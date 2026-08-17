// Text-to-speech via ElevenLabs, used by the hub "Listen" option on annual
// training. Generated audio is cached in S3 (see routes/me.ts POST /me/tts) so
// each unique piece of text is only ever billed once.

const API_BASE = 'https://api.elevenlabs.io/v1'

// "Alice" — a clear British English voice. Override per environment with
// ELEVENLABS_VOICE_ID. The multilingual model handles second-language content.
const DEFAULT_VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2'
const MODEL_ID = 'eleven_multilingual_v2'

export function ttsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY
}

export function ttsVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID
}

// Synthesise speech for the given text, returning MP3 audio bytes. Throws on a
// missing key or a non-2xx response so the caller can surface a clean error.
export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('TTS_NOT_CONFIGURED')

  const res = await fetch(`${API_BASE}/text-to-speech/${ttsVoiceId()}`, {
    method:  'POST',
    headers: {
      'xi-api-key':   key,
      'Content-Type': 'application/json',
      Accept:         'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id:       MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${detail.slice(0, 300)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}
