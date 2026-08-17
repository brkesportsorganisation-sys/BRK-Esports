import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { DuelChallenge } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
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
    console.error('[GET /api/arena]', error);
    return NextResponse.json({ duels: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Fetch current duels
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

    // 1. CREATE CHALLENGE
    if (action === 'CREATE') {
      const { creatorId, creatorName, creatorIgn, creatorUid, mode, customRules, stakeType = 'BDT', entryFee } = body;

      if (!creatorId || !entryFee || Number(entryFee) <= 0) {
        return NextResponse.json({ message: 'Creator ID and valid Entry Fee are required.' }, { status: 400 });
      }

      const numFee = Number(entryFee);

      // Verify creator balance
      const { data: creator, error: cErr } = await supabaseAdmin
        .from('User')
        .select('id, walletBalance, coinBalance')
        .eq('id', creatorId)
        .single();

      if (cErr || !creator) {
        return NextResponse.json({ message: 'User not found.' }, { status: 404 });
      }

      const balance = stakeType === 'COINS' ? Number(creator.coinBalance || 0) : Number(creator.walletBalance || 0);
      if (balance < numFee) {
        return NextResponse.json({ message: `Insufficient ${stakeType === 'COINS' ? 'coins' : 'balance'}! Required: ${numFee}` }, { status: 400 });
      }

      // Deduct creator stake into escrow
      if (stakeType === 'COINS') {
        await supabaseAdmin.from('User').update({ coinBalance: balance - numFee }).eq('id', creatorId);
      } else {
        await supabaseAdmin.from('User').update({ walletBalance: balance - numFee }).eq('id', creatorId);
      }

      const prizePool = Math.floor(numFee * 2 * 0.9); // 10% platform fee, 90% prize
      const duelId = `duel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newDuel: DuelChallenge = {
        id: duelId,
        creatorId,
        creatorName: creatorName || 'Player',
        creatorIgn: creatorIgn || 'Unknown IGN',
        creatorUid: creatorUid || '',
        mode: mode || '1v1_CS',
        customRules: customRules || 'Headshots Only / Unlimited Ammo (Standard 1v1 Rules)',
        stakeType,
        entryFee: numFee,
        prizePool,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      };

      const updatedDuels = [newDuel, ...duels.slice(0, 49)];

      await supabaseAdmin.from('SiteSetting').upsert({
        id: 'setting_active_duels',
        key: 'ACTIVE_DUEL_CHALLENGES',
        value: JSON.stringify(updatedDuels),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

      return NextResponse.json({
        success: true,
        message: 'Duel Challenge created! Waiting for an opponent to accept.',
        duel: newDuel,
      }, { status: 201 });
    }

    // 2. ACCEPT CHALLENGE
    if (action === 'ACCEPT') {
      const { duelId, challengerId, challengerName, challengerIgn, challengerUid } = body;

      const duelIndex = duels.findIndex(d => d.id === duelId && d.status === 'OPEN');
      if (duelIndex === -1) {
        return NextResponse.json({ message: 'Challenge is no longer open or does not exist.' }, { status: 404 });
      }

      const duel = duels[duelIndex];

      if (duel.creatorId === challengerId) {
        return NextResponse.json({ message: 'You cannot accept your own challenge.' }, { status: 400 });
      }

      // Verify challenger balance
      const { data: challenger, error: chErr } = await supabaseAdmin
        .from('User')
        .select('id, walletBalance, coinBalance')
        .eq('id', challengerId)
        .single();

      if (chErr || !challenger) {
        return NextResponse.json({ message: 'Challenger user not found.' }, { status: 404 });
      }

      const chBalance = duel.stakeType === 'COINS' ? Number(challenger.coinBalance || 0) : Number(challenger.walletBalance || 0);
      if (chBalance < duel.entryFee) {
        return NextResponse.json({ message: `Insufficient ${duel.stakeType === 'COINS' ? 'coins' : 'balance'}! Required: ${duel.entryFee}` }, { status: 400 });
      }

      // Deduct challenger stake
      if (duel.stakeType === 'COINS') {
        await supabaseAdmin.from('User').update({ coinBalance: chBalance - duel.entryFee }).eq('id', challengerId);
      } else {
        await supabaseAdmin.from('User').update({ walletBalance: chBalance - duel.entryFee }).eq('id', challengerId);
      }

      // Update duel
      duel.challengerId = challengerId;
      duel.challengerName = challengerName;
      duel.challengerIgn = challengerIgn;
      duel.challengerUid = challengerUid;
      duel.status = 'IN_PROGRESS';
      duel.roomId = `${Math.floor(100000 + Math.random() * 900000)}`;
      duel.roomPass = `${Math.floor(1000 + Math.random() * 9000)}`;

      duels[duelIndex] = duel;

      await supabaseAdmin.from('SiteSetting').upsert({
        id: 'setting_active_duels',
        key: 'ACTIVE_DUEL_CHALLENGES',
        value: JSON.stringify(duels),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

      return NextResponse.json({
        success: true,
        message: 'Duel Challenge accepted! Room ID & Password generated.',
        duel,
      });
    }

    return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/arena]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process duel action.' }, { status: 500 });
  }
}
