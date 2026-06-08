'use client'

import { useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { AlertCircle, CheckCircle2, Loader2, Send, Sparkles, X } from 'lucide-react'
import { DOMAINS, type Domain, type Question, type StaffUser } from './cqc-shared'

// ─── Add Question Modal ───────────────────────────────────────────────────────

export function AddQuestionModal({
  onClose, onSave, token,
}: {
  onClose: () => void
  onSave:  (q: Question) => void
  token:   string
}) {
  const api = createApiClient(token)
  const [tab, setTab]             = useState<'manual' | 'ai'>('ai')
  const [domain, setDomain]       = useState<Domain>('safe')
  const [topic, setTopic]         = useState('')
  const [question, setQuestion]   = useState('')
  const [modelAnswer, setModel]   = useState('')
  const [generating, setGen]      = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  async function handleGenerate() {
    if (!topic.trim()) return
    setGen(true); setError('')
    try {
      const res = await api.cqcQuestions.generate({ domain, topic })
      setQuestion(res.question)
      setModel(res.model_answer)
      setTab('manual')
    } catch (e: any) { setError(e.message) }
    finally { setGen(false) }
  }

  async function handleSave() {
    if (!question.trim() || !modelAnswer.trim()) { setError('Question and model answer are required'); return }
    setSaving(true); setError('')
    try {
      const res = await api.cqcQuestions.create({ domain, question, model_answer: modelAnswer })
      onSave(res.question)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-card shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-neutral-dark">Add CQC Question</h2>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Domain */}
          <div>
            <label className="block text-xs font-medium text-neutral-mid uppercase tracking-wide mb-2">CQC Domain</label>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map(d => (
                <button key={d.key} onClick={() => setDomain(d.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    domain === d.key ? `${d.bg} ${d.color} border-current` : 'bg-white text-neutral-mid border-gray-200 hover:border-gray-400'
                  }`}
                >{d.label}</button>
              ))}
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-lg p-1 w-fit">
            {(['ai', 'manual'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  tab === t ? 'bg-white text-neutral-dark shadow-sm' : 'text-neutral-mid hover:text-neutral-dark'
                }`}
              >
                {t === 'ai' ? <><Sparkles size={13} className="inline mr-1.5" />AI Generate</> : 'Write manually'}
              </button>
            ))}
          </div>
          {tab === 'ai' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Topic or scenario</label>
                <textarea rows={3} value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. responding to a resident who has fallen, managing aggressive behaviour, end-of-life care…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>
              <button onClick={handleGenerate} disabled={!topic.trim() || generating}
                className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-btn text-sm font-medium hover:bg-teal-dark disabled:opacity-50"
              >
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {generating ? 'Generating…' : 'Generate question'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Question</label>
                <textarea rows={3} value={question} onChange={e => setQuestion(e.target.value)}
                  placeholder="How would you…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">
                  Model answer <span className="font-normal text-neutral-mid">(used by AI to evaluate staff responses)</span>
                </label>
                <textarea rows={5} value={modelAnswer} onChange={e => setModel(e.target.value)}
                  placeholder="The ideal answer would include…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>
            </div>
          )}
          {error && <p className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={15} />{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-mid hover:text-neutral-dark">Cancel</button>
          {tab === 'manual' && (
            <button onClick={handleSave} disabled={!question.trim() || !modelAnswer.trim() || saving}
              className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-btn text-sm font-medium hover:bg-teal-dark disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {saving ? 'Saving…' : 'Save question'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Send Modal ───────────────────────────────────────────────────────────────

export function SendModal({
  question, staff, onClose, onSent, token,
}: {
  question: Question; staff: StaffUser[]
  onClose: () => void; onSent: () => void; token: string
}) {
  const api = createApiClient(token)
  const [selected, setSelected] = useState<string[]>([])
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState('')

  function toggle(id: string) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  async function handleSend() {
    if (selected.length === 0) return
    setSending(true); setError('')
    try {
      await api.cqcQuestions.deliver(question.id, { user_ids: selected, channel: 'portal' })
      onSent()
    } catch (e: any) { setError(e.message) }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-card shadow-elevated w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-neutral-dark">Send to staff</h2>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-mid">
            The question will be rephrased before delivery so staff cannot memorise the exact wording.
          </p>
          <div className="bg-neutral-light rounded-lg p-3 text-sm text-neutral-dark italic">
            "{question.question}"
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-neutral-dark">Select staff members</label>
              <button onClick={() => setSelected(selected.length === staff.length ? [] : staff.map(s => s.id))}
                className="text-xs text-teal hover:underline"
              >
                {selected.length === staff.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {staff.map(s => (
                <label key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-light cursor-pointer">
                  <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)}
                    className="w-4 h-4 text-teal rounded" />
                  <div>
                    <p className="text-sm font-medium text-neutral-dark">{s.name}</p>
                    {s.job_role && <p className="text-xs text-neutral-mid">{s.job_role}</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={15} />{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-mid">Cancel</button>
          <button onClick={handleSend} disabled={selected.length === 0 || sending}
            className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-btn text-sm font-medium hover:bg-teal-dark disabled:opacity-50"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {sending ? 'Sending…' : `Send to ${selected.length} staff`}
          </button>
        </div>
      </div>
    </div>
  )
}
