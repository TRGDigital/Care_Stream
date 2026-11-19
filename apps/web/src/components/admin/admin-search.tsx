'use client'

// Admin search: one box in the top bar that finds pages, features, guide answers and this account's own records.
// Shown to every admin account. It can be switched off for one account with feature flag admin_search = false.
// Locked results are shown, not hidden: they say which plan includes the thing and offer the upgrade.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Search, Lock, FileText, Users, BookOpen, ClipboardCheck, GraduationCap, HelpCircle, Heart, CornerDownLeft, Sparkles, Compass, PlusCircle, UserPlus } from 'lucide-react'
import { createApiClient, type SearchRecord } from '@/lib/api-client'
import { usePlanFeatures } from '@/lib/use-plan-features'
import { FEATURES, PLAN_NOTE, type FeatureEntry } from '@/lib/admin-search/features'
import { searchFeatures, searchGuides, tokens, type GuideEntry } from '@/lib/admin-search/search'
import { lockFor, visibleTo, type AccountKind } from '@/lib/admin-search/access'
import { runIntent } from '@/lib/admin-search/intents'
import { CPD_CERTIFIED_LOGO } from '@/lib/cpd'

type Item = {
  key: string; group: string; title: string; sub?: string | null; href: string
  locked?: { note: string; plan?: string; viaOverlay: boolean } | null
  alt?: { label: string; href: string }          // a second action on the row, shown as a small button
  openPolicy?: { id: string; name: string }       // policies: the main action opens this policy itself
  cta?: string                                    // what the main action does, in a few words
  tag?: string                                    // what kind of thing it is: Policy, Staff, Action…
  cpdCertified?: boolean                          // a course The CPD Certification Service has certified: shows their logo, unaltered
  Icon: React.ElementType
}

// One settings read per page load answers "is search switched on for this account".
let flagCache: Promise<boolean> | null = null
export function useAdminSearchEnabled(): boolean {
  const { data: session } = useSession()
  const token = session?.accessToken
  const [on, setOn] = useState(true)   // shown straight away; hidden again only if this account has been switched off
  useEffect(() => {
    if (!token) return
    // On for every account unless it has been switched off for that account (admin_search: false), which is the kill switch.
    if (!flagCache) flagCache = createApiClient(token).settings.get().then(s => s.feature_flags?.admin_search !== false).catch(() => true)
    let live = true
    flagCache.then(v => { if (live) setOn(v) })
    return () => { live = false }
  }, [token])
  return on
}

