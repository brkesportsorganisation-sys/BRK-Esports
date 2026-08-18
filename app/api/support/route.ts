import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';
import { SupportTicket, SupportMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';

const DISCORD_INVITE_URL = 'https://discord.gg/blackrock-esports';

const AUTOMATED_DISCORD_WELCOME_MESSAGE = `👋 আসসালামু আলাইকুম! Black Rock Esports হেল্পডেস্ক ও সাপোর্ট সেন্টারে স্বাগতম।

📌 **জরুরি টুর্নামেন্ট সমস্যা, রুম আইডি মিসিং, ইনস্ট্যান্ট প্রাইজমানি ক্যাশআউট সাপোর্ট ও নোটিফিকেশনের জন্য আমাদের অফিসিয়াল Discord সার্ভারে যোগ দিন:**
👉 **Discord Invite Link:** ${DISCORD_INVITE_URL}

আমাদের একজন সাপোর্ট অ্যাডমিন আপনার মেসেজটি পেয়েছেন এবং খুব দ্রুত এখানেই উত্তর দেবেন। অনুগ্রহ করে আপনার ফ্রি ফায়ার UID বা সমস্যার বিবরণ লিখে রাখুন।`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    const userId = searchParams.get('userId');
    const adminAll = searchParams.get('adminAll') === 'true';

    // 1. Admin fetching all tickets
    if (adminAll) {
      // Try Supabase first
      const { data: supaTickets } = await supabaseAdmin
        .from('SupportTicket')
        .select('*')
        .order('updatedAt', { ascending: false });

      if (supaTickets && supaTickets.length > 0) {
        return NextResponse.json({ tickets: supaTickets });
      }

      // Local DB fallback
      return NextResponse.json({ tickets: db.getSupportTickets() });
    }

    // 2. Fetching specific ticket or user's ticket
    let targetTicket: SupportTicket | null = null;
    let targetTicketId = ticketId;

    if (targetTicketId) {
      const { data: supaT } = await supabaseAdmin
        .from('SupportTicket')
        .select('*')
        .eq('id', targetTicketId)
        .maybeSingle();

      targetTicket = supaT || db.getSupportTicketById(targetTicketId);
    } else if (userId) {
      const { data: supaT } = await supabaseAdmin
        .from('SupportTicket')
        .select('*')
        .eq('userId', userId)
        .order('updatedAt', { ascending: false })
        .limit(1)
        .maybeSingle();

      targetTicket = supaT || db.getSupportTicketByUserId(userId);
      if (targetTicket) {
        targetTicketId = targetTicket.id;
      }
    }

    if (!targetTicketId) {
      return NextResponse.json({ ticket: null, messages: [] });
    }

    // Fetch messages
    const { data: supaMsgs } = await supabaseAdmin
      .from('SupportMessage')
      .select('*')
      .eq('ticketId', targetTicketId)
      .order('createdAt', { ascending: true });

    const messages = supaMsgs && supaMsgs.length > 0 ? supaMsgs : db.getSupportMessages(targetTicketId);

    return NextResponse.json({
      ticket: targetTicket,
      messages: messages || [],
    });
  } catch (error: any) {
    console.error('[GET /api/support] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch support data.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ticketId, userId, userName, userEmail, userPhone, content, senderRole, adminName } = body;

    // Action 1: User sends a message
    if (action === 'SEND_USER_MESSAGE' || senderRole === 'USER') {
      if (!userId || !content?.trim()) {
        return NextResponse.json({ error: 'User ID and content are required.' }, { status: 400 });
      }

      // Create or find ticket
      let ticket = db.createOrGetSupportTicket(userId, userName || 'Player', userEmail, userPhone);
      let isFirstMessage = false;

      // Check existing messages count
      const existingMsgs = db.getSupportMessages(ticket.id);
      if (existingMsgs.length === 0) {
        isFirstMessage = true;
      }

      // Save user message in local DB
      const userMsg = db.addSupportMessage({
        ticketId: ticket.id,
        userId,
        userName: userName || 'Player',
        senderRole: 'USER',
        content: content.trim(),
      });

      // Also persist to Supabase if table exists
      try {
        await supabaseAdmin.from('SupportTicket').upsert({
          id: ticket.id,
          userId: ticket.userId,
          userName: ticket.userName,
          userEmail: ticket.userEmail,
          userPhone: ticket.userPhone,
          lastMessage: content.trim(),
          status: 'OPEN',
          updatedAt: new Date().toISOString(),
        });

        await supabaseAdmin.from('SupportMessage').insert({
          id: userMsg.id,
          ticketId: ticket.id,
          userId,
          userName: ticket.userName,
          senderRole: 'USER',
          content: content.trim(),
          createdAt: userMsg.createdAt,
        });
      } catch (supaErr) {
        console.warn('[POST /api/support] Supabase sync notice:', supaErr);
      }

      // AUTO DISCORD WELCOME REPLY (If new conversation / first user message)
      if (isFirstMessage) {
        const sysMsg = db.addSupportMessage({
          ticketId: ticket.id,
          userId: 'system',
          userName: 'Black Rock Support Bot',
          senderRole: 'SYSTEM',
          content: AUTOMATED_DISCORD_WELCOME_MESSAGE,
        });

        try {
          await supabaseAdmin.from('SupportMessage').insert({
            id: sysMsg.id,
            ticketId: ticket.id,
            userId: 'system',
            userName: 'Black Rock Support Bot',
            senderRole: 'SYSTEM',
            content: AUTOMATED_DISCORD_WELCOME_MESSAGE,
            createdAt: sysMsg.createdAt,
          });
        } catch {}
      }

      const allMessages = db.getSupportMessages(ticket.id);
      return NextResponse.json({
        success: true,
        ticket: db.getSupportTicketById(ticket.id),
        messages: allMessages,
      });
    }

    // Action 2: Admin sends a reply
    if (action === 'SEND_ADMIN_REPLY' || senderRole === 'ADMIN') {
      if (!ticketId || !content?.trim()) {
        return NextResponse.json({ error: 'Ticket ID and content are required.' }, { status: 400 });
      }

      const adminMsg = db.addSupportMessage({
        ticketId,
        userId: 'admin',
        userName: adminName || 'Admin Support',
        senderRole: 'ADMIN',
        content: content.trim(),
      });

      try {
        await supabaseAdmin.from('SupportMessage').insert({
          id: adminMsg.id,
          ticketId,
          userId: 'admin',
          userName: adminName || 'Admin Support',
          senderRole: 'ADMIN',
          content: content.trim(),
          createdAt: adminMsg.createdAt,
        });

        await supabaseAdmin.from('SupportTicket').update({
          lastMessage: content.trim(),
          status: 'OPEN',
          updatedAt: new Date().toISOString(),
        }).eq('id', ticketId);
      } catch (supaErr) {
        console.warn('[POST /api/support] Admin Supabase sync notice:', supaErr);
      }

      const allMessages = db.getSupportMessages(ticketId);
      return NextResponse.json({
        success: true,
        ticket: db.getSupportTicketById(ticketId),
        messages: allMessages,
      });
    }

    // Action 3: Resolve Ticket
    if (action === 'RESOLVE_TICKET') {
      if (!ticketId) {
        return NextResponse.json({ error: 'Ticket ID is required.' }, { status: 400 });
      }

      db.resolveSupportTicket(ticketId);
      try {
        await supabaseAdmin.from('SupportTicket').update({
          status: 'RESOLVED',
          updatedAt: new Date().toISOString(),
        }).eq('id', ticketId);
      } catch {}

      return NextResponse.json({ success: true, message: 'Ticket resolved.' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/support] Error:', error);
    return NextResponse.json({ error: 'Failed to process support request.' }, { status: 500 });
  }
}
