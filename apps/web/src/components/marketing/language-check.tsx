'use client'

import { useMemo, useState } from 'react'
import { COURSE_LANGUAGES } from '@/lib/languages'

// "Is my language supported?" on the training pages.
//
// The theme ships this as a real input, and it is worth keeping as one: a manager whose team
// speaks Tagalog wants to see the word Tagalog, not a claim about a number. It answers from
// COURSE_LANGUAGES, the same list the hub uses, so it can never say yes to something the
// product cannot actually deliver.

export function LanguageCheck() {
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()

  const result = useMemo(() => {
    if (!term) return `Over ${COURSE_LANGUAGES.length} languages supported`
    const hit = COURSE_LANGUAGES.find(l => l.name.toLowerCase().startsWith(term))
      ?? COURSE_LANGUAGES.find(l => l.name.toLowerCase().includes(term))
    if (hit) return `Yes, ${hit.name} is supported`
    // Not in the list is not the same as not possible, and saying "no" would be wrong.
    return 'Not on the list. Ask us and we will tell you what is possible.'
  }, [term])

  return (
    <>
      <div className="mlangbox">
        <input type="text" value={q} onChange={e => setQ(e.target.value)}
               placeholder="Type your language"
               aria-label="Check if your language is supported" autoComplete="off" />
      </div>
      <div className="mlangout" aria-live="polite">{result}</div>
    </>
  )
}
