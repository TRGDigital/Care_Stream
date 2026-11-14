import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { trainingForAudit } from '@/lib/audit-training'

// After an audit: the free CPD certified courses that cover the knowledge behind it, with a way to give them to
// the team. Free on every plan. Shown on the completed audit and on the staff hub summary.
export function AuditTrainingPanel({ auditName, failing = 0 }: { auditName: string; failing?: number }) {
  const courses = trainingForAudit(auditName)
  if (!courses.length) return null
  return (
    <div className="overflow-hidden rounded-card bg-white shadow-card">
      <div className="flex items-start gap-3 px-6 py-4">
        <GraduationCap size={18} className="mt-0.5 shrink-0 text-teal" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-neutral-dark">Train your team on this</h2>
          <p className="mt-1 text-sm text-neutral-mid">
            {failing > 0
              ? `${failing} check${failing === 1 ? '' : 's'} did not pass. `
              : ''}
            These CPD certified courses cover the knowledge behind this audit. They are free for every member of staff on every plan.
          </p>
          <ul className="mt-3 space-y-2">
            {courses.map(c => (
              <li key={c.slug} className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 bg-neutral-light/40 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-dark">{c.title}</p>
                  <p className="text-xs text-neutral-mid">{c.blurb}</p>
                </div>
                <Link href="/training" className="shrink-0 rounded-md bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark">Assign to staff</Link>
                <Link href={`/staff-training/${c.slug}`} target="_blank" className="shrink-0 text-xs font-medium text-teal hover:underline">See the course</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
