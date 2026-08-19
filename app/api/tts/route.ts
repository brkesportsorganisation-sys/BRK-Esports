import { NextRequest, NextResponse } from 'next/server';
import * as googleTTS from 'google-tts-api';

function cleanBanglaText(rawText: string): string {
  return rawText
    .replace(/https?:\/\/[^\s]+/g, 'ওয়েবসাইট লিংক')
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
    const isStream = searchParams.get('stream') === '1';

    const cleanText = cleanBanglaText(rawText);
    if (!cleanText) {
      return NextResponse.json({ error: 'Text parameter is required.' }, { status: 400 });
    }

    // Direct binary streaming mode for short text
    if (isStream && cleanText.length <= 200) {
      const base64 = await googleTTS.getAudioBase64(cleanText, {
        lang: 'bn',
        slow: false,
        timeout: 10000,
      });
      const buffer = Buffer.from(base64, 'base64');

      return new Response(buffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Base64 JSON array mode for all text lengths
    const chunks = await googleTTS.getAllAudioBase64(cleanText, {
      lang: 'bn',
      slow: false,
      timeout: 10000,
      splitPunct: '।,!?.;:\n',
    });

    const audios = chunks.map(c => `data:audio/mp3;base64,${c.base64}`);

    return NextResponse.json({
      success: true,
      audios,
    });
  } catch (error: any) {
    console.error('[GET /api/tts] Error generating Bangla audio:', error);
    return NextResponse.json({
      error: error?.message || 'Failed to generate Bangla audio'
    }, { status: 500 });
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
      timeout: 10000,
      splitPunct: '।,!?.;:\n',
    });

    const audios = chunks.map(c => `data:audio/mp3;base64,${c.base64}`);

    return NextResponse.json({
      success: true,
      audios,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to generate audio' }, { status: 500 });
  }
}
