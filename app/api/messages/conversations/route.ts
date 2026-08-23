import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    // Query conversations where user is either buyer or seller
    const { data: conversations, error } = await supabaseAdmin
      .from('Conversation')
      .select('*')
      .or(`buyerId.eq.${userId},sellerId.eq.${userId}`)
      .order('lastMessageAt', { ascending: false });

    if (error) {
      console.warn('[GET /api/messages/conversations] Supabase query warning:', error.message);
      return NextResponse.json({ conversations: [] });
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Collect all other participant IDs to fetch avatars & contact info
    const otherUserIds = Array.from(new Set(
      conversations.map((c: any) => (c.buyerId === userId ? c.sellerId : c.buyerId))
    ));

    const { data: otherUsers } = await supabaseAdmin
      .from('User')
      .select('id, name, avatar, freeFireUid, inGameName, accountNumber, role')
      .in('id', otherUserIds);

    const userMap = new Map((otherUsers || []).map((u: any) => [u.id, u]));

    // Check contact unlocks for these conversations
    const conversationIds = conversations.map((c: any) => c.id);
    const { data: unlocks } = await supabaseAdmin
      .from('ContactUnlock')
      .select('conversationId, status')
      .in('conversationId', conversationIds)
      .eq('buyerId', userId)
      .eq('status', 'COMPLETED');

    const unlockedMap = new Set((unlocks || []).map((u: any) => u.conversationId));

    // Enrich conversation list
    const enriched = conversations.map((c: any) => {
      const otherId = c.buyerId === userId ? c.sellerId : c.buyerId;
      const otherUser = userMap.get(otherId);

      return {
        id: c.id,
        buyerId: c.buyerId,
        sellerId: c.sellerId,
        otherUser: {
          id: otherId,
          name: otherUser?.name || (c.buyerId === userId ? c.sellerName : c.buyerName) || 'EZBD Player',
          avatar: otherUser?.avatar || '',
          accountNumber: otherUser?.accountNumber || `EZBD-${otherId.slice(-6).toUpperCase()}`,
          role: otherUser?.role || 'USER',
          inGameName: otherUser?.inGameName || '',
        },
        lastMessage: c.lastMessage || 'No messages yet',
        lastMessageAt: c.lastMessageAt || c.createdAt,
        createdAt: c.createdAt,
        isUnlocked: unlockedMap.has(c.id),
      };
    });

    return NextResponse.json({ conversations: enriched });
  } catch (error: any) {
    console.error('[GET /api/messages/conversations]', error);
    return NextResponse.json({ conversations: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buyerId, sellerId } = body;

    if (!buyerId || !sellerId) {
      return NextResponse.json({ message: 'Buyer ID and Seller ID are required.' }, { status: 400 });
    }

    if (buyerId === sellerId) {
      return NextResponse.json({ message: 'You cannot start a conversation with yourself.' }, { status: 400 });
    }

    // Check if conversation already exists between these 2 users (in either direction)
    const { data: existing } = await supabaseAdmin
      .from('Conversation')
      .select('*')
      .or(`and(buyerId.eq.${buyerId},sellerId.eq.${sellerId}),and(buyerId.eq.${sellerId},sellerId.eq.${buyerId})`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ conversation: existing, isNew: false });
    }

    // Fetch user names for conversation header
    const { data: users } = await supabaseAdmin
      .from('User')
      .select('id, name')
      .in('id', [buyerId, sellerId]);

    const buyerName = users?.find((u: any) => u.id === buyerId)?.name || 'Buyer';
    const sellerName = users?.find((u: any) => u.id === sellerId)?.name || 'Seller';

    const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newConv = {
      id: convId,
      buyerId,
      sellerId,
      buyerName,
      sellerName,
      lastMessage: 'Conversation started.',
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const { data: created, error: createErr } = await supabaseAdmin
      .from('Conversation')
      .insert([newConv])
      .select()
      .single();

    if (createErr) throw new Error(createErr.message);

    return NextResponse.json({ conversation: created, isNew: true }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/messages/conversations]', error);
    return NextResponse.json({ message: error?.message || 'Failed to start conversation.' }, { status: 500 });
  }
}
