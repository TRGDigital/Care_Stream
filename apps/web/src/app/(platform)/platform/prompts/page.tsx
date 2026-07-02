'use client'

import { useEffect, useRef, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type OutputRecord, type PromptVersion, type FeedbackStat } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Check, ChevronDown, ChevronUp, Clock, Loader2, Pencil, Plus, RotateCcw, ThumbsDown, ThumbsUp, X } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_USAGES = [
  { value: 'policy_summary',               label: 'Prompt A — Summary & Questions',      description: 'Generates the concise answer + follow-up questions shown to staff.' },
  { value: 'policy_full',                  label: 'Prompt B — Full Policy Formatter',     description: 'Formats the full policy section response when staff request more detail.' },
  { value: 'knowledge_extraction',         label: 'Prompt C — Knowledge Base Extraction', description: 'Extracts structured Q&A pairs from uploaded policy documents.' },
  { value: 'training_question_generation', label: 'Training Question Generation',          description: 'Generates training module questions from training seed RAG data and source URLs.' },
  { value: 'cqc_query',                   label: 'CQC Compliance Director',               description: 'Drives the CQC compliance chat. Cross-references uploaded CQC reports with internal policies and the CQC framework knowledge base.' },
  { value: 'training_chat',               label: 'Training Chat',                         description: 'Conversational training support for staff researching training topics via the Training & Learning chat block.' },
  { value: 'cqc_question_generation',     label: 'CQC Staff Prep — Question Generation',  description: 'Generates CQC inspector-style questions and model answers from a domain and topic. Uses {{domain}} and {{topic}} placeholders.' },
  { value: 'cqc_answer_evaluation',       label: 'CQC Staff Prep — Answer Evaluation',    description: 'Evaluates a staff member\'s free-text answer and returns a score (0–100) and feedback. Uses {{question}}, {{model_answer}}, and {{staff_answer}} placeholders.' },
  { value: 'audit_recommendations',       label: 'Monthly Audit — AI Recommendations',    description: 'Generates post-audit recommendations from completed audit results. Uses {{audit_name}}, {{organisation_name}}, {{auditor_name}}, {{auditor_role}}, {{audit_date}}, {{audit_results}}, {{strengths}}, {{improvements}}, and {{actions_deadline}} placeholders.' },
  { value: 'onboarding_questions_from_policy', label: 'Onboarding — Questions from Policy', description: 'Generates onboarding knowledge-check questions from a tenant\'s uploaded policy, used by the "Generate with AI" button on Answer question steps in the onboarding flow builder. Uses {{policy_name}}, {{count}}, and {{policy_text}} placeholders.' },
  { value: 'training_image_generation',   label: 'Annual Training — Cover Image',         description: 'Image prompt for the AI cover illustration on annual training modules (OpenAI gpt-image-1). Uses {{topic}} (module title) and {{summary}} (the lesson summary) placeholders. Keep the no-text / no-realistic-faces guidance to keep images safe and on-brand.' },
]

const CATEGORY_DISPLAY: Record<string, string> = {
  policy:          'Policies & Procedures',
  internal_policy: 'Policies & Procedures',
  staff_handbook:  'Staff Handbook',
  training_module: 'Training Chat',
  cqc_report:      'CQC Compliance',
}

type Prompt = { id: string; usage: string; label: string; content: string; updated_at: string }
type ActiveTab = 'prompt' | 'outputs' | 'history'

// ─── Feedback Overview ────────────────────────────────────────────────────────

