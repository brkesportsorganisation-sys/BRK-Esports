import { NextRequest, NextResponse } from 'next/server';
import * as googleTTS from 'google-tts-api';

function cleanBanglaText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/https?:\/\/[^\s]+/g, 'ওয়েবসাইট লিংক')
    .replace(/৳\s*([0-9]+)/g, (_match, p1) => `${p1} টাকা`)
    .replace(/([0-9]+)\s*৳/g, (_match, p1) => `${p1} টাকা`)
    .replace(/\b1v1\b/gi, '১ ভার্সেস ১')
    .replace(/\b4v4\b/gi, '৪ ভার্সেস ৪')
    .replace(/\b2v2\b/gi, '২ ভার্সেস ২')
    .replace(/\bbKash\b/gi, 'বিকাশ')
    .replace(/\bNagad\b/gi, 'নগদ')
    .replace(/\bRocket\b/gi, 'রকেট')
    .replace(/\bFree Fire\b/gi, 'ফ্রি ফায়ার')
    .replace(/\bBRK Esports\b/gi, 'বি আর কে স্পোর্টস')
    .replace(/\bBRK\b/gi, 'বি আর কে')
    .replace(/\bWallet\b/gi, 'ওয়ালেট')
    .replace(/\bTournament\b/gi, 'টুর্নামেন্ট')
    .replace(/\bTournaments\b/gi, 'টুর্নামেন্ট')
    .replace(/\bDeposit\b/gi, 'ডিপোজিট')
    .replace(/\bWithdraw\b/gi, 'উইথড্র')
    .replace(/\bCoins\b/gi, 'কয়েন')
    .replace(/\bCoin\b/gi, 'কয়েন')
    .replace(/\bBooyah\b/gi, 'বুয়াহ')
    .replace(/\bRoom\b/gi, 'রুম')
    .replace(/\bPassword\b/gi, 'পাসওয়ার্ড')
    .replace(/\bPass\b/gi, 'পাসওয়ার্ড')
    .replace(/\bSlot\b/gi, 'স্লট')
    .replace(/\bSlots\b/gi, 'স্লট')
    .replace(/\bID\b/gi, 'আইডি')
    .replace(/[*#_`~>\[\]\(\)\{\}\^\$\+\=\|\\]/g, ' ')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[🎮🏆🔥💰⚡🎯🛡️💎🔑👉📌✨⚠️•🔔👑⚽🪖⚔️🎁]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawText = searchParams.get('text') || '';
    const cleanText = cleanBanglaText(rawText);

    if (!cleanText) {
      return new Response('Text parameter is required.', { status: 400 });
    }

    const chunks = await googleTTS.getAllAudioBase64(cleanText, {
      lang: 'bn',
      slow: false,
      timeout: 12000,
    });

    const buffers = chunks.map(c => Buffer.from(c.base64, 'base64'));
    const fullAudioBuffer = Buffer.concat(buffers);

    return new Response(fullAudioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fullAudioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error: any) {
    console.error('[GET /api/tts] Error generating Bangla audio:', error);
    return new Response(error?.message || 'Failed to generate Bangla audio', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawText = body.text || '';
    const cleanText = cleanBanglaText(rawText);

    if (!cleanText) {
      return NextResponse.json({ error: 'Text parameter is required.' }, { status: 400 });
    }

    const chunks = await googleTTS.getAllAudioBase64(cleanText, {
      lang: 'bn',
      slow: false,
      timeout: 12000,
    });

    const buffers = chunks.map(c => Buffer.from(c.base64, 'base64'));
    const fullAudioBuffer = Buffer.concat(buffers);
    const fullBase64 = `data:audio/mp3;base64,${fullAudioBuffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      audio: fullBase64,
      cleanText,
    });
  } catch (error: any) {
    console.error('[POST /api/tts] Error generating Bangla audio:', error);
    return NextResponse.json({ error: error?.message || 'Failed to generate audio' }, { status: 500 });
  }
}
