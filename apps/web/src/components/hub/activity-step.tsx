'use client'

// Interactive lesson activities in the hub. These sit BETWEEN the teaching
// sections of a course, in addition to everything already there — the sections,
// the quick checks and the assessment are untouched.
//
// Three types: put the steps in order, sort items into bins, match a term to
// its meaning. All three are formative: they are not marked against the pass
// mark, the learner can retry freely, and they gate progression only in that
// the lesson asks for an attempt before moving on.
//
// Everything works by TAPPING. Dragging is layered on top for a mouse, never
// required — WCAG 2.2 (2.5.7) wants a single-pointer alternative to any drag,
// and staff take these on phones.

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, CheckCircle2, Info, Lightbulb, MousePointerClick, MoveVertical, RotateCcw, XCircle } from 'lucide-react'
import { ListenButton } from '@/components/hub/listen-button'
import { joinSpoken } from '@/lib/speech'

export type Activity = {
  id: string
  type: 'order' | 'sort' | 'match'
  title: string
  instructions: string
  after_section: number | null
  steps?: string[]
  bins?: Array<{ id: string; name: string; note: string }>
  items?: Array<{ text: string; bin: string }>
  pairs?: Array<{ term: string; definition: string }>
}

// Deterministic shuffle seeded by the activity id, so the order is stable across
// re-renders (React state updates would otherwise reshuffle under the learner).
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const rand = () => { h = (h * 1103515245 + 12345) >>> 0; return h / 4294967296 }
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// How each type works, in plain language — shown in the "i" panel and used as
// the on-screen cue between the question and the answers.
const HOW_TO: Record<Activity['type'], { cue: string; detail: string[] }> = {
  order: {
    cue: 'Drag a row, or use the arrows to move it',
    detail: [
      'The steps below are in the wrong order.',
      'Move them until they read in the order you would actually do them: drag a row by its handle, or use the ▲ and ▼ buttons if that is easier.',
      'Press "Check my answers" when you are happy. Rows that are in the right place turn green; you can keep going until they all are.',
    ],
  },
  sort: {
    cue: 'Tap an item, then tap the box it belongs in',
    detail: [
      'Each item at the top belongs in one of the boxes below.',
      'Tap an item to pick it up, then tap the box you want to put it in. You can drag it instead if you prefer a mouse.',
      'Tap an item you have already placed to take it back out. Press "Check my answers" when everything is placed.',
    ],
  },
  match: {
    cue: 'Tap a term on the left, then its meaning on the right',
    detail: [
      'Every term on the left matches one meaning on the right.',
      'Tap a term to select it, then tap the meaning that goes with it. A correct pair turns green and stays put.',
      'If you pick the wrong meaning it flashes red and nothing is lost — just try another.',
    ],
  },
}

const CARD  = 'rounded-lg border px-3 py-2 text-left text-sm transition-colors'
const IDLE  = 'border-gray-200 text-neutral-dark hover:border-teal/50'
const RIGHT = 'border-green-300 bg-green-50 text-neutral-dark'
const WRONG = 'border-red-300 bg-red-50 text-neutral-dark'
const PICK  = 'border-teal bg-teal-light/40 text-neutral-dark'

// ─── A · put the steps in order ───────────────────────────────────────────────

