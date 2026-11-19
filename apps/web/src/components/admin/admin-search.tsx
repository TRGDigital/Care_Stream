'use client'

// Admin search: one box in the top bar that finds pages, features, guide answers and this account's own records.
// Only shown to accounts with the admin_search flag (CS-1001 first, then everyone once tested).
// Locked results are shown, not hidden: they say which plan includes the thing and offer the upgrade.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Search, Lock, FileText, Users, BookOpen, ClipboardCheck, GraduationCap, HelpCircle, Heart, CornerDownLeft, Sparkles, Compass } from 'lucide-react'
import { createApiClient, type SearchRecord } from '@/lib/api-client'
import { usePlanFeatures } from '@/lib/use-plan-features'
import { FEATURES, PLAN_NOTE, type FeatureEntry } from '@/lib/admin-search/features'
import { searchFeatures, searchGuides, tokens, type GuideEntry } from '@/lib/admin-search/search'
import { tierLock, type AccountKind } from '@/lib/admin-search/access'

type Item = {
  key: string; group: string; title: string; sub?: string | null; href: string
  locked?: { note: string; plan?: string; viaOverlay: boolean } | null
  alt?: { label: string; href: string }          // a second action on the row, shown as a small button
  openPolicy?: { id: string; name: string }       // policies: the main action opens this policy itself
  Icon: React.ElementType
}

// One settings read per page load answers "is search switched on for this account".
let flagCache: Promise<boolean> | null = null
export function useAdminSearchEnabled(): boolean {
  const { data: session } = useSession()
  const token = session?.accessToken
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!token) return
    if (!flagCache) flagCache = createApiClient(token).settings.get().then(s => !!s.feature_flags?.admin_search).catch(() => false)
    let live = true
    flagCache.then(v => { if (live) setOn(v) })
    return () => { live = false }
  }, [token])
  return on
}

