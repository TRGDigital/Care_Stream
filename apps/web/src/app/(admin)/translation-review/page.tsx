'use client'

// Admin review queue for staff-suggested translation improvements. Approve, edit
// or reject; approved suggestions replace the machine translation for that phrase
// in that language, for this care setting. Enterprise-independent (part of the
// core multilingual offering).

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient, type TranslationSuggestion } from '@/lib/api-client'
import { Languages, Loader2, Check, X, Pencil, Trash2, Info, ChevronDown } from 'lucide-react'

const TABS: { key: string; label: string }[] = [
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: '',         label: 'All' },
]
const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}
function fmt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function HelpAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-5 overflow-hidden rounded-lg border border-teal/20 bg-teal-light/20">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-teal-light/40">
        <Info size={13} className="shrink-0 text-teal" />
        <span className="flex-1 text-xs font-semibold text-teal">{title}</span>
        <ChevronDown size={13} className={`shrink-0 text-teal transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-teal/10 px-4 py-3 text-xs leading-relaxed text-neutral-mid">{children}</div>
      )}
    </div>
  )
}

export default function TranslationReviewPage() {
  const { data: session } = useSession()
  const token = session?.accessToken

  const [tab, setTab] = useState('pending')
  const [items, setItems] = useState<TranslationSuggestion[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [autoApprove, setAutoApprove] = useState(false)
  const [savingAuto, setSavingAuto] = useState(false)

  const load = useCallback(() => {
    if (!token) return
    setLoading(true)
    createApiClient(token).settings.translationSuggestions(tab || undefined)
      .then(r => { setItems(r.suggestions); setPendingCount(r.pending_count) })
      .catch((e: any) => setError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [token, tab])
  useEffect(load, [load])

  useEffect(() => {
    if (!token) return
    createApiClient(token).settings.get().then(s => setAutoApprove(!!s.translation_suggestions_auto_approve)).catch(() => {})
  }, [token])

  async function toggleAuto() {
    if (!token) return
    const next = !autoApprove
    setAutoApprove(next); setSavingAuto(true)
    try { await createApiClient(token).settings.update({ translation_suggestions_auto_approve: next }) }
    catch { setAutoApprove(!next) }
    finally { setSavingAuto(false) }
  }

  async function review(id: string, action: 'approve' | 'reject' | 'pending', suggested_text?: string) {
    if (!token) return
    setBusy(id)
    try {
      await createApiClient(token).settings.reviewTranslationSuggestion(id, { action, suggested_text })
      setEditing(null)
      load()
    } catch (e: any) { setError(e.message ?? 'Could not update') }
    finally { setBusy(null) }
  }
  async function remove(id: string) {
    if (!token) return
    setBusy(id)
    try { await createApiClient(token).settings.deleteTranslationSuggestion(id); setItems(prev => prev.filter(x => x.id !== id)) }
    finally { setBusy(null) }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Languages size={20} className="text-teal" />
          <div>
            <h1 className="text-xl font-bold text-neutral-dark">Translation review</h1>
            <p className="mt-0.5 text-sm text-neutral-mid">Approve improvements your team suggest to translated content.</p>
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs">
          <button type="button" role="switch" aria-checked={autoApprove} disabled={savingAuto} onClick={toggleAuto}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${autoApprove ? 'bg-teal' : 'bg-gray-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoApprove ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-neutral-dark">Auto-approve suggestions</span>
        </label>
      </div>

      <HelpAccordion title="How translation review works">
        <p>When you let a staff member suggest translations (Staff → edit their profile → &ldquo;Let them suggest better translations&rdquo;), they can propose improvements to any translated training or content in their hub.</p>
        <p>Suggestions arrive here as <strong>Pending</strong>. When you <strong>Approve</strong> one, that improved wording replaces the machine translation for that exact phrase, in that language, for your care setting, everywhere it appears. You can <strong>Edit</strong> before approving, or <strong>Reject</strong> to keep the machine version.</p>
        <p>With <strong>Auto-approve</strong> on, suggestions from your permitted staff go live immediately without waiting here. It&rsquo;s off by default so nothing changes what staff see until you&rsquo;ve checked it.</p>
      </HelpAccordion>

      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === t.key ? 'bg-teal text-white' : 'border border-gray-200 bg-white text-neutral-mid hover:text-neutral-dark'}`}>
            {t.label}
            {t.key === 'pending' && pendingCount > 0 && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-xs text-amber-700">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={15} className="animate-spin" /> Loading…</div>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-neutral-mid">
          {tab === 'pending' ? 'No suggestions waiting for review.' : 'Nothing here yet.'}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map(s => (
            <div key={s.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-600">{s.lang_name}</span>
                <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[s.status] ?? 'bg-gray-100 text-gray-500'}`}>{s.status}</span>
                {s.content_kind && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">{s.content_kind}</span>}
                <span className="ml-auto text-neutral-mid">by {s.suggested_by_name || 'staff'} · {fmt(s.updated_at)}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded bg-neutral-light/60 p-2">
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-mid">English source</p>
                  <p className="text-xs text-neutral-dark">{s.source_text}</p>
                </div>
                <div className="rounded bg-neutral-light/60 p-2">
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-mid">Current (machine)</p>
                  <p className="text-xs text-neutral-mid">{s.machine_text || '—'}</p>
                </div>
                <div className="rounded bg-teal-light/30 p-2">
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal">Suggested</p>
                  {editing === s.id ? (
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3}
                      className="w-full rounded border border-teal/40 bg-white px-2 py-1 text-xs focus:outline-none" />
                  ) : (
                    <p className="text-xs text-neutral-dark">{s.suggested_text}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                {editing === s.id ? (
                  <>
                    <button onClick={() => review(s.id, 'approve', editText)} disabled={busy === s.id} className="inline-flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50">
                      {busy === s.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save &amp; approve
                    </button>
                    <button onClick={() => setEditing(null)} className="rounded-lg px-3 py-1.5 text-xs text-neutral-mid hover:text-neutral-dark">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => remove(s.id)} disabled={busy === s.id} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-neutral-mid hover:text-red-500 disabled:opacity-50" title="Delete"><Trash2 size={12} /></button>
                    <button onClick={() => { setEditing(s.id); setEditText(s.suggested_text) }} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal"><Pencil size={12} /> Edit</button>
                    {s.status !== 'rejected' && <button onClick={() => review(s.id, 'reject')} disabled={busy === s.id} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-red-300 hover:text-red-600 disabled:opacity-50"><X size={12} /> Reject</button>}
                    {s.status !== 'approved' && <button onClick={() => review(s.id, 'approve')} disabled={busy === s.id} className="inline-flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50">{busy === s.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve</button>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
