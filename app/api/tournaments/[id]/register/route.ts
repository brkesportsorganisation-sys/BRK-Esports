import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { getSquads } from '@/lib/squads';
import { db } from '@/lib/db';
import { getDynamicTournamentStatus } from '@/lib/tournament-utils';

function generateId(prefix: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix + '-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function validateText(value: string, fieldName: string, required = true): string | null {
  if (!value || !value.trim()) {
    return required ? `${fieldName} is required.` : null;
  }
  return null;
}

function validateWhatsApp(value: string): string | null {
  if (!value || !value.trim()) return 'Captain WhatsApp Number is required.';
  const cleaned = value.trim().replace(/\s+/g, '');
  if (!/^[\d+\-()]+$/.test(cleaned) || cleaned.replace(/\D/g, '').length < 10) {
    return 'Enter a valid WhatsApp number (minimum 10 digits).';
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;

  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const {
    userId,
    userName,
    userEmail,
    paymentType = 'WALLET',
    squadName,
    iglName,
    player1Name,
    player2Name,
    player3Name,
    player4Name,
    backupPlayerName,
    captainWhatsApp,
    inGameUid,
  } = body;

  try {
    const tournament = await getTournamentByIdFromDb(tournamentId);
    if (!tournament) {
      return NextResponse.json({ message: 'Tournament not found.' }, { status: 404 });
    }

    const tMode = (tournament.mode || '').toUpperCase();
    const tTitle = (tournament.title || '').toLowerCase();
    const isSoloMatch = tMode === 'SOLO' || tTitle.includes('solo') || tTitle.includes('1v1');
    const isDuoMatch = tMode === 'DUO' || tTitle.includes('duo');

    // Field validation based on match mode
    const errors: Record<string, string> = {};

    if (isSoloMatch) {
      // SOLO: Only player IGN and WhatsApp are required
      const p1NameErr = validateText(player1Name || iglName || squadName, 'Player In-Game Name');
      if (p1NameErr) errors.player1Name = p1NameErr;

      const whatsappErr = validateWhatsApp(captainWhatsApp);
      if (whatsappErr) errors.captainWhatsApp = whatsappErr;
    } else if (isDuoMatch) {
      // DUO: Team name, WhatsApp, Player 1 & 2
      const squadNameErr = validateText(squadName, 'Team / Duo Name');
      if (squadNameErr) errors.squadName = squadNameErr;

      const p1NameErr = validateText(player1Name, 'Player 1 Name');
      if (p1NameErr) errors.player1Name = p1NameErr;

      const p2NameErr = validateText(player2Name, 'Player 2 Name');
      if (p2NameErr) errors.player2Name = p2NameErr;

      const whatsappErr = validateWhatsApp(captainWhatsApp);
      if (whatsappErr) errors.captainWhatsApp = whatsappErr;
    } else {
      // SQUAD (4 Players required)
      const squadNameErr = validateText(squadName, 'Squad Name');
      if (squadNameErr) errors.squadName = squadNameErr;

      const iglNameErr = validateText(iglName, 'IGL Name');
      if (iglNameErr) errors.iglName = iglNameErr;

      const p1NameErr = validateText(player1Name, 'Player 1 Name');
      if (p1NameErr) errors.player1Name = p1NameErr;

      const p2NameErr = validateText(player2Name, 'Player 2 Name');
      if (p2NameErr) errors.player2Name = p2NameErr;

      const p3NameErr = validateText(player3Name, 'Player 3 Name');
      if (p3NameErr) errors.player3Name = p3NameErr;

      const p4NameErr = validateText(player4Name, 'Player 4 Name');
      if (p4NameErr) errors.player4Name = p4NameErr;

      const whatsappErr = validateWhatsApp(captainWhatsApp);
      if (whatsappErr) errors.captainWhatsApp = whatsappErr;

      if (backupPlayerName && backupPlayerName.trim()) {
        const backupNameErr = validateText(backupPlayerName, 'Backup Player Name', false);
        if (backupNameErr) errors.backupPlayerName = backupNameErr;
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ message: 'Validation failed.', errors }, { status: 422 });
    }

    const dynStatus = getDynamicTournamentStatus(tournament);
    if (dynStatus === 'PENDING') {
      return NextResponse.json({ message: 'Registration is pending for this tournament.' }, { status: 400 });
    }
    if (dynStatus === 'UPCOMING') {
      return NextResponse.json({ message: 'Registration has not started yet (Upcoming match).' }, { status: 400 });
    }
    if (dynStatus === 'LIVE' || dynStatus === 'FINISHED' || dynStatus === 'CANCELLED') {
      return NextResponse.json({ message: 'Registration is closed for this tournament.' }, { status: 400 });
    }
    if (!tournament.registrationOpen) {
      return NextResponse.json({ message: 'Registration is closed for this tournament.' }, { status: 400 });
    }
    if (tournament.registeredCount >= tournament.maxTeams) {
      return NextResponse.json({ message: 'This tournament is full. No more slots available.' }, { status: 400 });
    }

    // Giveaway & Full Squad Verification: ONLY apply to SQUAD tournaments, NEVER to SOLO!
    const isFreeMatch = Number(tournament.entryFee || 0) === 0 && (!tournament.coinEntryFee || Number(tournament.coinEntryFee) === 0);
    const isGiveawayTournament = !isSoloMatch && Boolean(
      tournament.isGiveaway || 
      tournament.requiresFullSquad || 
      (isFreeMatch && tTitle.includes('giveaway')) ||
      tTitle.includes('giveaway')
    );

    if (isGiveawayTournament) {
      // 1. Check if user has already registered a team in this giveaway tournament
      const { data: existingUserReg } = await supabaseAdmin
        .from('Participant')
        .select('id, squadName')
        .eq('tournamentId', tournamentId)
        .eq('userId', userId)
        .maybeSingle();

      if (existingUserReg) {
        return NextResponse.json({
          message: 'Giveaway tournaments allow only 1 team registration per user. You have already registered for this tournament.',
          code: 'ALREADY_REGISTERED_GIVEAWAY',
          errors: { squadName: 'Giveaway টুর্নামেন্টে ইতিমধ্যে আপনার ১টি টিম রেজিস্টার করা আছে। একাধিক টিম রেজিস্টার করা যাবে না।' }
        }, { status: 400 });
      }

      // 2. Full official squad verification
      const allSquads = await getSquads();
      const userSquad = allSquads.find((s: any) => 
        (s.name?.trim().toLowerCase() === squadName.trim().toLowerCase() || s.id === body.squadId) &&
        (s.leaderId === userId || (s.members || []).some((m: any) => m.userId === userId && m.status === 'ACTIVE'))
      );

      if (!userSquad) {
        return NextResponse.json({
          message: 'This Giveaway tournament strictly requires an official registered squad. Please create an official squad from the Teams menu first.',
          code: 'SQUAD_NOT_FOUND',
          errors: { squadName: 'No official registered squad found with this name. Create a squad from Teams first.' }
        }, { status: 422 });
      }

      const activeMembers = (userSquad.members || []).filter((m: any) => m.status === 'ACTIVE');
      if (activeMembers.length < 4) {
        return NextResponse.json({
          message: `Your squad "${userSquad.name}" only has ${activeMembers.length}/4 active players. Giveaway tournaments strictly require a full squad of at least 4 active members.`,
          code: 'INCOMPLETE_SQUAD',
          errors: { squadName: `Squad requires minimum 4 active members (currently has ${activeMembers.length}). Invite more players from Teams menu.` }
        }, { status: 422 });
      }
    }

    // Fetch user or auto-create in Supabase
    let { data: user } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) {
      const { data: newUser, error: createErr } = await supabaseAdmin
        .from('User')
        .insert([{
          id: userId,
          name: userName || 'Player',
          email: userEmail || `${userId}@helian.gg`,
          walletBalance: 0,
          coinBalance: 0,
          referralCode: `REF_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        }])
        .select()
        .single();

      if (createErr) throw new Error(createErr.message);
      user = newUser;
    }

    // Determine payment mode & fee requirements
    const isPayingWithCoins = paymentType === 'COINS';
    const allowCoins = tournament.allowCoinEntry !== false && tournament.entryFeeType !== 'CASH';

    if (isPayingWithCoins && !allowCoins) {
      return NextResponse.json({
        message: 'This tournament does not accept EZBD Coins. Please register using your Main Wallet balance (BDT).',
        code: 'COIN_PAYMENT_NOT_ALLOWED',
      }, { status: 400 });
    }

    if (!isPayingWithCoins && tournament.entryFeeType === 'COINS') {
      return NextResponse.json({
        message: 'This is a Coin-Only tournament. Please register using EZBD Coins.',
        code: 'COIN_PAYMENT_REQUIRED',
      }, { status: 400 });
    }

    const requiredFee = isPayingWithCoins 
      ? (tournament.coinEntryFee !== undefined && tournament.coinEntryFee !== null && tournament.coinEntryFee > 0 
          ? Number(tournament.coinEntryFee) 
          : (Number(tournament.entryFee) * 10 || Number(tournament.entryFee) || 50))
      : Number(tournament.entryFee || 0);

    const currentBalance = isPayingWithCoins ? (Number(user.coinBalance) || 0) : (Number(user.walletBalance) || 0);
    const currencyName = isPayingWithCoins ? 'Coins' : 'Wallet balance';
    const currencyUnit = isPayingWithCoins ? 'Coins 🪙' : 'BDT ৳';

    if (currentBalance < requiredFee) {
      return NextResponse.json({
        message: `${currencyName} insufficient! You need ${requiredFee.toLocaleString()} ${currencyUnit} to register, but you only have ${currentBalance.toLocaleString()} ${currencyUnit}.`,
        code: 'INSUFFICIENT_BALANCE',
        required: requiredFee,
        available: currentBalance,
      }, { status: 400 });
    }

    // Check duplicate squad name in tournament
    const { data: existingSquad } = await supabaseAdmin
      .from('Participant')
      .select('id')
      .eq('tournamentId', tournamentId)
      .eq('squadName', squadName.trim())
      .maybeSingle();

    if (existingSquad) {
      return NextResponse.json({ message: 'Validation failed.', errors: { squadName: 'This squad name is already registered in this tournament. Choose a different name.' } }, { status: 422 });
    }

    // Generate IDs
    const registrationId = generateId('REG');
    const teamId = generateId('TEAM');
    const trxId = `${isPayingWithCoins ? 'COIN' : 'WAL'}_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 1. Deduct balance with Dual-Wallet prioritization (Promo Wallet consumed first if cash)
    let balanceUpdate: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (isPayingWithCoins) {
      balanceUpdate.coinBalance = Math.max(0, currentBalance - requiredFee);
    } else {
      const fee = requiredFee;
      const currentPromo = Number(user.promoBalance) || 0;
      const currentWinning = Number(user.winningBalance) || 0;

      let newPromo = currentPromo;
      let newWinning = currentWinning;

      if (currentPromo >= fee) {
        newPromo = currentPromo - fee;
      } else {
        const remainder = fee - currentPromo;
        newPromo = 0;
        newWinning = Math.max(0, currentWinning - remainder);
      }

      balanceUpdate.promoBalance = newPromo;
      balanceUpdate.winningBalance = newWinning;
      balanceUpdate.walletBalance = Math.max(0, (Number(user.walletBalance) || 0) - fee);
    }

    await supabaseAdmin
      .from('User')
      .update(balanceUpdate)
      .eq('id', userId);

    // Extract & prepare names according to match mode
    const finalSquadName = isSoloMatch
      ? (squadName?.trim() || player1Name?.trim() || userName?.trim() || 'Solo Player')
      : squadName.trim();
    const finalIglName = isSoloMatch
      ? (player1Name?.trim() || userName?.trim() || 'Solo Player')
      : iglName.trim();
    const finalPlayer1Name = (player1Name || finalIglName).trim();
    const finalPlayer2Name = isSoloMatch ? '' : (player2Name?.trim() || '');
    const finalPlayer3Name = (isSoloMatch || isDuoMatch) ? '' : (player3Name?.trim() || '');
    const finalPlayer4Name = (isSoloMatch || isDuoMatch) ? '' : (player4Name?.trim() || '');

    // 2. Assign to room (Auto Group 1, Group 2, Group 3 batching based on format & room capacity)
    let roomAssignment = {
      roomId: `room_${tournamentId}_1`,
      roomLabel: '1',
      slotNumberInRoom: 1,
      isNewRoomCreated: false,
    };

    try {
      const { assignParticipantToRoom } = await import('@/lib/tournament-rooms');
      roomAssignment = await assignParticipantToRoom(tournament, {
        id: registrationId,
        userId,
        squadName: finalSquadName,
        iglName: finalIglName,
        captainWhatsApp: captainWhatsApp ? captainWhatsApp.trim() : null,
      });
    } catch (roomErr: any) {
      console.warn('[POST /api/tournaments/[id]/register] Room assignment notice:', roomErr?.message);
    }

    // 3. Create Participant
    const participantRecord: Record<string, any> = {
      id: registrationId,
      registrationId,
      tournamentId,
      userId,
      teamId: null, // Avoid FK violation on dynamic squad names
      status: 'VERIFIED',
      squadName: finalSquadName,
      iglName: finalIglName,
      captainWhatsApp: captainWhatsApp ? captainWhatsApp.trim() : null,
      player1Name: finalPlayer1Name,
      player2Name: finalPlayer2Name,
      player3Name: finalPlayer3Name,
      player4Name: finalPlayer4Name,
      backupPlayerName: backupPlayerName?.trim() || null,
      roomId: roomAssignment.roomId,
      roomLabel: roomAssignment.roomLabel,
      slotNumberInRoom: roomAssignment.slotNumberInRoom,
      joinedAt: new Date().toISOString(),
    };

    const { error: partErr } = await supabaseAdmin
      .from('Participant')
      .insert([participantRecord]);

    if (partErr) {
      // If table doesn't have room columns yet, retry without them
      if (partErr.message?.includes('roomId') || partErr.message?.includes('roomLabel') || partErr.message?.includes('slotNumberInRoom')) {
        const cleanRecord = { ...participantRecord };
        delete cleanRecord.roomId;
        delete cleanRecord.roomLabel;
        delete cleanRecord.slotNumberInRoom;
        await supabaseAdmin.from('Participant').insert([cleanRecord]);
      } else {
        console.error('[POST /api/tournaments/[id]/register] Supabase Participant insert error:', partErr);
      }
    }

    // If inGameUid was provided by player, update their Free Fire UID
    if (inGameUid && userId) {
      try {
        await supabaseAdmin
          .from('User')
          .update({
            freeFireUid: String(inGameUid).trim(),
            ...(finalPlayer1Name ? { inGameName: finalPlayer1Name } : {})
          })
          .eq('id', userId);
      } catch (uidErr) {
        console.warn('Could not update user Free Fire UID:', uidErr);
      }
    }

    // 4. Create Payment record
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await supabaseAdmin
      .from('Payment')
      .insert([{
        id: paymentId,
        userId,
        tournamentId,
        userName: userName || 'Player',
        userEmail: userEmail || `${userId}@helian.gg`,
        tournamentTitle: tournament.title,
        method: isPayingWithCoins ? 'COINS' : 'WALLET',
        amount: requiredFee,
        trxId: `TRX-${registrationId}`,
        status: 'VERIFIED',
        walletType: isPayingWithCoins ? 'COINS' : 'PROMO',
        notes: `${isSoloMatch ? 'Solo' : 'Squad'} registration (${isPayingWithCoins ? `${requiredFee} Coins 🪙` : `৳ ${requiredFee} Wallet`}): ${finalSquadName} | ${registrationId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }]);

    // 4. Increment registeredCount
    await supabaseAdmin
      .from('Tournament')
      .update({ 
        registeredCount: (tournament.registeredCount || 0) + 1,
        updatedAt: new Date().toISOString()
      })
      .eq('id', tournamentId);

    // Sync to local fallback DB
    db.createRegistration({
      id: registrationId,
      tournamentId,
      userId,
      status: 'VERIFIED',
      registrationId,
      squadName: finalSquadName,
      iglName: finalIglName,
      captainWhatsApp: captainWhatsApp ? captainWhatsApp.trim() : '',
      player1Name: finalPlayer1Name,
      player2Name: finalPlayer2Name,
      player3Name: finalPlayer3Name,
      player4Name: finalPlayer4Name,
      backupPlayerName: backupPlayerName?.trim() || null,
      joinedAt: new Date().toISOString(),
    });

    // 5. Send in-app Notification to player (safely)
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('Notification').insert([{
        id: notifId,
        userId,
        title: `Registered: ${tournament.title} 🎮`,
        message: isSoloMatch
          ? `You have joined the solo match successfully! Room ID and Password will be posted 10-15m before match start.`
          : `Your squad "${finalSquadName}" has been registered successfully! Room ID and Password will be posted 10-15m before match start.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      }]);
    } catch {}

    return NextResponse.json({
      message: `Registration successful! ${requiredFee} ${currencyUnit} has been deducted.`,
      registrationId,
      teamId,
      squadName: finalSquadName,
      tournamentTitle: tournament.title,
      entryFee: isPayingWithCoins ? requiredFee : tournament.entryFee,
      currencyUnit,
      remainingBalance: isPayingWithCoins ? (balanceUpdate.coinBalance ?? 0) : (balanceUpdate.walletBalance ?? 0),
      status: 'VERIFIED',
    }, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/tournaments/[id]/register]', error?.message || error);
    return NextResponse.json({ message: error?.message || 'Registration failed. Please try again.' }, { status: 500 });
  }
}
