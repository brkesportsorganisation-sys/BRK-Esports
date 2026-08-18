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

const ADVANCED_BLACKROCK_SYSTEM_INSTRUCTION = `You are the official AI Assistant and Gaming Coach for BlackRock Esports (BRK Esports) — Bangladesh's premier automated competitive gaming platform.

When responding to users, follow these strict output guidelines to ensure natural, high-quality Bangla Text-to-Speech (TTS/Read Aloud) performance:

1. Language & Accent: Always respond in natural, standard Bengali (প্রমিত বাংলা).
2. Clean Text for TTS: 
   - Avoid using special symbols, strange emojis, markdown bullet hashes (#), or excessive asterisks (*) inside main paragraphs as they confuse text-to-speech engines.
   - Use proper Bengali punctuation (দাঁড়ি '।', কমা ',') correctly so the TTS engine pauses naturally during Read Aloud.
3. Tone: Keep responses concise, helpful, polite, and gaming-focused.
4. Digits & Terms: Write critical numbers and gaming terms clearly (e.g. Free Fire, eFootball, bKash, Nagad, Room ID, Custom Match) so they are pronounced accurately in Bangla context.
5. Provide clear steps for slot booking, custom room passwords, wallet deposits, bKash cashouts, and character skill combinations.`;

/**
 * Intelligent Multi-Topic NLP Engine for Bengali, Banglish & English Free Fire Gaming & BRK Platform Queries
 */
