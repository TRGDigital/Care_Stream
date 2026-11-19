'use client'

// What visitors do on the public site: for each page view, how long they were really there (tab visible and doing something), how far they
// scrolled, what they clicked, and whether they started signing up, typed an email address, or pressed Book a demo. Sent to the API on a 30 second
// heartbeat and when they leave, and shown to CareStream at /platform/site-activity.
//
// Only after the visitor has accepted analytics cookies (the same gate as the other tracking): decline, and nothing is recorded or stored.
// No IP address, no name and never the email address itself: only that an email field was used. Clicks are labels and link paths, no query strings.
// A visitor id is kept in this browser's local storage so repeat visits can be seen; withdrawing consent removes it.
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { CONSENT_EVENT, hasAnalyticsConsent } from './cookie-consent'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const BEAT_MS = 30_000
const IDLE_MS = 60_000
const PRIVATE_FIRST = new Set(['platform', 'admin', 'api', 'chat', 'dashboard', 'login', 'staff', 'billing', 'settings', 'family', 'auth', 'onboarding'])
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|gtmetrix|monitor|uptime/i

type Visit = {
  id: string; path: string; page_type: string; startedAt: number; active: number; maxScroll: number; interactions: number
  clicks: Array<{ l: string; h: string | null }>; conversions: Set<string>; nextPath: string | null; lastInteraction: number
}
let visit: Visit | null = null
let timer: ReturnType<typeof setInterval> | null = null
let beat: ReturnType<typeof setInterval> | null = null
let listening = false

const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16) }))
const store = (k: string, v?: string): string | null => { try { if (v !== undefined) localStorage.setItem(k, v); return localStorage.getItem(k) } catch { return null } }
const sess = (k: string, v?: string): string | null => { try { if (v !== undefined) sessionStorage.setItem(k, v); return sessionStorage.getItem(k) } catch { return null } }

function pageType(p: string): string {
  if (p === '/') return 'home'
  const s = p.split('/').filter(Boolean)[0] ?? ''
  if (['pricing', 'demo', 'register', 'contact', 'blog', 'features', 'about', 'faq', 'how-it-works'].includes(s)) return s
  if (['care-policies', 'care-audits', 'cpd-certified', 'basket', 'buy', 'offers'].includes(s)) return 'shop'
  return 'other'
}
const isPrivate = (p: string) => PRIVATE_FIRST.has((p.split('/').filter(Boolean)[0] ?? '').toLowerCase())
const excluded = () => {
  try { if (store('cs_internal') === '1') return true } catch { /* ignore */ }
  return typeof navigator === 'undefined' || (navigator as any).webdriver === true || BOT.test(navigator.userAgent)
}
const device = () => { const u = navigator.userAgent; return /iPad|Tablet/i.test(u) ? 'tablet' : /Android|iPhone|iPod|Mobile/i.test(u) ? 'mobile' : 'desktop' }
const scrollPct = () => { const d = document.documentElement; return Math.min(100, Math.round(((window.scrollY + window.innerHeight) / Math.max(d.scrollHeight, 1)) * 100)) || 0 }

function ids() {
  let vid = store('cs_vid'); if (!vid) { vid = uuid(); store('cs_vid', vid) }
  let sid = sess('cs_sid'); if (!sid) { sid = uuid(); sess('cs_sid', sid) }
  let first = store('cs_first_seen'); if (!first) { first = String(Date.now()); store('cs_first_seen', first) }
  let utm = sess('cs_utm')
  if (utm === null) {
    const q = new URLSearchParams(window.location.search)
    utm = JSON.stringify({ s: q.get('utm_source'), m: q.get('utm_medium'), c: q.get('utm_campaign') }); sess('cs_utm', utm)
  }
  let u: any = {}; try { u = JSON.parse(utm) } catch { /* ignore */ }
  let ref = sess('cs_ref'); if (ref === null) { ref = document.referrer && !document.referrer.includes(window.location.host) ? document.referrer : ''; sess('cs_ref', ref) }
  return { vid, sid, is_return: Date.now() - Number(first) > 86_400_000, utm: u, ref }
}

