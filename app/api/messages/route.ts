import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateChatMessage } from '@/lib/chat-filter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const userId = searchParams.get('userId') || request.headers.get('x-user-id');

    if (!conversationId) {
      return NextResponse.json({ message: 'Conversation ID is required.' }, { status: 400 });
    }

    // 1. Fetch conversation details to verify participants
    const { data: conversation, error: convErr } = await supabaseAdmin
      .from('Conversation')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convErr || !conversation) {
      return NextResponse.json({
        conversation: null,
        messages: [],
        contactInfo: { isUnlocked: false },
        unlockFee: 20,
      });
    }

    // Security check: only participants or admin can read messages
    if (userId && conversation.buyerId !== userId && conversation.sellerId !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // 2. Fetch messages in order (filter out any blocked violation attempts)
    const { data: rawMessages, error: msgErr } = await supabaseAdmin
      .from('Message')
      .select('*')
      .eq('conversationId', conversationId)
      .order('createdAt', { ascending: true });

    if (msgErr) {
      console.warn('[GET /api/messages] Supabase warning:', msgErr.message);
    }

    // Cleanly filter out any blocked violation records so raw phone numbers never appear in chat
    const messages = (rawMessages || []).filter(
      (m: any) => !m.isFlagged && !m.content?.startsWith('[BLOCKED BY FILTER')
    );

    // Clean up old blocked violation attempts from database asynchronously
    try {
      await supabaseAdmin
        .from('Message')
        .delete()
        .eq('conversationId', conversationId)
        .or('isFlagged.eq.true,content.like.[BLOCKED BY FILTER%');
    } catch {}

    // 3. Check Contact Unlock status
    const { data: unlock } = await supabaseAdmin
      .from('ContactUnlock')
      .select('*')
      .eq('conversationId', conversationId)
      .eq('status', 'COMPLETED')
      .maybeSingle();

    // 4. Fetch dynamic unlock fee from SiteSetting
    const { data: feeSetting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'contact_unlock_fee')
      .maybeSingle();

    const unlockFee = Number(feeSetting?.value) || 20;

    let contactInfo = {
      isUnlocked: Boolean(unlock),
      sellerPhone: unlock?.sellerPhone || null,
      sellerWhatsApp: unlock?.sellerWhatsApp || null,
      unlockedAt: unlock?.unlockedAt || null,
    };

    // If unlocked and contact info is missing, fetch from seller's profile
    if (unlock && (!contactInfo.sellerPhone || !contactInfo.sellerWhatsApp)) {
      const { data: seller } = await supabaseAdmin
        .from('User')
        .select('accountNumber, inGameName')
        .eq('id', conversation.sellerId)
        .maybeSingle();

      if (seller) {
        contactInfo.sellerPhone = contactInfo.sellerPhone || seller.accountNumber || null;
      }
    }

    // Return messages, conversation metadata, and contact unlock state
    return NextResponse.json({
      conversation,
      messages: messages || [],
      contactInfo,
      unlockFee,
    });
  } catch (error: any) {
    console.error('[GET /api/messages]', error);
    return NextResponse.json({ messages: [], message: error?.message || 'Failed to fetch messages.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, senderId, senderName, senderAvatar, content } = body;

    if (!conversationId || !senderId || !content || !content.trim()) {
      return NextResponse.json({ message: 'Conversation ID, sender, and content are required.' }, { status: 400 });
    }

    const trimmedContent = content.trim();

    // 🛡️ 1. SERVER-SIDE SECURITY LINK & PHONE FILTER
    const filterResult = validateChatMessage(trimmedContent);

    if (filterResult.isBlocked) {
      // Reject and do NOT insert the blocked phone number or link into the chat table!
      return NextResponse.json({
        success: false,
        blocked: true,
        flagReason: filterResult.flagReason,
        message: filterResult.warningMessage || 'Security Warning: Direct phone numbers and external links cannot be sent in chat.',
      }, { status: 422 });
    }

    // 2. Fetch conversation to verify and update
    const { data: conv, error: convErr } = await supabaseAdmin
      .from('Conversation')
      .select('id, buyerId, sellerId, buyerName, sellerName')
      .eq('id', conversationId)
      .single();

    if (convErr || !conv) {
      return NextResponse.json({ message: 'Conversation thread not found.' }, { status: 404 });
    }

    // 3. Insert verified message
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newMessage = {
      id: msgId,
      conversationId,
      senderId,
      senderName: senderName || 'Player',
      content: trimmedContent,
      isFlagged: false,
      flagReason: null,
      createdAt: now,
    };

    const { data: createdMsg, error: insertErr } = await supabaseAdmin
      .from('Message')
      .insert([newMessage])
      .select()
      .single();

    if (insertErr) {
      throw new Error(insertErr.message);
    }

    // 4. Update Conversation's lastMessage and lastMessageAt
    await supabaseAdmin
      .from('Conversation')
      .update({
        lastMessage: trimmedContent.length > 60 ? `${trimmedContent.substring(0, 57)}...` : trimmedContent,
        lastMessageAt: now,
        updatedAt: now,
      })
      .eq('id', conversationId);

    // 5. Send in-app notification to the receiver
    const recipientId = conv.buyerId === senderId ? conv.sellerId : conv.buyerId;
    if (recipientId) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('Notification').insert([{
        id: notifId,
        userId: recipientId,
        title: `New message from ${senderName || 'Player'} 💬`,
        message: trimmedContent.length > 80 ? `${trimmedContent.substring(0, 77)}...` : trimmedContent,
        type: 'GENERAL',
        link: `/messages?id=${conversationId}`,
        isRead: false,
        createdAt: now,
      }]);
    }

    return NextResponse.json({
      success: true,
      message: createdMsg,
    }, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/messages]', error);
    return NextResponse.json({ message: error?.message || 'Failed to send message.' }, { status: 500 });
  }
}