export function AdminSearch({ account, onLocked }: { account: AccountKind; onLocked: (feature: string) => void }) {
  const enabled = useAdminSearchEnabled()
  const { data: session } = useSession()
  const { features } = usePlanFeatures()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [guides, setGuides] = useState<GuideEntry[]>([])
  const [records, setRecords] = useState<Record<string, SearchRecord[]> | null>(null)
  const [settled, setSettled] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const token = session?.accessToken

  // Ctrl or Cmd + K opens it from anywhere (when switched on).
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(true) } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [enabled])

  useEffect(() => { if (open) { setTimeout(() => inputRef.current?.focus(), 30); if (!guides.length) import('@/lib/admin-search/guides-index.json').then(m => setGuides((m as any).default as GuideEntry[])).catch(() => {}) } }, [open, guides.length])

  const close = useCallback(() => { setOpen(false); setQ(''); setRecords(null); setActive(0); setSettled(false) }, [])

  // Their own records, after a short pause in typing.
  useEffect(() => {
    setRecords(null); setSettled(false)
    const term = q.trim()
    if (!open || !token || term.length < 2) { setSettled(term.length < 2); return }
    const t = setTimeout(() => {
      createApiClient(token).adminSearch.records(term).then(r => { setRecords(r); setSettled(true) }).catch(() => { setRecords({}); setSettled(true) })
    }, 250)
    return () => clearTimeout(t)
  }, [q, open, token])

  const lockOf = useCallback((href: string, requires?: FeatureEntry['requires']): Item['locked'] => {
    if (tierLock(href, account)) return { note: 'Part of the full CareStream plans', viaOverlay: true }
    if (requires && features && !features[requires.feature]) return { note: PLAN_NOTE[requires.plan], plan: requires.plan, viaOverlay: false }
    return null
  }, [account, features])

  const items = useMemo<Item[]>(() => {
    const term = q.trim()
    if (term.length < 2) return []
    const out: Item[] = []
    for (const { entry } of searchFeatures(term, FEATURES).slice(0, 8)) {
      out.push({ key: 'f-' + entry.id, group: 'Pages and features', title: entry.title, sub: entry.about, href: entry.href, locked: lockOf(entry.href, entry.requires), Icon: Compass })
    }
    for (const g of searchGuides(term, guides).slice(0, 5)) {
      out.push({ key: 'g-' + g.guide.id + (g.block ?? ''), group: 'Help and guides', title: g.block ? `${g.guide.title}: ${g.block}` : g.guide.title, sub: g.snippet, href: `/guides#${g.guide.id}`, Icon: HelpCircle })
    }
    const rec = (k: string, group: string, Icon: React.ElementType, base: string, withQ = false, to?: (id: string) => string) => (records?.[k] ?? []).forEach(r =>
      out.push({ key: `${k}-${r.id}`, group, title: r.title, sub: r.sub, href: to ? to(r.id) : withQ ? `${base}?q=${encodeURIComponent(r.title)}` : base, locked: lockOf(base), Icon }))
    ;(records?.policies ?? []).forEach(r => out.push({
      key: `policies-${r.id}`, group: 'Your policies', title: r.title, sub: r.sub, Icon: FileText, locked: lockOf('/policies'),
      href: `/policies?open=${encodeURIComponent(r.id)}&name=${encodeURIComponent(r.title)}`, openPolicy: { id: r.id, name: r.title },
      alt: { label: 'Policies page', href: `/policies?q=${encodeURIComponent(r.title)}` },
    }))
    rec('staff', 'Your staff', Users, '/staff', false, id => `/staff/${id}`)
    rec('residents', 'Your residents', Heart, '/knowledge', false, id => `/knowledge?resident=${id}`)
    rec('knowledge', 'Your knowledge base', BookOpen, '/knowledge')
    rec('audits', 'Audits', ClipboardCheck, '/audits')
    rec('training', 'Training courses', GraduationCap, '/training')
    return out
  }, [q, guides, records, lockOf])

  useEffect(() => { setActive(0) }, [items.length])

  // Searches that found nothing are logged (once per query) so we can see what admins look for and cannot find.
  const missSent = useRef('')
  useEffect(() => {
    const term = q.trim().toLowerCase()
    if (!settled || !token || term.length < 3 || items.length > 0 || missSent.current === term || (!guides.length)) return
    missSent.current = term
    createApiClient(token).adminSearch.miss(term).catch(() => {})
  }, [settled, items.length, q, token, guides.length])

  function go(it: Item) {
    if (it.locked) {
      if (it.locked.viaOverlay) { onLocked(it.title); close(); return }
      router.push('/billing'); close(); return
    }
    if (it.openPolicy && pathname === '/policies') { window.dispatchEvent(new CustomEvent('cs-open-policy', { detail: it.openPolicy })); close(); return }
    router.push(it.href); close()
  }

  function goAlt(it: Item) {
    if (!it.alt) return
    router.push(it.alt.href); close()
  }

  if (!enabled) return null

  let lastGroup = ''
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Search CareStream"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-neutral-light/60 px-2.5 py-1.5 text-sm text-neutral-mid hover:border-teal/40 hover:text-neutral-dark md:w-72 lg:w-96 xl:w-[28rem]">
        <Search size={15} />
        <span className="hidden flex-1 text-left md:inline">Search CareStream</span>
        <kbd className="hidden rounded border border-gray-200 bg-white px-1.5 text-[10px] font-medium text-neutral-mid md:inline">Ctrl K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Search CareStream">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center gap-2 border-b border-gray-100 px-4">
              <Search size={16} className="text-neutral-mid" />
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search pages, features, guides, policies, staff, residents…"
                className="h-12 flex-1 bg-transparent text-sm text-neutral-dark outline-none placeholder:text-neutral-mid"
                onKeyDown={e => {
                  if (e.key === 'Escape') close()
                  else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, items.length - 1)) }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
                  else if (e.key === 'Enter' && items[active]) { e.preventDefault(); go(items[active]) }
                }} />
              <button type="button" onClick={close} className="text-xs text-neutral-mid hover:text-neutral-dark">Esc</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto py-1">
              {q.trim().length < 2 && <p className="px-4 py-6 text-sm text-neutral-mid">Type what you are looking for, for example <em>supervisions</em>, <em>invite family</em>, <em>DBS</em> or a policy name.</p>}
              {q.trim().length >= 2 && items.length === 0 && settled && (
                <div className="px-4 py-6 text-sm text-neutral-mid">
                  <p>Nothing found for &ldquo;{q.trim()}&rdquo;.</p>
                  <p className="mt-1">Try a simpler word, or <Link href="/guides" onClick={close} className="font-medium text-teal hover:underline">ask us in Help &amp; Guides</Link>. We note what people search for, so we can add it.</p>
                </div>
              )}
              {items.map((it, i) => {
                const head = it.group !== lastGroup ? it.group : null
                lastGroup = it.group
                return (
                  <div key={it.key}>
                    {head && <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-mid">{head}</p>}
                    <div className={`flex items-start ${i === active ? 'bg-teal/5' : ''}`}>
                    <button type="button" onClick={() => go(it)} onMouseEnter={() => setActive(i)}
                      className="flex min-w-0 flex-1 items-start gap-3 py-2 pl-4 pr-2 text-left">
                      <it.Icon size={16} className={`mt-0.5 shrink-0 ${it.locked ? 'text-neutral-mid/60' : 'text-teal'}`} />
                      <span className="min-w-0 flex-1">
                        <span className={`flex flex-wrap items-center gap-2 text-sm font-medium ${it.locked ? 'text-neutral-mid' : 'text-neutral-dark'}`}>
                          {it.title}
                          {it.locked && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"><Lock size={9} /> {it.locked.plan ?? 'Upgrade'}</span>}
                        </span>
                        {it.sub && <span className="mt-0.5 line-clamp-2 block text-xs text-neutral-mid">{it.sub}</span>}
                        {it.openPolicy && !it.locked && <span className="mt-0.5 block text-[11px] font-medium text-teal">Open this policy</span>}
                        {it.locked && <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal"><Sparkles size={11} /> {it.locked.note}. {it.locked.viaOverlay ? 'See what CareStream adds' : 'See plans'}</span>}
                      </span>
                      {i === active && !it.alt && <CornerDownLeft size={13} className="mt-1 shrink-0 text-neutral-mid" />}
                    </button>
                      {it.alt && !it.locked && (
                        <button type="button" onClick={() => goAlt(it)} className="mr-3 mt-2 shrink-0 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-neutral-mid hover:border-teal/40 hover:text-teal">{it.alt.label}</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
