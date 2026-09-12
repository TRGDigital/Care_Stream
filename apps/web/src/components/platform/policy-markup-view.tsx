'use client'

// The policy, marked up against where it came from.
//
// Reading three thousand words and deciding whether they satisfy twenty-four required
// elements is not something anyone does reliably by eye. This puts the working on the page:
// each section carries the number of the regulation it serves, and every phrase taken from
// what the buyer told us is highlighted as theirs.
//
// The two markings are NOT equally certain, and the page says so rather than leaving a
// reader to assume. A regulation badge is the coverage judge's opinion about which heading
// treats which element. A highlighted fact is a literal match against a value the buyer
// actually gave us, decided by string comparison with no model involved. Presenting them
// identically would lend the judge's guesswork the credibility of the exact match.

import { useEffect, useMemo, useState } from 'react'
import { createPlatformClient, type PolicyMarkup } from '@/lib/platform-api'
import { Loader2, Info, ShieldAlert } from 'lucide-react'

// One colour per regulation. Full class strings so Tailwind keeps them.
const PALETTE = [
  { badge: 'bg-sky-600',     tint: 'bg-sky-50',     ring: 'ring-sky-200',     text: 'text-sky-900' },
  { badge: 'bg-violet-600',  tint: 'bg-violet-50',  ring: 'ring-violet-200',  text: 'text-violet-900' },
  { badge: 'bg-emerald-600', tint: 'bg-emerald-50', ring: 'ring-emerald-200', text: 'text-emerald-900' },
  { badge: 'bg-amber-600',   tint: 'bg-amber-50',   ring: 'ring-amber-200',   text: 'text-amber-900' },
  { badge: 'bg-rose-600',    tint: 'bg-rose-50',    ring: 'ring-rose-200',    text: 'text-rose-900' },
  { badge: 'bg-cyan-600',    tint: 'bg-cyan-50',    ring: 'ring-cyan-200',    text: 'text-cyan-900' },
]
const colour = (i: number) => PALETTE[(i - 1) % PALETTE.length]

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Wrap every occurrence of a supplied fact. Longest first, so "Ferndale Nursing Home"
 *  wins over "Ferndale" and the shorter one does not carve up the longer match. */
function highlightFacts(line: string, facts: PolicyMarkup['facts']): React.ReactNode {
  if (!facts.length) return line
  const ordered = [...facts].sort((a, b) => b.value.length - a.value.length)
  const re = new RegExp(`(${ordered.map(f => escapeRe(f.value)).join('|')})`, 'gi')
  const parts = line.split(re)
  if (parts.length === 1) return line
  return parts.map((part, i) => {
    const hit = ordered.find(f => f.value.toLowerCase() === part.toLowerCase())
    if (!hit) return <span key={i}>{part}</span>
    return (
      <mark key={i} className="rounded bg-yellow-200/70 px-0.5 font-medium text-neutral-dark"
            title={`${hit.label} — from ${hit.source}, supplied by the client`}>
        {part}
      </mark>
    )
  })
}

