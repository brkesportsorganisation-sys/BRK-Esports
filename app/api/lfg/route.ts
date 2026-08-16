import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status') || 'OPEN';

    let query = supabaseAdmin.from('LFGPost').select('*').order('createdAt', { ascending: false });

    if (type && type !== 'ALL') {
      query = query.eq('type', type);
    }

    if (status !== 'ALL') {
      query = query.eq('status', status);
    }

    const { data: posts, error } = await query;
    if (error) {
      console.warn('[GET /api/lfg] Supabase query warning:', error.message);
      return NextResponse.json({ posts: [] });
    }

    return NextResponse.json({ posts: posts || [] });
  } catch (error: any) {
    console.warn('[GET /api/lfg]', error);
    return NextResponse.json({ posts: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      authorName,
      type,
      gameMode = 'BR_SQUAD',
      roleNeeded = 'RUSHER',
      contactWhatsApp,
      description,
      squadName,
    } = body;

    if (!userId || !authorName || !type || !description) {
      return NextResponse.json({ message: 'User ID, name, post type, and description are required.' }, { status: 400 });
    }

    // Fetch user details for accurate win-rate and public bank-style account number
    const { data: user } = await supabaseAdmin
      .from('User')
      .select('id, name, avatar, accountNumber, winRate, totalKills, totalWins')
      .eq('id', userId)
      .maybeSingle();

    const postId = `lfg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const calcWinRate = user && (user.totalWins || 0) > 0 ? Math.min(100, Math.round(((user.totalWins || 0) / Math.max(1, (user.totalWins || 0) + 5)) * 100)) : 0;

    const newPost = {
      id: postId,
      userId,
      authorName: user?.name || authorName,
      accountNumber: user?.accountNumber || `BRE-${Math.floor(100000 + Math.random() * 900000)}`,
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      type,
      gameMode,
      roleNeeded,
      contactWhatsApp: contactWhatsApp?.trim() || null,
      description: description.trim(),
      status: 'OPEN',
      squadName: squadName?.trim() || null,
      winRate: user?.winRate || calcWinRate,
      kills: user?.totalKills || 0,
      createdAt: new Date().toISOString(),
    };

    const { data: created, error } = await supabaseAdmin
      .from('LFGPost')
      .insert([newPost])
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ post: created, message: 'Recruitment post published successfully!' }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/lfg]', error);
    return NextResponse.json({ message: error?.message || 'Failed to create recruitment post.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, action, candidateUserId } = body;

    if (!postId || !action) {
      return NextResponse.json({ message: 'Post ID and action are required.' }, { status: 400 });
    }

    if (action === 'CONFIRM_SQUAD') {
      // Confirm candidate into squad -> locks playerStatus to 'PENDING' until match concludes
      if (candidateUserId) {
        await supabaseAdmin
          .from('User')
          .update({
            playerStatus: 'PENDING',
            updatedAt: new Date().toISOString(),
          })
          .eq('id', candidateUserId);
      }

      const { data: updatedPost, error } = await supabaseAdmin
        .from('LFGPost')
        .update({
          status: 'PENDING',
        })
        .eq('id', postId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return NextResponse.json({
        post: updatedPost,
        message: 'Squad confirmed! Player status is locked to PENDING for the upcoming match.',
      });
    }

    if (action === 'CLOSE') {
      const { data: updatedPost, error } = await supabaseAdmin
        .from('LFGPost')
        .update({ status: 'CLOSED' })
        .eq('id', postId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return NextResponse.json({ post: updatedPost, message: 'Post closed.' });
    }

    return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[PATCH /api/lfg]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update post.' }, { status: 500 });
  }
}
