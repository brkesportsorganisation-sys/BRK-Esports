import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { DuelChallenge, DuelChatMessage } from '@/lib/types';

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

    // 1. CREATE FREE CUSTOM CHALLENGE
    if (action === 'CREATE') {
      const {
        creatorId,
        creatorName,
        creatorIgn,
        creatorUid,
        creatorAvatar,
        creatorWhatsApp,
        mode = '1v1_CS',
        customRules,
        roomCardProvider = 'CREATOR',
      } = body;

      if (!creatorId || !creatorName) {
        return NextResponse.json({ message: 'Creator ID and Name are required.' }, { status: 400 });
      }

      const duelId = `duel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const initialMessage: DuelChatMessage = {
        id: `msg_${Date.now()}_0`,
        senderId: 'SYSTEM',
        senderName: 'ESPORTS ZONE BD Arena',
        message: `🎮 Free Custom Challenge posted by ${creatorName} (${creatorIgn || 'IGN'}). Looking for an opponent!`,
        isSystem: true,
        type: 'TEXT',
        createdAt: new Date().toISOString(),
      };

      const newDuel: DuelChallenge = {
        id: duelId,
        creatorId,
        creatorName: creatorName || 'Player',
        creatorIgn: creatorIgn || 'Unknown IGN',
        creatorUid: creatorUid || '',
        creatorAvatar: creatorAvatar || undefined,
        creatorWhatsApp: creatorWhatsApp || undefined,
        mode: mode || '1v1_CS',
        customRules: customRules || 'Unlimited Ammo / Character Skill Off (Standard 1v1 Clash Squad Rules)',
        roomCardProvider: roomCardProvider || 'CREATOR',
        stakeType: 'FREE',
        entryFee: 0,
        prizePool: 0,
        status: 'OPEN',
        messages: [initialMessage],
        createdAt: new Date().toISOString(),
      };

      const updatedDuels = [newDuel, ...duels.filter(d => d.status !== 'CANCELLED').slice(0, 50)];

      await supabaseAdmin.from('SiteSetting').upsert({
        id: 'setting_active_duels',
        key: 'ACTIVE_DUEL_CHALLENGES',
        value: JSON.stringify(updatedDuels),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

      return NextResponse.json({
        success: true,
        message: 'Free Custom Challenge posted! Opponents can now view and accept your match.',
        duel: newDuel,
      }, { status: 201 });
    }

    // 2. ACCEPT FREE CHALLENGE
    if (action === 'ACCEPT') {
      const {
        duelId,
        challengerId,
        challengerName,
        challengerIgn,
        challengerUid,
        challengerAvatar,
        challengerWhatsApp,
      } = body;

      const duelIndex = duels.findIndex(d => d.id === duelId && d.status === 'OPEN');
      if (duelIndex === -1) {
        return NextResponse.json({ message: 'This custom match challenge is no longer available or already accepted.' }, { status: 404 });
      }

      const duel = duels[duelIndex];

      if (duel.creatorId === challengerId) {
        return NextResponse.json({ message: 'You cannot accept your own challenge.' }, { status: 400 });
      }

      duel.challengerId = challengerId;
      duel.challengerName = challengerName || 'Opponent';
      duel.challengerIgn = challengerIgn || challengerName || 'Opponent IGN';
      duel.challengerUid = challengerUid || '';
      duel.challengerAvatar = challengerAvatar || undefined;
      duel.challengerWhatsApp = challengerWhatsApp || undefined;
      duel.status = 'IN_PROGRESS';

      // Add accept notification in room chat
      const acceptMsg: DuelChatMessage = {
        id: `msg_${Date.now()}_accept`,
        senderId: 'SYSTEM',
        senderName: 'ESPORTS ZONE BD Arena',
        message: `⚔️ ${challengerName} has accepted the challenge! You both can now chat below, coordinate, and share the Free Fire Custom Room ID & Password.`,
        isSystem: true,
        type: 'TEXT',
        createdAt: new Date().toISOString(),
      };

      duel.messages = [...(duel.messages || []), acceptMsg];
      duels[duelIndex] = duel;

      await supabaseAdmin.from('SiteSetting').upsert({
        id: 'setting_active_duels',
        key: 'ACTIVE_DUEL_CHALLENGES',
        value: JSON.stringify(duels),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

      // Send in-app push/system notification to challenge creator
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await supabaseAdmin.from('Notification').insert([{
          id: notifId,
          userId: duel.creatorId,
          title: `⚔️ Custom Challenge Accepted: ${challengerName}!`,
          message: `${challengerName} accepted your custom match challenge (${duel.mode.replace(/_/g, ' ')}). Open the match chat to share Room ID & Password!`,
          link: `/arena?duelId=${duel.id}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        }]);
      } catch {}

      return NextResponse.json({
        success: true,
        message: 'Challenge accepted! Room chat is now live.',
        duel,
      });
    }

    // 3. SEND IN-ROOM CHAT MESSAGE / SHARE ROOM ID
    if (action === 'SEND_MESSAGE') {
      const { duelId, senderId, senderName, senderIgn, message, type = 'TEXT', data } = body;

      if (!duelId || !senderId || !message) {
        return NextResponse.json({ message: 'Duel ID, Sender ID, and Message are required.' }, { status: 400 });
      }

      const duelIndex = duels.findIndex(d => d.id === duelId);
      if (duelIndex === -1) {
        return NextResponse.json({ message: 'Custom match not found.' }, { status: 404 });
      }

      const duel = duels[duelIndex];

      const newMsg: DuelChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId,
        senderName: senderName || 'Player',
        senderIgn: senderIgn || undefined,
        message: message.trim(),
        type,
        data: data || undefined,
        createdAt: new Date().toISOString(),
      };

      // If room credentials sent, update room on duel object
      if (type === 'ROOM_CREDENTIALS' && data?.roomId) {
        duel.roomId = data.roomId;
        if (data.roomPass) duel.roomPass = data.roomPass;
      }

      duel.messages = [...(duel.messages || []).slice(-49), newMsg];
      duels[duelIndex] = duel;

      await supabaseAdmin.from('SiteSetting').upsert({
        id: 'setting_active_duels',
        key: 'ACTIVE_DUEL_CHALLENGES',
        value: JSON.stringify(duels),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

      return NextResponse.json({
        success: true,
        message: 'Message sent.',
        messages: duel.messages,
        duel,
      });
    }

    // 4. UPDATE ROOM CREDENTIALS DIRECTLY
    if (action === 'SET_ROOM') {
      const { duelId, roomId, roomPass, senderName } = body;

      const duelIndex = duels.findIndex(d => d.id === duelId);
      if (duelIndex === -1) {
        return NextResponse.json({ message: 'Custom match not found.' }, { status: 404 });
      }

      const duel = duels[duelIndex];
      duel.roomId = roomId ? String(roomId).trim() : duel.roomId;
      duel.roomPass = roomPass ? String(roomPass).trim() : duel.roomPass;

      const roomMsg: DuelChatMessage = {
        id: `msg_${Date.now()}_room`,
        senderId: 'SYSTEM',
        senderName: 'Room Manager',
        message: `🔑 Free Fire Custom Room Configured! Room ID: ${duel.roomId || 'N/A'} • Password: ${duel.roomPass || 'None'}`,
        isSystem: true,
        type: 'ROOM_CREDENTIALS',
        data: { roomId: duel.roomId, roomPass: duel.roomPass },
        createdAt: new Date().toISOString(),
      };

      duel.messages = [...(duel.messages || []), roomMsg];
      duels[duelIndex] = duel;

      await supabaseAdmin.from('SiteSetting').upsert({
        id: 'setting_active_duels',
        key: 'ACTIVE_DUEL_CHALLENGES',
        value: JSON.stringify(duels),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

      return NextResponse.json({
        success: true,
        message: 'Custom Room credentials shared with opponent!',
        duel,
      });
    }

    // 5. CANCEL / DELETE CHALLENGE
    if (action === 'CANCEL') {
      const { duelId, userId } = body;

      const duelIndex = duels.findIndex(d => d.id === duelId);
      if (duelIndex === -1) {
        return NextResponse.json({ message: 'Custom match not found.' }, { status: 404 });
      }

      const duel = duels[duelIndex];
      if (duel.creatorId !== userId && duel.challengerId !== userId) {
        return NextResponse.json({ message: 'Unauthorized to cancel this match.' }, { status: 403 });
      }

      duel.status = 'CANCELLED';
      duels[duelIndex] = duel;

      await supabaseAdmin.from('SiteSetting').upsert({
        id: 'setting_active_duels',
        key: 'ACTIVE_DUEL_CHALLENGES',
        value: JSON.stringify(duels.filter(d => d.id !== duelId)),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

      return NextResponse.json({ success: true, message: 'Challenge cancelled.' });
    }

    // 6. FINISH / COMPLETE MATCH
    if (action === 'FINISH') {
      const { duelId } = body;

      const duelIndex = duels.findIndex(d => d.id === duelId);
      if (duelIndex === -1) {
        return NextResponse.json({ message: 'Custom match not found.' }, { status: 404 });
      }

      const duel = duels[duelIndex];
      duel.status = 'COMPLETED';

      const finishMsg: DuelChatMessage = {
        id: `msg_${Date.now()}_fin`,
        senderId: 'SYSTEM',
        senderName: 'ESPORTS ZONE BD Arena',
        message: '🏁 Match marked as completed! GG to both players!',
        isSystem: true,
        type: 'TEXT',
        createdAt: new Date().toISOString(),
      };

      duel.messages = [...(duel.messages || []), finishMsg];
      duels[duelIndex] = duel;

      await supabaseAdmin.from('SiteSetting').upsert({
        id: 'setting_active_duels',
        key: 'ACTIVE_DUEL_CHALLENGES',
        value: JSON.stringify(duels),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

      return NextResponse.json({ success: true, message: 'Match marked as completed!', duel });
    }

    return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/arena]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process custom match action.' }, { status: 500 });
  }
}