function FeedbackOverview({ token }: { token: string }) {
  const [stats, setStats] = useState<FeedbackStat[]>([])

  useEffect(() => {
    createPlatformClient(token).prompts.feedbackStats()
      .then(d => setStats(d.stats.filter(s => Number(s.positive) + Number(s.negative) > 0)))
      .catch(() => {})
  }, [token])

  if (stats.length === 0) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-3">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Response Quality</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {stats.map(s => {
          const rated = Number(s.positive) + Number(s.negative)
          const pct   = s.positive_pct !== null ? Number(s.positive_pct) : null
          return (
            <div key={s.category} className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-dark">
                {CATEGORY_DISPLAY[s.category] ?? s.category}
              </span>
              {pct !== null && (
                <span className={`flex items-center gap-1 text-sm font-semibold ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                  <ThumbsUp size={12} />
                  {pct}%
                </span>
              )}
              <span className="text-xs text-neutral-mid">({rated} rated)</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Outputs Panel ────────────────────────────────────────────────────────────

function OutputsPanel({ token, usage }: { token: string; usage: string }) {
  const [outputs,     setOutputs]     = useState<OutputRecord[]>([])
  const [loading,     setLoading]     = useState(true)
  const [expandedId,  setExpandedId]  = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setExpandedId(null)
    createPlatformClient(token).prompts.promptOutputs(usage)
      .then(d => setOutputs(d.outputs))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, usage])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-neutral-mid" />
      </div>
    )
  }

  if (outputs.length === 0) {
    return <p className="px-5 py-8 text-sm text-neutral-mid">No outputs recorded for this prompt yet.</p>
  }

  return (
    <div className="divide-y divide-gray-100">
      {outputs.map(row => {
        const isExpanded = expandedId === row.id
        return (
          <div key={row.id} className="px-5 py-3">
            <button
              onClick={() => setExpandedId(isExpanded ? null : row.id)}
              className="flex w-full items-start justify-between gap-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-neutral-dark">{row.query_text}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {row.no_match && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">No match</span>
                  )}
                  {row.feedback === 'positive' && (
                    <span className="flex items-center gap-1 text-xs text-green-600"><ThumbsUp size={11} /> Helpful</span>
                  )}
                  {row.feedback === 'negative' && (
                    <span className="flex items-center gap-1 text-xs text-red-500"><ThumbsDown size={11} /> Could be better</span>
                  )}
                  <span className="text-xs text-neutral-mid">{row.response_time_ms}ms</span>
                  <span className="text-xs text-neutral-mid">
                    {new Date(row.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                  {row.user_name && <span className="text-xs text-neutral-mid">{row.user_name}</span>}
                </div>
              </div>
              {isExpanded ? <ChevronUp size={14} className="mt-0.5 shrink-0 text-neutral-mid" /> : <ChevronDown size={14} className="mt-0.5 shrink-0 text-neutral-mid" />}
            </button>

            {isExpanded && (
              <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Question</p>
                  <p className="text-sm text-neutral-dark">{row.query_text}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-mid">AI Response</p>
                  <div
                    className="prose prose-sm max-w-none text-neutral-dark [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: row.response_text }}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Version History Panel ────────────────────────────────────────────────────

function VersionHistoryPanel({
  token,
  promptId,
  onRestore,
}: {
  token:     string
  promptId:  string
  onRestore: (content: string) => void
}) {
  const [versions,   setVersions]   = useState<PromptVersion[]>([])
  const [loading,    setLoading]    = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setExpandedId(null)
    createPlatformClient(token).prompts.promptVersions(promptId)
      .then(d => setVersions(d.versions))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, promptId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-neutral-mid" />
      </div>
    )
  }

  if (versions.length === 0) {
    return <p className="px-5 py-8 text-sm text-neutral-mid">No version history yet. Versions are saved each time you edit a prompt.</p>
  }

  return (
    <div className="divide-y divide-gray-100">
      {versions.map((v, idx) => {
        const isExpanded = expandedId === v.id
        return (
          <div key={v.id} className="px-5 py-3">
            <button
              onClick={() => setExpandedId(isExpanded ? null : v.id)}
              className="flex w-full items-start justify-between gap-3 text-left"
            >
              <div>
                <p className="text-sm font-medium text-neutral-dark">
                  Version {versions.length - idx}
                  <span className="ml-2 font-normal text-neutral-mid">{v.label}</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-mid">
                  <Clock size={11} />
                  {new Date(v.saved_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                {!isExpanded && (
                  <p className="mt-1 font-mono text-xs text-neutral-mid">{v.content.slice(0, 100)}…</p>
                )}
              </div>
              {isExpanded ? <ChevronUp size={14} className="mt-0.5 shrink-0 text-neutral-mid" /> : <ChevronDown size={14} className="mt-0.5 shrink-0 text-neutral-mid" />}
            </button>

            {isExpanded && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-dark">
                  {v.content}
                </pre>
                <button
                  onClick={() => onRestore(v.content)}
                  className="mt-3 flex items-center gap-1.5 rounded-lg border border-teal px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal-light"
                >
                  <RotateCcw size={12} /> Restore this version
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PromptsPage() {
  const token                         = usePlatformAuth()
  const [prompts,   setPrompts]       = useState<Prompt[]>([])
  const [active,    setActive]        = useState<string | null>(null)
  const [loading,   setLoading]       = useState(true)
  const [error,     setError]         = useState<string | null>(null)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [showAdd,   setShowAdd]       = useState(false)
  const [activeTab, setActiveTab]     = useState<ActiveTab>('prompt')
  // Content to restore from version history — triggers editor with pre-filled content
  const [restoreContent, setRestoreContent] = useState<string | null>(null)

  function load() {
    if (!token) return
    createPlatformClient(token).prompts.list()
      .then(data => {
        setPrompts(data.prompts)
        if (data.prompts.length > 0 && !active) setActive(data.prompts[0].id)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset tab to 'prompt' when switching between prompts
  useEffect(() => {
    setActiveTab('prompt')
    setRestoreContent(null)
  }, [active])

  if (!token) return null

  const current        = prompts.find(p => p.id === active)
  const allocatedUsages = new Set(prompts.map(p => p.usage))
  const availableUsages = ALL_USAGES.filter(u => !allocatedUsages.has(u.value))

  function handleSaved(updated: Prompt) {
    setPrompts(prev => prev.map(p => p.id === updated.id ? updated : p))
    setEditingId(null)
    setRestoreContent(null)
    setActiveTab('prompt')
  }

  function handleCreated(prompt: Prompt) {
    setPrompts(prev => [...prev, prompt])
    setActive(prompt.id)
    setShowAdd(false)
  }

  function handleRestore(content: string) {
    setRestoreContent(content)
    setEditingId(current?.id ?? null)
    setActiveTab('prompt')
  }

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-dark">AI Prompts</h1>
            <p className="mt-1 text-sm text-neutral-mid">
              Editable prompts used across the AI pipeline. Changes take effect immediately.
            </p>
          </div>
          {!loading && availableUsages.length > 0 && !showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-lg bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal-dark"
            >
              <Plus size={14} /> Add prompt
            </button>
          )}
        </div>

        {/* Feedback overview strip */}
        {token && <FeedbackOverview token={token} />}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {showAdd && (
          <AddPromptForm
            key={availableUsages.map(u => u.value).join(',')}
            token={token}
            availableUsages={availableUsages}
            onClose={() => setShowAdd(false)}
            onCreated={handleCreated}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : (
          <div className="flex gap-4">
            {/* Prompt selector */}
            <div className="w-60 flex-shrink-0 space-y-1">
              {prompts.map(p => {
                const meta = ALL_USAGES.find(u => u.value === p.usage)
                return (
                  <button
                    key={p.id}
                    onClick={() => { setActive(p.id); setEditingId(null) }}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                      active === p.id
                        ? 'border-l-2 border-teal bg-teal-light text-teal'
                        : 'text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark'
                    }`}
                  >
                    <p className="text-sm font-medium leading-snug">{p.label}</p>
                    {meta && <p className="mt-0.5 text-[10px] leading-tight opacity-70">{meta.description.slice(0, 50)}…</p>}
                  </button>
                )
              })}
              {prompts.length === 0 && (
                <p className="px-3 py-4 text-xs text-neutral-mid">No prompts yet.</p>
              )}
            </div>

            {/* Right panel: tabbed */}
            {current && (
              <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white overflow-hidden">
                {/* Tab bar */}
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-0">
                  <div className="flex gap-0">
                    {(['prompt', 'outputs', 'history'] as ActiveTab[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); if (tab !== 'prompt') setEditingId(null) }}
                        className={`border-b-2 px-4 py-3 text-xs font-medium capitalize transition-colors ${
                          activeTab === tab
                            ? 'border-teal text-teal'
                            : 'border-transparent text-neutral-mid hover:text-neutral-dark'
                        }`}
                      >
                        {tab === 'outputs' ? 'Recent Outputs' : tab === 'history' ? 'Version History' : 'Prompt'}
                      </button>
                    ))}
                  </div>
                  {activeTab === 'prompt' && editingId !== current.id && (
                    <div className="flex items-center gap-3 py-2">
                      <span className="text-xs text-neutral-mid">{current.content.length.toLocaleString()} chars</span>
                      <button
                        onClick={() => { setEditingId(current.id); setRestoreContent(null) }}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal hover:text-teal"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Tab content */}
                {activeTab === 'prompt' && (
                  editingId === current.id ? (
                    <PromptEditor
                      key={`${current.id}-${restoreContent ?? ''}`}
                      token={token}
                      prompt={current}
                      initialContent={restoreContent ?? current.content}
                      onSaved={handleSaved}
                      onCancel={() => { setEditingId(null); setRestoreContent(null) }}
                    />
                  ) : (
                    <div>
                      <div className="border-b border-gray-100 px-5 py-3">
                        <h2 className="text-sm font-semibold text-neutral-dark">{current.label}</h2>
                        <p className="text-xs text-neutral-mid">
                          {ALL_USAGES.find(u => u.value === current.usage)?.description}
                        </p>
                      </div>
                      <pre className="overflow-x-auto p-5 text-xs leading-relaxed text-neutral-dark whitespace-pre-wrap font-mono">
                        {current.content}
                      </pre>
                    </div>
                  )
                )}

                {activeTab === 'outputs' && (
                  <OutputsPanel token={token} usage={current.usage} />
                )}

                {activeTab === 'history' && (
                  <VersionHistoryPanel
                    token={token}
                    promptId={current.id}
                    onRestore={handleRestore}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PlatformShell>
  )
}

// ─── Prompt editor ────────────────────────────────────────────────────────────

function PromptEditor({ token, prompt, initialContent, onSaved, onCancel }: {
  token:          string
  prompt:         Prompt
  initialContent: string
  onSaved:        (p: Prompt) => void
  onCancel:       () => void
}) {
  const [content, setContent] = useState(initialContent)
  const [label,   setLabel]   = useState(prompt.label)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const textareaRef           = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { textareaRef.current?.focus() }, [])

  async function save() {
    if (!content.trim()) return
    setSaving(true); setError('')
    try {
      const updated = await createPlatformClient(token).prompts.update(prompt.id, { label, content })
      onSaved(updated)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3">
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-neutral-dark focus:border-teal focus:outline-none"
        />
        <span className="shrink-0 text-xs text-neutral-mid">{content.length.toLocaleString()} chars</span>
        <button
          onClick={save}
          disabled={saving || !content.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-neutral-mid hover:bg-neutral-light">
          <X size={12} />
        </button>
      </div>
      {error && <p className="px-5 pt-3 text-xs text-red-600">{error}</p>}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={e => setContent(e.target.value)}
        className="block h-[calc(100vh-320px)] min-h-96 w-full resize-none p-5 font-mono text-xs leading-relaxed text-neutral-dark focus:outline-none"
        spellCheck={false}
      />
    </div>
  )
}

// ─── Add prompt form ──────────────────────────────────────────────────────────

function AddPromptForm({ token, availableUsages, onClose, onCreated }: {
  token:           string
  availableUsages: typeof ALL_USAGES
  onClose:         () => void
  onCreated:       (p: Prompt) => void
}) {
  const [usage,   setUsage]   = useState(availableUsages[0]?.value ?? '')
  const [content, setContent] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const selectedMeta = availableUsages.find(u => u.value === usage)

  async function create() {
    if (!usage || !content.trim()) return
    setSaving(true); setError('')
    try {
      const prompt = await createPlatformClient(token).prompts.create({ usage, content })
      onCreated(prompt)
    } catch (e: any) {
      setError(e.message ?? 'Failed to create prompt')
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-dark">Add prompt</h2>
        <button onClick={onClose}><X size={15} className="text-neutral-mid" /></button>
      </div>

      {/* Usage selector */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-neutral-mid">Where is this prompt used?</label>
        <select
          value={usage}
          onChange={e => setUsage(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
        >
          {availableUsages.map(u => (
            <option key={u.value} value={u.value}>{u.label}</option>
          ))}
        </select>
        {selectedMeta && (
          <p className="mt-1.5 text-xs text-neutral-mid">{selectedMeta.description}</p>
        )}
      </div>

      {/* Content */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-neutral-mid">Prompt content</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={14}
          placeholder="Enter the full prompt text…"
          className="w-full rounded-lg border border-gray-300 p-3 font-mono text-xs leading-relaxed focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
          spellCheck={false}
          autoFocus
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={create}
          disabled={saving || !content.trim()}
          className="flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          Save prompt
        </button>
        <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light">
          Cancel
        </button>
      </div>
    </div>
  )
}
