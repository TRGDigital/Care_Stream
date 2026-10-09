'use client'

import { useEffect, useState } from 'react'
import { fiAttribution } from '@/lib/funnel-insights'

// Add to basket button tests, run from Funnel Insights (trg-funnel-insights.vercel.app › Buttons).
// A live test names a shop (scope), a button position and its variants: wording ({price} is
// replaced by the button's price) and a colour from a fixed palette. Each visit gets one variant
// per test, chosen from the visit's anonymous Funnel Insights session id, so nothing is stored on
// the device and the choice holds for the whole visit. With no live test, a failed fetch, or no
// session yet, the page shows its normal button: tests can only ever change wording and colour.

export type CtaScope = 'training' | 'policies' | 'bundles'
type Variant = { key: string; label?: string; tone?: string; weight?: number }
type Test = { id: string; scope: string; position: string; variants: Variant[] }

const URL_ = 'https://trg-funnel-insights.vercel.app/api/cta-config?site=carestream'
let tests: Promise<Test[]> | null = null
const load = () => {
  if (!tests) {
    tests = Promise.race([
      fetch(URL_).then(r => (r.ok ? r.json() : { tests: [] })).then(j => (Array.isArray(j?.tests) ? j.tests as Test[] : [])),
      new Promise<Test[]>(res => setTimeout(() => res([]), 2500)),
    ]).catch(() => [] as Test[])
  }
  return tests
}

/** The colours a test may use: the site's own button colours, all with readable text. */
export const TONES: Record<string, { background: string; color: string }> = {
  orange: { background: '#F28C38', color: '#1F1530' },
  green: { background: '#1F8A5B', color: '#ffffff' },
  purple: { background: '#6D3FC0', color: '#ffffff' },
  dark: { background: '#1F1530', color: '#ffffff' },
}

// FNV-1a: the same session and test always land on the same variant.
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const seen = new Set<string>()

export type CtaChoice = { test: string; variant: string; label?: string; style?: { background: string; color: string } }

/** The variant of a live test for this button, or null for the normal button. */
export function useCtaTest(scope: CtaScope, position: string, price?: string): CtaChoice | null {
  const [choice, setChoice] = useState<CtaChoice | null>(null)
  useEffect(() => {
    let alive = true
    load().then(list => {
      const t = list.find(x => (x.scope === scope || x.scope === 'all') && x.position === position)
      if (!t || !alive) return
      const session = fiAttribution()?.session
      const vs = (t.variants || []).filter(v => v && v.key && (v.weight ?? 0) > 0)
      if (!session || !vs.length) return
      const total = vs.reduce((n, v) => n + (v.weight as number), 0)
      let r = hash(`${session}:${t.id}`) % total, pick = vs[0]
      for (const v of vs) { if (r < (v.weight as number)) { pick = v; break } r -= v.weight as number }
      let label = pick.label?.trim() || undefined
      if (label && /\{price\}/.test(label)) label = price ? label.replace(/\{price\}/g, price) : undefined
      const c: CtaChoice = { test: t.id, variant: pick.key, label, style: pick.tone ? TONES[pick.tone] : undefined }
      const k = `${t.id}:${position}`
      if (!seen.has(k)) {
        seen.add(k)
        try { (window as unknown as { fi?: { ctaSeen?: (a: string, b: string, c: string) => void } }).fi?.ctaSeen?.(t.id, pick.key, position) } catch { /* never in the way */ }
      }
      setChoice(c)
    })
    return () => { alive = false }
  }, [scope, position, price])
  return choice
}
