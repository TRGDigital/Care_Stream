// What Ask CareStream will NEVER do itself. For each of these the agent hands the administrator a link to the right screen instead. There is deliberately no action type,
// no tool and no execute path for any of them (a test checks the names in ACTION_TYPES and in the tool list).
export interface TierC { key: string; words: RegExp; label: string; link: string }
export const TIER_C: TierC[] = [
  { key: 'pay', words: /\b(change|raise|increase|update|set|edit)\b.*\b(pay|rate|salary|wage)\b|\bpay rise\b/i, label: 'Changing pay', link: '/staff' },
  { key: 'holiday', words: /\b(approve|reject|decline|edit|change|remove|delete|cancel)\b.*\b(holiday|leave)\b/i, label: 'Approving, editing or removing holiday', link: '/holiday' },
  { key: 'staff', words: /\b(archive|remove|delete|deactivate|dismiss|sack)\b.*\b(staff|member|person|employee)\b/i, label: 'Removing or archiving staff', link: '/staff' },
  { key: 'permissions', words: /\b(permission|role|admin rights|make .* an? admin)\b/i, label: 'Changing permissions', link: '/staff' },
  { key: 'sickness', words: /\b(sick|sickness|absence)\b/i, label: 'Sickness records', link: '/holiday' },
  { key: 'financial', words: /\b(fee|invoice|payment|refund|price|charge)\b.*\b(change|set|send|take|issue)\b/i, label: 'Anything financial', link: '/knowledge' },
]
/** A plain note the agent can use when asked for one of these: what it cannot do, and where to do it. */
export function tierCNote(request: string): { label: string; link: string } | null {
  const t = TIER_C.find(x => x.words.test(request))
  return t ? { label: t.label, link: t.link } : null
}
