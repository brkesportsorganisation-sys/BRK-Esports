import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';

function generateId(prefix: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix + '-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const ALLOWED_PATTERN = /^[A-Za-z0-9_ ]+$/;

function validateText(value: string, fieldName: string, required = true): string | null {
  if (!value || !value.trim()) {
    return required ? `${fieldName} is required.` : null;
  }
  if (!ALLOWED_PATTERN.test(value.trim())) {
    return `${fieldName}: Only letters, numbers, underscores, and spaces are allowed.`;
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
    userWalletBalance,
    userCoinBalance,
    paymentType = 'WALLET',
    squadName,
    iglName,
    player1Name,
    player2Name,
    player3Name,
    player4Name,
    backupPlayerName,
    captainWhatsApp,
  } = body;

  // Field validation
  const errors: Record<string, string> = {};

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

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ message: 'Validation failed.', errors }, { status: 422 });
  }

  try {
    const tournament = await getTournamentByIdFromDb(tournamentId);
    if (!tournament) {
      return NextResponse.json({ message: 'Tournament not found.' }, { status: 404 });
    }
    if (!tournament.registrationOpen) {
      return NextResponse.json({ message: 'Registration is closed for this tournament.' }, { status: 400 });
    }
    if (tournament.registeredCount >= tournament.maxTeams) {
      return NextResponse.json({ message: 'This tournament is full. No more slots available.' }, { status: 400 });
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
          walletBalance: typeof userWalletBalance === 'number' ? userWalletBalance : 0,
          coinBalance: typeof userCoinBalance === 'number' ? userCoinBalance : 0,
          referralCode: `REF_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        }])
        .select()
        .single();

      if (createErr) throw new Error(createErr.message);
      user = newUser;
    } else {
      let updatedWallet = Number(user.walletBalance) || 0;
      let updatedCoin = Number(user.coinBalance) || 0;
      let needsUpdate = false;

      if (typeof userWalletBalance === 'number' && updatedWallet < userWalletBalance) {
        updatedWallet = userWalletBalance;
        needsUpdate = true;
      }
      if (typeof userCoinBalance === 'number' && updatedCoin < userCoinBalance) {
        updatedCoin = userCoinBalance;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await supabaseAdmin
          .from('User')
          .update({ walletBalance: updatedWallet, coinBalance: updatedCoin, updatedAt: new Date().toISOString() })
          .eq('id', userId);
        user.walletBalance = updatedWallet;
        user.coinBalance = updatedCoin;
      }
    }

    // Balance check
    const isPayingWithCoins = paymentType === 'COINS';
    const currentBalance = isPayingWithCoins ? (Number(user.coinBalance) || 0) : (Number(user.walletBalance) || 0);
    const currencyName = isPayingWithCoins ? 'Coins' : 'Wallet balance';
    const currencyUnit = isPayingWithCoins ? 'Coins' : 'BDT';

    if (currentBalance < tournament.entryFee) {
      return NextResponse.json({
        message: `${currencyName} insufficient! You need ${tournament.entryFee} ${currencyUnit} to register, but you only have ${currentBalance} ${currencyUnit}.`,
        code: 'INSUFFICIENT_BALANCE',
        required: tournament.entryFee,
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
    const trxId = `WAL_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 1. Deduct balance with Dual-Wallet prioritization (Promo Wallet consumed first)
    let balanceUpdate: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (isPayingWithCoins) {
      balanceUpdate.coinBalance = currentBalance - tournament.entryFee;
    } else {
      const fee = Number(tournament.entryFee) || 0;
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

    // 2. Create Participant
    const participantId = `part_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await supabaseAdmin
      .from('Participant')
      .insert([{
        id: participantId,
        tournamentId,
        userId,
        status: 'VERIFIED',
        registrationId,
        squadName: squadName.trim(),
        iglName: iglName.trim(),
        captainWhatsApp: captainWhatsApp.trim(),
        player1Name: player1Name.trim(),
        player2Name: player2Name.trim(),
        player3Name: player3Name.trim(),
        player4Name: player4Name.trim(),
        backupPlayerName: backupPlayerName?.trim() || null,
        joinedAt: new Date().toISOString(),
      }]);

    // 3. Create Payment record
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await supabaseAdmin
      .from('Payment')
      .insert([{
        id: paymentId,
        userId,
        tournamentId,
        method: 'WALLET',
        amount: tournament.entryFee,
        trxId,
        status: 'VERIFIED',
        notes: `Squad registration (${isPayingWithCoins ? 'Paid via Coins' : 'Paid via Wallet'}): ${squadName.trim()} | ${registrationId}`,
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

    // 5. Send in-app Notification to player (safely)
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('Notification').insert([{
        id: notifId,
        userId,
        title: `Registered: ${tournament.title} 🎮`,
        message: `Your squad "${squadName.trim()}" has been registered successfully! Room ID and Password will be posted 10-15m before match start.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      }]);
    } catch {}

    return NextResponse.json({
      message: `Registration successful! ${tournament.entryFee} ${currencyUnit} has been deducted.`,
      registrationId,
      teamId,
      squadName: squadName.trim(),
      tournamentTitle: tournament.title,
      entryFee: tournament.entryFee,
      remainingBalance: balanceUpdate.walletBalance ?? balanceUpdate.coinBalance ?? 0,
      status: 'VERIFIED',
    }, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/tournaments/[id]/register]', error?.message || error);
    return NextResponse.json({ message: error?.message || 'Registration failed. Please try again.' }, { status: 500 });
  }
}
