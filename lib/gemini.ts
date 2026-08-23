import { supabaseAdmin } from './supabase';

const PREFERRED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro'
];

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

export interface AIResponseWithActions {
  reply: string;
  suggestedAction?: {
    label: string;
    link: string;
    icon?: string;
  };
  suggestedCategory?: string;
}

const ADVANCED_EZBD_SYSTEM_INSTRUCTION = `You are the Official Website Customer Support & AI Help Desk Assistant for ESPORTS ZONE BD (EZBD) — Bangladesh's premier automated competitive tournament platform.

ROLE & PERSONA:
- You are a polite, helpful, and professional official customer support assistant for the ESPORTS ZONE BD website.
- You are NOT a gaming coach or gameplay instructor. Do not offer gameplay coaching, headshot tricks, or sensitivity setups.
- Your primary responsibility is helping users with website features: Tournament booking, Slot reservation, Custom Room ID & Password access, Wallet deposit & withdrawal (bKash/Nagad/Rocket), Diamond Shop orders, LFG squad recruitment, and Account questions.
- If a user sends a greeting (e.g. "Hi", "Hello", "কেমন আছেন", "আসসালামু আলাইকুম", "Hello bai") or engages in formal/polite conversation, respond warmly, respectfully, and professionally in standard polite Bengali (or English if the user asks in English).

COMMUNICATION GUIDELINES:
1. Language & Tone: Always respond in polite, clear, natural standard Bengali (প্রমিত ও মার্জিত বাংলা) or English when prompted.
2. Direct & Helpful: Answer the user's specific questions directly and concisely with clear bullet points.
3. Clean Format: Use clear Bengali punctuation (দাঁড়ি '।', কমা ',') and clean text suitable for Text-to-Speech (TTS).`;

/**
 * Intelligent Multi-Topic NLP Fallback Engine for ESPORTS ZONE BD Platform Queries
 */