function OrderActivity({ act, onAttempt }: { act: Activity; onAttempt: () => void }) {
  const correct = act.steps ?? []
  const [order, setOrder] = useState<number[]>(() => {
    const idx = correct.map((_, i) => i)
    const s = seededShuffle(idx, act.id)
    return s.every((v, i) => v === i) ? s.slice().reverse() : s
  })
  const [checked, setChecked] = useState(false)
  const dragFrom = useRef<number | null>(null)

  function move(pos: number, dir: -1 | 1) {
    const to = pos + dir
    if (to < 0 || to >= order.length) return
    const next = order.slice()
    ;[next[pos], next[to]] = [next[to], next[pos]]
    setOrder(next); setChecked(false)
  }
  function drop(to: number) {
    const from = dragFrom.current
    if (from == null || from === to) return
    const next = order.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    dragFrom.current = null
    setOrder(next); setChecked(false)
  }

  const rightCount = order.filter((v, i) => v === i).length
  const allRight = rightCount === correct.length

  return (
    <>
      <Cue type="order" />
      <ul className="space-y-2">
        {order.map((stepIdx, pos) => {
          const state = !checked ? '' : stepIdx === pos ? RIGHT : WRONG
          return (
            <li
              key={stepIdx}
              draggable
              onDragStart={() => { dragFrom.current = pos }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); drop(pos) }}
              className={`flex items-center gap-3 ${CARD} ${state || IDLE}`}
            >
              <span aria-hidden="true" className="cursor-grab select-none text-neutral-mid">⠿</span>
              <span className="flex-1">{correct[stepIdx]}</span>
              <span className="flex shrink-0 flex-col gap-0.5">
                <button type="button" onClick={() => move(pos, -1)} disabled={pos === 0} aria-label={`Move "${correct[stepIdx]}" up`}
                  className="h-5 w-6 rounded border border-gray-200 text-[10px] leading-none text-neutral-mid hover:border-teal hover:text-teal disabled:opacity-30 disabled:hover:border-gray-200">▲</button>
                <button type="button" onClick={() => move(pos, 1)} disabled={pos === order.length - 1} aria-label={`Move "${correct[stepIdx]}" down`}
                  className="h-5 w-6 rounded border border-gray-200 text-[10px] leading-none text-neutral-mid hover:border-teal hover:text-teal disabled:opacity-30 disabled:hover:border-gray-200">▼</button>
              </span>
            </li>
          )
        })}
      </ul>
      <Footer
        onCheck={() => { setChecked(true); onAttempt() }}
        onReset={() => { setOrder(seededShuffle(correct.map((_, i) => i), act.id + 'r')); setChecked(false) }}
        result={!checked ? null : allRight
          ? { ok: true,  text: 'All in the right order.' }
          : { ok: false, text: `${rightCount} of ${correct.length} in the right place — the green rows are correct.` }}
      />
    </>
  )
}

// ─── B · sort into bins ───────────────────────────────────────────────────────

function SortActivity({ act, onAttempt }: { act: Activity; onAttempt: () => void }) {
  const bins = act.bins ?? []
  const items = act.items ?? []
  const shuffled = useMemo(() => seededShuffle(items.map((_, i) => i), act.id), [act.id, items.length])
  const [placed, setPlaced] = useState<Record<number, string>>({})
  const [picked, setPicked] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const dragItem = useRef<number | null>(null)

  function place(i: number, binId: string) {
    setPlaced(p => ({ ...p, [i]: binId })); setPicked(null); setChecked(false)
  }
  function lift(i: number) {
    setPlaced(p => { const n = { ...p }; delete n[i]; return n })
    setPicked(i); setChecked(false)
  }
  function tile(i: number, inBin: boolean) {
    const state = !checked || !inBin ? '' : placed[i] === items[i].bin ? RIGHT : WRONG
    return (
      <button
        key={i}
        type="button"
        draggable
        onDragStart={() => { dragItem.current = i }}
        onClick={() => (inBin ? lift(i) : setPicked(picked === i ? null : i))}
        aria-pressed={picked === i}
        className={`${CARD} ${state || (picked === i ? PICK : IDLE)} ${inBin ? 'w-full' : ''}`}
      >
        {items[i].text}
      </button>
    )
  }

  const loose = shuffled.filter(i => placed[i] === undefined)
  const done = Object.keys(placed).length
  const rightCount = items.filter((it, i) => placed[i] === it.bin).length

  return (
    <>
      <Cue type="sort" />
      <div className="mb-2 flex flex-wrap gap-2">
        {loose.length ? loose.map(i => tile(i, false))
          : <p className="text-sm text-neutral-mid">Everything placed — check your answers.</p>}
      </div>
      {/* Points from the items down into the boxes they get sorted into */}
      <div aria-hidden="true" className="mb-2 flex items-center justify-center gap-2 text-amber-brand">
        <span className="h-px w-10 bg-amber-brand/25" />
        <ArrowDown size={16} />
        <span className="h-px w-10 bg-amber-brand/25" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {bins.map(bin => (
          <div
            key={bin.id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); if (dragItem.current != null) { place(dragItem.current, bin.id); dragItem.current = null } }}
            onClick={() => { if (picked != null) place(picked, bin.id) }}
            className={`rounded-xl border-2 border-dashed p-3 transition-colors ${picked != null ? 'border-teal bg-teal-light/20' : 'border-gray-200 bg-neutral-light/30'}`}
          >
            <p className="text-sm font-semibold text-neutral-dark">{bin.name}</p>
            {bin.note && <p className="mb-2 text-xs text-neutral-mid">{bin.note}</p>}
            <div className="flex flex-col gap-1.5">
              {items.map((_, i) => (placed[i] === bin.id ? tile(i, true) : null))}
            </div>
            {picked != null && (
              <button type="button" onClick={() => place(picked, bin.id)}
                className="mt-2 w-full rounded-lg border border-teal/40 bg-white px-2 py-1 text-xs font-semibold text-teal hover:bg-teal-light/40">
                Put it here
              </button>
            )}
          </div>
        ))}
      </div>
      <Footer
        onCheck={() => { setChecked(true); onAttempt() }}
        onReset={() => { setPlaced({}); setPicked(null); setChecked(false) }}
        checkDisabled={done === 0}
        result={!checked ? null : rightCount === items.length
          ? { ok: true,  text: 'All in the right place.' }
          : { ok: false, text: `${rightCount} of ${items.length} correct — tap a red one to move it.` }}
      />
    </>
  )
}

