import { NextRequest, NextResponse } from 'next/server';
import * as googleTTS from 'google-tts-api';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawText = searchParams.get('text') || '';

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'Text parameter is required.' }, { status: 400 });
    }

    // Clean text: strip markdown, emoji, URLs, and weird symbols
    const cleanText = rawText
      .replace(/https?:\/\/[^\s]+/g, 'ওয়েবসাইট লিংক')
      .replace(/[*#_`~>\[\]\(\)]/g, ' ')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[🎮🏆🔥💰⚡🎯🛡️💎🔑👉📌✨⚠️]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: 'No readable text after cleaning.' }, { status: 400 });
    }

    // If text is within 200 characters, generate single audio url
    if (cleanText.length <= 200) {
      const audioUrl = googleTTS.getAudioUrl(cleanText, {
        lang: 'bn',
        slow: false,
        host: 'https://translate.google.com',
      });

      return NextResponse.json({
        success: true,
        urls: [audioUrl],
      });
    }

    // If text is longer, split into natural sentences/chunks
    const results = googleTTS.getAllAudioUrls(cleanText, {
      lang: 'bn',
      slow: false,
      host: 'https://translate.google.com',
      splitPunct: '।,!?.;:\n',
    });

    const urls = results.map(r => r.url);

    return NextResponse.json({
      success: true,
      urls,
    });
  } catch (error: any) {
    console.error('[GET /api/tts] Error generating Bangla audio:', error);
    return NextResponse.json({
      error: error?.message || 'Failed to generate audio'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawText = body.text || '';

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 });
    }

    const cleanText = rawText
      .replace(/https?:\/\/[^\s]+/g, 'ওয়েবসাইট লিংক')
      .replace(/[*#_`~>\[\]\(\)]/g, ' ')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[🎮🏆🔥💰⚡🎯🛡️💎🔑👉📌✨⚠️]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const results = googleTTS.getAllAudioUrls(cleanText, {
      lang: 'bn',
      slow: false,
      host: 'https://translate.google.com',
      splitPunct: '।,!?.;:\n',
    });

    const urls = results.map(r => r.url);

    return NextResponse.json({
      success: true,
      urls,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error' }, { status: 500 });
  }
}
