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
    const { title, mode = 'SQUAD', format = 'BR_RANKED', prizePool = 1000, entryFee = 100 } = body;

    const prompt = `Generate a high-energy, exciting tournament description and official rulebook for a Free Fire tournament.
Tournament Info:
- Title: ${title || 'Blackrock Free Fire Championship'}
- Mode: ${mode}
- Format: ${format}
- Entry Fee: ৳${entryFee}
- Prize Pool: ৳${prizePool}

Format the response strictly as valid JSON with two keys:
{
  "description": "An engaging, energetic 2-3 paragraph tournament overview highlighting the stakes and glory.",
  "rules": "1. All players must join the custom room on time.\\n2. No third-party hacks or config files allowed.\\n3. Emulators must follow tournament format.\\n4. Screenshot of final scoreboard required."
}`;

    const rawReply = await askGemini(prompt, {
      temperature: 0.6,
      systemInstruction: 'You are an expert esports tournament coordinator. Return only JSON format.',
    });

    let cleaned = rawReply.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      success: true,
      description: parsed.description || '',
      rules: parsed.rules || '',
    });
  } catch (error: any) {
    console.error('[POST /api/ai/generate-tournament]', error);
    return NextResponse.json({ message: error?.message || 'Failed to generate AI tournament content' }, { status: 500 });
  }
}
