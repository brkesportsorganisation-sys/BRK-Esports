import { NotificationType } from '@/lib/types';

const PREFERRED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro'
];

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
 * Helper to compute today's ISO date string with a given hour and minute in Asia/Dhaka time
 */
function getDateWithDhakaTime(hour: number, minute: number = 0): Date {
  const now = new Date();
  // Format current UTC time in Dhaka
  const dhakaFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  
  const parts = dhakaFormatter.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  
  const year = getPart('year');
  const month = getPart('month') - 1;
  const day = getPart('day');
  
  // Asia/Dhaka is UTC+6
  const targetUtc = new Date(Date.UTC(year, month, day, hour - 6, minute, 0, 0));
  return targetUtc;
}

/**
 * Intelligent Banglish & Bengali Rule-Based NLP Parser
 */
function parseBanglishScheduleLocally(userChat: string): AIChatScheduleResult {
  const text = userChat.toLowerCase().replace(/[,\-_]/g, ' ');
  const now = new Date();

  // 1. Time extraction helpers
  const timePeriodRegex = /(dupur|dopur|bikel|bikol|sondha|shondha|shondha|raat|rat|shokal|sokal|bhor|দুপুর|বিকাল|সন্ধ্যা|রাত|সকাল|ভোর)?\s*(\d{1,2})(?::(\d{2}))?\s*(ta|ti|টা|টি|am|pm|baje|বাজে)?/gi;
  
  let startHour: number | null = null;
  let startMin: number = 0;
  let endHour: number | null = null;
  let endMin: number = 0;

  // Check range keywords: "theke ... porjonto", "from ... to", "থেকে ... পর্যন্ত"
  const rangeMatch = userChat.match(/(.+?)(?:theke|from|থেকে|-|to)(.+?)(?:porjonto|porjontw|পর্যন্ত|till|until|$)/i);
  
  const convertTo24Hour = (hour: number, period?: string): number => {
    let h = hour;
    const p = (period || '').toLowerCase();
    if (p.includes('dupur') || p.includes('dopur') || p.includes('দুপুর')) {
      if (h < 12 && h >= 1) h += 12; // dupur 1 -> 13, dupur 12 -> 12
    } else if (p.includes('bikel') || p.includes('bikol') || p.includes('বিকাল')) {
      if (h < 12) h += 12; // bikel 4 -> 16
    } else if (p.includes('sondha') || p.includes('shondha') || p.includes('সন্ধ্যা')) {
      if (h < 12) h += 12; // sondha 6 -> 18
    } else if (p.includes('raat') || p.includes('rat') || p.includes('রাত')) {
      if (h < 12 && h >= 6) h += 12; // raat 8 -> 20, raat 1 -> 1 AM
    } else if (p.includes('shokal') || p.includes('sokal') || p.includes('সকাল') || p.includes('bhor') || p.includes('ভোর')) {
      if (h === 12) h = 0;
    } else if (p.includes('pm')) {
      if (h < 12) h += 12;
    } else if (p.includes('am')) {
      if (h === 12) h = 0;
    } else {
      // Default heuristic: if 1-6 and no morning keyword, usually afternoon/evening (13-18)
      if (h >= 1 && h <= 7) h += 12;
    }
    return h;
  };

  if (rangeMatch) {
    const startPart = rangeMatch[1];
    const endPart = rangeMatch[2];

    const startPMatches = [...startPart.matchAll(timePeriodRegex)].filter(m => m[2]);
    const endPMatches = [...endPart.matchAll(timePeriodRegex)].filter(m => m[2]);

    if (startPMatches.length > 0) {
      const lastStart = startPMatches[startPMatches.length - 1];
      const period = lastStart[1] || (startPart.includes('dupur') ? 'dupur' : startPart.includes('shokal') ? 'shokal' : startPart.includes('raat') ? 'raat' : '');
      const rawHour = parseInt(lastStart[2], 10);
      startMin = lastStart[3] ? parseInt(lastStart[3], 10) : 0;
      startHour = convertTo24Hour(rawHour, period);
    }

    if (endPMatches.length > 0) {
      const firstEnd = endPMatches[0];
      let period = firstEnd[1] || (endPart.includes('sondha') ? 'sondha' : endPart.includes('raat') ? 'raat' : endPart.includes('bikel') ? 'bikel' : endPart.includes('dupur') ? 'dupur' : '');
      if (!period) {
        if (startPart.includes('raat') || startPart.includes('rat') || startPart.includes('রাত')) period = 'raat';
        else if (startPart.includes('sondha') || startPart.includes('shondha') || startPart.includes('সন্ধ্যা')) period = 'sondha';
        else if (startPart.includes('bikel') || startPart.includes('bikol') || startPart.includes('বিকাল')) period = 'bikel';
        else if (startPart.includes('dupur') || startPart.includes('dopur') || startPart.includes('দুপুর')) period = 'dupur';
        else if (startPart.includes('shokal') || startPart.includes('sokal') || startPart.includes('সকাল')) period = 'shokal';
      }
      const rawHour = parseInt(firstEnd[2], 10);
      endMin = firstEnd[3] ? parseInt(firstEnd[3], 10) : 0;
      endHour = convertTo24Hour(rawHour, period);
    }
  }

  // 2. Interval detection
  let intervalMinutes = 60;
  const intervalMatch = userChat.match(/(\d+)\s*(minute|min|m|মিনিট|ghonta|hour|hr|h|ঘণ্টা|ঘন্টা)\s*(por\s*por|পর\s*পর|interval|every|পরপর)?/i);
  if (intervalMatch && intervalMatch[1]) {
    const val = parseInt(intervalMatch[1], 10);
    const unit = intervalMatch[2].toLowerCase();
    if (unit.includes('ghonta') || unit.includes('hour') || unit.includes('hr') || unit.includes('h') || unit.includes('ঘণ্টা') || unit.includes('ঘন্টা')) {
      intervalMinutes = val * 60;
    } else {
      intervalMinutes = Math.max(5, val);
    }
  }

  // 3. Category detection
  let category: NotificationType = 'MATCH';
  let categoryLabel = 'MATCH (টুর্নামেন্ট)';
  let draftTitle = '🔥 Free Fire Tournament Action!';
  let draftMessage = 'ডেইলি টুর্নামেন্টের স্লট ওপেন হয়েছে! এখনই আপনার স্কোয়াড রেজিস্টার করুন।';
  let actionLink = '/tournaments';

  if (text.includes('room') || text.includes('pass') || text.includes('রুম') || text.includes('পাসওয়ার্ড')) {
    category = 'ROOM_ID';
    categoryLabel = 'ROOM ID & PASS';
    draftTitle = '🔑 Custom Room ID & Password Released!';
    draftMessage = 'কাস্টম রুম আইডি ও পাসওয়ার্ড রিলিজ হয়েছে। দ্রুত ইন-গেম রুমে জয়েন করুন!';
  } else if (text.includes('wallet') || text.includes('payout') || text.includes('টাকা') || text.includes('bkash') || text.includes('nagad') || text.includes('উইথড্র')) {
    category = 'PAYOUT';
    categoryLabel = 'PAYOUT (ক্যাশআউট)';
    draftTitle = '💰 Instant bKash & Nagad Payouts Active!';
    draftMessage = 'টুর্নামেন্টের প্রাইজমানি সরাসরি আপনার ওয়ালেটে জমা হয়েছে। ইনস্ট্যান্ট ক্যাশআউট নিন!';
    actionLink = '/wallet';
  } else if (text.includes('spin') || text.includes('reward') || text.includes('bonus') || text.includes('coin') || text.includes('কয়েন') || text.includes('রিওয়ার্ড')) {
    category = 'REWARD';
    categoryLabel = 'REWARD (রিওয়ার্ড & স্পিন)';
    draftTitle = '🎁 Daily Lucky Spin & Coin Rewards!';
    draftMessage = 'আজকের ফ্রি লাকি স্পিন করুন এবং জিতে নিন ফ্রি ডায়মন্ড ও কয়েন বোনাস!';
    actionLink = '/ads';
  } else if (text.includes('cheat') || text.includes('hack') || text.includes('warning') || text.includes('ওয়ার্নিং') || text.includes('ব্যান')) {
    category = 'WARNING';
    categoryLabel = 'WARNING (ফেয়ার প্লে)';
    draftTitle = '🛡️ Fair Play & Strict Anti-Cheat Alert';
    draftMessage = 'যেকোনো প্রকার স্ক্রিপ্ট বা হ্যাক নিষিদ্ধ। ফেয়ার প্লে বজায় রাখুন এবং ব্যান এড়ান।';
    actionLink = '/anti-cheat';
  } else {
    if (startHour !== null && endHour !== null) {
      const formatH = (h: number) => h === 12 ? '১২:০০ PM' : h > 12 ? `${h - 12}:০০ PM` : `${h}:০০ AM`;
      draftTitle = '🔥 Daily Arena Championship: Register Squad!';
      draftMessage = `${formatH(startHour)} থেকে ${formatH(endHour)} পর্যন্ত টানা টুর্নামেন্ট লাইভ! এখনই স্লট বুক করুন।`;
    }
  }

  // 4. Count (maxRuns) calculation
  let maxRuns: number | null = null;
  const isUnlimitedOrAsMany = /joto\s*gula|jotogula|shob\s*gula|shobgula|all|maximum|যত\s*গুলো|সবগুলো|সব/i.test(userChat);
  const isNegatedOne = /massage\s*ekta\s*na|message\s*ekta\s*na|ekta\s*na|১টি\s*না|একটা\s*না/i.test(userChat);

  // Check explicit count (e.g. "5 ta message", "10 ti notification", ignoring time markers like "dupur 1 ta")
  const explicitCountRegex = /(?:total|mot|মোট)?\s*(\d{1,3})\s*(?:ta|ti|টি|টা|messages|msgs|notifs|times|বার)\s*(?:notification|message|sms|মেসেজ|নোটিফিকেশন)?/gi;
  const explicitMatches = [...userChat.matchAll(explicitCountRegex)];
  
  for (const m of explicitMatches) {
    const num = parseInt(m[1], 10);
    // Check if this number was part of time (e.g., startHour / raw hour in time context)
    const matchIndex = m.index || 0;
    const surrounding = userChat.slice(Math.max(0, matchIndex - 12), matchIndex + 15).toLowerCase();
    const isPartOfTime = /dupur|dopur|bikel|sondha|shondha|raat|shokal|theke|porjonto|baje|pm|am/i.test(surrounding);
    
    if (!isPartOfTime && !(num === 1 && isNegatedOne)) {
      maxRuns = num;
      break;
    }
  }

  // Calculate from time range if start and end are known
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  let durationMinutes = 0;

  if (startHour !== null && endHour !== null) {
    startDate = getDateWithDhakaTime(startHour, startMin);
    endDate = getDateWithDhakaTime(endHour, endMin);
    
    // If end hour is less than start hour (e.g. 20:00 to 02:00 next day)
    if (endDate <= startDate) {
      endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    }

    durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (60 * 1000));

    if (maxRuns === null || isUnlimitedOrAsMany) {
      // Calculate how many runs fit in this window
      maxRuns = Math.max(1, Math.floor(durationMinutes / intervalMinutes));
    }
  } else if (maxRuns === null) {
    maxRuns = 5;
  }

  // Build conversational reply message
  const formatTimeDhaka = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const dispH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const dispM = m > 0 ? `:${m < 10 ? '0' + m : m}` : ':00';
    return `${dispH}${dispM} ${period}`;
  };

  let timeRangeDesc = '';
  if (startHour !== null && endHour !== null) {
    timeRangeDesc = `\n- সময়সীমা: ${formatTimeDhaka(startHour, startMin)} থেকে ${formatTimeDhaka(endHour, endMin)} পর্যন্ত (${Math.round(durationMinutes / 60)} ঘণ্টা)`;
  }

  const replyMessage = `আমি আপনার নির্দেশ অনুযায়ী স্বয়ংক্রিয় নোটিফিকেশন টাইমার শিডিউল প্রস্তুত করেছি! 🤖${timeRangeDesc}
- মোট মেসেজ: ${maxRuns ? `${maxRuns} টি` : 'অনির্দিষ্ট (টাইম শেষ হওয়া পর্যন্ত)'}
- ফ্রিকোয়েন্সি: প্রতি ${intervalMinutes} মিনিট পর পর
- ক্যাটাগরি: ${categoryLabel}
- টার্গেট: All Players
নিচের প্রিভিউ চেক করে "Confirm & Launch Bot" বাটনে চাপুন।`;

  const campaignName = startHour !== null && endHour !== null
    ? `Campaign: ${formatTimeDhaka(startHour, startMin)} - ${formatTimeDhaka(endHour, endMin)} (${intervalMinutes}m Timer)`
    : `AI Campaign: ${userChat.slice(0, 28)}...`;

  return {
    replyMessage,
    scheduleProposal: {
      name: campaignName,
      prompt: `Automated ${category} notifications every ${intervalMinutes}m (${startHour !== null ? `From ${startHour}:00 to ${endHour}:00` : 'Daily'})`,
      naturalPrompt: userChat,
      category,
      targetAudience: 'ALL',
      intervalMinutes,
      startTime: startDate ? startDate.toISOString() : now.toISOString(),
      endTime: endDate ? endDate.toISOString() : undefined,
      maxRuns: maxRuns || undefined,
      actionLink,
      sampleDraftTitle: draftTitle,
      sampleDraftMessage: draftMessage,
    }
  };
}

