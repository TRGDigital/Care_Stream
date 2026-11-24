'use client'

// "This is me" resident profiles: the admin overlay opened from the Knowledge base page.
import { useAskPageContext } from '@/lib/ask-context'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchIntent } from '@/lib/admin-search/intents'
import Link from 'next/link'
import { ArrowLeft, Archive, Loader2, Lock, Plus, Search, Users, X } from 'lucide-react'
import { createResidentsClient, type Resident } from '@/lib/residents-api'
import { useCachedQuery } from '@/lib/use-cached-query'
import { ApprovalsTab } from './residents/approvals-tab'
import { FamilyAnswersTab } from './residents/family-answers-tab'
import { ArchiveAccessSettings, ArchivePanel } from './residents/archive-panel'
import { FamilyTab } from './residents/family-tab'
import { ResidentEditor } from './residents/resident-editor'
import { PhotoManager } from './residents/photos'
import { VideoManager } from './residents/videos'
import { StatusDialog } from './residents/status-dialog'
import { FundingTab } from './residents/funding-tab'
import { FundingSummaryCard } from './residents/funding-summary'
import { useFundingMeta } from '@/lib/funding-client'
import { ErrorBox, btnDangerOutline, btnSecondary, fmtDate, inputCls } from './residents/ui'

type Tab = 'profile' | 'family' | 'approvals' | 'from-family' | 'funding'
const displayName = (r: Resident) => `${r.preferred_name || r.first_name} ${r.last_name}`
const STATUS_LABEL: Record<string, string> = { deceased: 'Passed away', left: 'Moved on', living: 'Living' }

