const PREFERRED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro'
];

interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

const BLACKROCK_SYSTEM_INSTRUCTION = `You are "BRK AI", the official intelligent AI Esports Assistant & Gaming Coach for Blackrock Esports (BRK Esports) — Bangladesh's premier Free Fire Championship and Tournament Platform.

Core Platform Knowledge:
1. Platform Name: Blackrock Esports (BRK Esports).
2. Game: Garena Free Fire (Battle Royale Squad/Duo/Solo, Clash Squad Ranked).
3. Registration & Tournaments:
   - Players register with their Free Fire UID and in-game name (IGN).
   - Entry fees can be paid via bKash, Nagad, Rocket, or in-app Winning/Promo Wallet.
   - Custom Room ID and Password are published on the tournament match tab 10-15 minutes before match start.
4. Wallets & Payouts:
   - Dual wallet system: Main Wallet, Promo Wallet (for slot entries), and Winning Wallet (withdrawable cash prize).
   - Cash prize payouts are verified and sent directly to bKash/Nagad/Rocket.
5. Anti-Cheat & Rules:
   - Strict fair play policy. Third-party config tools, scripts, macro mods, or unauthorized emulator bypass are strictly prohibited and result in permanent device bans.
   - Players must join assigned slots on time.
6. LFG & Squad Finder:
   - Players can find squadmates, rushers, snipers, IGLs (In-Game Leaders), and support players in the Community / LFG tab.
7. Language & Personality:
   - Friendly, energetic, confident esports gaming coach tone.
   - Fluent in English, Bengali (বাংলা), and Banglish (Bengali in English letters). Always respond in the language the player asks in.
   - Keep answers concise, clear, and helpful with emojis (🎮, 🏆, 🔥, 💰, ⚡).`;

function getLocalFallbackResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  
  if (lower.includes('room') || lower.includes('id') || lower.includes('password') || lower.includes('রুম')) {
    return "🎮 **Room ID & Password:** ম্যাচ শুরুর ১০-১৫ মিনিট আগে টুর্নামেন্ট পেজের 'My Matches' অথবা নির্দিষ্ট টুর্নামেন্টের Match Details সেকশনে Room ID এবং Password দেখতে পাবেন। নির্ধারিত সময়ে ইন-গেম কাস্টম রুমে জয়েন করুন!";
  }
  
  if (lower.includes('payout') || lower.includes('cashout') || lower.includes('withdraw') || lower.includes('টাকা') || lower.includes('বিকাশ') || lower.includes('নগদ') || lower.includes('wallet')) {
    return "💰 **ক্যাশআউট ও প্রাইজমানি:** টুর্নামেন্টে জেতার পর আপনার প্রাইজমানি সরাসরি **Winning Wallet**-এ যুক্ত হয়। প্রোফাইল থেকে বিকাশ (bKash), নগদ (Nagad) বা রকেটের মাধ্যমে খুব সহজেই উইথড্র রিকোয়েস্ট করতে পারবেন। অ্যাডমিন ভেরিফিকেশনের পর দ্রুত টাকা পৌঁছে যাবে!";
  }

  if (lower.includes('register') || lower.includes('join') || lower.includes('টুর্নামেন্ট') || lower.includes('অংশগ্রহণ') || lower.includes('slot')) {
    return "🏆 **টুর্নামেন্টে জয়েন করার নিয়ম:** \n1. Tournaments ট্যাব থেকে আপনার পছন্দের ম্যাচ সিলেক্ট করুন।\n2. 'Register Slot' বাটনে ক্লিক করুন।\n3. আপনার Free Fire UID ও IGN দিন এবং ফি পরিশোধ করে স্লট কনফার্ম করুন!";
  }

  if (lower.includes('combo') || lower.includes('gun') || lower.includes('loadout') || lower.includes('গান') || lower.includes('টিপস')) {
    return "🔥 **Free Fire Top Combo:**\n- **Close Range / Rush:** MP40 / Shotgun (M1887, Charge Buster) + Tatsuya / Homer\n- **Mid/Long Range:** Woodpecker / AC80 + Groza / SCAR\n- **Character Combo:** Tatsuya/Alok + Kelly + Hayato + Moco!";
  }

  if (lower.includes('ki obostha') || lower.includes('kemon') || lower.includes('hello') || lower.includes('hi') || lower.includes('helo') || lower.includes('হাই') || lower.includes('কেমন')) {
    return "🔥 আরে ভাই, একদম চরম অবস্থা! Blackrock Esports অ্যারেনায় আপনাকে স্বাগতম। আজকে কোন টুর্নামেন্টে নামছেন? কোনো হেল্প লাগলে সরাসরি বলুন!";
  }

  return "🎮 **Blackrock Esports (BRK AI):** আমি আপনার গেমিং অ্যাসিস্ট্যান্ট! টুর্নামেন্ট শিডিউল, কাস্টম রুম আইডি, বিকাশ/নগদ উইথড্রয়াল বা স্কোয়াড স্ট্র্যাটেজি সম্পর্কে যে কোনো প্রশ্ন করতে পারেন।";
}

export async function askGemini(prompt: string, options: {
  systemInstruction?: string;
  history?: ChatMessage[];
  temperature?: number;
} = {}): Promise<string> {
  const {
    systemInstruction = BLACKROCK_SYSTEM_INSTRUCTION,
    history = [],
    temperature = 0.7
  } = options;

  const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();

  // If no Gemini API key is configured, respond with smart local fallback
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return getLocalFallbackResponse(prompt);
  }

  // Build contents array
  const contents: any[] = [];

  // Add conversation history
  for (const msg of history) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    });
  }

  // Add latest prompt
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
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
      console.warn(`[Gemini ${model} warning]:`, lastError);
    } catch (err: any) {
      lastError = err.message;
      console.warn(`[Gemini ${model} error]:`, err);
    }
  }

  console.warn('[Gemini fallback triggered]:', lastError);
  return getLocalFallbackResponse(prompt);
}