/**
 * Parses conversational user instructions in Bengali, Banglish, or English to construct precise timer schedules.
 * Tries Google Gemini API first with multi-model fallback, then uses robust Banglish NLP parsing.
 */
export async function parseConversationalSchedule(
  userChat: string,
  currentTimeZone: string = 'Asia/Dhaka'
): Promise<AIChatScheduleResult> {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();
  const now = new Date();
  const currentIso = now.toISOString();

  if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
    const systemPrompt = `You are an elite AI Campaign Manager & Push Notification Scheduler for "Black Rock Esports" (Free Fire tournament platform in Bangladesh).
The admin speaks in Bengali, Banglish (Bengali in English letters, e.g. "dupur 1 ta theke sondha 6 ta porjonto joto gula massage pathano jay 10 min por por"), or English.

Current Server Time: ${currentIso} (Timezone: ${currentTimeZone}, Dhaka Time: ${now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka' })})

Rules for understanding Banglish & Bengali:
1. Time idioms:
   - "shokal X ta" = X:00 AM
   - "dupur 1 ta / 2 ta / 3 ta" = 1:00 PM (13:00) / 2:00 PM (14:00) / 3:00 PM (15:00)
   - "bikel 4 ta / 5 ta" = 4:00 PM (16:00) / 5:00 PM (17:00)
   - "sondha 6 ta / 7 ta" = 6:00 PM (18:00) / 7:00 PM (19:00)
   - "raat 8 ta / 9 ta / 10 ta / 11 ta" = 8:00 PM (20:00) to 11:00 PM (23:00)
   - "theke ... porjonto" = from startTime to endTime
2. Duration & Count:
   - If user asks: "joto gula massage pathano jay 10 min por por" (from 1 PM to 6 PM):
     Duration = 5 hours = 300 minutes.
     Interval = 10 minutes.
     MaxRuns = 30 messages.
   - "Massage ekta na" / "একটা না" means "NOT just 1 message", so DO NOT set maxRuns = 1! Calculate the proper total count based on the time window and interval.
3. Notification Draft:
   - Generate exciting, gamer-friendly Free Fire notification copy in Bengali or English for sampleDraftTitle & sampleDraftMessage. DO NOT just copy the user's raw prompt into the notification draft.
4. Output Format:
   - Return ONLY a valid JSON object without markdown fences, codeblocks, or extra text:
{
  "replyMessage": "আমি আপনার নির্দেশ অনুযায়ী নোটিফিকেশন টাইমার শিডিউল প্রস্তুত করেছি! 🤖\\n- সময়সীমা: দুপুর ১:০০ PM থেকে সন্ধ্যা ৬:০০ PM পর্যন্ত (৫ ঘণ্টা)\\n- মোট মেসেজ: ৩০ টি\\n- ফ্রিকোয়েন্সি: প্রতি ১০ মিনিট পর পর\\n- ক্যাটাগরি: MATCH\\n- টার্গেট: All Players\\nনিচের প্রিভিউ চেক করে \\"Confirm & Launch Bot\\" বাটনে চাপুন।",
  "scheduleProposal": {
    "name": "Afternoon & Evening Match Blast (10m Timer)",
    "prompt": "Daily Free Fire match registration reminders from 1 PM to 6 PM",
    "naturalPrompt": "${userChat.replace(/"/g, "'")}",
    "category": "MATCH",
    "targetAudience": "ALL",
    "intervalMinutes": 10,
    "startTime": "ISO timestamp for start time today",
    "endTime": "ISO timestamp for end time today",
    "maxRuns": 30,
    "actionLink": "/tournaments",
    "sampleDraftTitle": "🔥 দুপুর ও সন্ধ্যার টুর্নামেন্ট লাইভ!",
    "sampleDraftMessage": "দুপুর ১টা থেকে সন্ধ্যা ৬টা পর্যন্ত সকল স্কোয়াড ম্যাচের স্লট ওপেন! এখনই জয়েন করুন।"
  }
}`;

    for (const model of PREFERRED_MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\n[ADMIN INSTRUCTION]: "${userChat}"` }] }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 800,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleanJson = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
          
          // Try parsing JSON
          const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.replyMessage && parsed.scheduleProposal) {
              return {
                replyMessage: parsed.replyMessage,
                scheduleProposal: {
                  ...parsed.scheduleProposal,
                  intervalMinutes: Math.max(5, parsed.scheduleProposal.intervalMinutes || 60),
                },
              };
            }
          }
        }
      } catch (err) {
        console.warn(`[AI Chat Scheduler] ${model} attempt failed:`, err);
      }
    }
  }

  // Fallback to local Banglish NLP Engine
  return parseBanglishScheduleLocally(userChat);
}
