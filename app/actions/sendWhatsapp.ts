'use server';

import { 
  sendRoomDetailsToPlayer as sendRoomDetails, 
  broadcastRoomDetails,
  SendRoomDetailsParams 
} from '@/lib/whatsapp';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Server Action: Send Room ID and Password to a single player via WhatsApp
 */
export async function sendRoomDetailsToPlayer(
  playerPhone: string, 
  roomId: string, 
  pass: string,
  playerName?: string,
  tournamentTitle?: string,
  customMessage?: string
) {
  return await sendRoomDetails({
    playerPhone,
    roomId,
    pass,
    playerName,
    tournamentTitle,
    customMessage,
  });
}

/**
 * Server Action: Broadcast Room ID and Password to all verified teams of a tournament
 */
export async function broadcastRoomDetailsToTournament(
  tournamentId: string,
  roomId: string,
  pass: string
) {
  if (!tournamentId || !roomId || !pass) {
    return {
      success: false,
      message: 'Tournament ID, Room ID, and Password are required.',
    };
  }

  try {
    // 1. Fetch tournament title
    let tournamentTitle = 'EZBD Esports Tournament';
    if (tournamentId && tournamentId !== 'ACTIVE_TOURNAMENTS' && tournamentId !== 'ALL') {
      const { data: tour } = await supabaseAdmin
        .from('Tournament')
        .select('title')
        .eq('id', tournamentId)
        .maybeSingle();
      if (tour?.title) tournamentTitle = tour.title;
    }

    // 2. Fetch all verified registrations from Participant table
    let query = supabaseAdmin
      .from('Participant')
      .select('id, captainWhatsApp, iglName, squadName, status, tournamentId')
      .eq('status', 'VERIFIED')
      .not('captainWhatsApp', 'is', null);

    if (tournamentId && tournamentId !== 'ACTIVE_TOURNAMENTS' && tournamentId !== 'ALL') {
      query = query.eq('tournamentId', tournamentId);
    }

    const { data: regs, error } = await query;

    if (error) {
      return { success: false, message: error.message };
    }

    if (!regs || regs.length === 0) {
      return {
        success: false,
        message: 'No verified registered teams found for this tournament.',
      };
    }

    // Extract valid WhatsApp numbers
    const recipients = regs
      .filter((r) => r.captainWhatsApp && r.captainWhatsApp.trim().length > 0)
      .map((r) => ({
        phone: r.captainWhatsApp,
        name: r.iglName || r.squadName || 'Captain',
      }));

    if (recipients.length === 0) {
      return {
        success: false,
        message: 'No valid captain WhatsApp numbers found in registrations.',
      };
    }

    // Broadcast
    const result = await broadcastRoomDetails({
      recipients,
      roomId,
      pass,
      tournamentTitle,
    });

    return {
      success: true,
      message: `Broadcast complete! Sent to ${result.successCount} of ${result.total} captains.`,
      result,
    };
  } catch (err: any) {
    console.error('[Broadcast WhatsApp Action Error]', err);
    return {
      success: false,
      message: err?.message || 'Failed to broadcast WhatsApp messages.',
    };
  }
}
