'use client'

// Shared training types, helpers and the MCQ question editor — used by both the
// training page (tabs that remain in page.tsx) and the lazy-loaded training modals.

import { useState } from 'react'
import { Trash2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Module = {
  id: string; slug: string; name: string; description: string
  category: string; sort_order: number
  questions:           Array<{ id: string; text: string }>
  questions_locked:    boolean
  questions_locked_at: string | null
  questions_version:   number
}
export type Staff  = { id: string; name: string; email: string; job_role: string | null; shift_type?: string }
export type Enrollment = {
  id: string; user_id: string; module_id: string; status: string
  completed_at: string | null; expires_at: string | null
  certificate_url: string | null; due_date: string | null
  daysUntilExpiry: number | null
  module: { id: string; slug: string; name: string; category: string; sort_order: number; source?: string; requires_practical?: boolean }
}

export type Question = {
  id:      string
  text:    string
  options: [string, string, string, string]  // A, B, C, D
  correct: 0 | 1 | 2 | 3                    // index of correct option
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

export function emptyQuestion(): Question {
  return { id: crypto.randomUUID(), text: '', options: ['', '', '', ''], correct: 0 }
}

export function isComplete(q: Question) {
  return q.text.trim() && q.options.every(o => o.trim())
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

// ─── MCQ question editor ──────────────────────────────────────────────────────

export function McqQuestionEditor({ q, idx, moduleId, onChange, onRemove }: {
  q:        Question
  idx:      number
  moduleId: string
  onChange: (updated: Question) => void
  onRemove: () => void
}) {
  const incomplete = !isComplete(q)
  return (
    <div className={`rounded-xl border p-4 ${incomplete ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100 bg-gray-50'}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal">Q{idx + 1}</span>
          {incomplete && <span className="text-[10px] font-medium text-amber-600">Incomplete</span>}
        </div>
        <button onClick={onRemove} className="rounded p-1 text-neutral-mid hover:bg-red-50 hover:text-red-500" title="Remove question">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Question text */}
      <input
        type="text"
        value={q.text}
        onChange={e => onChange({ ...q, text: e.target.value })}
        placeholder="Enter the question…"
        className="mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-neutral-dark focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
      />

      {/* Options A–D */}
      <div className="space-y-2">
        {OPTION_LABELS.map((label, optIdx) => {
          const isCorrect = q.correct === optIdx
          return (
            <div key={label} className="flex items-center gap-2">
              <button
                onClick={() => onChange({ ...q, correct: optIdx as 0|1|2|3 })}
                title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors ${
                  isCorrect
                    ? 'border-teal bg-teal text-white'
                    : 'border-gray-300 bg-white text-gray-400 hover:border-teal hover:text-teal'
                }`}
              >
                {label}
              </button>
              <input
                type="text"
                value={q.options[optIdx]}
                onChange={e => {
                  const opts = [...q.options] as [string,string,string,string]
                  opts[optIdx] = e.target.value
                  onChange({ ...q, options: opts })
                }}
                placeholder={`Option ${label}…`}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                  isCorrect
                    ? 'border-teal/40 bg-teal/5 text-teal focus:border-teal focus:ring-teal'
                    : 'border-gray-200 bg-white text-neutral-dark focus:border-teal focus:ring-teal'
                }`}
              />
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[10px] text-neutral-mid">Click a letter to mark that option as the correct answer.</p>
    </div>
  )
}
