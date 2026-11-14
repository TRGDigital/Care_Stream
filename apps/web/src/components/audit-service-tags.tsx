import { AUDIT_CATALOGUE, SERVICE_LABEL } from '@/lib/audit-catalogue'

// Small tags showing which care services an audit suits. Matched by audit name against the
// catalogue; your own custom audits have no tags.
const BY_NAME = new Map(AUDIT_CATALOGUE.map(a => [a.name, a.services]))
const TOTAL = Object.keys(SERVICE_LABEL).length

export function auditServices(name: string): string[] | null {
  return BY_NAME.get(name) ?? null
}

export function AuditServiceTags({ name, max = 3 }: { name: string; max?: number }) {
  const svc = auditServices(name)
  if (!svc || !svc.length) return null
  const all = svc.length >= TOTAL
  const shown = all ? [] : svc.slice(0, max)
  const rest = all ? 0 : svc.length - shown.length
  const full = svc.map(s => SERVICE_LABEL[s] ?? s).join(', ')
  const chip = 'rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700'
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1" title={`Suits: ${all ? 'every care service' : full}`}>
      {all
        ? <span className={chip}>All care services</span>
        : shown.map(s => <span key={s} className={chip}>{SERVICE_LABEL[s] ?? s}</span>)}
      {rest > 0 && <span className={chip}>+{rest} more</span>}
    </span>
  )
}