export function getSmartFallback(prompt: string, liveContext?: string): string {
  const p = prompt.toLowerCase().trim();

  // 0. Greetings / Formal Small Talk
  if (
    p === 'hi' || p === 'hello' || p === 'hello bai' || p === 'salam' || 
    p === 'assalamu alaikum' || p.includes('কেমন আছেন') || p.includes('kemon achen') || 
    p.includes('hlw') || p.includes('help') || p.includes('সাহায্য')
  ) {
    return `👋 **আসসালামু আলাইকুম! ESPORTS ZONE BD অফিসিয়াল সাপোর্ট ডেস্কে স্বাগতম।**

আমি আপনাকে ওয়েবসাইট সংক্রান্ত যেকোনো বিষয়ে সাহায্য করতে পারি, যেমন:
- 🏆 টুর্নামেন্ট বুকিং ও স্লট কনফার্মেশন
- 🔑 কাস্টম রুম আইডি ও পাসওয়ার্ড সংগ্রহ
- 💳 বিকাশ/নগদ ডিপোজিট ও ইনস্ট্যান্ট উইথড্রয়াল
- 💎 ডায়মন্ড শপ ও কয়েন রিওয়ার্ড
- 👥 স্কোয়াড মেম্বার খোঁজা (LFG)

আপনার কোনো প্রশ্ন বা সমস্যা থাকলে অনুগ্রহ করে জানান, আমি আপনাকে সহায়তা করতে প্রস্তুত! 😊`;
  }

  // 1. Slot Booking & Tournament Registration
  if (
    p.includes('slot') || 
    p.includes('book') || 
    p.includes('register') || 
    p.includes('join') || 
    p.includes('kivabe khelbo') || 
    p.includes('khelte chai') || 
    p.includes('entry') || 
    p.includes('ভর্তি') || 
    p.includes('জয়েন') || 
    p.includes('খেলব') ||
    p.includes('টুর্নামেন্ট')
  ) {
    return `🏆 **স্লট বুকিং ও টুর্নামেন্টে জয়েন করার নিয়ম:**

১. **[Tournaments](/tournaments)** পেজে যান।
২. আপনার পছন্দের ম্যাচটি বেছে নিন (যেমন: **BR Squad**, **Duo**, **Solo** বা **CS Ranked**)।
3. **"Book Slot" / "Register"** বাটনে ক্লিক করুন।
৪. আপনার সঠিক **Free Fire In-Game UID** এবং **Name** দিন।
৫. ওয়ালেট ব্যালেন্স দিয়ে এন্ট্রি ফি পরিশোধ করে স্লট কনফার্ম করুন!

💡 **টিপস:** ম্যাচ শুরুর ১০-১৫ মিনিট আগে টুর্নামেন্ট পেজে **Custom Room ID & Password** দেখতে পাবেন।`;
  }

  // 2. Room ID & Password / Match Access
  if (
    p.includes('room') || 
    p.includes('pass') || 
    p.includes('password') || 
    p.includes('আইডি') || 
    p.includes('পাসওয়ার্ড') || 
    p.includes('কোড') || 
    p.includes('code') || 
    p.includes('custom')
  ) {
    return `🔑 **কাস্টম রুম আইডি ও পাসওয়ার্ড পাওয়ার নিয়ম:**

১. আপনি যে টুর্নামেন্টে স্লট বুক করেছেন, তার বিস্তারিত পেজে যান।
২. ম্যাচ শুরুর ঠিক **১০ থেকে ১৫ মিনিট আগে** স্বয়ংক্রিয়ভাবে **Room ID** এবং **Password** আনলক হবে।
৩. Free Fire গেমে গিয়ে **Custom > Join Room** অপশনে Room ID ও Password দিয়ে নির্ধারিত স্লট নাম্বারে বসে পড়ুন।

⚠️ **সতর্কতা:** অন্য কারো স্লটে বসবেন না, অন্যথায় কিকে (Kick) পড়তে পারেন।`;
  }

  // 3. Wallet, Deposit & Adding Money
  if (
    p.includes('deposit') || 
    p.includes('add money') || 
    p.includes('recharge') || 
    p.includes('টাকা ঢুকাব') || 
    p.includes('টাকা অ্যাড') || 
    p.includes('ডিপোজিট')
  ) {
    return `💳 **ওয়ালেটে টাকা অ্যাড / ডিপোজিট করার নিয়ম:**

১. **[Wallet](/wallet)** পেজে যান এবং **"Deposit Funds"** চাপুন।
২. আপনার পছন্দের মেথড বেছে নিন: **bKash (বিকাশ)**, **Nagad (নগদ)** বা **Rocket (রকেট)**।
৩. প্রদর্শিত নাম্বারে 'Send Money' করে TrxID (Transaction ID) এবং টাকার পরিমাণ সাবমিট করুন।
৪. ২-৫ মিনিটের মধ্যে আপনার ওয়ালেটে ব্যালেন্স যোগ হয়ে যাবে!`;
  }

  // 4. Withdrawal & Cashout
  if (
    p.includes('withdraw') || 
    p.includes('cashout') || 
    p.includes('payout') || 
    p.includes('টাকা তুলব') || 
    p.includes('টাকা পাব') || 
    p.includes('উইথড্র') || 
    p.includes('bkash') || 
    p.includes('nagad') || 
    p.includes('টাকা')
  ) {
    return `💰 **প্রাইজমানি ও ওয়ালেট উইথড্রয়াল (Cashout) নিয়ম:**

১. টুর্নামেন্ট বা কিল রিওয়ার্ড জিতলে তা আপনার **Winning Wallet**-এ জমা হবে।
২. **[Wallet](/wallet)** পেজে গিয়ে **"Withdraw"** বাটনে চাপুন।
৩. আপনার **bKash** বা **Nagad** একাউন্ট নাম্বার ও অ্যামাউন্ট লিখুন।
৪. রিকোয়েস্ট দেওয়ার **৫-৩০ মিনিটের মধ্যে** আপনার নাম্বারে সরাসরি টাকা ট্রান্সফার হয়ে যাবে!

⚡ *মিনিমাম উইথড্র মাত্র ২০ টাকা!*`;
  }

  // 5. Squad Finder & LFG
  if (
    p.includes('squad') || 
    p.includes('team') || 
    p.includes('lfg') || 
    p.includes('player') || 
    p.includes('প্লেয়ার') || 
    p.includes('দল') || 
    p.includes('পার্টনার') || 
    p.includes('teammate')
  ) {
    return `👥 **স্কোয়াড বা টিমমেট খোঁজার নিয়ম:**

১. **[Squad Finder (LFG)](/lfg)** পেজে যান।
২. আপনার পছন্দের রোল (যেমন: *Rusher, Sniper, IGL, Supporter*) অনুযায়ী টিমমেট খুঁজুন।
৩. অথবা নিজের স্কোয়াড রিক্রুটমেন্ট পোস্ট তৈরি করে ভালো প্লেয়ারদের সাথে ইনবক্সে চ্যাট করুন!`;
  }

  // 6. Shop & Diamond Top-up
  if (
    p.includes('shop') || 
    p.includes('diamond') || 
    p.includes('ডায়মন্ড') || 
    p.includes('কিনব') || 
    p.includes('buy') || 
    p.includes('topup')
  ) {
    return `💎 **Free Fire ডায়মন্ড কেনার নিয়ম:**

১. **[Shop](/shop)** পেজে যান।
২. আপনার প্রয়োজনীয় ডায়মন্ড প্যাকেজ সিলেক্ট করুন।
৩. আপনার Free Fire UID প্রদান করে অর্ডার কনফার্ম করুন।
৪. কয়েক মিনিটের মধ্যেই আপনার ইন-গেম আইডিতে ডায়মন্ড চলে যাবে!`;
  }

  // 7. Free Diamonds, Coins & Lucky Wheel
  if (
    p.includes('spin') || 
    p.includes('coin') || 
    p.includes('কয়েন') || 
    p.includes('ফ্রি') || 
    p.includes('reward') || 
    p.includes('bonus')
  ) {
    return `🎁 **ফ্রি ডায়মন্ড ও লাকি স্পিন রিওয়ার্ডস:**

১. **[Rewards & Ads Hub](/ads)** পেজে যান।
২. প্রতিদিন **Lucky Wheel** স্পিন করে জিতুন ফ্রি ক্যাশ, ডায়মন্ড ও কয়েন।
৩. ডেইলি কোয়েস্ট কমপ্লিট করে প্রতিমাসে ফ্রি টুর্নামেন্ট এন্ট্রি পাস সংগ্রহ করুন!`;
  }

  // 8. Anti-Cheat & Rules
  if (
    p.includes('hack') || 
    p.includes('cheat') || 
    p.includes('ban') || 
    p.includes('panel') || 
    p.includes('apk') || 
    p.includes('রুল') || 
    p.includes('নিয়ম') || 
    p.includes('rule')
  ) {
    return `🛡️ **ESPORTS ZONE BD সিকিউরিটি ও নিয়মাবলী:**

- কোনো প্রকার হ্যাক, কনফিগ, মড APK, অটো হেডশট স্ক্রিপ্ট বা প্যানেল ব্যবহার সম্পূর্ণ নিষিদ্ধ।
- ইন-গেম সার্ভার ও AI অ্যান্টি-চিট প্রতি সেকেন্ডে ম্যাচ মনিটর করে।
- নিয়ম ভাঙলে স্থায়ীভাবে **Device HWID & Account Ban** দেওয়া হবে।`;
  }

  // 9. Sensitivity/Gameplay redirect to support desk
  if (
    p.includes('sens') || 
    p.includes('হেডশট') || 
    p.includes('headshot') || 
    p.includes('dpi') || 
    p.includes('setting') || 
    p.includes('coach')
  ) {
    return `👋 আমি ESPORTS ZONE BD-এর অফিসিয়াল ওয়েবসাইট সাপোর্ট অ্যাসিস্ট্যান্ট। আমি মূলত টুর্নামেন্ট স্লট বুকিং, রুম আইডি, ওয়ালেট লেনদেন এবং অ্যাকাউন্ট সম্পর্কিত সহায়তার জন্য প্রস্তুত।

টুর্নামেন্ট, ম্যাচ রুলস বা উইথড্রয়াল সংক্রান্ত যেকোনো তথ্যের জন্য আমাকে নির্দ্বিধায় জিজ্ঞাসা করতে পারেন! 🏆`;
  }

  // Live contextual fallback
  if (liveContext) {
    return `👋 ESPORTS ZONE BD অফিসিয়াল সাপোর্ট ডেস্কে স্বাগতম!

বর্তমানে প্ল্যাটফর্মে চলমান টুর্নামেন্ট এবং সেবা সমূহ:
${liveContext}

আপনার টুর্নামেন্ট বুকিং, রুম আইডি বা ওয়ালেট সংক্রান্ত যেকোনো প্রশ্ন আমাকে করতে পারেন।`;
  }

  return `👋 **ESPORTS ZONE BD অফিসিয়াল সাপোর্ট ডেস্কে স্বাগতম!**

আমি আপনাকে টুর্নামেন্ট স্লট বুকিং, কাস্টম রুম আইডি ও পাসওয়ার্ড সংগ্রহ, বিকাশ/নগদ ওয়ালেট লেনদেন এবং অ্যাকাউন্ট সংক্রান্ত যেকোনো বিষয়ে সাহায্য করতে পারি। আপনার সমস্যা বা প্রশ্নটি বিস্তারিত লিখুন!`;
}

