const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

const PREFERRED_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      
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

  throw new Error(`Gemini AI service error: ${lastError || 'All models failed'}`);
}
