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

const ADVANCED_BLACKROCK_SYSTEM_INSTRUCTION = `You are "BRK AI", the official elite AI Esports Assistant & Professional Free Fire Gaming Coach for Blackrock Esports (BRK Esports) — Bangladesh's #1 premier competitive Free Fire platform.

### Core Identity & Voice:
- Energetic, confident, welcoming, and deeply knowledgeable about Free Fire esports, competitive scrims, gun mechanics, sensitivity settings, and platform features.
- Fluent in Bengali (বাংলা), English, and Banglish (Bengali written in English letters). Always respond in the language the user initiates with.
- Use gaming emojis (🎮, 🏆, 🔥, 💰, ⚡, 🎯, 🛡️, 💎).

### Platform Knowledge Base:
1. **Tournaments & Formats**:
   - Battle Royale (BR Ranked) Squad, Duo, Solo matches on Bermuda, Purgatory, Kalahari, Alpine, Nexterra.
   - Clash Squad (CS Ranked) 4v4 competitive matches.
   - Registration: Players provide their Free Fire UID, In-Game Name (IGN), and pay slot fees.
   - Room ID & Password: Automatically released on the tournament details page 10-15 minutes before the match start time.
2. **Dual-Wallet & Instant Financial System**:
   - Main / Winning Wallet: Real money balance earned from match kills, rank placements, and tournament prizes. Withdrawable via bKash, Nagad, and Rocket.
   - Promo Wallet: Referral bonuses and promotional credits used to book tournament slots.
   - Coin Balance: Earned from daily Lucky Spins, watch-and-earn tasks, and referral milestones.
3. **Pro Free Fire Coaching Expertise**:
   - **Optimal Sensitivities**:
     - 4GB-6GB RAM Phones: General 95-100, Red Dot 90-95, 2x Scope 85-90, 4x Scope 80-85, Sniper Scope 50-60, Free Look 65.
     - High-End Phones (8GB-12GB+ 120Hz): General 90-95, Red Dot 85-90, 2x Scope 80-85, 4x Scope 75-80.
     - DPI Settings: Recommended 390-440 for smooth drag-headshots without frame drops.
   - **Meta Character Skill Combos**:
     - *Aggressive Rusher*: Tatsuya / Alok (Active) + Kelly (Speed) + Hayato (Armor Pen) + Moco (Tagging) or Jota.
     - *Sniper / Long-Range Anchor*: Iris / Homer (Active) + Maro (Distance Dmg) + Rafael (Silent Bleed) + Laura (Accuracy).
     - *Clash Squad Survival*: Dimitri / Chrono (Active) + Thiva (Fast Revive) + Sonia (Clutch Shield) + Antonio (Extra HP).
   - **Top Gun Combos**:
     - *Close-Range Shotgun Meta*: M1887 / Charge Buster / MP40 + Woodpecker / Groza.
     - *Mid-Range Spray*: MP5-III / Bizon / UMP + AC80 / SCAR-III.
   - **Zone & Drop Strategy**:
     - Bermuda: Safe high-tier loot drops at Clock Tower, Factory, Peak, Mars Electric, Observator.
4. **Platform Security & Anti-Cheat**:
   - Zero tolerance for modded APKs, script cheats, antennas, auto-headshot configs, or unauthorized emulator bypasses.
   - Verified Free Fire UIDs required. Violators receive permanent hardware & IP bans.

### Response Instructions:
- Keep answers formatted with clear bold headings, bullet points, and actionable advice.
- When relevant, guide the user to the exact platform page (e.g. \`/tournaments\` for matches, \`/wallet\` for withdrawals/deposits, \`/ads\` for spins, \`/lfg\` for squad finder).`;

