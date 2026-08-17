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
import { CheckCircle2, Lightbulb, RotateCcw, XCircle } from 'lucide-react'
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
      <div className="mb-4 flex flex-wrap gap-2">
        {loose.length ? loose.map(i => tile(i, false))
          : <p className="text-sm text-neutral-mid">Everything placed — check your answers.</p>}
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
      <div className="grid gap-3 sm:grid-cols-2">
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
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="p-5">
        <div className="mb-1 flex items-start justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal">
            <Lightbulb size={13} /> Try it yourself
          </p>
          {token && <ListenButton token={token} text={spoken} />}
        </div>
        {act.title && <p className="text-base font-bold text-neutral-dark">{act.title}</p>}
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
