'use client'

import { useEffect, useState } from 'react'

// Types out each word, pauses, deletes it, then moves to the next — looping.
// Starts with the first word already rendered so it is present for SSR/SEO.
export function Typewriter({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0)
  const [text, setText] = useState(words[0] ?? '')
  const [phase, setPhase] = useState<'typing' | 'deleting'>('typing')

  useEffect(() => {
    const current = words[index] ?? ''
    let timeout: ReturnType<typeof setTimeout>

    if (phase === 'typing') {
      if (text.length < current.length) {
        timeout = setTimeout(() => setText(current.slice(0, text.length + 1)), 85)
      } else {
        timeout = setTimeout(() => setPhase('deleting'), 1500)
      }
    } else {
      if (text.length > 0) {
        timeout = setTimeout(() => setText(current.slice(0, text.length - 1)), 45)
      } else {
        timeout = setTimeout(() => {
          setIndex((i) => (i + 1) % words.length)
          setPhase('typing')
        }, 250)
      }
    }

    return () => clearTimeout(timeout)
  }, [text, phase, index, words])

  return (
    <span>
      {text}
      <span
        aria-hidden="true"
        className="ml-1 inline-block h-[0.8em] w-[3px] translate-y-[0.04em] animate-pulse bg-current align-baseline"
      />
    </span>
  )
}
