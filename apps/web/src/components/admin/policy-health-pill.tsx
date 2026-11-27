'use client'

// Policy health (pilot: CS-1001 only): a small badge beside each policy on the Policies page. Click it to see the six dimensions and why each is rated as it is.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { stress, useStressMeta, type Band, type PolicyHealth } from '@/lib/stress-client'

export const BAND_STYLE: Record<Band, { label: string; pill: string; dot: string }> = {
  strong:    { label: 'Strong',          pill: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  good:      { label: 'Good',            pill: 'bg-blue-50 text-blue-700 border-blue-200',    dot: 'bg-blue-500' },
  attention: { label: 'Needs attention', pill: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  none:      { label: 'Not assessed',    pill: 'bg-gray-50 text-gray-600 border-gray-200',    dot: 'bg-gray-300' },
}

// One request for the whole page: every pill reads the same result.
let cache: { token: string; at: number; p: Promise<PolicyHealth[]> } | null = null
function loadOnce(token: string): Promise<PolicyHealth[]> {
  if (!cache || cache.token !== token || Date.now() - cache.at > 60_000) cache = { token, at: Date.now(), p: stress.health(token).then(r => r.policies).catch(() => []) }
  return cache.p
}

export function PolicyHealthPill({ policyId }: { policyId: string }) {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const { enabled } = useStressMeta()
  const [h, setH] = useState<PolicyHealth | null | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLSpanElement>(null)

  useEffect(() => { if (enabled && token) loadOnce(token).then(list => setH(list.find(x => x.id === policyId) ?? null)) }, [enabled, token, policyId])
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!enabled || !h) return null
  const st = BAND_STYLE[h.overall]
  return (
    <span ref={box} className="relative inline-block shrink-0">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.pill}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> Health: {st.label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-[360px] rounded-xl border border-gray-200 bg-white p-3 text-left shadow-lg">
          <p className="text-xs font-bold text-neutral-dark">Policy health <span className="font-normal text-neutral-mid">· {h.assessed} of {h.dims.length} assessed</span></p>
          <ul className="mt-2 space-y-2">
            {h.dims.map(d => (
              <li key={d.key} className="flex gap-2 text-xs">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${BAND_STYLE[d.band].dot}`} />
                <span className="min-w-0"><span className="font-semibold text-neutral-dark">{d.label}</span> <span className="text-neutral-mid">· {BAND_STYLE[d.band].label}</span>
                  <span className="block font-normal text-neutral-mid">{d.detail} <Link href={d.href} className="font-semibold text-purple-700 hover:underline">Open</Link></span>
                  {d.checks && (
                    <ul className="mt-1.5 space-y-1 border-l border-gray-100 pl-2">
                      {d.checks.map(c => (
                        <li key={c.key} className="flex items-center gap-1.5 font-normal text-neutral-dark"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${BAND_STYLE[c.band].dot}`} />{c.label}<span className="ml-auto text-neutral-mid">{c.count === 0 ? 'none' : c.count}</span></li>
                      ))}
                    </ul>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-gray-100 pt-2 text-[11px] text-neutral-mid">A roll up of what CareStream already knows about this policy, shown as bands. It is not a compliance rating.</p>
        </div>
      )}
    </span>
  )
}
