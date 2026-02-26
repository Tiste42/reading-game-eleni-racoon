import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'xctasy8XvGp2cVO9HL9k';

export async function POST(req: NextRequest) {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const { text, phoneme } = await req.json();

    if (!text && !phoneme) {
      return NextResponse.json({ error: 'text or phoneme required' }, { status: 400 });
    }

    const isPhoneme = !!phoneme;
    const model = isPhoneme ? 'eleven_flash_v2' : 'eleven_multilingual_v2';

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: phoneme || text,
          model_id: model,
          voice_settings: {
            stability: 0.9,
            similarity_boost: 0.75,
            style: 0.1,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error:', response.status, errorText);
      return NextResponse.json({ error: 'TTS failed', details: errorText }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Speech API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
