'use client'

// An audit's version history: who changed it, when, what they said changed, how many audits were run
// on each version, and the questions each version asked.

import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { QUESTION_TYPE_LABELS, type QuestionType } from '@/lib/audit-questions'
import { ChevronDown, History, Loader2, X } from 'lucide-react'

type Version = { version: number; changed_by: string | null; change_note: string | null; created_at: string; runs: number; question_count: number; snapshot: any }

export function AuditVersionsModal({ token, template, onClose }: { token: string; template: { id: string; name: string }; onClose: () => void }) {
  const [versions, setVersions] = useState<Version[] | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    createApiClient(token).audits.templateVersions(template.id)
      .then(d => { setVersions(d.versions); setOpen(d.versions[0]?.version ?? null) })
      .catch(e => setError(e?.message ?? 'Could not load the version history.'))
  }, [token, template.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-neutral-dark"><History size={16} className="text-teal" /> Version history</h2>
            <p className="text-xs text-neutral-mid">{template.name}. Completed audits always keep the questions of the version they were run on.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-neutral-mid hover:bg-neutral-light"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!versions && !error && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-neutral-mid" /></div>}
          {versions && versions.length === 0 && (
            <p className="text-sm text-neutral-mid">No saved versions yet. A version is recorded each time this audit is created, copied or edited.</p>
          )}
          <div className="space-y-2">
            {versions?.map(v => (
              <div key={v.version} className="rounded-lg border border-gray-100">
                <button onClick={() => setOpen(open === v.version ? null : v.version)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-light/40">
                  <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal">v{v.version}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-neutral-dark">{v.change_note || 'Edited'}</span>
                    <span className="text-xs text-neutral-mid">
                      {new Date(v.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {v.changed_by ? ` · ${v.changed_by}` : ''} · {v.question_count} question{v.question_count === 1 ? '' : 's'} · {v.runs} audit{v.runs === 1 ? '' : 's'} run
                    </span>
                  </span>
                  <ChevronDown size={14} className={`shrink-0 text-neutral-mid ${open === v.version ? 'rotate-180' : ''}`} />
                </button>
                {open === v.version && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    {(v.snapshot?.sections ?? []).map((s: any, si: number) => (
                      <div key={si} className="mb-3 last:mb-0">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-mid">{s.title}</p>
                        <ol className="list-decimal space-y-0.5 pl-5 text-sm text-neutral-dark">
                          {(s.questions ?? []).map((q: any, qi: number) => (
                            <li key={qi}>
                              {q.text}
                              <span className="ml-1.5 text-xs text-neutral-mid">({QUESTION_TYPE_LABELS[q.type as QuestionType] ?? q.type}{q.show_if ? ', conditional' : ''})</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
