// The "Before you send" checklist band: open by default the first three times a person sees it, then collapsed, and from then on it stays as they left it. Pure functions, tested.
export interface NoticePrefs { seen: number; ids: string[]; open: boolean | null }
export const EMPTY_NOTICE: NoticePrefs = { seen: 0, ids: [], open: null }
export const noticeKey = (who: string) => `cs-ask-notice-v1:${String(who || 'guest').toLowerCase()}`

export function parseNotice(raw: string | null | undefined): NoticePrefs {
  try {
    const j = JSON.parse(String(raw ?? ''))
    return { seen: Number.isFinite(j?.seen) ? Math.max(0, Math.floor(j.seen)) : 0, ids: Array.isArray(j?.ids) ? j.ids.map(String).slice(-60) : [], open: typeof j?.open === 'boolean' ? j.open : null }
  } catch { return { ...EMPTY_NOTICE } }
}

/** A draft with a checklist has been opened: count it once, and say whether the band starts open. */
export function openNotice(prefs: NoticePrefs, docId: string): { prefs: NoticePrefs; open: boolean } {
  const first = !prefs.ids.includes(docId)
  const next: NoticePrefs = first ? { ...prefs, seen: prefs.seen + 1, ids: [...prefs.ids, docId].slice(-60) } : prefs
  return { prefs: next, open: next.open ?? next.seen <= 3 }
}
export const setNoticeOpen = (prefs: NoticePrefs, open: boolean): NoticePrefs => ({ ...prefs, open })
