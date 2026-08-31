import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';
import { SupportTicket, SupportMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';
    const scope = searchParams.get('scope') || 'archived'; // 'archived' | 'all'

    const cutoffDate = new Date(Date.now() - THIRTY_DAYS_MS);
    const cutoffIso = cutoffDate.toISOString();

    // 1. Fetch tickets from Supabase or DB
    let tickets: SupportTicket[] = [];
    const { data: supaTickets } = await supabaseAdmin
      .from('SupportTicket')
      .select('*')
      .order('updatedAt', { ascending: false });

    if (supaTickets && supaTickets.length > 0) {
      tickets = supaTickets;
    } else {
      tickets = db.getSupportTickets();
    }

    // 2. Fetch all messages from Supabase or DB
    let allMessages: SupportMessage[] = [];
    const { data: supaMsgs } = await supabaseAdmin
      .from('SupportMessage')
      .select('*')
      .order('createdAt', { ascending: true });

    if (supaMsgs && supaMsgs.length > 0) {
      allMessages = supaMsgs;
    } else {
      allMessages = db.getAllSupportMessages();
    }

    const activeMessages = allMessages.filter(m => new Date(m.createdAt).getTime() >= cutoffDate.getTime());
    const archivedMessages = allMessages.filter(m => new Date(m.createdAt).getTime() < cutoffDate.getTime());

    // If download requested, generate downloadable file
    if (download) {
      const messagesToExport = scope === 'all' ? allMessages : archivedMessages;
      
      const ticketMap = new Map<string, SupportTicket>();
      tickets.forEach(t => ticketMap.set(t.id, t));

      const groupedByTicket: Record<string, {
        ticketId: string;
        userId: string;
        userName: string;
        userEmail?: string;
        userPhone?: string;
        ticketStatus: string;
        messagesCount: number;
        messages: SupportMessage[];
      }> = {};

      messagesToExport.forEach(msg => {
        const ticket = ticketMap.get(msg.ticketId);
        if (!groupedByTicket[msg.ticketId]) {
          groupedByTicket[msg.ticketId] = {
            ticketId: msg.ticketId,
            userId: msg.userId,
            userName: msg.userName || ticket?.userName || 'Player',
            userEmail: ticket?.userEmail || '',
            userPhone: ticket?.userPhone || '',
            ticketStatus: ticket?.status || 'OPEN',
            messagesCount: 0,
            messages: [],
          };
        }
        groupedByTicket[msg.ticketId].messages.push(msg);
        groupedByTicket[msg.ticketId].messagesCount += 1;
      });

      const exportPayload = {
        title: 'EZBD Esports Live Support Chat Archive',
        exportDate: new Date().toISOString(),
        retentionPolicy: '30-Day Auto Retention',
        cutoffDate: cutoffIso,
        exportScope: scope,
        totalExportedMessages: messagesToExport.length,
        totalConversations: Object.keys(groupedByTicket).length,
        conversations: Object.values(groupedByTicket),
      };

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `support_chat_${scope}_backup_${dateStr}.json`;

      return new NextResponse(JSON.stringify(exportPayload, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Return backup statistics overview
    return NextResponse.json({
      retentionPolicyDays: 30,
      cutoffDate: cutoffIso,
      stats: {
        totalConversations: tickets.length,
        totalMessages: allMessages.length,
        activeMessagesCount: activeMessages.length,
        archivedMessagesCount: archivedMessages.length,
      },
    });

  } catch (error: any) {
    console.error('[GET /api/admin/support/backup] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch backup data.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body; // 'PURGE_ARCHIVED' | 'PURGE_ALL'

    const cutoffDate = new Date(Date.now() - THIRTY_DAYS_MS);
    const cutoffIso = cutoffDate.toISOString();

    if (action === 'PURGE_ARCHIVED') {
      let supaDeleted = 0;
      try {
        const { count, error } = await supabaseAdmin
          .from('SupportMessage')
          .delete({ count: 'exact' })
          .lt('createdAt', cutoffIso);
        if (!error && typeof count === 'number') supaDeleted = count;
      } catch (err) {
        console.warn('[PURGE_ARCHIVED] Supabase purge notice:', err);
      }

      const localDeleted = db.purgeSupportMessages(cutoffIso);

      return NextResponse.json({
        success: true,
        message: `Successfully permanently purged archived messages older than 30 days.`,
        deletedCount: Math.max(supaDeleted, localDeleted),
      });
    }

    if (action === 'PURGE_ALL') {
      let supaDeleted = 0;
      try {
        const { count, error } = await supabaseAdmin
          .from('SupportMessage')
          .delete({ count: 'exact' })
          .neq('id', '0');
        if (!error && typeof count === 'number') supaDeleted = count;
      } catch (err) {
        console.warn('[PURGE_ALL] Supabase purge notice:', err);
      }

      const localDeleted = db.purgeAllSupportMessages();

      return NextResponse.json({
        success: true,
        message: 'Successfully purged all chat message history from database.',
        deletedCount: Math.max(supaDeleted, localDeleted),
      });
    }

    return NextResponse.json({ error: 'Invalid purge action specified.' }, { status: 400 });

  } catch (error: any) {
    console.error('[POST /api/admin/support/backup] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to process purge action.' }, { status: 500 });
  }
}
