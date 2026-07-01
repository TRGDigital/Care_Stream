'use client'

// §14.7 — Policy library: searchable table, upload, archive.

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Upload, FolderUp, RefreshCw, X, MoreHorizontal, Archive, RotateCcw, Search } from 'lucide-react'

// Upload modals are lazy-loaded — only fetched when a dialog is opened.
const UploadModal = dynamic(() => import('@/components/admin/policies/policy-modals').then(m => m.UploadModal), { ssr: false })
const BulkUploadModal = dynamic(() => import('@/components/admin/policies/policy-modals').then(m => m.BulkUploadModal), { ssr: false })
const NewVersionModal = dynamic(() => import('@/components/admin/policies/policy-modals').then(m => m.NewVersionModal), { ssr: false })

function statusVariant(s: string): 'active' | 'processing' | 'archived' | 'superseded' | 'failed' {
  if (s === 'active')     return 'active'
  if (s === 'processing') return 'processing'
  if (s === 'superseded') return 'superseded'
  if (s === 'failed')     return 'failed'
  return 'archived'
}

const ACTIVE_STATUSES   = new Set(['active', 'processing', 'failed'])
const ARCHIVED_STATUSES = new Set(['archived', 'superseded'])

// Distinct colour per section so they're easy to scan. The 15 standard sections
// get fixed colours; any custom section gets a stable colour from a name hash.
const SECTION_COLOURS: Record<string, string> = {
  'Activities':                   'bg-pink-50 text-pink-700',
  'Admission management':         'bg-blue-50 text-blue-700',
  'Business procedures':          'bg-slate-100 text-slate-700',
  'Care and health of residents': 'bg-emerald-50 text-emerald-700',
  'Complaints and compliments':   'bg-orange-50 text-orange-700',
  'Emergency planning':           'bg-amber-50 text-amber-700',
  'Fees and funding':             'bg-lime-50 text-lime-700',
  'GDPR':                         'bg-indigo-50 text-indigo-700',
  'Governance':                   'bg-violet-50 text-violet-700',
  'Home Premises':                'bg-yellow-50 text-yellow-700',
  'Infection control':            'bg-cyan-50 text-cyan-700',
  'Quality Assurance':            'bg-fuchsia-50 text-fuchsia-700',
  'Safeguarding':                 'bg-rose-50 text-rose-700',
  'Staff':                        'bg-sky-50 text-sky-700',
  'Training':                     'bg-teal-50 text-teal-700',
}
const SECTION_PALETTE = [
  'bg-pink-50 text-pink-700', 'bg-blue-50 text-blue-700', 'bg-emerald-50 text-emerald-700',
  'bg-orange-50 text-orange-700', 'bg-indigo-50 text-indigo-700', 'bg-violet-50 text-violet-700',
  'bg-amber-50 text-amber-700', 'bg-cyan-50 text-cyan-700', 'bg-fuchsia-50 text-fuchsia-700',
  'bg-rose-50 text-rose-700', 'bg-sky-50 text-sky-700', 'bg-teal-50 text-teal-700',
  'bg-lime-50 text-lime-700', 'bg-slate-100 text-slate-700',
]
function sectionColour(name: string): string {
  if (SECTION_COLOURS[name]) return SECTION_COLOURS[name]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return SECTION_PALETTE[h % SECTION_PALETTE.length]
}

