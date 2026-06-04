'use client'

// Add-knowledge-entry modal — extracted from the knowledge page and lazy-loaded
// (next/dynamic) so it's only fetched when the user opens the "Add entry" dialog.

import { useState } from 'react'
import { createApiClient, type KnowledgeEntry } from '@/lib/api-client'
import { Loader2, X } from 'lucide-react'
import { KNOWLEDGE_CATEGORY_OPTIONS } from '@/lib/knowledge-categories'

export function AddEntryModal({
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
  const [category,   setCategory]   = useState('general')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleSave() {
    if (!question.trim() || !answer.trim()) return
    setSaving(true)
    setError(null)
    try {
      const entry = await createApiClient(token).knowledge.create({
        question:           question.trim(),
        answer:             answer.trim(),
        source_name:        sourceName.trim() || undefined,
        knowledge_category: category,
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
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            >
              {KNOWLEDGE_CATEGORY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {category === 'business_continuity' && (
              <p className="mt-1 text-xs text-teal">This entry will appear in the Business Continuity chat on the staff portal.</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Source (optional)</label>
            <input
              type="text"
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              placeholder="e.g. Business Continuity Plan v2"
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