export function ResidentsOverlay({ token, userId, onClose, initialResidentId = null, initialTab = null }: { token: string; userId: string; onClose: () => void; initialResidentId?: string | null; initialTab?: Tab | null }) {
  const client = useMemo(() => createResidentsClient(token), [token])
  const dialogRef = useRef<HTMLDivElement>(null)
  const [scope, setScope] = useState<'current' | 'archived'>('current')
  const [selected, setSelected] = useState<string | 'new' | null>(initialResidentId)
  // A resident's id only (never a name, funding or any detail): the panel can offer fee and income questions without learning who it is.
  useAskPageContext({ page: 'residents', label: selected && selected !== 'new' ? 'a resident record' : 'the residents screen', ...(selected && selected !== 'new' ? { residentId: selected } : {}) })
  const [tab, setTab] = useState<Tab>(initialTab ?? 'profile')
  const [search, setSearch] = useState('')
  const [statusFor, setStatusFor] = useState<Resident | null>(null)

  const fundingMeta = useFundingMeta()   // pilot, administrators only: null for everyone else, so no Funding tab and no summary appear
  const meta = useCachedQuery(`residents-meta-${userId}`, () => client.meta())
  const enabled = meta.data?.enabled === true
  const canArchive = meta.data?.can_manage_archive === true
  const sections = meta.data?.sections ?? []

  const current = useCachedQuery(`residents-list-current-${userId}`, () => client.list('current'), { enabled })
  const archived = useCachedQuery(`residents-list-archived-${userId}`, () => client.list('archived'), { enabled: enabled && canArchive })
  const list = scope === 'current' ? current : archived

  const detailKey = enabled && scope === 'current' && selected && selected !== 'new' ? `resident-detail-${userId}-${selected}` : null
  const detail = useCachedQuery(detailKey, () => client.get(selected as string), { enabled: detailKey !== null })

  // Focus, scroll lock and Escape (a nested dialog handles its own Escape first).
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[data-nested-dialog]')) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prev?.focus?.() }
  }, [onClose])

  // Opened from a resident on the Knowledge page: if they have answers waiting, go straight to them.
  const openedInitial = useRef(false)
  useEffect(() => {
    if (openedInitial.current || !initialResidentId || !current.data) return
    openedInitial.current = true
    const r = current.data.residents.find(x => x.id === initialResidentId)
    if (!initialTab && r && r.pending_count > 0) setTab('approvals')
  }, [initialResidentId, current.data])

  const refreshAll = useCallback(() => { current.reload(); if (canArchive) archived.reload(); detail.reload() }, [current, archived, detail, canArchive])

  const waiting = (current.data?.residents ?? []).reduce((n, r) => n + (r.pending_count || 0), 0)
  const residents = (list.data?.residents ?? []).filter(r => {
    const q = search.trim().toLowerCase()
    return !q || `${r.first_name} ${r.preferred_name ?? ''} ${r.last_name} ${r.room ?? ''}`.toLowerCase().includes(q)
  })
  const selectedResident = (list.data?.residents ?? []).find(r => r.id === selected) ?? null
  const total = sections.length

  function pick(id: string | 'new' | null, t: Tab = 'profile') { setSelected(id); setTab(t) }
  function switchScope(s: 'current' | 'archived') { setScope(s); pick(null); setSearch('') }

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/50 md:p-6" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="residents-title"
        className="flex h-full w-full max-w-7xl flex-col overflow-hidden bg-white shadow-2xl focus:outline-none md:rounded-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h2 id="residents-title" className="flex items-center gap-2 text-lg font-semibold text-neutral-dark"><Users size={18} className="text-teal" /> Residents</h2>
            {enabled && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${waiting > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-neutral-mid'}`}>
                Family answers and photos waiting: {waiting}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close residents" className="rounded-lg p-2 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
        </header>

        {meta.loading ? (
          <div className="flex flex-1 items-center justify-center"><Loader2 size={26} className="animate-spin text-neutral-mid" /></div>
        ) : meta.error && !meta.data ? (
          <div className="p-4"><ErrorBox>{meta.error}</ErrorBox></div>
        ) : !enabled ? (
          <div className="flex flex-1 items-center justify-center overflow-y-auto p-4">
            <div className="max-w-md rounded-card border border-amber-200 bg-gradient-to-b from-amber-50/70 to-white p-8 text-center shadow-card">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100"><Lock size={18} className="text-amber-600" /></div>
              <h3 className="mb-1 text-base font-bold text-neutral-dark">Resident profiles are on the Professional and Enterprise plans</h3>
              <p className="mb-4 text-sm text-neutral-mid">Keep what makes each person who they are in one place, ask their family to add to it, and let staff ask the assistant about them by name.</p>
              <Link href="/billing" className="inline-flex items-center rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark">See plans</Link>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            {/* List panel */}
            <aside className={`${selected ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-gray-200 md:w-80 md:shrink-0`} aria-label="Residents list">
              {canArchive && (
                <div className="grid grid-cols-2 gap-1 border-b border-gray-200 p-2" role="group" aria-label="Which residents">
                  {(['current', 'archived'] as const).map(s => (
                    <button key={s} type="button" aria-pressed={scope === s} onClick={() => switchScope(s)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium ${scope === s ? 'bg-teal text-white' : 'text-neutral-mid hover:bg-neutral-light'}`}>
                      {s === 'current' ? 'Current' : 'Archived'}
                    </button>
                  ))}
                </div>
              )}
              {scope === 'current' && fundingMeta?.enabled && fundingMeta.ready && <div className="pt-3"><FundingSummaryCard token={token} /></div>}
              <div className="space-y-2 p-3">
                <div className="relative">
                  <label htmlFor="rs-search" className="sr-only">Search residents</label>
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="rs-search" type="search" placeholder="Search by name or room" className={`${inputCls} pl-8`} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {scope === 'current' && (
                  <button type="button" onClick={() => pick('new')} className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal-dark">
                    <Plus size={14} /> Add resident
                  </button>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {list.loading ? (
                  <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-neutral-mid" /></div>
                ) : list.error && !list.data ? (
                  <div className="p-3"><ErrorBox>{list.error}</ErrorBox></div>
                ) : residents.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-neutral-mid">{search ? 'No one matches that search.' : scope === 'current' ? 'No residents yet. Add the first one.' : 'No archived residents.'}</p>
                ) : (
                  <ul>
                    {residents.map(r => (
                      <li key={r.id}>
                        <button type="button" onClick={() => pick(r.id, scope === 'current' && r.pending_count > 0 ? 'approvals' : 'profile')} aria-current={selected === r.id}
                          className={`w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-neutral-light ${selected === r.id ? 'bg-teal/5' : ''}`}>
                          <span className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-sm font-medium text-neutral-dark">{displayName(r)}</span>
                            {scope === 'current' && r.pending_count > 0 && (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{r.pending_count} waiting</span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs text-neutral-mid">
                            {scope === 'current'
                              ? <>{r.room ? `Room ${r.room}, ` : ''}{r.filled_count} of {total} sections filled</>
                              : <>{STATUS_LABEL[r.status]}{r.status_at ? ` ${fmtDate(r.status_at)}` : ''}{r.retention_until ? `, kept until ${fmtDate(r.retention_until)}` : ''}</>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {canArchive && scope === 'archived' && <ArchiveAccessSettings client={client} />}
            </aside>

            {/* Detail panel */}
            <section className={`${selected ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`} aria-label="Resident">
              {!selected ? (
                <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-neutral-mid">
                  {scope === 'current' ? 'Choose a resident, or add a new one.' : 'Choose an archived resident to see its archive task.'}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2">
                    <button type="button" onClick={() => pick(null)} className="rounded-lg p-1.5 text-neutral-mid hover:bg-neutral-light md:hidden" aria-label="Back to the list"><ArrowLeft size={18} /></button>
                    <h3 className="min-w-0 truncate text-base font-semibold text-neutral-dark">
                      {selected === 'new' ? 'Add resident' : selectedResident ? displayName(selectedResident) : 'Resident'}
                    </h3>
                  </div>

                  {scope === 'current' && selected !== 'new' && (
                    <div className="flex gap-1 overflow-x-auto border-b border-gray-200 px-3" role="tablist" aria-label="Resident sections">
                      {([['profile', 'Profile'], ['family', 'Family'], ['approvals', 'Approvals'], ['from-family', 'From family'], ...(fundingMeta?.enabled ? [['funding', 'Funding'] as const] : [])] as ReadonlyArray<readonly [Tab, string]>).map(([k, l]) => {
                        const n = k === 'approvals' ? (detail.data?.pending_count ?? selectedResident?.pending_count ?? 0) : 0
                        return (
                          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium ${tab === k ? 'border-teal text-teal' : 'border-transparent text-neutral-mid hover:text-neutral-dark'}`}>
                            {k === 'funding' && <Lock size={12} aria-label="Locked, administrators only" className="text-amber-700" />}{l}
                            {n > 0 && <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white" aria-label={`${n} waiting`}>{n}</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {scope === 'archived' ? (
                      selectedResident ? (
                        <div className="space-y-4">
                          <div className="rounded-lg bg-neutral-light/60 px-4 py-3 text-sm text-neutral-dark">
                            <p><strong>{STATUS_LABEL[selectedResident.status]}</strong>{selectedResident.status_at ? ` on ${fmtDate(selectedResident.status_at)}` : ''}</p>
                            <p className="text-neutral-mid">Archived {fmtDate(selectedResident.archived_at) || 'recently'}{selectedResident.retention_until ? `, kept until ${fmtDate(selectedResident.retention_until)}` : ''}</p>
                          </div>
                          <ArchivePanel key={selectedResident.id} client={client} resident={selectedResident} retentionYears={meta.data?.retention_years ?? 7}
                            onChanged={() => archived.reload()} onDeleted={() => { pick(null); archived.reload() }} />
                        </div>
                      ) : <Loader2 size={22} className="animate-spin text-neutral-mid" />
                    ) : selected === 'new' ? (
                      <ResidentEditor client={client} sections={sections} resident={null}
                        onSaved={id => { current.reload(); setSelected(id); setTab('profile') }} />
                    ) : detail.loading ? (
                      <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-neutral-mid" /></div>
                    ) : detail.error && !detail.data ? (
                      <ErrorBox>{detail.error}</ErrorBox>
                    ) : detail.data ? (
                      <>
                        {tab === 'profile' && (
                          <div className="space-y-8">
                            <ResidentEditor key={detail.data.id} client={client} sections={sections} resident={detail.data} onSaved={() => { current.reload(); detail.reload() }} />
                            <PhotoManager client={client} resident={detail.data} onChanged={refreshAll} />
                            <VideoManager client={client} resident={detail.data} onChanged={refreshAll} />
                            <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
                              <h4 className="text-sm font-semibold text-red-900">Died or moved on</h4>
                              <p className="mb-3 mt-1 text-sm text-red-900">They will disappear from the hub and the assistant straight away. You will be asked to confirm first.</p>
                              <button type="button" className={btnDangerOutline} onClick={() => setStatusFor(detail.data!)}><Archive size={14} /> Mark as died or moved on</button>
                            </div>
                          </div>
                        )}
                        {tab === 'family' && <FamilyTab client={client} resident={detail.data} onChanged={refreshAll} />}
                        {tab === 'from-family' && <FamilyAnswersTab resident={detail.data} sections={sections} onExpired={refreshAll} />}
                        {tab === 'funding' && fundingMeta?.enabled && <FundingTab key={detail.data.id} token={token} residentId={detail.data.id} meta={fundingMeta} />}
                        {tab === 'approvals' && <ApprovalsTab client={client} resident={detail.data} sections={sections} onChanged={refreshAll} />}
                      </>
                    ) : null}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>

      {statusFor && (
        <StatusDialog client={client} resident={statusFor} onClose={() => setStatusFor(null)}
          onDone={() => { setStatusFor(null); pick(null); refreshAll() }} />
      )}
    </div>
  )
}
