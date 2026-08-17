'use client'

// "Listen" control for hub learning content (annual training accessibility).
// Fetches ElevenLabs audio for the given text via the API (which caches it, so
// repeat plays of the same passage cost nothing) and plays it inline with
// play/pause. Hides itself entirely when text-to-speech is not configured.

import { useEffect, useRef, useState } from 'react'
import { Loader2, Pause, RotateCcw, Volume2 } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'

type State = 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'unavailable'

export function ListenButton({ token, text, className = '' }: { token: string; text: string; className?: string }) {
  const [state, setState] = useState<State>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef   = useRef<string | null>(null)
  const textRef  = useRef<string>('')

  // A new step means new text: stop, release the old audio, reset to idle.
  useEffect(() => {
    if (textRef.current !== text) {
      textRef.current = text
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null }
      setState(s => (s === 'unavailable' ? 'unavailable' : 'idle'))
    }
  }, [text])

  // Release the object URL on unmount.
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  async function play() {
    // Already generated this passage — just resume.
    if (audioRef.current && urlRef.current) { void audioRef.current.play(); setState('playing'); return }
    setState('loading')
    try {
      const blob = await createApiClient(token).me.tts(text)
      const url  = URL.createObjectURL(blob)
      urlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setState('idle')
      await audio.play()
      setState('playing')
    } catch (e: any) {
      setState(e?.message === 'TTS_NOT_CONFIGURED' ? 'unavailable' : 'error')
    }
  }

  function pause() { audioRef.current?.pause(); setState('paused') }

  if (state === 'unavailable' || !text.trim()) return null

  const label =
    state === 'loading' ? 'Loading' :
    state === 'playing' ? 'Pause'   :
    state === 'paused'  ? 'Resume'  :
    state === 'error'   ? 'Try again' : 'Listen'

  const Icon =
    state === 'loading' ? Loader2 :
    state === 'playing' ? Pause   :
    state === 'error'   ? RotateCcw : Volume2

  return (
    <button
      type="button"
      onClick={state === 'playing' ? pause : play}
      disabled={state === 'loading'}
      aria-label={state === 'playing' ? 'Pause audio' : 'Listen to this text'}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-teal/40 bg-teal-light/30 px-3 py-1 text-xs font-semibold text-teal transition-colors hover:bg-teal-light/50 disabled:opacity-60 ${className}`}
    >
      <Icon size={13} className={state === 'loading' ? 'animate-spin' : ''} />
      {label}
    </button>
  )
}
