'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type SpeechState = 'idle' | 'listening' | 'error'

export interface UseSpeechReturn {
  supported:   boolean
  state:       SpeechState
  start:       () => void
  stop:        () => void
  transcript:  string
}

// Browser speech recognition — works in Chrome, Edge, Safari 15+.
// The hook transcribes speech, appends the transcript to `onTranscript`, and
// resets to idle. The caller decides when to submit.

// `lang` is a BCP-47 locale (e.g. 'pl-PL') so staff can dictate in their own
// language; falls back to the device language, then English.
export function useSpeech(onTranscript: (text: string) => void, lang?: string): UseSpeechReturn {
  const [state,      setState]      = useState<SpeechState>('idle')
  const [transcript, setTranscript] = useState('')
  const recognitionRef              = useRef<any>(null)

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
      : null

  const supported = Boolean(SpeechRecognition)

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setState('idle')
  }, [])

  const start = useCallback(() => {
    if (!SpeechRecognition || state === 'listening') return

    const recognition = new SpeechRecognition()
    recognition.continuous       = false
    recognition.interimResults   = false
    recognition.maxAlternatives  = 1
    // Dictate in the staff member's language when known; else the device language.
    recognition.lang = lang || navigator.language || 'en-GB'

    recognition.onstart = () => {
      setState('listening')
      setTranscript('')
    }

    recognition.onresult = (event: any) => {
      const text = event.results[0]?.[0]?.transcript ?? ''
      setTranscript(text)
      if (text.trim()) onTranscript(text.trim())
    }

    recognition.onerror = (event: any) => {
      // 'no-speech' is a normal outcome (user didn't speak) — treat as idle, not error
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setState('idle')
      } else {
        console.warn('[useSpeech] Recognition error:', event.error)
        setState('error')
        setTimeout(() => setState('idle'), 2000)
      }
    }

    recognition.onend = () => setState('idle')

    recognitionRef.current = recognition
    recognition.start()
  }, [SpeechRecognition, state, onTranscript, lang])

  // Clean up on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort() }
  }, [])

  return { supported, state, start, stop, transcript }
}
