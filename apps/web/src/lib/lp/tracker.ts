// Client-side engagement tracker for landing pages. Module-singleton; only ever
// imported by client components. Batches events to /public/lp/events.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type QueuedEvent = { event_type: string; field_name?: string | null; metadata?: unknown }

let pageId = ''
let sessionId = ''
let startedAt = 0
let queue: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let listenersBound = false

function ensureSession(): string {
  if (sessionId) return sessionId
  try {
    sessionId = sessionStorage.getItem('lp_sid') || crypto.randomUUID()
    sessionStorage.setItem('lp_sid', sessionId)
  } catch {
    sessionId = Math.random().toString(36).slice(2)
  }
  return sessionId
}

export function initTracker(id: string): void {
  pageId = id
  startedAt = Date.now()
  ensureSession()
  if (!listenersBound && typeof window !== 'undefined') {
    listenersBound = true
    const onLeave = () => flush(true)
    window.addEventListener('pagehide', onLeave)
    window.addEventListener('beforeunload', onLeave)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true) })
  }
}

export function track(eventType: string, fieldName?: string | null, metadata?: unknown): void {
  if (!pageId) return
  queue.push({ event_type: eventType, field_name: fieldName ?? null, metadata: metadata ?? null })
  if (!flushTimer) flushTimer = setTimeout(() => flush(false), 5000)
}

function flush(useBeacon: boolean): void {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
  if (!pageId || queue.length === 0) return
  const batch = queue.splice(0, queue.length)
  const body = JSON.stringify({ landing_page_id: pageId, session_id: ensureSession(), events: batch })
  const url = `${API_URL}/public/lp/events`
  try {
    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    } else {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
  } catch {
    // never throw from tracking
  }
}

// Attribution captured at submit time: UTMs, click IDs, referrer, device, engagement.
export function getAttribution() {
  if (typeof window === 'undefined') return {}
  const p = new URLSearchParams(window.location.search)
  const w = window.innerWidth
  const deviceType = w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'
  const val = (k: string) => p.get(k) || null
  return {
    utm_source:           val('utm_source'),
    utm_medium:           val('utm_medium'),
    utm_campaign:         val('utm_campaign'),
    utm_term:             val('utm_term'),
    utm_content:          val('utm_content'),
    gclid:                val('gclid'),
    fbclid:               val('fbclid'),
    referrer:             document.referrer || null,
    page_url:             window.location.href,
    viewport:             `${window.innerWidth}x${window.innerHeight}`,
    device_type:          deviceType,
    time_on_page_seconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
  }
}