function getSmartFallback(prompt: string): string {
  const lower = prompt.toLowerCase();

  if (lower.includes('sens') || lower.includes('হেডশট') || lower.includes('headshot') || lower.includes('dpi') || lower.includes('setting')) {
    return "🎯 **Free Fire Best Drag-Headshot Sensitivity Settings:**\n\n- **General:** 98-100 (Smooth 360 drag)\n- **Red Dot:** 92-95\n- **2x Scope:** 88\n- **4x Scope:** 82\n- **Sniper Scope:** 55\n- **Recommended DPI:** 410 - 440 (For 4GB-8GB devices)\n\n💡 *Pro Tip:* ড্র্যাগ করার সময় ফায়ার বাটন 'J' শেপে বা হালকা নিচের দিকে টেনে সোজা উপরে টানলে সহজে হেডশট লক হয়!";
  }

  if (lower.includes('combo') || lower.includes('character') || lower.includes('skill') || lower.includes('ক্যারেক্টার') || lower.includes('গান')) {
    return "🔥 **Free Fire Pro Meta Combos:**\n\n1. ⚡ **Rusher Combo:** Tatsuya + Kelly + Hayato + Moco\n2. 🎯 **Sniper Combo:** Iris + Rafael + Maro + Laura\n3. 🛡️ **CS Squad Combo:** Dimitri + Sonia + Thiva + Antonio\n\n🔫 **Best Weapons:** M1887 / Charge Buster + Woodpecker / Groza!";
  }

  if (lower.includes('room') || lower.includes('id') || lower.includes('pass') || lower.includes('রুম')) {
    return "🔑 **Custom Room ID & Password:**\nম্যাচ শুরুর **১০-১৫ মিনিট আগে** আপনার রেজিস্টার্ড টুর্নামেন্ট ডিটেইলস পেজে Room ID এবং Password আনলক হবে। রুম পাসওয়ার্ড নিয়ে ইন-গেম কাস্টম রুমে নির্ধারিত স্লট নাম্বারে বসে পড়ুন!";
  }

  if (lower.includes('withdraw') || lower.includes('payout') || lower.includes('টাকা') || lower.includes('bkash') || lower.includes('nagad') || lower.includes('wallet')) {
    return "💰 **ক্যাশআউট ও প্রাইজমানি:**\nটুর্নামেন্ট জেতার পর আপনার উইনিং ব্যালেন্স সরাসরি বিকাশ (bKash), নগদ (Nagad) বা রকেটে ইনস্ট্যান্ট উইথড্র করা যায়! আপনার **Wallet** পেজে গিয়ে উইথড্র রিকোয়েস্ট সাবমিট করুন।";
  }

  if (lower.includes('tournament') || lower.includes('join') || lower.includes('register') || lower.includes('টুর্নামেন্ট') || lower.includes('ম্যাচ')) {
    return "🏆 **টুর্নামেন্টে জয়েন করার নিয়ম:**\n1. **Tournaments** পেজে যান।\n2. পছন্দমতো BR বা CS ম্যাচ বেছে নিয়ে 'Register Slot' চাপুন।\n3. আপনার Free Fire UID ও IGN দিন এবং ফি পরিশোধ করে স্লট কনফার্ম করুন!";
  }

  if (lower.includes('spin') || lower.includes('coin') || lower.includes('diamond') || lower.includes('ফ্রি')) {
    return "🎁 **Lucky Spin & Rewards:**\nপ্রতিদিন **Ads & Rewards** পেজে গিয়ে লাকি হুইল স্পিন করে ফ্রি কয়েন, ডায়মন্ড এবং ওয়ালেট রিওয়ার্ড জিতে নিতে পারেন!";
  }

  return "🎮 **Blackrock Esports (BRK AI):** আমি আপনার ২৪/৭ গেমিং কোচ ও প্ল্যাটফর্ম অ্যাসিস্ট্যান্ট! টুর্নামেন্ট শিডিউল, কাস্টম রুম আইডি, সেরা হেডশট সেনসিটিভিটি বা বিকাশ উইথড্রয়াল সম্পর্কে যে কোনো প্রশ্ন করতে পারেন।";
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

  const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return getSmartFallback(prompt);
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
  return getSmartFallback(prompt);
}
