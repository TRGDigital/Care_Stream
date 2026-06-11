'use client'

import { useEffect, useState } from 'react'

// Types each word, pauses, deletes it, then moves to the next. Loops through the
// full list `rounds` times, then types the first word again and rests on it.
// Starts with the first word already rendered so it is present for SSR/SEO.
export function Typewriter({ words, rounds = 2 }: { words: string[]; rounds?: number }) {
  const [index, setIndex] = useState(0)
  const [text, setText] = useState(words[0] ?? '')
  const [phase, setPhase] = useState<'typing' | 'deleting'>('typing')
  const [loops, setLoops] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) return
    const current = words[index] ?? ''
    let timeout: ReturnType<typeof setTimeout>

    if (phase === 'typing') {
      if (text.length < current.length) {
        timeout = setTimeout(() => setText(current.slice(0, text.length + 1)), 85)
      } else if (index === 0 && loops >= rounds) {
        // Been around `rounds` times — rest on the first word.
        setDone(true)
      } else {
        timeout = setTimeout(() => setPhase('deleting'), 1500)
      }
    } else {
      if (text.length > 0) {
        timeout = setTimeout(() => setText(current.slice(0, text.length - 1)), 45)
      } else {
        timeout = setTimeout(() => {
          const next = (index + 1) % words.length
          if (next === 0) setLoops((l) => l + 1)
          setIndex(next)
          setPhase('typing')
        }, 250)
      }
    }

    return () => clearTimeout(timeout)
  }, [text, phase, index, loops, done, rounds, words])

  // Reserve the widest word's width so the rest of the sentence never re-wraps
  // as the word animates (the main source of hero layout shift / CLS). The hidden
  // sizer and the live text occupy the same grid cell, so the slot is always as
  // wide as the longest word and the surrounding text stays put.
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), words[0] ?? '')

  return (
    <span className="relative inline-grid align-baseline">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 whitespace-nowrap">
        {longest}
      </span>
      <span className="col-start-1 row-start-1 justify-self-start whitespace-nowrap">
        {text}
        {!done && (
          <span
            aria-hidden="true"
            className="ml-1 inline-block h-[0.8em] w-[3px] translate-y-[0.04em] animate-pulse bg-current align-baseline"
          />
        )}
      </span>
    </span>
  )
}
