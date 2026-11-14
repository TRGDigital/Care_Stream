'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'
import { trainingForAudit } from '@/lib/audit-training'

// After an audit: the training that supports it, with a way to give it to the team. It shows the training the
// home linked to this audit (the free CPD courses and/or its own training); with nothing linked it suggests the
// free CPD courses that match. The CPD courses are free for every member of staff on every plan.
type Item = { key: string; title: string; blurb?: string; course?: string }

export function AuditTrainingPanel({ token, templateId, auditName, failing = 0 }: { token?: string; templateId?: string; auditName: string; failing?: number }) {
  const [items, setItems] = useState<Item[]>(() => trainingForAudit(auditName).map(c => ({ key: c.slug, title: c.title, blurb: c.blurb, course: c.slug })))
  const [linked, setLinked] = useState(false)

  useEffect(() => {
    if (!token || !templateId) return
    createApiClient(token).audits.trainingLinks().then(r => {
      const refs = r.links[templateId] ?? []
      if (!refs.length) return
      const next: Item[] = []
      for (const ref of refs) {
        const cpd = r.options.cpd.find(c => c.ref === ref)
        if (cpd) { next.push({ key: ref, title: cpd.title, course: cpd.slug }); continue }
        const own = r.options.own.find(o => o.ref === ref)
        if (own) next.push({ key: ref, title: own.title })
      }
      if (next.length) { setItems(next); setLinked(true) }
    }).catch(() => {})
  }, [token, templateId])

  if (!items.length) return null
  return (
    <div className="overflow-hidden rounded-card bg-white shadow-card">
      <div className="flex items-start gap-3 px-6 py-4">
        <GraduationCap size={18} className="mt-0.5 shrink-0 text-teal" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-neutral-dark">Train your team on this</h2>
          <p className="mt-1 text-sm text-neutral-mid">
            {failing > 0 ? `${failing} check${failing === 1 ? '' : 's'} did not pass. ` : ''}
            {linked ? 'This is the training you linked to this audit.' : 'These free CPD certified courses cover the knowledge behind this audit, free for every member of staff on every plan.'}
          </p>
          <ul className="mt-3 space-y-2">
            {items.map(c => (
              <li key={c.key} className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 bg-neutral-light/40 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-dark">{c.title}</p>
                  {c.blurb && <p className="text-xs text-neutral-mid">{c.blurb}</p>}
                </div>
                <Link href="/training" className="shrink-0 rounded-md bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark">Assign to staff</Link>
                {c.course && <Link href={`/staff-training/${c.course}`} target="_blank" className="shrink-0 text-xs font-medium text-teal hover:underline">See the course</Link>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-neutral-mid">Change this any time from Linked training on the audits page.</p>
        </div>
      </div>
    </div>
  )
}
