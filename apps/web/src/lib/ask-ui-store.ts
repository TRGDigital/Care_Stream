'use client'

// Whether the Ask CareStream panel is open, expanded, and how wide it is. One small shared store so the header button and the panel (two parts of the admin
// shell) always agree. Open and width are remembered per person in this browser; expanded is never remembered.
import { useSyncExternalStore } from 'react'
import { DEFAULT_W, clampWidth, loadPrefs, savePrefs, loadEditMode, saveEditMode, type EditMode } from './ask-panel-state'

interface State { enabled: boolean; open: boolean; expanded: boolean; width: number; who: string; /** a draft is open for editing: the panel widens (remembered per person, see editMode) */ editing: boolean; editMode: EditMode }
let s: State = { enabled: false, open: false, expanded: false, width: DEFAULT_W, who: '', editing: false, editMode: 'wide' }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const store = (): Storage | null => { try { return typeof window !== 'undefined' ? window.localStorage : null } catch { return null } }
const persist = () => savePrefs(s.who, { open: s.open, width: s.width }, store())

let trigger: HTMLElement | null = null
export const registerAskTrigger = (el: HTMLElement | null) => { trigger = el }
export const focusAskTrigger = () => { try { trigger?.focus() } catch { /* gone */ } }

export const useAskUi = (): State => useSyncExternalStore(subscribe, () => s, () => s)
export function initAskUi(who: string): void {
  if (s.who === who) return
  const p = loadPrefs(who, store())
  s = { ...s, who, open: p.open, width: p.width, expanded: false, editing: false, editMode: loadEditMode(who, store()) }
  emit()
}
export function setAskEnabled(enabled: boolean): void { if (s.enabled !== enabled) { s = { ...s, enabled }; emit() } }
export function openAsk(): void { s = { ...s, open: true }; persist(); emit() }
export function closeAsk(): void { s = { ...s, open: false, expanded: false }; persist(); emit(); focusAskTrigger() }
export function toggleAsk(): void { if (s.open) closeAsk(); else openAsk() }
export function setAskExpanded(expanded: boolean): void { s = { ...s, expanded }; emit() }
export function setAskWidth(w: number): void { s = { ...s, width: clampWidth(w, typeof window !== 'undefined' ? window.innerWidth : undefined) }; persist(); emit() }

/** A draft is open for editing (true) or closed (false): the panel widens and goes back. Never remembered, only the choice of width is. */
export function setAskEditing(editing: boolean): void { if (s.editing !== editing) { s = { ...s, editing }; emit() } }
export function setAskEditMode(editMode: EditMode): void { s = { ...s, editMode }; saveEditMode(s.who, editMode, store()); emit() }
