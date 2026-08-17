import { NotificationType, NotificationSchedule } from '@/lib/types';

export interface AIChatScheduleResult {
  replyMessage: string;
  scheduleProposal?: {
    name: string;
    prompt: string;
    naturalPrompt: string;
    category: NotificationType;
    targetAudience: 'ALL' | 'ACTIVE_PLAYERS' | 'TOURNAMENT';
    intervalMinutes: number;
    startTime?: string;
    endTime?: string;
    maxRuns?: number;
    imageUrl?: string;
    actionLink: string;
    sampleDraftTitle: string;
    sampleDraftMessage: string;
  };
}

/**
 * Parses conversational user instructions in Bengali or English to construct precise timer schedules
 */
export async function parseConversationalSchedule(
  userChat: string,
  currentTimeZone: string = 'Asia/Dhaka'
): Promise<AIChatScheduleResult> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const now = new Date();
  const currentIso = now.toISOString();

  if (geminiKey) {
    try {
      const systemPrompt = `
You are an expert AI Campaign Manager & Scheduler for "Black Rock Esports" (Free Fire tournament platform).
The admin is speaking to you in Bengali, Banglish, or English to set up automated notification schedules.
Current Server Time (UTC): ${currentIso} (Timezone: ${currentTimeZone}, Local time roughly: ${now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka' })})

User Instruction: "${userChat}"

Your job:
1. Understand:
   - What the notifications are about (prompt theme)
   - When to START sending (startTime in ISO string)
   - When to STOP / END sending (endTime in ISO string)
   - How OFTEN / frequency in minutes (intervalMinutes)
   - How MANY total notifications to send (maxRuns count, e.g. 3, 5, 10, or null for unlimited until end time)
   - Target Audience ('ALL', 'ACTIVE_PLAYERS', 'TOURNAMENT')
   - Category ('MATCH', 'ROOM_ID', 'PAYOUT', 'REWARD', 'WARNING', 'GENERAL')
2. Generate an energetic, friendly conversational reply in Bengali (বাংলা) confirming all parameters clearly with emojis.
3. Generate a sample draft notification (title + message) to preview.

Return ONLY a valid JSON object matching this exact structure (no markdown fences, no extra text):
{
  "replyMessage": "আপনার কমান্ড অনুযায়ী শিডিউল তৈরি করা হয়েছে! 🎯\\n- শুরু: ...\\n- শেষ: ...\\n- ফ্রিকোয়েন্সি: প্রতি X মিনিট পর পর\\n- মোট মেসেজ: Y টি",
  "scheduleProposal": {
    "name": "Short Descriptive Name (e.g. Evening Tournament Reminder)",
    "prompt": "Refined AI prompt instructions for the notification generator",
    "naturalPrompt": "${userChat.replace(/"/g, "'")}",
    "category": "MATCH",
    "targetAudience": "ALL",
    "intervalMinutes": 45,
    "startTime": "${currentIso}",
    "endTime": null,
    "maxRuns": 5,
    "actionLink": "/tournaments",
    "sampleDraftTitle": "🔥 Booyah Awaits: Squad Match Reminder!",
    "sampleDraftMessage": "Evening tournament slots are closing fast. Secure your slot now!"
  }
}
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 600,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJson = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        if (parsed.replyMessage && parsed.scheduleProposal) {
          return {
            replyMessage: parsed.replyMessage,
            scheduleProposal: {
              ...parsed.scheduleProposal,
              intervalMinutes: Math.max(10, parsed.scheduleProposal.intervalMinutes || 60),
            },
          };
        }
      }
    } catch (aiErr) {
      console.warn('[AI Chat Scheduler] Gemini API notice, applying smart regex heuristic:', aiErr);
    }
  }

  // Smart Heuristic Fallback Parser
  let intervalMinutes = 60;
  let maxRuns = 5;
  let category: NotificationType = 'MATCH';

  // Detect count
  const countMatch = userChat.match(/(\d+)\s*(ta|ti|টি|টা|messages|msgs|notifs|times|বার)/i);
  if (countMatch && countMatch[1]) {
    maxRuns = parseInt(countMatch[1], 10);
  }

  // Detect interval
  const intervalMatch = userChat.match(/(\d+)\s*(minute|min|m|মিনিট|ghonta|hour|h|ঘণ্টা)/i);
  if (intervalMatch && intervalMatch[1]) {
    const val = parseInt(intervalMatch[1], 10);
    if (intervalMatch[2].toLowerCase().includes('ghonta') || intervalMatch[2].toLowerCase().includes('hour') || intervalMatch[2].toLowerCase().includes('h') || intervalMatch[2].includes('ঘণ্টা')) {
      intervalMinutes = val * 60;
    } else {
      intervalMinutes = Math.max(10, val);
    }
  }

  if (userChat.toLowerCase().includes('room') || userChat.toLowerCase().includes('pass') || userChat.toLowerCase().includes('রুম')) {
    category = 'ROOM_ID';
  } else if (userChat.toLowerCase().includes('wallet') || userChat.toLowerCase().includes('payout') || userChat.toLowerCase().includes('টাকা') || userChat.toLowerCase().includes('bkash')) {
    category = 'PAYOUT';
  } else if (userChat.toLowerCase().includes('spin') || userChat.toLowerCase().includes('reward') || userChat.toLowerCase().includes('bonus')) {
    category = 'REWARD';
  }

  return {
    replyMessage: `আমি আপনার নির্দেশ অনুযায়ী নোটিফিকেশন টাইমার শিডিউল প্রস্তুত করেছি! 🤖\n- মোট মেসেজ: ${maxRuns} টি\n- ফ্রিকোয়েন্সি: প্রতি ${intervalMinutes} মিনিট পর পর\n- ক্যাটাগরি: ${category}\n- টার্গেট: All Players\nনিচের প্রিভিউ চেক করে "Confirm & Launch Bot" বাটনে চাপুন।`,
    scheduleProposal: {
      name: `AI Campaign: ${userChat.slice(0, 30)}...`,
      prompt: userChat,
      naturalPrompt: userChat,
      category,
      targetAudience: 'ALL',
      intervalMinutes,
      startTime: now.toISOString(),
      maxRuns,
      actionLink: '/tournaments',
      sampleDraftTitle: '🔥 Black Rock Esports: Automated Alert',
      sampleDraftMessage: `${userChat.slice(0, 100)}... Visit platform now!`,
    },
  };
}