export function getSmartFallback(prompt: string, liveContext?: string): string {
  const p = prompt.toLowerCase().trim();

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
৩. **"Book Slot" / "Register"** বাটনে ক্লিক করুন।
৪. আপনার সঠিক **Free Fire In-Game UID** এবং **Name** দিন।
৫. ওয়ালেট ব্যালেন্স বা পেমেন্ট গেটওয়ে দিয়ে এন্ট্রি ফি পরিশোধ করে স্লট কনফার্ম করুন!

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

১. টুর্নামেন্ট বা কিল রিওয়ার্ড জিতলে তা আপনার **Main / Winning Wallet**-এ জমা হবে।
২. **[Wallet](/wallet)** পেজে গিয়ে **"Withdraw"** বাটনে চাপুন।
৩. আপনার **bKash** বা **Nagad** একাউন্ট নাম্বার ও অ্যামাউন্ট লিখুন।
৪. রিকোয়েস্ট দেওয়ার **৫-৩০ মিনিটের মধ্যে** আপনার নাম্বারে সরাসরি টাকা ট্রান্সফার হয়ে যাবে!

⚡ *মিনিমাম উইথড্র মাত্র ২০ টাকা!*`;
  }

  // 5. Sensitivity & Headshot Settings
  if (
    p.includes('sens') || 
    p.includes('হেডশট') || 
    p.includes('headshot') || 
    p.includes('dpi') || 
    p.includes('setting') || 
    p.includes('drag') || 
    p.includes('সেন্সি') || 
    p.includes('সেনসিটিভিটি')
  ) {
    return `🎯 **Free Fire Best Drag-Headshot Sensitivity Settings (2026 Meta):**

- **General:** 98 - 100 (Smooth 360 Drag)
- **Red Dot:** 92 - 95
- **2x Scope:** 88
- **4x Scope:** 82
- **Sniper Scope:** 55
- **Free Look:** 65
- **Recommended DPI:** 410 - 440 (For 4GB-8GB RAM phones)

🔥 **Pro Drag Secret:**
- ক্লোজ রেঞ্জে ড্র্যাগ করার সময় ফায়ার বাটনটিকে হালকা নিচে টেনে ইংরেজি **'J'** অক্ষরের মতো ঘুরিয়ে উপরে টানুন।
- মিড রেঞ্জে সোজা উপরে (Straight Upward Drag) টানলে সহজেই পারফেক্ট রেড নম্বর হেডশট কানেক্ট হবে!`;
  }

  // 6. Character Combos & Meta Skills
  if (
    p.includes('combo') || 
    p.includes('character') || 
    p.includes('skill') || 
    p.includes('ক্যারেক্টার') || 
    p.includes('স্কিল') || 
    p.includes('alok') || 
    p.includes('tatsuya') || 
    p.includes('dimitri') || 
    p.includes('sonia')
  ) {
    return `🔥 **Free Fire শীর্ষ মেটা ক্যারেক্টার স্কিল কম্বিনেশন:**

১. ⚡ **Rusher / Aggressive BR Combo:**
   - **Active:** Tatsuya / Alok
   - **Passive:** Kelly (Speed) + Hayato (Armor Pen) + Moco (Enemy Tag)

২. 🎯 **Sniper / Long Range Anchor:**
   - **Active:** Iris / Homer
   - **Passive:** Maro (High Dmg) + Rafael (Silent Bleed) + Laura (Accuracy)

৩. 🛡️ **CS Ranked Clutcher Combo:**
   - **Active:** Dimitri / Chrono
   - **Passive:** Sonia (150 HP Shield) + Thiva (Instant Revive) + Antonio (Extra Shield HP)`;
  }

  // 7. Best Guns & Weapons
  if (
    p.includes('gun') || 
    p.includes('weapon') || 
    p.includes('গান') || 
    p.includes('অস্ত্র') || 
    p.includes('m1887') || 
    p.includes('mp40') || 
    p.includes('woodpecker')
  ) {
    return `🔫 **Free Fire বর্তমান মেটার সেরা গান কম্বো:**

- **Close Range (শর্ট রেঞ্জ):** M1887 (2-Shot) / Charge Buster / MP40 / Bizon
- **Mid & Long Range:** Woodpecker / Groza / AC80 / SCAR-III
- **CS 4v4 Ranked Special:** MP5-III + M1887 + Deser Eagle (1-Tap Headshot)`;
  }

  // 8. Squad Finder & LFG
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
৩. অথবা নিজের স্কোয়াড রিক্রুটমেন্ট পোস্ট তৈরি করে ভালো প্লেয়ারদের সাথে একসাথে টুর্নামেন্ট খেলুন!`;
  }

  // 9. Free Diamonds, Coins & Lucky Wheel
  if (
    p.includes('spin') || 
    p.includes('coin') || 
    p.includes('diamond') || 
    p.includes('ডায়মন্ড') || 
    p.includes('কয়েন') || 
    p.includes('ফ্রি') || 
    p.includes('reward') || 
    p.includes('bonus')
  ) {
    return `🎁 **ফ্রি ডায়মন্ড ও লাকি স্পিন রিওয়ার্ডস:**

১. **[Rewards & Ads Hub](/ads)** পেজে যান।
২. প্রতিদিন **Lucky Wheel** স্পিন করে জিতুন ফ্রি ক্যাশ, ডায়মন্ড ও কয়েন।
৩. শর্ট ভিডিও ও ডেইলি কোয়েস্ট কমপ্লিট করে প্রতিমাসে ফ্রি টুর্নামেন্ট এন্ট্রি পাস সংগ্রহ করুন!`;
  }

  // 10. Anti-Cheat & Rules
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
    return `🛡️ **Black Rock Esports সিকিউরিটি ও নিয়মাবলী:**

- কোনো প্রকার হ্যাক, কনফিগ, মড APK, অটো হেডশট স্ক্রিপ্ট বা প্যানেল ব্যবহার সম্পূর্ণ নিষিদ্ধ।
- ইন-গেম সার্ভার ও AI অ্যান্টি-চিট প্রতি সেকেন্ডে ম্যাচ মনিটর করে।
- নিয়ম ভাঙলে স্থায়ীভাবে **Device HWID & IP Ban** দেওয়া হবে এবং সমস্ত প্রাইজমানি বাতিল হবে।`;
  }

  // 11. Profile & UID Update
  if (
    p.includes('uid') || 
    p.includes('ign') || 
    p.includes('name') || 
    p.includes('profile') || 
    p.includes('প্রোফাইল') || 
    p.includes('নাম')
  ) {
    return `👤 **Free Fire UID ও প্রোফাইল সেটআপ:**

১. **[Profile](/profile)** পেজে যান।
২. আপনার আসল **Free Fire In-Game UID** এবং **Nickname** দিন।
৩. প্রোফাইল সেভ করুন যাতে টুর্নামেন্টে জয়েন করার সময় অটোমেটিক্যালি স্লট ভেরিফাই হয়ে যায়।`;
  }

  // 12. Support, Help & Contact
  if (
    p.includes('help') || 
    p.includes('support') || 
    p.includes('admin') || 
    p.includes('contact') || 
    p.includes('যোগাযোগ') || 
    p.includes('সাহায্য') || 
    p.includes('হোয়াটসঅ্যাপ') || 
    p.includes('whatsapp')
  ) {
    return `📞 **Black Rock Esports অফিশিয়াল সাপোর্ট:**

- যে কোনো সমস্যা বা টুর্নামেন্ট সহায়তার জন্য আমাদের **WhatsApp Helpline** বা **Telegram Support**-এ মেসেজ দিতে পারেন।
- আমাদের টিম ২৪ ঘণ্টার মধ্যেই আপনার সমস্যার সমাধান করে দেবে!
- হেল্পলাইন লিংক: **[Support Contact](/contact)**`;
  }

  // 13. Greetings
  if (
    p.includes('hi') || 
    p.includes('hello') || 
    p.includes('hey') || 
    p.includes('সালাম') || 
    p.includes('salam') || 
    p.includes('kemon') || 
    p.includes('কেমন')
  ) {
    return `👋 **আসসালামু আলাইকুম! আমি আপনার BRK AI গেমিং কোচ।**

আমি আপনাকে টুর্নামেন্ট বুকিং, রুম আইডি, বিকাশ উইথড্রয়াল, সেরা হেডশট সেনসিটিভিটি বা ক্যারেক্টার স্কিল কম্বো সম্পর্কে সাহায্য করতে পারি। আপনি কী জানতে চান? 🎮🔥`;
  }

  // Default Conversational Answer
  return `🎮 **Blackrock Esports (BRK AI):**
আপনার প্রশ্নটির জন্য ধন্যবাদ! আপনি চাইলে নিচের যেকোনো বিষয়ে সরাসরি সাহায্য নিতে পারেন:

- **🏆 স্লট বুকিং:** \`"Slot kivabe book korbo"\`
- **🔑 রুম আইডি:** \`"Room ID kokhon pabo"\`
- **🎯 হেডশট সেনসিটিভিটি:** \`"Headshot settings dao"\`
- **💰 বিকাশ উইথড্র:** \`"Taka kivabe tulbo"\`
- **👥 স্কোয়াড খোঁজা:** \`"Squad kivabe pabo"\`

আপনার প্রশ্নটি লিখে পাঠান, আমি বিস্তারিত বুঝিয়ে বলছি! 🚀`;
}

