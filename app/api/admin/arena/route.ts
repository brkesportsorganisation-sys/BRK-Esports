import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminSession, hasPermission } from '@/lib/admin-auth';
import { DuelChallenge } from '@/lib/types';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasPermission(session, 'manage_tournaments')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'ACTIVE_DUEL_CHALLENGES')
      .maybeSingle();

    let duels: DuelChallenge[] = [];
    if (setting?.value) {
      try {
        duels = JSON.parse(setting.value);
      } catch {}
    }

    return NextResponse.json({ success: true, duels: duels || [] });
  } catch (error: any) {
    console.error('[GET /api/admin/arena]', error);
    return NextResponse.json({ duels: [] });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasPermission(session, 'enter_results')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { duelId, action, winnerId } = body;

    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'ACTIVE_DUEL_CHALLENGES')
      .maybeSingle();

    let duels: DuelChallenge[] = [];
    if (setting?.value) {
      try {
        duels = JSON.parse(setting.value);
      } catch {}
    }

    const duelIdx = duels.findIndex(d => d.id === duelId);
    if (duelIdx === -1) {
      return NextResponse.json({ message: 'Duel not found.' }, { status: 404 });
    }

    const duel = duels[duelIdx];

    // 1. AWARD WINNER
    if (action === 'AWARD_WINNER') {
      if (!winnerId) {
        return NextResponse.json({ message: 'Winner ID is required.' }, { status: 400 });
      }

      // Credit Winner
      const { data: winner } = await supabaseAdmin
        .from('User')
        .select('id, walletBalance, coinBalance, winningBalance')
        .eq('id', winnerId)
        .single();

      const prizeAmt = Number(duel.prizePool || 0);

      if (winner && prizeAmt > 0) {
        if (duel.stakeType === 'COINS') {
          await supabaseAdmin
            .from('User')
            .update({ coinBalance: Number(winner.coinBalance || 0) + prizeAmt })
            .eq('id', winnerId);
        } else {
          await supabaseAdmin
            .from('User')
            .update({
              walletBalance: Number(winner.walletBalance || 0) + prizeAmt,
              winningBalance: Number(winner.winningBalance || 0) + prizeAmt,
            })
            .eq('id', winnerId);
        }
      }

      duel.status = 'COMPLETED';
      duel.winnerId = winnerId;
      duels[duelIdx] = duel;

      await supabaseAdmin.from('SiteSetting').upsert({
        id: 'setting_active_duels',
        key: 'ACTIVE_DUEL_CHALLENGES',
        value: JSON.stringify(duels),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

      // Send in-app notification
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await supabaseAdmin.from('Notification').insert([{
          id: notifId,
          userId: winnerId,
          title: 'Custom Match Victory! 🏆',
          message: prizeAmt > 0
            ? `Congratulations! You won the match and received ৳${prizeAmt} in your wallet!`
            : `Congratulations! You won the custom match! GG!`,
          isRead: false,
          createdAt: new Date().toISOString(),
        }]);
      } catch {}

      return NextResponse.json({ success: true, message: `Match victory recorded for winner.` });
    }

    // 2. REFUND BOTH PLAYERS
    if (action === 'REFUND') {
      const refundPlayers = [duel.creatorId, duel.challengerId].filter(Boolean);
      const refundFee = Number(duel.entryFee || 0);

      if (refundFee > 0) {
        for (const pId of refundPlayers) {
          const { data: p } = await supabaseAdmin
            .from('User')
            .select('id, walletBalance, coinBalance')
            .eq('id', pId)
            .single();

          if (p) {
            if (duel.stakeType === 'COINS') {
              await supabaseAdmin.from('User').update({ coinBalance: Number(p.coinBalance || 0) + refundFee }).eq('id', pId);
            } else {
              await supabaseAdmin.from('User').update({ walletBalance: Number(p.walletBalance || 0) + refundFee }).eq('id', pId);
            }
          }
        }
      }

      duel.status = 'CANCELLED';
      duels[duelIdx] = duel;

      await supabaseAdmin.from('SiteSetting').upsert({
        id: 'setting_active_duels',
        key: 'ACTIVE_DUEL_CHALLENGES',
        value: JSON.stringify(duels),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

      return NextResponse.json({ success: true, message: 'Duel cancelled and stakes refunded to both players.' });
    }

    return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[PATCH /api/admin/arena]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process duel action.' }, { status: 500 });
  }
}
