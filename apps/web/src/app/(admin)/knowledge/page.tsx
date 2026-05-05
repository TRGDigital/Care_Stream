'use client'

// Home Knowledge Base — admin page for viewing, editing, and generating
// Q&A pairs extracted from uploaded policies.

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient, type KnowledgeEntry } from '@/lib/api-client'
import { BookOpen, Plus, RefreshCw, Trash2, Pencil, X, Check, Loader2, Sparkles } from 'lucide-react'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const { data: session }       = useSession()
  const [entries, setEntries]   = useState<KnowledgeEntry[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showAdd, setShowAdd]   = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(() => {
    if (!session?.accessToken) return
    setLoading(true)
    const api = createApiClient(session.accessToken)
    api.knowledge.list({ limit: '200' })
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

  const policyEntries = entries.filter(e => e.source_type === 'policy')
  const manualEntries = entries.filter(e => e.source_type === 'manual')

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-dark">Home Knowledge Base</h1>
          <p className="mt-1 text-sm text-neutral-mid">
            {total} Q&amp;A pairs — automatically extracted from your policies and used to give staff richer, more specific answers.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light"
          >
            <Plus size={15} />
            Add entry
          </button>
          <button
            onClick={handleGenerateAll}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {generating ? 'Generating…' : 'Regenerate all'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty / loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-neutral-mid" />
        </div>
      ) : total === 0 ? (
        <EmptyState onGenerate={handleGenerateAll} generating={generating} />
      ) : (
        <div className="space-y-8">

          {/* Policy-generated entries */}
          {policyEntries.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-mid">
                From uploaded policies ({policyEntries.length})
              </h2>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                {policyEntries.map(entry => (
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
                  />
                ))}
              </div>
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
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Add manual entry drawer */}
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
          This usually takes 1–2 minutes.
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
}: {
  entry:       KnowledgeEntry
  isEditing:   boolean
  token:       string
  onEdit:      () => void
  onCancelEdit: () => void
  onSaved:     (updated: KnowledgeEntry) => void
  onDelete:    () => void
}) {
  const [question, setQuestion] = useState(entry.question)
  const [answer, setAnswer]     = useState(entry.answer)
  const [saving, setSaving]     = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await createApiClient(token).knowledge.update(entry.id, { question, answer })
      onSaved(updated)
    } finally {
      setSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className="p-4 space-y-3 bg-teal-light/30">
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
            <X size={13} />
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-dark">{entry.question}</p>
        <p className="mt-1 text-sm text-neutral-mid">{entry.answer}</p>
        <p className="mt-1.5 text-xs text-gray-400">{entry.source_name}</p>
      </div>
      <div className="flex flex-shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="rounded p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-teal"
          title="Edit"
        >
          <Pencil size={14} />
        </button>
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
              placeholder="e.g. Yellow mops are for kitchen use only. Red mops are for bathrooms."
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

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

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
