'use client'

// §14.7 — Policy library: searchable table, upload, archive.

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Upload, FolderUp, RefreshCw, X, MoreHorizontal, Archive, RotateCcw, Search, GraduationCap, Trash2, Copy, Loader2, CheckCircle2, Eye, FileText, FilePenLine, CalendarClock } from 'lucide-react'
import { PolicyChangesModal } from '@/components/admin/policy-changes-modal'

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
  const [previewPolicy,  setPreviewPolicy]  = useState<{ id: string; name: string } | null>(null)
  const [reviewSummary,  setReviewSummary]  = useState<Array<{ policy_id: string; pending: number; version: string; published_at: string | null; approval_status: string; external_name: string; external_sent_at: string | null }>>([])
  const [dueReview,      setDueReview]       = useState<Array<{ policy_id: string; name: string; next_review_due: string; days_overdue: number }>>([])
  const [reviewTarget,   setReviewTarget]   = useState<{ id: string; name: string } | null>(null)
  const [sections,       setSections]       = useState<string[]>([])
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [duplicates,     setDuplicates]     = useState<Array<{ id: string; name: string; version: number; score: number; match: { id: string; name: string; version: number } }>>([])
  const [resolvingDup,   setResolvingDup]   = useState<string | null>(null)
  const [similarNamed,   setSimilarNamed]   = useState<Array<{ id: string; name: string; matched_name: string; content_pct: number | null }>>([])

  function load() {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    api.policies.list({ limit: '2000' })
      .then(data => { const list = data?.policies ?? []; setPolicies(list); persistentCache.set(`admin-policies-${userId}`, list) })
      .catch(() => {})
      .finally(() => setLoading(false))
    loadReviewSummary()
  }

  function loadReviewSummary() {
    if (!session?.accessToken) return
    createApiClient(session.accessToken).analytics.policyDocumentsSummary().then(d => setReviewSummary(d?.documents ?? [])).catch(() => {})
  }

  // Policies due for review — fetched on its own (not tangled with the heavy list load), cached
  // and hydrated like the dashboard so the panel shows reliably.
  function loadDueReview() {
    if (!session?.accessToken) return
    createApiClient(session.accessToken).analytics.policiesDueForReview()
      .then(d => { const list = d?.policies ?? []; setDueReview(list); persistentCache.set(`admin-policies-due-${userId}`, list) })
      .catch(() => {})
  }

  function loadDuplicates() {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    api.policies.duplicates().then(d => setDuplicates(d?.duplicates ?? [])).catch(() => {})
    api.policies.similarNamed().then(d => setSimilarNamed(d?.notes ?? [])).catch(() => {})
  }

  async function dismissSimilar(id: string) {
    if (!session?.accessToken) return
    setSimilarNamed(prev => prev.filter(n => n.id !== id))
    try { await createApiClient(session.accessToken).policies.dismissSimilarNamed(id) } catch { /* stays until next load */ }
  }

  async function resolveDuplicate(id: string, action: 'keep_both' | 'replace' | 'cancel') {
    if (!session?.accessToken) return
    setResolvingDup(id)
    try {
      await createApiClient(session.accessToken).policies.resolveDuplicate(id, action)
      setDuplicates(prev => prev.filter(d => d.id !== id))
      load()   // reflect any archive (replace/cancel)
    } catch { /* leave it flagged to retry */ }
    finally { setResolvingDup(null) }
  }

  useEffect(() => {
    const cached = persistentCache.get<any[]>(`admin-policies-${userId}`)
    if (cached) { setPolicies(cached); setLoading(false) }
  }, [userId])

  useEffect(load, [session?.accessToken])
  useEffect(loadDuplicates, [session?.accessToken])

  // Due-for-review panel: hydrate from cache instantly, then refresh from the API.
  useEffect(() => {
    const cached = persistentCache.get<Array<{ policy_id: string; name: string; next_review_due: string; days_overdue: number }>>(`admin-policies-due-${userId}`)
    if (cached) setDueReview(cached)
    loadDueReview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken, userId])

  // While any policy is still processing, refresh the list + duplicate flags every
  // few seconds so a newly-detected duplicate surfaces without a manual reload.
  useEffect(() => {
    if (!session?.accessToken) return
    if (!policies.some(p => p.status === 'processing')) return
    const t = setInterval(() => { load(); loadDuplicates() }, 4000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policies, session?.accessToken])

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

  // Managed-document summary (adopted changes / published version) keyed by policy id.
  const docByPolicy = Object.fromEntries(reviewSummary.map(d => [d.policy_id, d]))

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

  async function toggleGeneric(p: any) {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    const next = !p.generic_onboarding
    // Optimistic update, then persist.
    setPolicies(prev => prev.map(x => x.id === p.id ? { ...x, generic_onboarding: next } : x))
    try { await api.policies.update(p.id, { generic_onboarding: next }) }
    catch (e: any) { alert(e?.message ?? 'Update failed.'); load() }
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

      {/* Possible content duplicates — same policy text under a different name */}
      {tab === 'active' && duplicates.length > 0 && (
        <div className="mb-4 rounded-card border border-amber-200 bg-amber-50/60 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Copy size={15} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              {duplicates.length === 1 ? 'A policy looks like a duplicate' : `${duplicates.length} policies look like duplicates`}
            </p>
          </div>
          <p className="mb-3 text-xs text-neutral-mid">
            The content of these newly uploaded policies closely matches an existing policy, even though the names differ. Choose what to do with each.
          </p>
          <div className="space-y-2.5">
            {duplicates.map(d => (
              <div key={d.id} className="rounded-lg border border-amber-100 bg-white p-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium text-neutral-dark">{d.name}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">{Math.round(d.score * 100)}% match</span>
                  <span className="text-xs text-neutral-mid">looks like</span>
                  <span className="font-medium text-neutral-dark">{d.match.name}</span>
                  <span className="text-[11px] text-neutral-mid">(existing)</span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button onClick={() => resolveDuplicate(d.id, 'replace')} disabled={resolvingDup === d.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50">
                    {resolvingDup === d.id ? <Loader2 size={12} className="animate-spin" /> : null} Replace &ldquo;{d.match.name}&rdquo;
                  </button>
                  <button onClick={() => resolveDuplicate(d.id, 'keep_both')} disabled={resolvingDup === d.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal disabled:opacity-50">
                    Keep both
                  </button>
                  <button onClick={() => resolveDuplicate(d.id, 'cancel')} disabled={resolvingDup === d.id}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-mid hover:text-red-600 disabled:opacity-50">
                    <Trash2 size={12} /> Discard this upload
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-mid">
                  <strong>Replace</strong> archives the existing policy and keeps this one. <strong>Keep both</strong> saves them side by side. <strong>Discard</strong> archives this new upload.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reassurance: similarly-named but content-distinct policies (checked, both kept) */}
      {tab === 'active' && similarNamed.length > 0 && (
        <div className="mb-4 rounded-card border border-teal/20 bg-teal-light/20 p-4">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-teal" />
            <p className="text-sm font-semibold text-teal">Checked for duplicates, kept as separate policies</p>
          </div>
          <p className="mb-3 text-xs text-neutral-mid">
            These policies have a similar name to one you already have, so we compared their full content. They&rsquo;re <strong>different policies</strong>, not duplicates, so we&rsquo;ve kept both.
          </p>
          <div className="space-y-2">
            {similarNamed.map(n => (
              <div key={n.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-teal/10 bg-white px-3 py-2 text-sm">
                <span className="font-medium text-neutral-dark">{n.name}</span>
                <span className="text-xs text-neutral-mid">and</span>
                <span className="font-medium text-neutral-dark">{n.matched_name}</span>
                <span className="text-xs text-neutral-mid">share similar wording but are</span>
                <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-medium text-teal">
                  {n.content_pct != null ? `only ${n.content_pct}% content match` : 'different content'}
                </span>
                <span className="text-xs text-neutral-mid">, both kept.</span>
                <button onClick={() => dismissSimilar(n.id)} className="ml-auto text-xs font-medium text-neutral-mid hover:text-neutral-dark">Dismiss</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showUpload && (
        <UploadModal
          token={session?.accessToken ?? ''}
          sections={sections}
          categories={categoryOptions}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); setLoading(true); load(); loadDuplicates() }}
        />
      )}
      {showBulkUpload && (
        <BulkUploadModal
          token={session?.accessToken ?? ''}
          sections={sections}
          categories={categoryOptions}
          onClose={() => setShowBulkUpload(false)}
          onUploaded={() => { setShowBulkUpload(false); setLoading(true); load(); loadDuplicates() }}
        />
      )}
      {versionTarget && (
        <NewVersionModal
          token={session?.accessToken ?? ''}
          policyId={versionTarget.id}
          policyName={versionTarget.name}
          onClose={() => setVersionTarget(null)}
          onUploaded={() => { setVersionTarget(null); setLoading(true); load(); loadDuplicates() }}
        />
      )}
      {previewPolicy && session?.accessToken && (
        <PolicyPreviewModal
          token={session.accessToken}
          policy={previewPolicy}
          onClose={() => setPreviewPolicy(null)}
        />
      )}
      {reviewTarget && session?.accessToken && (
        <PolicyChangesModal
          token={session.accessToken}
          policyId={reviewTarget.id}
          policyName={reviewTarget.name}
          onClose={() => { setReviewTarget(null); loadReviewSummary() }}
          onPublished={() => loadReviewSummary()}
        />
      )}

      {/* Archived notice */}
      {tab === 'archived' && !loading && (
        <p className="mb-4 text-sm text-neutral-mid">
          Archived policies are no longer active in CareStream. They will not be returned in staff
          queries or used by the AI assistant. They are kept here for your records only.
        </p>
      )}

      {/* Policies due for review (review dates set on /gaps that have come around) */}
      {tab === 'active' && dueReview.length > 0 && (
        <div className="mb-4 rounded-card border border-red-200 bg-red-50/50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-900"><CalendarClock size={15} /> Policies due for review</p>
          <p className="mt-0.5 text-xs text-red-800/80">These policies have reached the review date you set. Review them, then record a new review date.</p>
          <ul className="mt-3 space-y-2">
            {dueReview.map(d => (
              <li key={d.policy_id} className="flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-dark">{d.name}</p>
                  <p className="text-xs text-neutral-mid">Due {new Date(d.next_review_due).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}{d.days_overdue > 0 ? ` · ${d.days_overdue} day${d.days_overdue === 1 ? '' : 's'} overdue` : ''}</p>
                </div>
                <a href="/gaps" className="shrink-0 rounded-btn bg-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-dark">Review</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Adopted changes to review (Policy Change Adoption) */}
      {(() => {
        const toReview = reviewSummary.filter(d => d.pending > 0)
        if (!toReview.length) return null
        return (
          <div className="mb-4 rounded-card border border-teal-200 bg-teal-50/50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-teal-900"><FilePenLine size={15} /> Adopted changes to review</p>
            <p className="mt-0.5 text-xs text-teal-800/80">You have adopted policy changes waiting to be approved and published.</p>
            <ul className="mt-3 space-y-2">
              {toReview.map(d => {
                const name = policies.find((p: any) => p.id === d.policy_id)?.name ?? 'Policy'
                const st = d.approval_status
                const chip = st === 'pending_manager' ? { label: 'With care manager for approval', cls: 'border-amber-200 bg-amber-50 text-amber-700' }
                  : st === 'pending_external' ? { label: 'Awaiting external approval', cls: 'border-sky-200 bg-sky-50 text-sky-700' }
                  : null
                return (
                  <li key={d.policy_id} className="flex items-center justify-between gap-3 rounded-lg border border-teal-100 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-neutral-dark">{name}</p>
                        {chip && <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${chip.cls}`}>{chip.label}</span>}
                      </div>
                      <p className="text-xs text-neutral-mid">{d.pending} change{d.pending === 1 ? '' : 's'}{d.version ? ` · current version ${d.version}` : ''}</p>
                      {st === 'pending_external' && d.external_sent_at && (
                        <p className="mt-0.5 text-xs text-sky-700">Sent to {d.external_name || 'the reviewer'} on {new Date(d.external_sent_at).toLocaleDateString('en-GB')}</p>
                      )}
                    </div>
                    <button onClick={() => setReviewTarget({ id: d.policy_id, name })}
                      className={`shrink-0 rounded-btn px-3 py-1.5 text-sm font-medium text-white ${st === 'pending_external' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-teal hover:bg-teal-dark'}`}>{st === 'pending_external' ? 'Send to external approver' : st === 'pending_manager' ? 'View' : 'Review changes'}</button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })()}

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
            onToggleGeneric={toggleGeneric} onPreview={p => setPreviewPolicy({ id: p.id, name: p.name })} docSummary={docByPolicy} onReview={p => setReviewTarget({ id: p.id, name: p.name })}
          />
          <PolicyGroup
            heading="Staff Handbooks"
            policies={visiblePolicies.filter(p => p.document_category === 'staff_handbook')}
            emptyText={tab === 'active' ? 'No active staff handbooks.' : 'No archived staff handbooks.'}
            onNewVersion={p => setVersionTarget({ id: p.id, name: p.name })}
            onRetry={p => retry(p.id)}
            onArchive={p => archive(p.id, p.name)}
            onDelete={p => permanentDelete(p.id, p.name)}
            onToggleGeneric={toggleGeneric} onPreview={p => setPreviewPolicy({ id: p.id, name: p.name })} docSummary={docByPolicy} onReview={p => setReviewTarget({ id: p.id, name: p.name })}
          />
          <PolicyGroup
            heading="CQC Reports"
            policies={visiblePolicies.filter(p => p.document_category === 'cqc_report')}
            emptyText={tab === 'active' ? 'No active CQC reports.' : 'No archived CQC reports.'}
            onNewVersion={p => setVersionTarget({ id: p.id, name: p.name })}
            onRetry={p => retry(p.id)}
            onArchive={p => archive(p.id, p.name)}
            onDelete={p => permanentDelete(p.id, p.name)}
            onToggleGeneric={toggleGeneric} onPreview={p => setPreviewPolicy({ id: p.id, name: p.name })} docSummary={docByPolicy} onReview={p => setReviewTarget({ id: p.id, name: p.name })}
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
            onToggleGeneric={toggleGeneric} onPreview={p => setPreviewPolicy({ id: p.id, name: p.name })} docSummary={docByPolicy} onReview={p => setReviewTarget({ id: p.id, name: p.name })}
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
  onToggleGeneric,
  onPreview,
  docSummary = {},
  onReview,
}: {
  heading:      string
  policies:     any[]
  emptyText:    string
  showSection?: boolean
  onNewVersion: (p: any) => void
  onRetry:      (p: any) => void
  onArchive:    (p: any) => void
  onDelete:     (p: any) => void
  onToggleGeneric: (p: any) => void
  onPreview:    (p: any) => void
  docSummary?:  Record<string, { pending: number; version: string; published_at: string | null }>
  onReview?:    (p: any) => void
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
              <col className={showSection ? 'w-[34%]' : 'w-[50%]'} />
              {showSection && <col className="w-[16%]" />}
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-4 text-xs font-medium text-neutral-mid">Name</th>
                {showSection && <th className="px-6 py-4 text-xs font-medium text-neutral-mid">Section</th>}
                <th className="px-3 py-4 text-xs font-medium text-neutral-mid">Status</th>
                <th className="px-3 py-4 text-xs font-medium text-neutral-mid">Version</th>
                <th className="px-3 py-4 text-xs font-medium text-neutral-mid">Uploaded</th>
                <th className="px-4 py-4 text-xs font-medium text-neutral-mid text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p: any) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-neutral-light/50">
                  <td className="px-6 py-4 font-medium text-neutral-dark">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate">{p.name}</span>
                      {p.generic_onboarding && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700"><GraduationCap size={9} /> Onboarding</span>}
                      {docSummary[p.id] && (docSummary[p.id].pending > 0
                        ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700"><FilePenLine size={9} /> {docSummary[p.id].pending} to review</span>
                        : docSummary[p.id].published_at
                          ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-light/40 px-2 py-0.5 text-[10px] font-semibold text-teal"><CheckCircle2 size={9} /> Updated · v{docSummary[p.id].version}</span>
                          : null)}
                    </div>
                  </td>
                  {showSection && (
                    <td className="px-6 py-4">
                      {p.section
                        ? <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${sectionColour(p.section)}`}>{p.section}</span>
                        : <span className="text-xs italic text-neutral-mid/50">—</span>}
                    </td>
                  )}
                  <td className="px-3 py-4">
                    <Badge variant={statusVariant(p.status)}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-3 py-4 text-neutral-mid">v{p.version}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-neutral-mid">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-nowrap items-center justify-end gap-1">
                      {p.status === 'active' && docSummary[p.id] && onReview && (
                        <button
                          onClick={() => onReview(p)}
                          title="Review adopted changes, download, or publish"
                          aria-label="Review changes"
                          className="inline-flex h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-teal/40 px-2.5 text-xs font-medium text-teal hover:bg-teal-light/30"
                        >
                          <FilePenLine size={12} /> {docSummary[p.id].pending > 0 ? 'Review' : 'View / download'}
                        </button>
                      )}
                      {p.status === 'active' && !docSummary[p.id] && (
                        <button
                          onClick={() => onPreview(p)}
                          title="Preview how this policy renders for staff (letterhead & footers stripped)"
                          aria-label="Preview policy"
                          className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-gray-200 px-2.5 text-xs font-medium text-neutral-mid hover:border-teal/40 hover:text-teal"
                        >
                          Policy preview
                        </button>
                      )}
                      <PolicyActions
                        policy={p}
                        onNewVersion={() => onNewVersion(p)}
                        onRetry={() => onRetry(p)}
                        onArchive={() => onArchive(p)}
                        onDelete={() => onDelete(p)}
                        onToggleGeneric={() => onToggleGeneric(p)}
                      />
                    </div>
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
  onToggleGeneric,
}: {
  policy:       any
  onNewVersion: () => void
  onRetry:      () => void
  onArchive:    () => void
  onDelete:     () => void
  onToggleGeneric: () => void
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
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
          open ? 'border-teal/40 bg-teal-light/40 text-teal' : 'border-gray-200 bg-white text-neutral-dark hover:border-teal/40 hover:bg-neutral-light'
        }`}
      >
        Actions <MoreHorizontal size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="dropdown-pop fixed z-20 w-60 origin-top-right overflow-hidden rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl ring-1 ring-black/5"
            style={{ top: pos.top, right: pos.right }}
          >
            {(policy.status === 'active' || policy.status === 'failed') && (
              <button
                onClick={() => { setOpen(false); onNewVersion() }}
                className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-dark transition-colors hover:bg-neutral-light"
              >
                <RefreshCw size={15} className="shrink-0 text-neutral-mid transition-colors group-hover:text-teal" /> Upload new version
              </button>
            )}
            {policy.status === 'failed' && (
              <button
                onClick={() => { setOpen(false); onRetry() }}
                className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-dark transition-colors hover:bg-neutral-light"
              >
                <RotateCcw size={15} className="shrink-0 text-neutral-mid transition-colors group-hover:text-teal" /> Retry ingestion
              </button>
            )}
            {policy.status === 'active' && policy.document_category !== 'cqc_report' && (
              <button
                onClick={() => { setOpen(false); onToggleGeneric() }}
                className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-dark transition-colors hover:bg-amber-50"
              >
                <GraduationCap size={15} className="shrink-0 text-neutral-mid transition-colors group-hover:text-amber-600" /> {policy.generic_onboarding ? 'Remove from onboarding' : 'Use as onboarding policy'}
              </button>
            )}
            {policy.status !== 'archived' && (
              <button
                onClick={() => { setOpen(false); onArchive() }}
                className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-dark transition-colors hover:bg-neutral-light"
              >
                <Archive size={15} className="shrink-0 text-neutral-mid transition-colors group-hover:text-teal" /> Archive
              </button>
            )}
            <div className="mx-2 my-1.5 border-t border-gray-100" />
            <button
              onClick={() => { setOpen(false); onDelete() }}
              className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 size={15} className="shrink-0 text-red-400 transition-colors group-hover:text-red-600" /> Delete permanently
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Policy Preview (how it renders for staff) ────────────────────────────────
function PolicyPreviewModal({ token, policy, onClose }: {
  token: string
  policy: { id: string; name: string }
  onClose: () => void
}) {
  const [data, setData]     = useState<{ name: string; status: string; cached: boolean; html: string; raw: string; has_raw: boolean } | null>(null)
  const [loading, setLoad]  = useState(true)
  const [error, setError]   = useState('')
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    createApiClient(token).policies.preview(policy.id)
      .then(setData)
      .catch((e: any) => setError(e.message ?? 'Could not load the preview.'))
      .finally(() => setLoad(false))
  }, [token, policy.id])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-neutral-dark">{policy.name}</h2>
            <p className="mt-0.5 text-xs text-neutral-mid">How this policy looks to your staff (letterhead, contacts &amp; footers removed).</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>

        {data?.has_raw && (
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-2.5">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
              <button onClick={() => setShowRaw(false)} className={`flex items-center gap-1 rounded-md px-2.5 py-1 ${!showRaw ? 'bg-white text-neutral-dark shadow-sm' : 'text-neutral-mid'}`}><Eye size={12} /> As staff see it</button>
              <button onClick={() => setShowRaw(true)} className={`flex items-center gap-1 rounded-md px-2.5 py-1 ${showRaw ? 'bg-white text-neutral-dark shadow-sm' : 'text-neutral-mid'}`}><FileText size={12} /> Original text</button>
            </div>
            {data && !data.cached && !showRaw && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">Rendered just now</span>}
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center gap-2 py-16 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Rendering the policy…</div>
          ) : error ? (
            <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          ) : !data?.has_raw ? (
            <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">This policy isn&rsquo;t ready to preview yet{data?.status === 'processing' ? ' — it&rsquo;s still processing.' : '.'}</p>
          ) : showRaw ? (
            <pre className="whitespace-pre-wrap break-words rounded-lg bg-neutral-light/50 p-4 text-xs leading-relaxed text-neutral-dark">{data.raw}</pre>
          ) : data.html ? (
            <div className="policy-content" dangerouslySetInnerHTML={{ __html: data.html }} />
          ) : (
            <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">Could not render this policy. Try &ldquo;Original text&rdquo; to see the source.</p>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-100 px-6 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-neutral-mid hover:text-neutral-dark">Close</button>
        </div>
      </div>
    </div>
  )
}
