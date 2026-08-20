import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { askGemini } from '@/lib/gemini';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, game = 'Free Fire', mode = 'SQUAD', format = 'BR_RANKED', prizePool = 1000, entryFee = 100 } = body;

    const prompt = `You are a professional esports tournament coordinator.
Generate an exciting tournament description and official rules for:
- Game: ${game}
- Title: ${title || 'Esports Championship'}
- Mode: ${mode}
- Format: ${format}
- Entry Fee: ৳${entryFee}
- Prize Pool: ৳${prizePool}

IMPORTANT: Return ONLY a valid JSON object without markdown fences, like this:
{
  "description": "Welcome to the ultimate tournament! Compete with the best squads.",
  "rules": "1. All players must join the room 5 minutes before match time.\\n2. No third-party hacks or mod files.\\n3. Take a screenshot of the scoreboard.\\n4. Admin decisions are final."
}`;

    const rawReply = await askGemini(prompt, {
      temperature: 0.5,
      systemInstruction: 'You are an expert esports coordinator. Always return ONLY a raw JSON object with keys "description" and "rules". No preamble or extra conversational text.',
    });

    let description = '';
    let rules = '';

    // 1. Try to extract JSON between { and }
    const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.description) description = String(parsed.description).trim();
        if (parsed.rules) rules = String(parsed.rules).trim();
      } catch (e) {
        console.warn('Direct JSON parse failed, fallback to text parsing', e);
      }
    }

    // 2. Fallback if JSON extraction didn't populate
    if (!description) {
      const cleanText = rawReply.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parts = cleanText.split(/rules?:|official rules:|নিয়মাবলী:/i);
      if (parts.length > 1) {
        description = parts[0].trim();
        rules = parts.slice(1).join('\n').trim();
      } else {
        description = cleanText;
        rules = '1. All players must join the room on time.\n2. Fair-play only. No third-party config or hacks.\n3. Keep screenshot of match result.\n4. Admin decisions are final.';
      }
    }

    return NextResponse.json({
      success: true,
      description,
      rules,
    });
  } catch (error: any) {
    console.error('[POST /api/ai/generate-tournament]', error);
    // Provide a safe fallback content instead of throwing 500 error
    return NextResponse.json({
      success: true,
      description: 'Get ready for intense competitive esports action! Join the tournament, assemble your squad, and battle for the grand championship prize pool.',
      rules: '1. Join custom room 5 minutes before start time.\n2. Fair play only - zero tolerance for third-party hacks or modded files.\n3. Keep screenshot of match result for verification.\n4. Host / Admin decisions are final.',
    });
  }
}