function send(final: boolean) {
  const v = visit; if (!v) return
  if (!final && v.active < 2 && v.interactions === 0) return
  const { vid, sid, is_return, utm, ref } = ids()
  const body = JSON.stringify({
    id: v.id, visitor_id: vid, session_id: sid, path: v.path, page_type: v.page_type, referrer: ref || null, utm_source: utm.s, utm_medium: utm.m, utm_campaign: utm.c,
    device: device(), is_return, started_at: new Date(v.startedAt).toISOString(), ended_at: final ? new Date().toISOString() : null,
    active_seconds: Math.round(v.active), elapsed_seconds: Math.round((Date.now() - v.startedAt) / 1000), max_scroll_pct: v.maxScroll, interactions: v.interactions,
    clicks: v.clicks.slice(0, 25), conversions: [...v.conversions], next_path: v.nextPath,
  })
  try {
    const url = `${API_URL}/public/page-visit`
    // text/plain is a "simple" request, so it needs no CORS preflight and works with sendBeacon when the page is closing.
    if (final && navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))
    else fetch(url, { method: 'POST', body, keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
  } catch { /* never breaks the page */ }
}

function labelFor(el: Element) {
  const t = el.closest('a,button,[role=button],input[type=submit],summary')
  if (!t) return null
  const tracked = t.getAttribute('data-track') || t.closest('[data-track]')?.getAttribute('data-track')
  const text = (t.getAttribute('aria-label') || t.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)
  const href = t.getAttribute('href')
  return { label: tracked || text || t.tagName.toLowerCase(), href: href ? href.slice(0, 120) : null }
}

function onClick(e: MouseEvent) {
  const v = visit; if (!v || !(e.target instanceof Element)) return
  const l = labelFor(e.target); if (!l) return
  v.interactions++; v.lastInteraction = Date.now()
  if (v.clicks.length < 25) v.clicks.push({ l: l.label, h: l.href })
  const href = l.href ?? '', text = l.label
  if (/^mailto:|^tel:/i.test(href)) v.conversions.add('contact_click')
  if (/\/demo(\/|$|\?)/i.test(href) || /book (a )?demo/i.test(text)) v.conversions.add('demo_click')
  if (/\/register(\/|$|\?)/i.test(href) || /start (your )?(free )?(trial|account)|sign ?up|get started|create (your )?(free )?account/i.test(text)) v.conversions.add('signup_click')
  if (/ask carestream assistant|chat with us/i.test(text)) v.conversions.add('chat_opened')
}
function onInput(e: Event) {
  const v = visit; const t = e.target as HTMLInputElement | null
  if (!v || !t || t.tagName !== 'INPUT') return
  if (t.type === 'email' || /email/i.test(t.name || '') || /email/i.test(t.autocomplete || '')) v.conversions.add('email_entered')   // only that it was used, never the value
}
function onSubmit(e: Event) {
  const v = visit; const f = e.target as HTMLFormElement | null
  if (!v || !f || f.tagName !== 'FORM') return
  v.conversions.add('form_submit'); v.interactions++
  if (v.path.startsWith('/register')) v.conversions.add('signup_submitted')
  else if (v.path.startsWith('/demo') || /demo/i.test(f.getAttribute('data-track') || f.id || '')) v.conversions.add('demo_submitted')
  send(false)
}
function mark() { if (visit) visit.lastInteraction = Date.now() }
function onScroll() { if (visit) { visit.maxScroll = Math.max(visit.maxScroll, scrollPct()); visit.lastInteraction = Date.now() } }
function onHide() { if (document.visibilityState === 'hidden') send(false) }
function onPageHide() { send(true) }

function attach() {
  if (listening) return; listening = true
  document.addEventListener('click', onClick, true); document.addEventListener('input', onInput, true); document.addEventListener('submit', onSubmit, true)
  window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('pointerdown', mark, { passive: true }); window.addEventListener('keydown', mark, { passive: true })
  window.addEventListener('touchstart', mark, { passive: true }); document.addEventListener('visibilitychange', onHide); window.addEventListener('pagehide', onPageHide)
  timer = setInterval(() => { const v = visit; if (v && document.visibilityState === 'visible' && Date.now() - v.lastInteraction < IDLE_MS) v.active += 1 }, 1000)
  beat = setInterval(() => send(false), BEAT_MS)
}
function detach() {
  if (!listening) return; listening = false
  document.removeEventListener('click', onClick, true); document.removeEventListener('input', onInput, true); document.removeEventListener('submit', onSubmit, true)
  window.removeEventListener('scroll', onScroll); window.removeEventListener('pointerdown', mark); window.removeEventListener('keydown', mark)
  window.removeEventListener('touchstart', mark); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', onPageHide)
  if (timer) clearInterval(timer); if (beat) clearInterval(beat); timer = beat = null
}

function begin(path: string) {
  if (!hasAnalyticsConsent() || excluded() || isPrivate(path)) return
  attach()
  visit = { id: uuid(), path: path.split(/[?#]/)[0] || '/', page_type: pageType(path), startedAt: Date.now(), active: 0, maxScroll: scrollPct(), interactions: 0, clicks: [], conversions: new Set(), nextPath: null, lastInteraction: Date.now() }
}
function finish(next: string | null) {
  if (!visit) return
  visit.nextPath = next && !isPrivate(next) ? next.split(/[?#]/)[0] : null
  send(true); visit = null
}

export function SiteTracker() {
  const pathname = usePathname()
  useEffect(() => {
    begin(pathname || '/')
    return () => finish(typeof window !== 'undefined' ? window.location.pathname : null)
  }, [pathname])
  useEffect(() => {
    const onConsent = () => {
      if (hasAnalyticsConsent()) { if (!visit) begin(window.location.pathname) }
      else { finish(null); detach(); try { localStorage.removeItem('cs_vid'); localStorage.removeItem('cs_first_seen'); sessionStorage.removeItem('cs_sid') } catch { /* ignore */ } }   // withdrawing consent removes the identifiers
    }
    window.addEventListener(CONSENT_EVENT, onConsent)
    return () => window.removeEventListener(CONSENT_EVENT, onConsent)
  }, [])
  return null
}
