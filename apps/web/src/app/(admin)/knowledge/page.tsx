'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient, type KnowledgeEntry } from '@/lib/api-client'
import {
  BookOpen, Plus, Sparkles, Trash2, Pencil, X, Check,
  Loader2, ChevronDown, ChevronRight, ShieldCheck, Clock,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupBySource(entries: KnowledgeEntry[]): Map<string, KnowledgeEntry[]> {
  const map = new Map<string, KnowledgeEntry[]>()
  for (const e of entries) {
    const key = e.source_name || 'Manual entries'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return map
}

// Maps each platform seed source_name to its display category.
const PLATFORM_SOURCE_CATEGORY: Record<string, string> = {
  'CQC — Key Lines of Enquiry':                          'CQC & Inspection',
  'CQC — Inspection Ratings':                            'CQC & Inspection',
  'CQC — Fit and Proper Persons Requirement':            'CQC & Inspection',
  'CQC — Registration Requirements':                     'CQC & Inspection',
  'HSE — RIDDOR 2013':                                   'Incidents & Reporting',
  'Care Act 2014 — Safeguarding Principles':             'Incidents & Reporting',
  'CQC — Duty of Candour (Regulation 20)':               'Incidents & Reporting',
  'CQC — Notification Requirements':                     'Incidents & Reporting',
  'Mental Capacity Act 2005 — DoLS':                     'Incidents & Reporting',
  'HSE — Manual Handling Operations Regulations 1992':   'Health & Safety',
  'HSE — COSHH Regulations 2002':                        'Health & Safety',
  'Regulatory Reform (Fire Safety) Order 2005':          'Health & Safety',
  'HSE — Lone Working Guidance':                         'Health & Safety',
  'HSE — LOLER 1998 / PUWER 1998':                       'Health & Safety',
  'NICE / NMC — Medication Administration Guidance':     'Medication',
  'Misuse of Drugs Regulations 2001':                    'Medication',
  'NICE / UKCPA — PRN Medication Guidance':              'Medication',
  'CQC / NICE — Medication Error Reporting':             'Medication',
  'WHO — Five Moments for Hand Hygiene':                 'Infection Prevention',
  'UKHSA — IPC in Health and Social Care Settings':      'Infection Prevention',
  'UKHSA — Standard Infection Control Precautions':      'Infection Prevention',
  'UKHSA — Outbreak Management in Care Settings':        'Infection Prevention',
  'Public Interest Disclosure Act 1998':                 'Employment & HR',
  'DBS / Safeguarding Vulnerable Groups Act 2006':       'Employment & HR',
  'Working Time Regulations 1998':                       'Employment & HR',
  'HMRC — Statutory Sick Pay':                           'Employment & HR',
  'UK GDPR / Data Protection Act 2018':                  'Data & Privacy',
  'NHS / DHSC — Records Management Code of Practice 2021': 'Data & Privacy',
  'UK GDPR — Subject Access Requests':                   'Data & Privacy',
  'ICO — Data Breach Reporting':                         'Data & Privacy',
  'Mental Capacity Act 2005':                            'Mental Capacity & Rights',
  'Mental Capacity Act 2005 — Capacity Assessment':      'Mental Capacity & Rights',
  'Mental Capacity Act 2005 — Lasting Power of Attorney':'Mental Capacity & Rights',
  'Mental Capacity Act 2005 — IMCA Duty':                'Mental Capacity & Rights',
}

function groupPlatformByCategory(entries: KnowledgeEntry[]): Map<string, KnowledgeEntry[]> {
  const map = new Map<string, KnowledgeEntry[]>()
  for (const e of entries) {
    const cat = PLATFORM_SOURCE_CATEGORY[e.source_name] ?? 'General'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(e)
  }
  return map
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const { data: session }           = useSession()
  const [entries, setEntries]       = useState<KnowledgeEntry[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showAdd, setShowAdd]       = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)

  const load = useCallback(() => {
    if (!session?.accessToken) return
    setLoading(true)
    createApiClient(session.accessToken).knowledge.list({ limit: '500' })
      .then(data => { setEntries(data.entries); setTotal(data.total) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  useEffect(() => { load() }, [load])

  async function handleGenerateAll() {
    if (!session?.accessToken) return
    if (!confirm('This will regenerate all knowledge entries from every active policy. Existing policy-generated entries will be replaced. Continue?')) return
    setGenerating(true)
    setError(null)
    try {
      const result = await createApiClient(session.accessToken).knowledge.generateAll()
      load()
      alert(`Done — generated ${result.generated} entries across ${result.policies} policies.`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(entry: KnowledgeEntry) {
    if (!session?.accessToken) return
    if (!confirm(`Delete this entry?\n\n"${entry.question}"`)) return
    try {
      await createApiClient(session.accessToken).knowledge.delete(entry.id)
      setEntries(prev => prev.filter(e => e.id !== entry.id))
      setTotal(prev => prev - 1)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleApprove(entry: KnowledgeEntry) {
    if (!session?.accessToken) return
    try {
      const updated = await createApiClient(session.accessToken).knowledge.approve(entry.id)
      setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
    } catch (e: any) {
      setError(e.message)
    }
  }

  const policyEntries   = entries.filter(e => e.source_type === 'policy')
  const manualEntries   = entries.filter(e => e.source_type === 'manual')
  const platformEntries = entries.filter(e => e.source_type === 'platform')

  const approvedCount = entries.filter(e => e.approved).length
  const pendingCount  = entries.filter(e => !e.approved).length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-neutral-dark">Home Knowledge Base</h1>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light"
            >
              <Plus size={14} />
              Add entry
            </button>
            <button
              onClick={handleGenerateAll}
              disabled={generating}
              className="flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generating ? 'Generating…' : 'Regenerate all'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm text-neutral-mid leading-relaxed">
          Your knowledge base is the library of approved Q&amp;A pairs that power every response your staff receive from CareStreamAI — across both chat and email. Entries are generated automatically from your uploaded policies, pre-loaded from CareStreamAI&apos;s UK care regulations library, or added manually by your admin team. The more complete and approved your knowledge base, the richer and more accurate the answers CareStreamAI can provide, giving every staff member instant access to the right information whenever they need it.
        </p>
        <div className="mt-3 flex items-center gap-4">
          <p className="text-xs text-neutral-mid">{total} Q&amp;A pairs in your knowledge base.</p>
          {total > 0 && (
            <div className="flex gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                <ShieldCheck size={11} /> {approvedCount} approved
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                <Clock size={11} /> {pendingCount} pending approval
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Approval notice */}
      {pendingCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{pendingCount} {pendingCount === 1 ? 'entry is' : 'entries are'} pending approval.</strong>{' '}
          Only approved entries are used when answering staff queries. Review and approve entries below.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-neutral-mid" />
        </div>
      ) : total === 0 ? (
        <EmptyState onGenerate={handleGenerateAll} generating={generating} />
      ) : (
        <div className="space-y-10">

          {/* Policy-generated entries — grouped by policy */}
          {policyEntries.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-mid">
                From uploaded policies ({policyEntries.length})
              </h2>
              <PolicyAccordion
                entries={policyEntries}
                editId={editId}
                token={session?.accessToken ?? ''}
                onEdit={setEditId}
                onCancelEdit={() => setEditId(null)}
                onSaved={(updated) => {
                  setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
                  setEditId(null)
                }}
                onDelete={handleDelete}
                onApprove={handleApprove}
              />
            </section>
          )}

          {/* Manual entries */}
          {manualEntries.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-mid">
                Manual entries ({manualEntries.length})
              </h2>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                {manualEntries.map(entry => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    isEditing={editId === entry.id}
                    token={session?.accessToken ?? ''}
                    onEdit={() => setEditId(entry.id)}
                    onCancelEdit={() => setEditId(null)}
                    onSaved={(updated) => {
                      setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
                      setEditId(null)
                    }}
                    onDelete={() => handleDelete(entry)}
                    onApprove={() => handleApprove(entry)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Platform seed entries */}
          {platformEntries.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-mid">
                CareStreamAI standard entries ({platformEntries.length})
              </h2>
              <PlatformAccordion
                entries={platformEntries}
                token={session?.accessToken ?? ''}
                onDelete={handleDelete}
                onApprove={handleApprove}
              />
            </section>
          )}
        </div>
      )}

      {showAdd && (
        <AddEntryModal
          token={session?.accessToken ?? ''}
          onClose={() => setShowAdd(false)}
          onSaved={(entry) => {
            setEntries(prev => [entry, ...prev])
            setTotal(prev => prev + 1)
            setShowAdd(false)
          }}
        />
      )}
    </div>
  )
}

// ─── Policy accordion ─────────────────────────────────────────────────────────

function PolicyAccordion({
  entries,
  editId,
  token,
  onEdit,
  onCancelEdit,
  onSaved,
  onDelete,
  onApprove,
}: {
  entries:     KnowledgeEntry[]
  editId:      string | null
  token:       string
  onEdit:      (id: string) => void
  onCancelEdit: () => void
  onSaved:     (updated: KnowledgeEntry) => void
  onDelete:    (entry: KnowledgeEntry) => void
  onApprove:   (entry: KnowledgeEntry) => void
}) {
  const grouped = groupBySource(entries)
  const [open, setOpen] = useState<Set<string>>(new Set())

  const toggle = (key: string) =>
    setOpen(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  return (
    <div className="space-y-2">
      {[...grouped.entries()].map(([policyName, policyEntries]) => {
        const isOpen      = open.has(policyName)
        const approved    = policyEntries.filter(e => e.approved).length
        const pending     = policyEntries.length - approved

        return (
          <div key={policyName} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            {/* Accordion header */}
            <button
              onClick={() => toggle(policyName)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-neutral-light/50"
            >
              {isOpen
                ? <ChevronDown size={16} className="flex-shrink-0 text-neutral-mid" />
                : <ChevronRight size={16} className="flex-shrink-0 text-neutral-mid" />
              }
              <BookOpen size={15} className="flex-shrink-0 text-teal" />
              <span className="flex-1 text-sm font-semibold text-neutral-dark">{policyName}</span>
              <span className="text-xs text-neutral-mid">{policyEntries.length} entries</span>
              {approved > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  <ShieldCheck size={10} /> {approved}
                </span>
              )}
              {pending > 0 && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <Clock size={10} /> {pending}
                </span>
              )}
            </button>

            {/* Accordion body */}
            {isOpen && (
              <div className="divide-y divide-gray-100 border-t border-gray-100">
                {policyEntries.map(entry => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    isEditing={editId === entry.id}
                    token={token}
                    onEdit={() => onEdit(entry.id)}
                    onCancelEdit={onCancelEdit}
                    onSaved={onSaved}
                    onDelete={() => onDelete(entry)}
                    onApprove={() => onApprove(entry)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Platform accordion ───────────────────────────────────────────────────────

function PlatformAccordion({
  entries,
  token,
  onDelete,
  onApprove,
}: {
  entries:   KnowledgeEntry[]
  token:     string
  onDelete:  (entry: KnowledgeEntry) => void
  onApprove: (entry: KnowledgeEntry) => void
}) {
  const grouped  = groupPlatformByCategory(entries)
  const [open, setOpen] = useState<Set<string>>(new Set())

  const toggle = (key: string) =>
    setOpen(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  return (
    <div className="space-y-2">
      {[...grouped.entries()].map(([category, catEntries]) => {
        const isOpen   = open.has(category)
        const approved = catEntries.filter(e => e.approved).length
        const pending  = catEntries.length - approved

        return (
          <div key={category} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <button
              onClick={() => toggle(category)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-neutral-light/50"
            >
              {isOpen
                ? <ChevronDown size={16} className="flex-shrink-0 text-neutral-mid" />
                : <ChevronRight size={16} className="flex-shrink-0 text-neutral-mid" />
              }
              <Sparkles size={15} className="flex-shrink-0 text-teal" />
              <span className="flex-1 text-sm font-semibold text-neutral-dark">{category}</span>
              <span className="text-xs text-neutral-mid">{catEntries.length} entries</span>
              {approved > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  <ShieldCheck size={10} /> {approved}
                </span>
              )}
              {pending > 0 && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <Clock size={10} /> {pending}
                </span>
              )}
            </button>

            {isOpen && (
              <div className="divide-y divide-gray-100 border-t border-gray-100">
                {catEntries.map(entry => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    isEditing={false}
                    token={token}
                    onEdit={() => {}}
                    onCancelEdit={() => {}}
                    onSaved={() => {}}
                    onDelete={() => onDelete(entry)}
                    onApprove={() => onApprove(entry)}
                    readOnly
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed border-gray-200 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-light">
        <BookOpen className="text-teal" size={28} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-neutral-dark">No knowledge entries yet</h2>
        <p className="mt-1 max-w-sm text-sm text-neutral-mid">
          Click &ldquo;Regenerate all&rdquo; to automatically extract Q&amp;A pairs from your uploaded policies.
        </p>
      </div>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
      >
        {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        {generating ? 'Generating…' : 'Generate from my policies'}
      </button>
    </div>
  )
}

// ─── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  isEditing,
  token,
  onEdit,
  onCancelEdit,
  onSaved,
  onDelete,
  onApprove,
  readOnly = false,
}: {
  entry:        KnowledgeEntry
  isEditing:    boolean
  token:        string
  onEdit:       () => void
  onCancelEdit: () => void
  onSaved:      (updated: KnowledgeEntry) => void
  onDelete:     () => void
  onApprove:    () => void
  readOnly?:    boolean
}) {
  const [question, setQuestion] = useState(entry.question)
  const [answer, setAnswer]     = useState(entry.answer)
  const [saving, setSaving]     = useState(false)
  const [approving, setApproving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await createApiClient(token).knowledge.update(entry.id, { question, answer })
      onSaved(updated)
    } finally {
      setSaving(false)
    }
  }

  async function handleApproveClick() {
    setApproving(true)
    try { await onApprove() } finally { setApproving(false) }
  }

  if (isEditing) {
    return (
      <div className="space-y-3 bg-teal-light/30 p-4">
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
          placeholder="Question"
        />
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
          placeholder="Answer"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-teal px-3 py-1.5 text-sm text-white hover:bg-teal-dark disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Save
          </button>
          <button
            onClick={onCancelEdit}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-neutral-mid hover:bg-white"
          >
            <X size={13} /> Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          {entry.approved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              <ShieldCheck size={9} /> Approved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
              <Clock size={9} /> Pending approval
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-neutral-dark">{entry.question}</p>
        <p className="mt-1 text-sm text-neutral-mid">{entry.answer}</p>
        {entry.approved_by && (
          <p className="mt-1 text-xs text-gray-400">Approved by {entry.approved_by}</p>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        {/* Approve / unapprove */}
        <button
          onClick={handleApproveClick}
          disabled={approving}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            entry.approved
              ? 'border border-gray-200 text-neutral-mid hover:border-red-200 hover:bg-red-50 hover:text-red-600'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
          title={entry.approved ? 'Revoke approval' : 'Approve'}
        >
          {approving
            ? <Loader2 size={11} className="animate-spin" />
            : entry.approved
              ? <X size={11} />
              : <ShieldCheck size={11} />
          }
          {entry.approved ? 'Revoke' : 'Approve'}
        </button>

        {!readOnly && (
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-teal"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
        )}
        <button
          onClick={onDelete}
          className="rounded p-1.5 text-neutral-mid hover:bg-red-50 hover:text-red-600"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Add entry modal ──────────────────────────────────────────────────────────

function AddEntryModal({
  token,
  onClose,
  onSaved,
}: {
  token:   string
  onClose: () => void
  onSaved: (entry: KnowledgeEntry) => void
}) {
  const [question,   setQuestion]   = useState('')
  const [answer,     setAnswer]     = useState('')
  const [sourceName, setSourceName] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleSave() {
    if (!question.trim() || !answer.trim()) return
    setSaving(true)
    setError(null)
    try {
      const entry = await createApiClient(token).knowledge.create({
        question:    question.trim(),
        answer:      answer.trim(),
        source_name: sourceName.trim() || undefined,
      })
      onSaved(entry)
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-dark">Add knowledge entry</h2>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-neutral-mid">
          New entries are saved as <span className="font-semibold text-amber-600">pending</span> — approve them from the list before they are used in staff queries.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Question</label>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              rows={2}
              placeholder="e.g. What colour mop is used in the kitchen?"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Answer</label>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              rows={4}
              placeholder="e.g. Yellow mops are for kitchen use only."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Source (optional)</label>
            <input
              type="text"
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              placeholder="e.g. Infection Control Policy"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !question.trim() || !answer.trim()}
            className="flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save entry
          </button>
        </div>
      </div>
    </div>
  )
}