/**
 * Ask Gemini with live context injection and fallback resilience
 */
export async function askGemini(prompt: string, options: {
  systemInstruction?: string;
  history?: ChatMessage[];
  temperature?: number;
  liveContext?: string;
} = {}): Promise<string> {
  const {
    systemInstruction = ADVANCED_BLACKROCK_SYSTEM_INSTRUCTION,
    history = [],
    temperature = 0.7,
    liveContext = ''
  } = options;

  let apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();

  // Try checking SiteSetting for custom Gemini API key if present
  try {
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'GEMINI_API_KEY')
      .maybeSingle();

    if (setting?.value && setting.value.trim() && setting.value.startsWith('AIzaSy')) {
      apiKey = setting.value.trim();
    }
  } catch {}

  // If no valid Google AI Studio key (standard keys start with AIzaSy)
  if (!apiKey || !apiKey.startsWith('AIzaSy') || apiKey === 'your_gemini_api_key_here') {
    return getSmartFallback(prompt, liveContext);
  }

  const contents: any[] = [];

  // Add conversation history
  for (const msg of history) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    });
  }

  // Final user prompt with live context injection
  const fullUserPrompt = liveContext 
    ? `[LIVE PLATFORM REAL-TIME DATA]:\n${liveContext}\n\n[USER QUESTION]:\n${prompt}`
    : prompt;

  contents.push({
    role: 'user',
    parts: [{ text: fullUserPrompt }]
  });

  let lastError: any = null;

  for (const model of PREFERRED_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const payload: any = {
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: 1024,
        }
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim();
      }

      lastError = data.error?.message || `HTTP ${res.status}`;
    } catch (err: any) {
      lastError = err.message;
    }
  }

  console.warn('[Gemini fallback triggered]:', lastError);
  return getSmartFallback(prompt, liveContext);
}
