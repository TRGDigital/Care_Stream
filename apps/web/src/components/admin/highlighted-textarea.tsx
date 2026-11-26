'use client'

// The edit box for wording about to be adopted, with the words that were added or changed (a woven in name, a replaced name) highlighted IN the box, the way the policy on the right highlights
// passages. A box cannot colour its own words, so a highlight layer sits behind a transparent box and both show exactly the same text. The box grows to fit its text, so neither has a scroll bar and the two stay lined up.
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { diffAdded } from '@/lib/text-diff'

const SHARED = 'w-full px-2 py-1.5 text-sm leading-relaxed'

export function HighlightedTextarea({ value, onChange, baseline, textareaRef, rows = 5 }: {
  value: string
  onChange: (v: string) => void
  /** The wording as first suggested: anything not in it is highlighted. */
  baseline: string
  textareaRef?: RefObject<HTMLTextAreaElement>
  rows?: number
}) {
  const own = useRef<HTMLTextAreaElement>(null)
  const ref = textareaRef ?? own
  const segments = useMemo(() => diffAdded(baseline, value), [baseline, value])
  const fit = () => { const ta = ref.current; if (!ta) return; ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight + 2}px` }
  useLayoutEffect(() => { fit() }, [value])   // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit) }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative mt-0.5 rounded-md bg-white">
      <div aria-hidden="true" className={`${SHARED} pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-md border border-transparent text-transparent`}>
        {segments.map((s, i) => s.added
          ? <mark key={i} className="rounded-sm bg-emerald-200 text-transparent">{s.text}</mark>
          : <span key={i}>{s.text}</span>)}
        {' '}
      </div>
      <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} rows={rows}
        className={`${SHARED} relative block resize-none overflow-hidden rounded-md border border-gray-200 bg-transparent focus:border-teal focus:outline-none`} />
    </div>
  )
}