export function AdminSearch({ account, onLocked }: { account: AccountKind & { multiSite?: boolean }; onLocked: (feature: string) => void }) {
  const enabled = useAdminSearchEnabled()
  const { data: session } = useSession()
  const { features } = usePlanFeatures()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [guides, setGuides] = useState<GuideEntry[]>([])
  type Recs = { topics?: string[] } & Partial<Record<'policies' | 'staff' | 'knowledge' | 'audits' | 'training' | 'residents' | 'onboarding', SearchRecord[]>>
  const [records, setRecords] = useState<Recs | null>(null)
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
    const l = lockFor(href, requires, account, features)
    if (!l) return null
    if (l.kind === 'tier') return { note: 'Part of the full CareStream plans', viaOverlay: true }
    return { note: PLAN_NOTE[l.plan as 'Professional' | 'Enterprise'], plan: l.plan, viaOverlay: false }
  }, [account, features])

  const items = useMemo<Item[]>(() => {
    const term = q.trim()
    if (term.length < 2) return []
    const out: Item[] = []
    const found = searchFeatures(term, FEATURES.filter(f => visibleTo(f.only, account)))
    for (const { entry } of found.filter(x => x.entry.action).slice(0, 4)) {
      out.push({ key: 'f-' + entry.id, group: 'Do something', title: entry.title, sub: entry.about, href: entry.href, locked: lockOf(entry.href, entry.requires), Icon: PlusCircle, cta: entry.cta })
    }
    for (const { entry } of found.filter(x => !x.entry.action).slice(0, 7)) {
      out.push({ key: 'f-' + entry.id, group: 'Pages and features', title: entry.title, sub: entry.about, href: entry.href, locked: lockOf(entry.href, entry.requires), Icon: Compass })
    }
    for (const g of searchGuides(term, guides).slice(0, 5)) {
      out.push({ key: 'g-' + g.guide.id + (g.block ?? ''), group: 'Help and guides', title: g.block ? `${g.guide.title}: ${g.block}` : g.guide.title, sub: g.snippet, href: `/guides#${g.guide.id}`, Icon: HelpCircle })
    }
    const rec = (k: string, group: string, Icon: React.ElementType, base: string, withQ = false, to?: (id: string) => string, cta?: string, alt?: { label: string; href: (id: string) => string }) => ((records as any)?.[k] as SearchRecord[] | undefined ?? []).forEach(r =>
      out.push({ key: `${k}-${r.id}`, group, title: r.title, sub: r.sub, href: to ? to(r.id) : withQ ? `${base}?q=${encodeURIComponent(r.title)}` : base, locked: lockOf(base), Icon, cta, alt: alt ? { label: alt.label, href: alt.href(r.id) } : undefined }))
    ;(records?.policies ?? []).forEach(r => out.push({
      key: `policies-${r.id}`, group: 'Your policies', title: r.title, sub: r.sub, Icon: FileText, locked: lockOf('/policies'),
      href: `/policies?open=${encodeURIComponent(r.id)}&name=${encodeURIComponent(r.title)}`, openPolicy: { id: r.id, name: r.title },
      alt: { label: 'Policies page', href: `/policies?q=${encodeURIComponent(r.title)}` },
    }))
    rec('staff', 'Your staff', Users, '/staff', false, id => `/staff/${id}`)
    rec('residents', 'Your residents', Heart, '/knowledge', false, id => `/knowledge?resident=${id}`, 'Open profile', { label: 'Invite family', href: id => `/knowledge?resident=${id}&tab=family` })
    rec('knowledge', 'Your knowledge base', BookOpen, '/knowledge')
    rec('audits', 'Audits', ClipboardCheck, '/audits', false, id => `/audits?do=start-audit&template=${encodeURIComponent(id)}`, 'Start this audit', { label: 'Audits page', href: () => '/audits' })
    ;(records?.training ?? []).forEach(r => {
      // Free accounts only have the CPD courses, assigned from the CPD page.
      const cpdPage = r.annual || account.freeTier === true
      const path = cpdPage ? '/training/annual' : '/training'
      const href = cpdPage ? `/training/annual?do=assign-cpd&module=${encodeURIComponent(r.id)}&name=${encodeURIComponent(r.title)}` : `/training?do=assign-training&module=${encodeURIComponent(r.id)}`
      out.push({ key: `training-${r.id}`, group: 'Training courses', title: r.title, sub: r.sub, Icon: GraduationCap, cpdCertified: r.cpd === true, tag: r.cpd ? undefined : r.annual ? 'Standard course' : 'Ad hoc course', locked: lockOf(path), href, cta: 'Assign to staff', alt: { label: cpdPage ? 'CPD page' : 'Training page', href: path } })
    })
    rec('onboarding', 'Staff onboarding flows', UserPlus, '/onboarding', false, id => `/onboarding?do=allocate-flow&flow=${encodeURIComponent(id)}`, 'Allocate to staff', { label: 'Onboarding page', href: () => '/onboarding' })
    // Order: actions and the person's own records first, then pages and features, then help and guides.
    const TAG: Record<string, string> = { 'Do something': 'Action', 'Your policies': 'Policy', 'Your staff': 'Staff', 'Your residents': 'Resident', 'Your knowledge base': 'Knowledge', Audits: 'Audit', 'Training courses': 'Course', 'Staff onboarding flows': 'Onboarding flow' }
    const rank = (it: Item) => it.group === 'Pages and features' ? 1 : it.group === 'Help and guides' ? 2 : 0
    // The kinds of thing the person asked for ("GDPR training" asks for courses) come before the other records.
    const WANT: Record<string, string> = { training: 'Training courses', audit: 'Audits', policy: 'Your policies', onboarding: 'Staff onboarding flows', staff: 'Your staff', resident: 'Your residents', 'knowledge base': 'Your knowledge base' }
    const wanted = new Set((records?.topics ?? []).map(x => WANT[x]).filter(Boolean))
    const sub = (it: Item) => it.group === 'Do something' ? 0 : wanted.has(it.group) ? 1 : 2
    return out
      .map(it => rank(it) === 0 ? { ...it, tag: it.tag ?? (it.cpdCertified ? undefined : TAG[it.group]), group: 'Actions and specifics', _sub: sub(it) } : { ...it, _sub: 9 })
      .sort((a, b) => rank(a) - rank(b) || a._sub - b._sub)
  }, [q, guides, records, lockOf, account])

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
    navigate(it.href)
  }

  function goAlt(it: Item) {
    if (!it.alt) return
    navigate(it.alt.href)
  }

  // A link with ?do= on the page that is already open is done in place; anything else is a normal navigation.
  function navigate(href: string) {
    const u = new URL(href, window.location.origin)
    const name = u.searchParams.get('do')
    close()
    if (name && u.pathname === pathname) {
      const params: Record<string, string> = {}
      u.searchParams.forEach((v, k) => { if (k !== 'do') params[k] = v })
      runIntent(name, params)
    } else router.push(href)
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
          <div className="relative w-full max-w-2xl overflow-hidden rounded-xl md:max-w-4xl xl:max-w-5xl border border-gray-200 bg-white shadow-2xl">
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
            <div className="max-h-[68vh] overflow-y-auto py-1">
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
                      {it.cpdCertified
                        // The mark is shown exactly as supplied: no border, tint, crop or added text, original proportions (132 x 120).
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={CPD_CERTIFIED_LOGO} alt="CPD Certified" width={33} height={30} className="mt-0.5 h-[30px] w-[33px] shrink-0" />
                        : <it.Icon size={16} className={`mt-0.5 shrink-0 ${it.locked ? 'text-neutral-mid/60' : 'text-teal'}`} />}
                      <span className="min-w-0 flex-1">
                        <span className={`flex flex-wrap items-center gap-2 text-sm font-medium ${it.locked ? 'text-neutral-mid' : 'text-neutral-dark'}`}>
                          {it.title}
                          {it.tag && <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-mid">{it.tag}</span>}
                          {it.locked && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"><Lock size={9} /> {it.locked.plan ?? 'Upgrade'}</span>}
                        </span>
                        {it.sub && <span className="mt-0.5 line-clamp-2 block text-xs text-neutral-mid">{it.sub}</span>}
                        {it.locked && <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal"><Sparkles size={11} /> {it.locked.note}. {it.locked.viaOverlay ? 'See what CareStream adds' : 'See plans'}</span>}
                      </span>
                      {it.group === 'Actions and specifics' && !it.locked
                        ? <span className="shrink-0 self-center rounded-md bg-teal px-3 py-1.5 text-xs font-semibold text-white shadow-sm">{it.cta ?? (it.openPolicy ? 'Open policy' : it.tag === 'Action' ? 'Open form' : it.tag === 'Staff' ? 'Open record' : 'Open')}</span>
                        : i === active && !it.alt && <CornerDownLeft size={13} className="mt-1 shrink-0 text-neutral-mid" />}
                    </button>
                      {it.alt && !it.locked && (
                        <button type="button" onClick={() => goAlt(it)} className="mr-3 shrink-0 self-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal hover:text-teal">{it.alt.label}</button>
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
