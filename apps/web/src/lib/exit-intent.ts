// "The visitor is leaving through the top of the window": one rule for every exit popup on the site.
//
// A real mouse does not report the edge. Moving fast toward the tabs, the last position the page hears about is often 30 to 100px
// below the top. So the rule is: the pointer leaves the window (no element to enter) and EITHER its last position is within
// 24px of the top, OR it was moving upward a moment ago and was within 120px. Calls onExit on every such leave; callers decide
// how often they act (once a visit, and so on).

export const TOP_EDGE_PX = 24
export const UP_ZONE_PX = 120
const UP_WINDOW_MS = 400

export function isTopExit(clientY: number, movingUp: boolean): boolean {
  return clientY <= TOP_EDGE_PX || (movingUp && clientY <= UP_ZONE_PX)
}

export function watchTopExit(onExit: () => void): () => void {
  let lastY = NaN, dy = 0, at = 0
  const move = (e: MouseEvent) => { dy = Number.isFinite(lastY) ? e.clientY - lastY : 0; lastY = e.clientY; at = Date.now() }
  const out = (e: MouseEvent) => {
    if (e.relatedTarget) return                           // moved to another element in the page, not out of the window
    if (isTopExit(e.clientY, Date.now() - at < UP_WINDOW_MS && dy < 0)) onExit()
  }
  document.addEventListener('mousemove', move, { passive: true })
  document.addEventListener('mouseout', out)
  document.documentElement.addEventListener('mouseleave', out)
  return () => {
    document.removeEventListener('mousemove', move)
    document.removeEventListener('mouseout', out)
    document.documentElement.removeEventListener('mouseleave', out)
  }
}