export function PolicyMarkupView({ token, orderId }: { token: string; orderId: string }) {
  const [markup, setMarkup] = useState<PolicyMarkup | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    createPlatformClient(token).policyGaps.orderMarkup(orderId)
      .then(r => { if (live) setMarkup(r.markup) })
      .catch(e => { if (live) setError(e?.message ?? 'Could not build the marked-up view.') })
    return () => { live = false }
  }, [token, orderId])

  // Which regulation numbers belong against each heading.
  const byHeading = useMemo(() => {
    const m = new Map<string, number[]>()
    for (const r of markup?.regulations ?? []) {
      for (const sec of r.sections) {
        const k = sec.toLowerCase()
        m.set(k, [...(m.get(k) ?? []), r.index])
      }
    }
    return m
  }, [markup])

  if (error) return <p className="px-5 py-6 text-sm text-red-700">{error}</p>
  if (!markup) return (
    <div className="flex items-center gap-2 px-5 py-6 text-sm text-neutral-mid">
      <Loader2 size={16} className="animate-spin text-teal" /> Marking up the policy…
    </div>
  )
  if (!markup.markdown.trim()) return <p className="px-5 py-6 text-sm text-neutral-mid">Nothing written yet.</p>

  const lines = markup.markdown.split('\n')
  const noJudgement = markup.regulations.every(r => r.sections.length === 0)

  return (
    <div className="px-5 py-4">
      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-neutral-light/30 px-4 py-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-dark">Key</p>
        <div className="space-y-1.5">
          {markup.regulations.map(r => {
            const c = colour(r.index)
            return (
              <div key={r.reference_key} className="flex items-start gap-2">
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded text-[11px] font-bold text-white ${c.badge}`}>
                  {r.index}
                </span>
                <p className="text-xs text-neutral-dark">
                  <span className="font-semibold">{r.official_name}</span>
                  <span className="text-neutral-mid">
                    {' '}· {r.authority_basis === 'statutory' ? 'statutory' : 'guidance'}
                    {' '}· {r.elements_met}/{r.elements_total} elements addressed
                    {r.sections.length === 0 && ' · no section attributed'}
                  </span>
                </p>
              </div>
            )
          })}
          <div className="flex items-start gap-2 border-t border-gray-200 pt-1.5">
            <mark className="mt-0.5 rounded bg-yellow-200/70 px-1 text-[11px] font-medium">Aa</mark>
            <p className="text-xs text-neutral-dark">
              <span className="font-semibold">Their own details</span>
              <span className="text-neutral-mid"> · {markup.facts.length} supplied value{markup.facts.length === 1 ? '' : 's'}, matched literally. Hover any to see which question it came from.</span>
            </p>
          </div>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-neutral-mid">
          <Info size={11} className="mt-0.5 shrink-0" />
          A number is the coverage judge&rsquo;s view of which section treats that regulation.
          A highlight is an exact match on something the client told us, with no model involved.
          Trust them accordingly.
        </p>
      </div>

      {noJudgement && (
        <p className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <ShieldAlert size={13} className="mt-0.5 shrink-0" />
          No section has been attributed to a regulation. This draft was verified before the
          judge recorded sections, so re-verify it to get the numbers.
        </p>
      )}

      {/* ── The document ────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-100 bg-white px-5 py-4">
        {lines.map((line, i) => {
          const h2 = /^##\s+(.+)$/.exec(line)
          const h1 = /^#\s+(.+)$/.exec(line)
          const h3 = /^###\s+(.+)$/.exec(line)
          if (h1) return <h1 key={i} className="mb-3 text-lg font-bold text-neutral-dark">{highlightFacts(h1[1], markup.facts)}</h1>
          if (h2) {
            const nums = byHeading.get(h2[1].trim().toLowerCase()) ?? []
            return (
              <div key={i} className="mt-4 flex items-start gap-2">
                <span className="flex shrink-0 gap-1 pt-1">
                  {nums.length > 0
                    ? nums.map(n => (
                        <span key={n} className={`grid h-5 w-5 place-items-center rounded text-[11px] font-bold text-white ${colour(n).badge}`}>{n}</span>
                      ))
                    : <span className="grid h-5 w-5 place-items-center rounded border border-dashed border-gray-300 text-[10px] text-neutral-mid" title="No regulation attributed to this section">·</span>}
                </span>
                <h2 className="text-sm font-bold text-neutral-dark">{highlightFacts(h2[1], markup.facts)}</h2>
              </div>
            )
          }
          if (h3) return <h3 key={i} className="mt-3 pl-7 text-[13px] font-semibold text-neutral-dark">{highlightFacts(h3[1], markup.facts)}</h3>
          if (!line.trim()) return <div key={i} className="h-2" />
          const bullet = /^\s*[-*]\s+(.+)$/.exec(line)
          if (bullet) return <p key={i} className="pl-10 text-[13px] leading-relaxed text-neutral-dark">• {highlightFacts(bullet[1], markup.facts)}</p>
          return <p key={i} className="pl-7 text-[13px] leading-relaxed text-neutral-dark">{highlightFacts(line, markup.facts)}</p>
        })}
      </div>

      {markup.unattributed_sections.length > 0 && (
        <p className="mt-3 text-xs text-neutral-mid">
          <span className="font-semibold text-neutral-dark">{markup.unattributed_sections.length} section
          {markup.unattributed_sections.length === 1 ? '' : 's'} not attributed to any regulation:</span>{' '}
          {markup.unattributed_sections.join(', ')}. Not necessarily wrong. Roles, training, records and
          review are the policy&rsquo;s own scaffolding rather than a response to a specific element.
        </p>
      )}
    </div>
  )
}
