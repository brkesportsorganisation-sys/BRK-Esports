import { NotificationType, NotificationPriority } from '@/lib/types';
import { supabaseAdmin } from '@/lib/supabase';

export interface AINotificationPromptInput {
  prompt: string;
  category?: NotificationType;
  tournamentTitle?: string;
  prizePool?: number;
  entryFee?: number;
  openSlots?: number;
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AIGeneratedNotification {
  title: string;
  message: string;
  category: NotificationType;
  priority: NotificationPriority;
  suggestedActionLink: string;
  suggestedImageUrl?: string;
}

// Fallback smart templates when Gemini API is offline or not configured
const FALLBACK_TEMPLATES: Record<string, { titles: string[]; messages: string[]; action: string }> = {
  GENERAL: {
    titles: [
      '🔥 Arena Alert: New Free Fire Challenges Live!',
      '⚡ BRK Esports: Daily Action Awaits You!',
      '🎮 Step into the Battleground, Soldier!'
    ],
    messages: [
      'Top players are grinding right now. Join the action, hone your skills, and dominate the leaderboard today!',
      'New matches and tournaments are open for registration. Claim your squad slot before time runs out!',
      'Earn points, secure Booyahs, and climb the ranks on Black Rock Esports. Check out the latest events now!'
    ],
    action: '/tournaments'
  },
  MATCH: {
    titles: [
      '🏆 Booyah Time! High-Stakes Tournament Alert',
      '💥 Squad Battle Ready: Entry Open Now!',
      '🎯 Free Fire BR Ranked Tournament Starting Soon!'
    ],
    messages: [
      'A massive prize pool is waiting for champion squads. Register your team now and prove your squad supremacy!',
      'Slots are filling fast! Don\'t miss your chance to battle the best teams in Bangladesh and take home the cash prize.',
      'Match room details and scheduling are active. Join your squad room on time for a clean start!'
    ],
    action: '/tournaments'
  },
  PAYOUT: {
    titles: [
      '💰 Instant Wallet Cashout & Prize Boosts!',
      '💎 Fast bKash & Nagad Withdrawals Active',
      '💵 Claim Your Winning Rewards Today!'
    ],
    messages: [
      'Your tournament winnings are ready in your wallet. Withdraw instantly via bKash or Nagad anytime!',
      'Fast automated wallet payouts are processing smoothly. Play matches, rack up kills, and earn daily cash prizes.',
      'Convert your in-game kills into real cash. Check your updated wallet balance and withdrawal status now.'
    ],
    action: '/wallet'
  },
  REWARD: {
    titles: [
      '🎁 Lucky Spin & Coin Rewards Waiting!',
      '✨ Claim Your Daily Player Milestone Bonus',
      '💎 Free Fire Diamond Drop: Spin the Wheel!'
    ],
    messages: [
      'Your daily free spin and bonus coins are available! Spin the lucky wheel now to win diamonds and wallet credits.',
      'Refer your squad mates with your unique invite code and earn bonus credits on every tournament registration.',
      'Complete daily match milestones to unlock exclusive badges and bonus coin rewards in your profile!'
    ],
    action: '/ads'
  },
  ROOM_ID: {
    titles: [
      '🔑 Room ID & Password Released!',
      '🚨 Match Starting in 15 Minutes: Enter Custom Room',
      '⚡ Official Match Lobby Open - Check Details'
    ],
    messages: [
      'The custom room ID and password for your registered tournament have been released. Join the lobby immediately!',
      'Free Fire custom room is live! Make sure your squad is seated in your assigned slot numbers.',
      'Match countdown active. Check your tournament dashboard to view the room credentials and start on time!'
    ],
    action: '/tournaments'
  },
  WARNING: {
    titles: [
      '🛡️ Fair Play & Anti-Cheat Notice',
      '⚠️ Strict Rule Enforcement: Zero Hack Policy',
      '📋 Tournament Guidelines & Verification'
    ],
    messages: [
      'All players must use verified Free Fire UIDs. Any use of modded APKs, emulators, or script hacks results in permanent bans.',
      'Ensure your registered in-game name matches your Free Fire profile. Screen recordings may be requested by admins.',
      'Keep esports clean and competitive. Review our community guidelines and match rules before playing.'
    ],
    action: '/anti-cheat'
  }
};

/**
 * Generate high-converting, exciting notification copy using Gemini AI with fallback
 */
export async function generateAINotification(input: AINotificationPromptInput): Promise<AIGeneratedNotification> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (geminiKey) {
    try {
      const promptText = `
You are the official AI Esports Notification Bot for "Black Rock Esports" (a premium Free Fire tournament platform in Bangladesh).
Generate an energetic, high-converting, gamer-friendly mobile push notification.

Context:
- User Prompt: "${input.prompt}"
- Category: ${input.category || 'GENERAL'}
- Tournament Context: ${input.tournamentTitle ? `Tournament: "${input.tournamentTitle}", Prize: ৳${input.prizePool || 0} BDT, Fee: ৳${input.entryFee || 0} BDT, Slots Left: ${input.openSlots || 'Few'}` : 'General esports platform event'}
- Urgency: ${input.urgency || 'MEDIUM'}

Return ONLY a valid JSON object with this exact structure (no markdown fences, no extra text):
{
  "title": "Short catchy title with 1-2 gamer emojis (max 50 chars)",
  "message": "Clear, exciting, action-oriented message (max 140 chars)",
  "category": "${input.category || 'GENERAL'}",
  "priority": "${input.urgency === 'HIGH' ? 'HIGH' : 'NORMAL'}",
  "suggestedActionLink": "/tournaments"
}
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 300,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Clean JSON formatting
        const cleanJson = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        if (parsed.title && parsed.message) {
          return {
            title: parsed.title,
            message: parsed.message,
            category: (parsed.category as NotificationType) || input.category || 'GENERAL',
            priority: (parsed.priority as NotificationPriority) || 'NORMAL',
            suggestedActionLink: parsed.suggestedActionLink || '/tournaments',
          };
        }
      }
    } catch (aiErr) {
      console.warn('[AI Notification Generator] Gemini API error, falling back to smart templates:', aiErr);
    }
  }

  // Fallback Generation
  const cat = input.category || 'GENERAL';
  const tmpl = FALLBACK_TEMPLATES[cat] || FALLBACK_TEMPLATES.GENERAL;
  const randIdx = Math.floor(Math.random() * tmpl.titles.length);

  let title = tmpl.titles[randIdx];
  let message = tmpl.messages[randIdx];

  if (input.tournamentTitle) {
    title = `🏆 ${input.tournamentTitle}: Registration Open!`;
    message = `Prize Pool: ৳${input.prizePool || 0} BDT. Secure your squad slot now before registration closes!`;
  } else if (input.prompt) {
    title = `🔥 Black Rock Alert: ${input.prompt.slice(0, 30)}...`;
    message = `${input.prompt} Check platform for details!`;
  }

  return {
    title,
    message,
    category: cat,
    priority: input.urgency === 'HIGH' ? 'HIGH' : 'NORMAL',
    suggestedActionLink: tmpl.action,
  };
}

/**
 * Dispatch an AI-generated notification to target users in Supabase database
 */
export async function dispatchNotificationToDatabase(params: {
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  link?: string;
  imageUrl?: string;
  icon?: string;
  targetAudience: 'ALL' | 'ACTIVE_PLAYERS' | 'TOURNAMENT' | 'SPECIFIC';
  tournamentId?: string;
  specificUserIds?: string[];
}): Promise<{ success: boolean; dispatchedCount: number; message: string }> {
  try {
    let targetUserIds: string[] = [];

    if (params.targetAudience === 'SPECIFIC' && params.specificUserIds && params.specificUserIds.length > 0) {
      targetUserIds = [...new Set(params.specificUserIds.filter(Boolean))];
    } else if (params.targetAudience === 'TOURNAMENT' && params.tournamentId) {
      const { data: participants } = await supabaseAdmin
        .from('Participant')
        .select('userId')
        .eq('tournamentId', params.tournamentId);

      targetUserIds = [...new Set((participants || []).map(p => p.userId).filter(Boolean))];
    } else if (params.targetAudience === 'ACTIVE_PLAYERS') {
      const { data: users } = await supabaseAdmin
        .from('User')
        .select('id')
        .eq('isBanned', false)
        .order('updatedAt', { ascending: false })
        .limit(200);

      targetUserIds = (users || []).map(u => u.id);
    } else {
      // Broadcast to ALL users
      const { data: allUsers } = await supabaseAdmin
        .from('User')
        .select('id')
        .eq('isBanned', false);

      targetUserIds = (allUsers || []).map(u => u.id);
    }

    if (targetUserIds.length === 0) {
      return { success: false, dispatchedCount: 0, message: 'No eligible recipients found.' };
    }

    const rowsToInsert = targetUserIds.map(uid => ({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: uid,
      title: params.title.trim(),
      message: params.message.trim(),
      type: params.type || 'GENERAL',
      priority: params.priority || 'NORMAL',
      link: params.link?.trim() || null,
      imageUrl: params.imageUrl?.trim() || null,
      icon: params.icon?.trim() || null,
      isRead: false,
      createdAt: new Date().toISOString(),
    }));

    // Batch insert up to 100 rows per batch with dynamic schema tolerance
    const batchSize = 100;
    for (let i = 0; i < rowsToInsert.length; i += batchSize) {
      let batch = rowsToInsert.slice(i, i + batchSize);
      let success = false;
      let attempts = 8;

      while (!success && attempts > 0) {
        const { error: insertErr } = await supabaseAdmin
          .from('Notification')
          .insert(batch);

        if (!insertErr) {
          success = true;
          break;
        }

        const fullErrStr = `${insertErr.message || ''} ${insertErr.details || ''} ${insertErr.hint || ''}`;
        const match = fullErrStr.match(/Could not find the '([^']+)' column/i) ||
                      fullErrStr.match(/column '([^']+)' does not exist/i) ||
                      fullErrStr.match(/column "([^"]+)" does not exist/i);

        if (match && match[1]) {
          const missingCol = match[1];
          console.warn(`[dispatchNotificationToDatabase] Dynamic omission of column '${missingCol}' due to schema cache.`);
          batch = batch.map(record => {
            const copy = { ...record };
            delete (copy as any)[missingCol];
            return copy;
          });
          attempts--;
          continue;
        }

        // Ultimate fallback to core Notification columns if multiple columns mismatch
        if (attempts <= 2) {
          const coreBatch = batch.map(({ id, userId, title, message, isRead, createdAt }) => ({
            id,
            userId,
            title,
            message,
            isRead: Boolean(isRead),
            createdAt,
          }));
          const { error: fallbackErr } = await supabaseAdmin
            .from('Notification')
            .insert(coreBatch);
          if (!fallbackErr) {
            success = true;
            break;
          }
        }

        console.error('[dispatchNotificationToDatabase] Batch insert error:', insertErr);
        throw new Error(insertErr.message);
      }
    }

    return {
      success: true,
      dispatchedCount: targetUserIds.length,
      message: `Successfully delivered notification to ${targetUserIds.length} players.`,
    };
  } catch (err: any) {
    console.error('[dispatchNotificationToDatabase] Error:', err);
    return {
      success: false,
      dispatchedCount: 0,
      message: err?.message || 'Failed to dispatch notification.',
    };
  }
}
