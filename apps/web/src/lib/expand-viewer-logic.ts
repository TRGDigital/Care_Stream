// The rules of the full screen viewer, kept apart from the screen so they can be tested on their own: zoom limits, page stepping, fit to the box, which key does what, and where
// Tab goes (the viewer keeps focus inside itself). No React in here.
export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 3
export const ZOOM_STEP = 0.25

const round2 = (n: number) => Math.round(n * 100) / 100
export const clampZoom = (z: number): number => (Number.isFinite(z) ? round2(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))) : 1)
export const zoomIn = (z: number): number => clampZoom(z + ZOOM_STEP)
export const zoomOut = (z: number): number => clampZoom(z - ZOOM_STEP)
export const canZoomIn = (z: number): boolean => z < ZOOM_MAX - 1e-9
export const canZoomOut = (z: number): boolean => z > ZOOM_MIN + 1e-9
export const zoomLabel = (z: number): string => `${Math.round(clampZoom(z) * 100)}%`

/** A page number kept inside 0 to count minus 1. With no pages it is 0. */
export const clampPage = (i: number, count: number): number => (count <= 0 || !Number.isFinite(i) ? 0 : Math.min(count - 1, Math.max(0, Math.trunc(i))))
export const stepPage = (i: number, count: number, dir: 1 | -1): number => clampPage(i + dir, count)
export const hasPrev = (i: number): boolean => i > 0
export const hasNext = (i: number, count: number): boolean => i < count - 1
export const pageLabel = (i: number, count: number): string => `Page ${clampPage(i, count) + 1} of ${Math.max(1, count)}`

/** The scale that makes a page of contentW by contentH fit inside a box, never enlarging it past its own size. Zero sizes fit at 1. */
export function fitScale(contentW: number, contentH: number, boxW: number, boxH: number): number {
  if (!(contentW > 0) || !(contentH > 0) || !(boxW > 0) || !(boxH > 0)) return 1
  return Math.min(1, boxW / contentW, boxH / contentH)
}

export type ViewerAction = 'close' | 'prev' | 'next' | 'zoomIn' | 'zoomOut' | 'reset' | null
/** What a key press means inside the viewer. Escape closes; the arrows step pages; plus, minus and 0 zoom. */
export function viewerKey(key: string, o: { pages: number; page: number }): ViewerAction {
  if (key === 'Escape' || key === 'Esc') return 'close'
  if (key === 'ArrowLeft' || key === 'PageUp') return hasPrev(o.page) ? 'prev' : null
  if (key === 'ArrowRight' || key === 'PageDown') return hasNext(o.page, o.pages) ? 'next' : null
  if (key === '+' || key === '=') return 'zoomIn'
  if (key === '-' || key === '_') return 'zoomOut'
  if (key === '0') return 'reset'
  return null
}
/** Enter or Space on a picture, a thumbnail or an Expand button opens it. */
export const isActivateKey = (key: string): boolean => key === 'Enter' || key === ' ' || key === 'Spacebar'

/** Where Tab goes when focus must stay inside the viewer: the index of the element to focus, wrapping at both ends. null means leave it to the browser. */
export function trapTab(activeIndex: number, count: number, shift: boolean): number | null {
  if (count <= 0) return null
  if (activeIndex < 0) return shift ? count - 1 : 0          // focus is outside the viewer: bring it in
  if (shift && activeIndex === 0) return count - 1
  if (!shift && activeIndex === count - 1) return 0
  return null
}