export default function PoliciesPage() {
  const { data: session }           = useSession()
  const userId = session?.user?.email ?? 'guest'
  const [policies,       setPolicies]       = useState<any[]>([])
  const [loading,        setLoading]        = useState(true)
  const [tab,            setTab]            = useState<'active' | 'archived'>('active')
  const [search,         setSearch]         = useState('')
  const [showUpload,     setShowUpload]     = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [versionTarget,  setVersionTarget]  = useState<{ id: string; name: string } | null>(null)
  const [sections,       setSections]       = useState<string[]>([])
  const [customCategories, setCustomCategories] = useState<string[]>([])

  function load() {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    api.policies.list({ limit: '2000' })
      .then(data => { const list = data?.policies ?? []; setPolicies(list); persistentCache.set(`admin-policies-${userId}`, list) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const cached = persistentCache.get<any[]>(`admin-policies-${userId}`)
    if (cached) { setPolicies(cached); setLoading(false) }
  }, [userId])

  useEffect(load, [session?.accessToken])

  // The tenant's configurable internal-policy sections + custom document
  // categories (both drive the upload dropdowns).
  useEffect(() => {
    if (!session?.accessToken) return
    createApiClient(session.accessToken).settings.get()
      .then(s => { setSections(s.policy_sections ?? []); setCustomCategories(s.policy_categories ?? []) })
      .catch(() => {})
  }, [session?.accessToken])

  // Built-in categories (fixed) + the tenant's custom ones, as { value, label }.
  const categoryOptions = [
    { value: 'internal_policy',     label: 'Internal policy' },
    { value: 'staff_handbook',      label: 'Staff handbook' },
    { value: 'cqc_report',          label: 'CQC Report' },
    { value: 'business_continuity', label: 'Business continuity' },
    ...customCategories.map(c => ({ value: c, label: c })),
  ]

  const activePolicies   = policies.filter(p => ACTIVE_STATUSES.has(p.status))
  const archivedPolicies = policies.filter(p => ARCHIVED_STATUSES.has(p.status))
  const tabPolicies      = tab === 'active' ? activePolicies : archivedPolicies

  // Free-text search across name + filename, applied within the current tab.
  const q = search.trim().toLowerCase()
  const visiblePolicies = q
    ? tabPolicies.filter(p =>
        `${p.name ?? ''} ${p.filename ?? ''} ${p.section ?? ''}`.toLowerCase().includes(q))
    : tabPolicies

  async function archive(id: string, name: string) {
    if (!session?.accessToken) return
    if (!confirm(`Archive "${name}"? It will no longer be searchable.`)) return
    const api = createApiClient(session.accessToken)
    try { await api.policies.archive(id) } catch (e: any) { alert(e?.message ?? 'Archive failed.') }
    load()
  }

  async function retry(id: string) {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    try { await api.policies.retry(id) } catch (e: any) { alert(e?.message ?? 'Retry failed.') }
    load()
  }

  async function permanentDelete(id: string, name: string) {
    if (!session?.accessToken) return
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return
    const api = createApiClient(session.accessToken)
    try { await api.policies.permanentDelete(id) } catch (e: any) { alert(e?.message ?? 'Delete failed.') }
    load()
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-dark">Policies</h1>
        {tab === 'active' && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowBulkUpload(true)} size="md">
              <FolderUp size={15} className="mr-2" />
              Bulk upload
            </Button>
            <Button onClick={() => setShowUpload(true)} size="md">
              <Upload size={15} className="mr-2" />
              Upload policy
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'active'
              ? 'border-teal text-teal'
              : 'border-transparent text-neutral-mid hover:text-neutral-dark'
          }`}
        >
          Active
          {!loading && (
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
              tab === 'active' ? 'bg-teal-light text-teal' : 'bg-gray-100 text-neutral-mid'
            }`}>
              {activePolicies.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('archived')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'archived'
              ? 'border-teal text-teal'
              : 'border-transparent text-neutral-mid hover:text-neutral-dark'
          }`}
        >
          Archived
          {!loading && (
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
              tab === 'archived' ? 'bg-teal-light text-teal' : 'bg-gray-100 text-neutral-mid'
            }`}>
              {archivedPolicies.length}
            </span>
          )}
        </button>
      </div>

      {/* Modals */}
      {showUpload && (
        <UploadModal
          token={session?.accessToken ?? ''}
          sections={sections}
          categories={categoryOptions}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); setLoading(true); load() }}
        />
      )}
      {showBulkUpload && (
        <BulkUploadModal
          token={session?.accessToken ?? ''}
          sections={sections}
          categories={categoryOptions}
          onClose={() => setShowBulkUpload(false)}
          onUploaded={() => { setShowBulkUpload(false); setLoading(true); load() }}
        />
      )}
      {versionTarget && (
        <NewVersionModal
          token={session?.accessToken ?? ''}
          policyId={versionTarget.id}
          policyName={versionTarget.name}
          onClose={() => setVersionTarget(null)}
          onUploaded={() => { setVersionTarget(null); setLoading(true); load() }}
        />
      )}

      {/* Archived notice */}
      {tab === 'archived' && !loading && (
        <p className="mb-4 text-sm text-neutral-mid">
          Archived policies are no longer active in CareStream. They will not be returned in staff
          queries or used by the AI assistant. They are kept here for your records only.
        </p>
      )}

      {/* Search */}
      {!loading && tabPolicies.length > 0 && (
        <div className="relative mb-4 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-mid" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search policies by name…"
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-9 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-mid hover:text-neutral-dark" aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="rounded-card bg-white shadow-card px-6 py-6">
          <p className="text-sm text-neutral-mid">Loading…</p>
        </div>
      ) : tabPolicies.length === 0 ? (
        <div className="rounded-card bg-white shadow-card px-6 py-6">
          <p className="text-sm text-neutral-mid">
            {tab === 'active'
              ? 'No active policies. Upload a PDF, DOCX, ODT, or TXT file to get started.'
              : 'No archived policies.'}
          </p>
        </div>
      ) : visiblePolicies.length === 0 ? (
        <div className="rounded-card bg-white shadow-card px-6 py-6">
          <p className="text-sm text-neutral-mid">
            No policies match &ldquo;<span className="font-medium text-neutral-dark">{search}</span>&rdquo;. It may not have been uploaded yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <PolicyGroup
            heading="Internal Policies"
            showSection
            policies={visiblePolicies.filter(p => p.document_category === 'internal_policy')}
            emptyText={tab === 'active' ? 'No active internal policies.' : 'No archived internal policies.'}
            onNewVersion={p => setVersionTarget({ id: p.id, name: p.name })}
            onRetry={p => retry(p.id)}
            onArchive={p => archive(p.id, p.name)}
            onDelete={p => permanentDelete(p.id, p.name)}
          />
          <PolicyGroup
            heading="Staff Handbooks"
            policies={visiblePolicies.filter(p => p.document_category === 'staff_handbook')}
            emptyText={tab === 'active' ? 'No active staff handbooks.' : 'No archived staff handbooks.'}
            onNewVersion={p => setVersionTarget({ id: p.id, name: p.name })}
            onRetry={p => retry(p.id)}
            onArchive={p => archive(p.id, p.name)}
            onDelete={p => permanentDelete(p.id, p.name)}
          />
          <PolicyGroup
            heading="CQC Reports"
            policies={visiblePolicies.filter(p => p.document_category === 'cqc_report')}
            emptyText={tab === 'active' ? 'No active CQC reports.' : 'No archived CQC reports.'}
            onNewVersion={p => setVersionTarget({ id: p.id, name: p.name })}
            onRetry={p => retry(p.id)}
            onArchive={p => archive(p.id, p.name)}
            onDelete={p => permanentDelete(p.id, p.name)}
          />
          {/* Custom categories — shown only when they actually contain documents. */}
          {Array.from(new Set(visiblePolicies.map(p => p.document_category as string)))
            .filter(cat => !['internal_policy', 'staff_handbook', 'cqc_report'].includes(cat))
            .sort((a, b) => a.localeCompare(b))
            .map(cat => (
              <PolicyGroup
                key={cat}
                heading={cat}
                policies={visiblePolicies.filter(p => p.document_category === cat)}
                emptyText=""
                onNewVersion={p => setVersionTarget({ id: p.id, name: p.name })}
                onRetry={p => retry(p.id)}
                onArchive={p => archive(p.id, p.name)}
                onDelete={p => permanentDelete(p.id, p.name)}
              />
            ))}
        </div>
      )}
    </div>
  )
}

