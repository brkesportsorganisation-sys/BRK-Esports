import { NextRequest, NextResponse } from 'next/server';
import { askGemini } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], userContext = {} } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ message: 'Message is required.' }, { status: 400 });
    }

    // 1. Fetch Real-time Live Platform Context from Supabase
    let liveTournamentsSummary = 'No active tournaments at this exact moment.';
    let activeAnnouncementsSummary = '';

    try {
      const { data: tournaments } = await supabaseAdmin
        .from('Tournament')
        .select('id, title, prizePool, entryFee, registeredCount, maxTeams, startTime, gameMode, map, status')
        .in('status', ['UPCOMING', 'REGISTRATION_OPEN', 'LIVE'])
        .order('createdAt', { ascending: false })
        .limit(5);

      if (tournaments && tournaments.length > 0) {
        liveTournamentsSummary = tournaments.map((t, idx) => (
          `${idx + 1}. "${t.title}" | Mode: ${t.gameMode || 'Squad BR'} | Map: ${t.map || 'Bermuda'} | Prize: ৳${t.prizePool || 0} | Entry Fee: ৳${t.entryFee || 0} | Slots Filled: ${t.registeredCount || 0}/${t.maxTeams || 48} | Status: ${t.status}`
        )).join('\n');
      }

      const { data: announcements } = await supabaseAdmin
        .from('Announcement')
        .select('title, content')
        .eq('isActive', true)
        .order('createdAt', { ascending: false })
        .limit(2);

      if (announcements && announcements.length > 0) {
        activeAnnouncementsSummary = announcements.map(a => `- ${a.title}: ${a.content}`).join('\n');
      }
    } catch (dbErr) {
      console.warn('[POST /api/ai/chat] Context fetch notice:', dbErr);
    }

    // 2. Build Rich Real-time Context
    let liveContext = `--- REAL-TIME LIVE PLATFORM DATA ---\n`;
    if (userContext.name) {
      liveContext += `Player Profile: Name: ${userContext.name}, IGN: ${userContext.inGameName || 'Not Set'}, Free Fire UID: ${userContext.freeFireUid || 'Not Set'}, Wallet Balance: ৳${userContext.walletBalance || 0}, Role: ${userContext.role || 'USER'}\n`;
    }
    liveContext += `Live Available Tournaments:\n${liveTournamentsSummary}\n`;
    if (activeAnnouncementsSummary) {
      liveContext += `Platform Announcements:\n${activeAnnouncementsSummary}\n`;
    }

    // 3. Ask Gemini with full context
    const reply = await askGemini(message.trim(), {
      history,
      temperature: 0.7,
      liveContext,
    });

    // 4. Smart Suggested Action Card Detection
    let suggestedAction: { label: string; link: string; icon: string } | null = null;
    const lower = message.toLowerCase();

    if (lower.includes('tournament') || lower.includes('join') || lower.includes('register') || lower.includes('ম্যাচ') || lower.includes('টুর্নামেন্ট')) {
      suggestedAction = { label: '🏆 Browse Active Tournaments', link: '/tournaments', icon: 'Trophy' };
    } else if (lower.includes('payout') || lower.includes('withdraw') || lower.includes('deposit') || lower.includes('টাকা') || lower.includes('bkash') || lower.includes('nagad') || lower.includes('wallet')) {
      suggestedAction = { label: '💰 Open Wallet & Withdraw', link: '/wallet', icon: 'DollarSign' };
    } else if (lower.includes('spin') || lower.includes('reward') || lower.includes('bonus') || lower.includes('coin') || lower.includes('diamond')) {
      suggestedAction = { label: '🎁 Claim Free Lucky Spin', link: '/ads', icon: 'Gift' };
    } else if (lower.includes('squad') || lower.includes('team') || lower.includes('lfg') || lower.includes('প্লেয়ার') || lower.includes('দল')) {
      suggestedAction = { label: '👥 Find Squadmates (LFG)', link: '/lfg', icon: 'Users' };
    } else if (lower.includes('rank') || lower.includes('leaderboard') || lower.includes('top') || lower.includes('চ্যাম্পিয়ন')) {
      suggestedAction = { label: '🔥 View Top Leaderboard', link: '/leaderboard', icon: 'Flame' };
    }

    return NextResponse.json({
      success: true,
      reply,
      suggestedAction,
    });
  } catch (error: any) {
    console.error('[POST /api/ai/chat]', error);
    return NextResponse.json({
      message: error?.message || 'AI Assistant is currently busy. Please try again in a moment.'
    }, { status: 500 });
  }
}
