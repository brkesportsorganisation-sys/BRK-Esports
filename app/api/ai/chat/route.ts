import { NextRequest, NextResponse } from 'next/server';
import { askGemini } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], userContext = {} } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ message: 'Message is required.' }, { status: 400 });
    }

    let extraContext = '';
    if (userContext.name) {
      extraContext += `\nCurrent User: ${userContext.name} (${userContext.inGameName ? 'IGN: ' + userContext.inGameName : ''}), Wallet: ৳${userContext.walletBalance || 0}, Role: ${userContext.role || 'USER'}`;
    }

    const reply = await askGemini(message.trim(), {
      history,
      temperature: 0.7,
    });

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error: any) {
    console.error('[POST /api/ai/chat]', error);
    return NextResponse.json({
      message: error?.message || 'AI Assistant is currently busy. Please try again in a moment.'
    }, { status: 500 });
  }
}
