// The rules behind the floating support chat (pure, so they are tested). The widget is in components/support/chat-widget.tsx.

/** How often to ask for new messages, or null for not at all. Open: every 3 seconds. Minimised with a live chat: every 8 seconds.
 *  No chat, or the browser tab is hidden: never (a status check happens only when the panel is opened). */
export function pollIntervalMs(o: { hasChat: boolean; open: boolean; tabHidden: boolean }): number | null {
  if (!o.hasChat || o.tabHidden) return null
  return o.open ? 3000 : 8000
}

/** Messages in `incoming` that are not already in `existing` (by id), in order. */
export function freshMessages<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const seen = new Set(existing.map(m => m.id))
  return incoming.filter(m => !seen.has(m.id))
}

/** How many of the new messages are from the team (they are what the unread badge counts). */
export function countAgentMessages(messages: Array<{ sender: string }>): number {
  return messages.filter(m => m.sender === 'agent').length
}

export const WIDGET_KEY = 'cs-support-chat'
export const SOUND_KEY = 'cs-support-chat-sound'
export interface WidgetState { open: boolean; chatId: string | null }
type Store = Pick<Storage, 'getItem' | 'setItem'> | null | undefined

export function readWidgetState(store: Store): WidgetState {
  try {
    const raw = store?.getItem(WIDGET_KEY)
    if (!raw) return { open: false, chatId: null }
    const v = JSON.parse(raw)
    return { open: v?.open === true, chatId: typeof v?.chatId === 'string' && v.chatId ? v.chatId : null }
  } catch { return { open: false, chatId: null } }
}
export function writeWidgetState(store: Store, s: WidgetState): void {
  try { store?.setItem(WIDGET_KEY, JSON.stringify({ open: !!s.open, chatId: s.chatId ?? null })) } catch { /* storage blocked: the widget still works, it just forgets on reload */ }
}
export const readSoundOn = (store: Store): boolean => { try { return store?.getItem(SOUND_KEY) === '1' } catch { return false } }
export const writeSoundOn = (store: Store, on: boolean): void => { try { store?.setItem(SOUND_KEY, on ? '1' : '0') } catch { /* ignore */ } }

/** The browser tab title with the unread count in front, or the plain title when there is nothing unread. */
export function titleWithUnread(base: string, unread: number): string {
  const clean = base.replace(/^\(\d+\)\s+/, '')
  return unread > 0 ? `(${unread}) ${clean}` : clean
}

/** The event the support menu sends to open the widget. */
export const OPEN_EVENT = 'cs:open-support-chat'
