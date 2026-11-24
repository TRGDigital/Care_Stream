// Feature requests and bug reports share one table and one inbox. Pure helpers, so they can be tested without a database.
export type RequestKind = 'feature' | 'bug'
export const normaliseKind = (v: unknown): RequestKind => (String(v ?? '').toLowerCase() === 'bug' ? 'bug' : 'feature')
/** The page a report was raised from: only an http(s) address, trimmed, never longer than 500 characters. */
export function cleanPageUrl(v: unknown): string | null {
  const s = String(v ?? '').trim().slice(0, 500)
  return /^https?:\/\/\S+$/i.test(s) ? s : null
}
export const emailSubjectFor = (kind: RequestKind, tenantName: string, title: string) =>
  kind === 'bug' ? `Bug report from ${tenantName}: ${title}` : `Feature request from ${tenantName}: ${title}`