// ─── Policy Group ─────────────────────────────────────────────────────────────

function PolicyGroup({
  heading,
  policies,
  emptyText,
  showSection,
  onNewVersion,
  onRetry,
  onArchive,
  onDelete,
}: {
  heading:      string
  policies:     any[]
  emptyText:    string
  showSection?: boolean
  onNewVersion: (p: any) => void
  onRetry:      (p: any) => void
  onArchive:    (p: any) => void
  onDelete:     (p: any) => void
}) {
  return (
    <div className="rounded-card bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-neutral-dark">{heading}</h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-neutral-mid">
          {policies.length}
        </span>
      </div>
      {policies.length === 0 ? (
        <p className="px-6 py-5 text-sm text-neutral-mid">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col />
              {showSection && <col className="w-44" />}
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-28" />
              <col className="w-32" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-xs font-medium text-neutral-mid">Name</th>
                {showSection && <th className="px-6 py-4 text-xs font-medium text-neutral-mid">Section</th>}
                <th className="px-6 py-4 text-xs font-medium text-neutral-mid">Status</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-mid">Version</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-mid">Uploaded</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-mid text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p: any) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-neutral-light/50">
                  <td className="px-6 py-4 truncate font-medium text-neutral-dark">{p.name}</td>
                  {showSection && (
                    <td className="px-6 py-4">
                      {p.section
                        ? <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${sectionColour(p.section)}`}>{p.section}</span>
                        : <span className="text-xs italic text-neutral-mid/50">—</span>}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant(p.status)}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-neutral-mid">v{p.version}</td>
                  <td className="px-6 py-4 text-neutral-mid">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <PolicyActions
                      policy={p}
                      onNewVersion={() => onNewVersion(p)}
                      onRetry={() => onRetry(p)}
                      onArchive={() => onArchive(p)}
                      onDelete={() => onDelete(p)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Policy Actions Dropdown ──────────────────────────────────────────────────

function PolicyActions({
  policy,
  onNewVersion,
  onRetry,
  onArchive,
  onDelete,
}: {
  policy:       any
  onNewVersion: () => void
  onRetry:      () => void
  onArchive:    () => void
  onDelete:     () => void
}) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  function handleOpen() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + window.scrollY + 4, right: window.innerWidth - r.right })
    }
    setOpen(v => !v)
  }

  return (
    <div className="inline-block text-left">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-dark shadow-sm hover:bg-gray-50"
      >
        Actions <MoreHorizontal size={13} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="fixed z-20 w-48 rounded-md border border-gray-100 bg-white py-1 shadow-lg"
            style={{ top: pos.top, right: pos.right }}
          >
            {(policy.status === 'active' || policy.status === 'failed') && (
              <button
                onClick={() => { setOpen(false); onNewVersion() }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-dark hover:bg-neutral-light"
              >
                <RefreshCw size={13} /> Upload new version
              </button>
            )}
            {policy.status === 'failed' && (
              <button
                onClick={() => { setOpen(false); onRetry() }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-dark hover:bg-neutral-light"
              >
                <RotateCcw size={13} /> Retry ingestion
              </button>
            )}
            {policy.status !== 'archived' && (
              <button
                onClick={() => { setOpen(false); onArchive() }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-dark hover:bg-neutral-light"
              >
                <Archive size={13} /> Archive
              </button>
            )}
            <div className="my-1 border-t border-gray-100" />
            <button
              onClick={() => { setOpen(false); onDelete() }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-status-error hover:bg-red-50"
            >
              <X size={13} /> Delete permanently
            </button>
          </div>
        </>
      )}
    </div>
  )
}
