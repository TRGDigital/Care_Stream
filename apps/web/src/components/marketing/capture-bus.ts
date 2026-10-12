'use client'

import { useEffect, useState } from 'react'

// Lets things on the page (the "Hold my price" line under the buy panel) open the email capture
// overlay and know whether they should show. The overlay owns the campaign and the visitor's variant;
// it publishes canHold (an offer to hold, not the control group, not already signed up) here.

export type CaptureOrigin = 'overlay' | 'tab' | 'hold' | 'exit'
type State = { ready: boolean; canHold: boolean }

let state: State = { ready: false, canHold: false }
const subs = new Set<(s: State) => void>()

export function setCaptureState(next: State) {
  if (next.ready === state.ready && next.canHold === state.canHold) return
  state = next
  subs.forEach(f => f(state))
}

export function useCaptureState(): State {
  const [s, set] = useState(state)
  useEffect(() => { subs.add(set); set(state); return () => { subs.delete(set) } }, [])
  return s
}

export function openCapture(origin: CaptureOrigin) {
  window.dispatchEvent(new CustomEvent('cs-capture-open', { detail: { origin } }))
}
