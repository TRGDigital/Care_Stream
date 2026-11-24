'use client'

// Pages tell the Ask CareStream panel what the admin is looking at. A page calls useAskPageContext({...}) and the panel offers matching questions.
// The context is only a pointer (a page name, a staff or resident id, a year or month). It is also announced as a window event, 'cs:ask-context'.
import { useEffect, useSyncExternalStore } from 'react'
import { sameContext, type AskPageContext } from './ask-panel-state'

export const ASK_CONTEXT_EVENT = 'cs:ask-context'
let current: AskPageContext | null = null
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export function setAskContext(c: AskPageContext | null): void {
  if (sameContext(current, c)) return
  current = c
  listeners.forEach(l => l())
  try { window.dispatchEvent(new CustomEvent(ASK_CONTEXT_EVENT, { detail: c })) } catch { /* no window */ }
}
export const getAskContext = (): AskPageContext | null => current
export const useAskContext = (): AskPageContext | null => useSyncExternalStore(subscribe, () => current, () => null)

/** Publishes the context while the calling page is on screen, and clears it when the page goes away. Pass null to publish nothing. */
export function useAskPageContext(ctx: AskPageContext | null): void {
  const key = ctx ? JSON.stringify(ctx) : ''
  useEffect(() => {
    if (!ctx) return
    setAskContext(ctx)
    return () => { if (sameContext(getAskContext(), ctx)) setAskContext(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
