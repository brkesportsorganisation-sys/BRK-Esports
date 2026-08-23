import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const PREFERRED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const base64Audio = formData.get('base64') as string | null;
    const mimeType = (formData.get('mimeType') as string) || 'audio/webm';

    let base64Data = '';
    let resolvedMimeType = mimeType;

    if (audioFile) {
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      base64Data = buffer.toString('base64');
      resolvedMimeType = audioFile.type || mimeType;
    } else if (base64Audio) {
      base64Data = base64Audio.replace(/^data:[^;]+;base64,/, '');
    }

    if (!base64Data) {
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
    }

    // Resolve Gemini API key
    let apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();

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

    if (!apiKey || !apiKey.startsWith('AIzaSy')) {
      return NextResponse.json({
        success: false,
        message: 'Speech-to-text API key is not configured.'
      }, { status: 500 });
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inline_data: {
                mime_type: resolvedMimeType.includes('audio') ? resolvedMimeType : 'audio/webm',
                data: base64Data
              }
            },
            {
              text: 'Transcribe this voice audio clip into clean natural Bengali (বাংলা). If the speaker spoke in Banglish or English gaming terms (like slot, room id, free fire, tournament, bKash, deposit), preserve those words naturally. Output ONLY the transcribed text without any quotation marks, explanations or formatting.'
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256
      }
    };

    let transcription = '';

    for (const model of PREFERRED_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          transcription = data.candidates[0].content.parts[0].text.trim();
          break;
        }
      } catch (err) {
        console.warn(`[STT Model ${model} failed]:`, err);
      }
    }

    if (!transcription) {
      return NextResponse.json({
        success: false,
        message: 'Could not transcribe audio'
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      text: transcription
    });
  } catch (error: any) {
    console.error('[POST /api/ai/stt]', error);
    return NextResponse.json({
      success: false,
      message: error?.message || 'Failed to process voice audio.'
    }, { status: 500 });
  }
}
