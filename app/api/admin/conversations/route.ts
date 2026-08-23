import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    // If specific conversation ID requested: fetch full thread & messages
    if (conversationId) {
      const { data: conversation, error: convErr } = await supabaseAdmin
        .from('Conversation')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convErr || !conversation) {
        return NextResponse.json({ message: 'Conversation not found.' }, { status: 404 });
      }

      // Fetch participants
      const { data: participants } = await supabaseAdmin
        .from('User')
        .select('id, name, email, avatar, accountNumber, freeFireUid, inGameName, walletBalance, isBanned')
        .in('id', [conversation.buyerId, conversation.sellerId]);

      const buyer = participants?.find((u) => u.id === conversation.buyerId) || null;
      const seller = participants?.find((u) => u.id === conversation.sellerId) || null;

      // Fetch messages
      const { data: messages } = await supabaseAdmin
        .from('Message')
        .select('*')
        .eq('conversationId', conversationId)
        .order('createdAt', { ascending: true });

      // Fetch unlock info
      const { data: unlockInfo } = await supabaseAdmin
        .from('ContactUnlock')
        .select('*')
        .eq('conversationId', conversationId)
        .maybeSingle();

      return NextResponse.json({
        conversation: {
          ...conversation,
          buyer,
          seller,
        },
        messages: messages || [],
        unlockInfo,
      });
    }

    // Otherwise: Fetch all conversation threads
    const { data: rawConversations, error: listErr } = await supabaseAdmin
      .from('Conversation')
      .select('*')
      .order('updatedAt', { ascending: false })
      .limit(100);

    if (listErr) {
      console.error('[GET /api/admin/conversations] listErr:', listErr.message);
    }

    const convList = rawConversations || [];

    // Collect all participant IDs
    const userIds = Array.from(
      new Set(convList.flatMap((c) => [c.buyerId, c.sellerId]).filter(Boolean))
    );

    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('User')
        .select('id, name, email, avatar, accountNumber, freeFireUid, inGameName, isBanned')
        .in('id', userIds);

      if (users) {
        users.forEach((u) => {
          usersMap[u.id] = u;
        });
      }
    }

    // Enrich conversations
    let conversations = convList.map((conv) => {
      const buyer = usersMap[conv.buyerId] || {
        id: conv.buyerId,
        name: conv.buyerName || 'Buyer',
        accountNumber: `BRE-${conv.buyerId?.substring(0, 6)?.toUpperCase() || 'MEMBER'}`,
      };
      const seller = usersMap[conv.sellerId] || {
        id: conv.sellerId,
        name: conv.sellerName || 'Seller',
        accountNumber: `BRE-${conv.sellerId?.substring(0, 6)?.toUpperCase() || 'MEMBER'}`,
      };

      return {
        ...conv,
        buyer,
        seller,
      };
    });

    // Apply search filter if query provided
    if (search) {
      conversations = conversations.filter((c) => {
        const bName = c.buyer?.name?.toLowerCase() || '';
        const bAcc = c.buyer?.accountNumber?.toLowerCase() || '';
        const sName = c.seller?.name?.toLowerCase() || '';
        const sAcc = c.seller?.accountNumber?.toLowerCase() || '';
        const lastMsg = c.lastMessage?.toLowerCase() || '';
        return (
          bName.includes(search) ||
          bAcc.includes(search) ||
          sName.includes(search) ||
          sAcc.includes(search) ||
          lastMsg.includes(search)
        );
      });
    }

    // Count stats
    const { count: totalMessages } = await supabaseAdmin
      .from('Message')
      .select('*', { count: 'exact', head: true });

    const { count: totalUnlocks } = await supabaseAdmin
      .from('ContactUnlock')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'COMPLETED');

    return NextResponse.json({
      conversations,
      stats: {
        totalConversations: convList.length,
        totalMessages: totalMessages || 0,
        totalUnlocks: totalUnlocks || 0,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/admin/conversations]', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to load conversations.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, conversationId, messageId, warningText, targetUserId } = body;

    if (action === 'send_warning') {
      if (!conversationId) {
        return NextResponse.json({ message: 'Conversation ID required.' }, { status: 400 });
      }

      const warningMsg = warningText?.trim() || '⚠️ [BLACKROCK MODERATION SYSTEM]: অশালীন ভাষা, গালিগালাজ বা স্প্যাম করা সম্পূর্ণ নিষিদ্ধ। পরবর্তীতে নিয়ম ভঙ্গ করলে সরাসরি অ্যাকাউন্ট ব্যান করা হবে।';

      const msgId = `warn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      await supabaseAdmin.from('Message').insert([{
        id: msgId,
        conversationId,
        senderId: 'SYSTEM_ADMIN_BOT',
        senderName: '🛡️ BlackRock Moderation System',
        content: warningMsg,
        isFlagged: false,
        createdAt: now,
      }]);

      await supabaseAdmin
        .from('Conversation')
        .update({
          lastMessage: '🛡️ Moderation Warning Issued.',
          lastMessageAt: now,
          updatedAt: now,
        })
        .eq('id', conversationId);

      return NextResponse.json({ success: true, message: 'Warning sent to conversation.' });
    }

    if (action === 'ban_user') {
      if (!targetUserId) {
        return NextResponse.json({ message: 'Target User ID required.' }, { status: 400 });
      }

      await supabaseAdmin
        .from('User')
        .update({ isBanned: true })
        .eq('id', targetUserId);

      return NextResponse.json({ success: true, message: 'User banned from platform.' });
    }

    return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/admin/conversations]', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to execute moderation action.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const messageId = searchParams.get('messageId');

    if (messageId) {
      await supabaseAdmin
        .from('Message')
        .delete()
        .eq('id', messageId);

      return NextResponse.json({ success: true, message: 'Message deleted successfully.' });
    }

    if (conversationId) {
      await supabaseAdmin
        .from('Message')
        .delete()
        .eq('conversationId', conversationId);

      await supabaseAdmin
        .from('ContactUnlock')
        .delete()
        .eq('conversationId', conversationId);

      await supabaseAdmin
        .from('Conversation')
        .delete()
        .eq('id', conversationId);

      return NextResponse.json({ success: true, message: 'Conversation thread deleted.' });
    }

    return NextResponse.json({ message: 'Provide conversationId or messageId.' }, { status: 400 });
  } catch (error: any) {
    console.error('[DELETE /api/admin/conversations]', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to delete.' },
      { status: 500 }
    );
  }
}