// ─── F · match the pairs ──────────────────────────────────────────────────────

function MatchActivity({ act, onAttempt }: { act: Activity; onAttempt: () => void }) {
  const pairs = act.pairs ?? []
  const rightOrder = useMemo(() => seededShuffle(pairs.map((_, i) => i), act.id), [act.id, pairs.length])
  const [picked, setPicked] = useState<number | null>(null)
  const [solved, setSolved] = useState<number[]>([])
  const [miss, setMiss] = useState<number | null>(null)

  useEffect(() => {
    if (miss == null) return
    const t = setTimeout(() => setMiss(null), 700)
    return () => clearTimeout(t)
  }, [miss])

  function choose(defIdx: number) {
    if (picked == null || solved.includes(defIdx)) return
    if (defIdx === picked) {
      const next = [...solved, defIdx]
      setSolved(next); setPicked(null)
      if (next.length === pairs.length) onAttempt()
    } else {
      setMiss(defIdx)
    }
  }

  return (
    <>
      <Cue type="match" />
      <div className="relative grid gap-3 sm:grid-cols-2">
        {/* Points from the terms across to the meanings they belong to */}
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-8 hidden -translate-x-1/2 sm:block">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-brand/40 bg-white text-amber-brand shadow-sm">
            <ArrowRight size={14} />
          </span>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">Term</p>
          <div className="flex flex-col gap-2">
            {pairs.map((p, i) => {
              const done = solved.includes(i)
              return (
                <button key={i} type="button" disabled={done} onClick={() => setPicked(picked === i ? null : i)}
                  aria-pressed={picked === i}
                  className={`${CARD} ${done ? RIGHT : picked === i ? PICK : IDLE}`}>
                  {done && <CheckCircle2 size={13} className="mr-1.5 inline text-green-600" />}
                  {p.term}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">Meaning</p>
          <div className="flex flex-col gap-2">
            {rightOrder.map(i => {
              const done = solved.includes(i)
              return (
                <button key={i} type="button" disabled={done} onClick={() => choose(i)}
                  className={`${CARD} ${done ? RIGHT : miss === i ? WRONG : IDLE}`}>
                  {pairs[i].definition}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <Footer
        onReset={() => { setSolved([]); setPicked(null); setMiss(null) }}
        result={solved.length === pairs.length
          ? { ok: true, text: 'All matched.' }
          : picked == null && solved.length === 0
            ? null
            : { ok: false, text: `${solved.length} of ${pairs.length} matched.` }}
      />
    </>
  )
}

// ─── shared cue + help ────────────────────────────────────────────────────────

// The one-line "what do I do here" that sits between the instructions and the
// thing the learner has to act on.
function Cue({ type }: { type: Activity['type'] }) {
  const Icon = type === 'order' ? MoveVertical : type === 'sort' ? ArrowDown : ArrowRight
  return (
    <p className="mb-3 flex items-center gap-2 rounded-lg bg-amber-brand/[0.07] px-3 py-2 text-xs font-semibold text-amber-brand">
      <Icon size={14} className="shrink-0" /> {HOW_TO[type].cue}
    </p>
  )
}

// "How this works" — opens on hover, on keyboard focus and on tap, so it is
// reachable however the learner is using the page.
function HowToButton({ type }: { type: Activity['type'] }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        aria-label="How to use this exercise"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-brand/40 text-amber-brand transition-colors hover:bg-amber-brand hover:text-white"
      >
        <Info size={12} />
      </button>
      {open && (
        <span role="tooltip"
          className="absolute left-0 top-7 z-30 w-72 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-elevated sm:w-80">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-amber-brand">How this works</span>
          {HOW_TO[type].detail.map((d, i) => (
            <span key={i} className="mb-1.5 block text-xs leading-relaxed text-neutral-dark last:mb-0">{d}</span>
          ))}
          <span className="mt-2 block border-t border-gray-100 pt-2 text-[11px] text-neutral-mid">
            Nothing here is marked — it will not change your score.
          </span>
        </span>
      )}
    </span>
  )
}

// ─── shared footer ────────────────────────────────────────────────────────────

function Footer({ onCheck, onReset, result, checkDisabled }: {
  onCheck?: () => void
  onReset: () => void
  result: { ok: boolean; text: string } | null
  checkDisabled?: boolean
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      {onCheck && (
        <button type="button" onClick={onCheck} disabled={checkDisabled}
          className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-40">
          Check my answers
        </button>
      )}
      <button type="button" onClick={onReset}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-neutral-mid hover:border-teal/40 hover:text-teal">
        <RotateCcw size={13} /> Start again
      </button>
      {result && (
        <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${result.ok ? 'text-green-600' : 'text-amber-600'}`}>
          {result.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {result.text}
        </span>
      )}
    </div>
  )
}

// ─── the step ─────────────────────────────────────────────────────────────────

// token is optional: the platform preview renders the same activity without a
// staff session, so there is nobody to bill the Listen audio to.
export function ActivityStep({ token, act, onAttempt }: { token?: string; act: Activity; onAttempt?: () => void }) {
  const attempted = onAttempt ?? (() => {})
  const spoken = joinSpoken([
    act.title,
    act.instructions,
    act.type === 'order' ? 'The steps to put in order are' : null,
    ...(act.type === 'order' ? (act.steps ?? []) : []),
    act.type === 'match' ? 'The terms are' : null,
    ...(act.type === 'match' ? (act.pairs ?? []).map(p => p.term) : []),
    act.type === 'sort' ? 'The items to sort are' : null,
    ...(act.type === 'sort' ? (act.items ?? []).map(i => i.text) : []),
  ])

  return (
    // Amber outline so an activity is visibly a different kind of step from the
    // teaching sections and quick checks around it — and the same colour the
    // author sees against that section in the module editor.
    // No overflow-hidden: the "How this works" panel has to escape the card.
    <div className="rounded-xl border-2 border-amber-brand/45 bg-white shadow-[0_1px_3px_rgba(232,133,10,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-[10px] border-b border-amber-brand/15 bg-amber-brand/[0.06] px-5 py-2.5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-brand">
          <Lightbulb size={13} /> Try it yourself
          <HowToButton type={act.type} />
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-brand ring-1 ring-amber-brand/25">
          <MousePointerClick size={12} /> CareStream Interactive
        </span>
      </div>

      <div className="p-5">
        <div className="mb-1 flex items-start justify-between gap-3">
          {act.title && <p className="text-base font-bold text-neutral-dark">{act.title}</p>}
          {token && <ListenButton token={token} text={spoken} className="mt-0.5" />}
        </div>
        {act.instructions && <p className="mb-4 mt-1 text-sm text-neutral-mid">{act.instructions}</p>}
        {act.type === 'order' && <OrderActivity act={act} onAttempt={attempted} />}
        {act.type === 'sort'  && <SortActivity  act={act} onAttempt={attempted} />}
        {act.type === 'match' && <MatchActivity act={act} onAttempt={attempted} />}
        <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-neutral-mid">
          This exercise is here to help you practise — it is not marked and does not affect your result.
        </p>
      </div>
    </div>
  )
}
