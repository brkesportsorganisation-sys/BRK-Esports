import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';
import { SupportTicket, SupportMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    const userId = searchParams.get('userId');
    const adminAll = searchParams.get('adminAll') === 'true';

    const cutoffTime = Date.now() - THIRTY_DAYS_MS;

    // 1. Admin fetching all tickets (WhatsApp / Messenger DM list)
    if (adminAll) {
      // Try Supabase first
      const { data: supaTickets } = await supabaseAdmin
        .from('SupportTicket')
        .select('*')
        .order('updatedAt', { ascending: false });

      let tickets: SupportTicket[] = (supaTickets && supaTickets.length > 0)
        ? supaTickets
        : db.getSupportTickets();

      // Deduplicate by userId to ensure strict 1-to-1 thread per user account
      const uniqueUserMap = new Map<string, SupportTicket>();
      for (const t of tickets) {
        if (!uniqueUserMap.has(t.userId)) {
          uniqueUserMap.set(t.userId, t);
        }
      }
      const uniqueTickets = Array.from(uniqueUserMap.values());

      return NextResponse.json({ tickets: uniqueTickets });
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

    // Fetch messages from Supabase or Local DB
    const { data: supaMsgs } = await supabaseAdmin
      .from('SupportMessage')
      .select('*')
      .eq('ticketId', targetTicketId)
      .order('createdAt', { ascending: true });

    const rawMessages = supaMsgs && supaMsgs.length > 0 ? supaMsgs : db.getSupportMessages(targetTicketId);

    // 30-Day Auto Retention: Only return active messages from the last 30 days
    const activeMessages = (rawMessages || []).filter(m => new Date(m.createdAt).getTime() >= cutoffTime);

    return NextResponse.json({
      ticket: targetTicket,
      messages: activeMessages,
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

        // Fetch ticket's userId to send in-app notification to the user
        const { data: ticketRecord } = await supabaseAdmin
          .from('SupportTicket')
          .select('userId')
          .eq('id', ticketId)
          .maybeSingle();

        const targetUserId = ticketRecord?.userId || db.getSupportTicketById(ticketId)?.userId;

        if (targetUserId && targetUserId !== 'admin' && targetUserId !== 'system') {
          const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await supabaseAdmin.from('Notification').insert([{
            id: notifId,
            userId: targetUserId,
            title: 'Admin Support Reply 🎧',
            message: content.trim().length > 80 ? `${content.trim().substring(0, 77)}...` : content.trim(),
            type: 'GENERAL',
            link: '/profile?tab=support',
            isRead: false,
            createdAt: new Date().toISOString(),
          }]);
        }
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

    // Action 4: Delete Single Message
    if (action === 'DELETE_MESSAGE') {
      const messageId = body.messageId;
      if (!messageId) {
        return NextResponse.json({ error: 'Message ID is required.' }, { status: 400 });
      }

      db.deleteSupportMessage(messageId);
      try {
        await supabaseAdmin.from('SupportMessage').delete().eq('id', messageId);
        if (ticketId) {
          const { data: latestMsg } = await supabaseAdmin
            .from('SupportMessage')
            .select('content')
            .eq('ticketId', ticketId)
            .order('createdAt', { ascending: false })
            .limit(1)
            .maybeSingle();

          await supabaseAdmin.from('SupportTicket').update({
            lastMessage: latestMsg?.content || '',
            updatedAt: new Date().toISOString(),
          }).eq('id', ticketId);
        }
      } catch (supaErr) {
        console.warn('[DELETE_MESSAGE] Supabase notice:', supaErr);
      }

      const allMessages = ticketId ? db.getSupportMessages(ticketId) : [];
      return NextResponse.json({ success: true, messages: allMessages });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/support] Error:', error);
    return NextResponse.json({ error: 'Failed to process support request.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const ticketId = searchParams.get('ticketId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required.' }, { status: 400 });
    }

    db.deleteSupportMessage(messageId);
    try {
      await supabaseAdmin.from('SupportMessage').delete().eq('id', messageId);
      if (ticketId) {
        const { data: latestMsg } = await supabaseAdmin
          .from('SupportMessage')
          .select('content')
          .eq('ticketId', ticketId)
          .order('createdAt', { ascending: false })
          .limit(1)
          .maybeSingle();

        await supabaseAdmin.from('SupportTicket').update({
          lastMessage: latestMsg?.content || '',
          updatedAt: new Date().toISOString(),
        }).eq('id', ticketId);
      }
    } catch (supaErr) {
      console.warn('[DELETE /api/support] Supabase notice:', supaErr);
    }

    const messages = ticketId ? db.getSupportMessages(ticketId) : [];
    return NextResponse.json({ success: true, message: 'Message deleted.', messages });
  } catch (error: any) {
    console.error('[DELETE /api/support] Error:', error);
    return NextResponse.json({ error: 'Failed to delete message.' }, { status: 500 });
  }
}