/**
 * Robust Multi-Model Gemini Calling Engine with Supabase Fallback
 */
export async function askGemini(
  prompt: string, 
  options: { 
    history?: ChatMessage[]; 
    temperature?: number; 
    liveContext?: string; 
    systemInstruction?: string;
  } = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return getSmartFallback(prompt, options.liveContext);
  }

  // Build unified contents history
  const contents: any[] = [];

  // Add system instruction as premier context
  let systemText = options.systemInstruction || ADVANCED_EZBD_SYSTEM_INSTRUCTION;
  if (options.liveContext) {
    systemText += `\n\n${options.liveContext}`;
  }

  // Format past history cleanly
  if (options.history && options.history.length > 0) {
    for (const msg of options.history.slice(-6)) {
      contents.push({
        role: msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
  }

  // Append current prompt
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  // Try preferred models in sequence with graceful fallback
  for (const model of PREFERRED_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemText }]
          },
          contents,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: 1000,
          }
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;
        if (text && typeof text === 'string' && text.trim().length > 0) {
          return text.trim();
        }
      }
    } catch (modelErr) {
      console.warn(`[Gemini API] Failed for model ${model}, trying next...`, modelErr);
    }
  }

  // If all live API calls fail, return rich smart contextual response
  return getSmartFallback(prompt, options.liveContext);
}
