'use client'

// What we still need to know about this service.
//
// These questions are not on the buying page, deliberately. Nine identity questions at
// checkout is a purchase; forty-four is a decision to come back later. They are asked here,
// after the money is taken, where every answer improves a document the client already owns.
//
// The framing matters as much as the questions. Nobody fills in a form because a supplier
// would like them to, so each answer says what it prevents the policy from assuming. A
// buyer who understands that an unanswered question becomes a sentence claiming they do
// something they do not answers it; a buyer shown a bare form does not.

import { useEffect, useState } from 'react'
import { createApiClient, type TenantIntake, type IntakeQuestion } from '@/lib/api-client'
import { Loader2, Check, ShieldAlert, ClipboardList, ChevronRight } from 'lucide-react'

function Field({ q, value, onChange }: {
  q: IntakeQuestion; value: string; onChange: (v: string) => void
}) {
  const base = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-neutral-dark focus:border-teal focus:outline-none'
  return (
    <div className="py-3">
      <label htmlFor={q.key} className="block text-sm font-medium text-neutral-dark">{q.label}</label>
      {q.help && <p className="mt-0.5 text-xs text-neutral-mid">{q.help}</p>}
      {q.type === 'yesno' ? (
        <select id={q.key} value={value} onChange={e => onChange(e.target.value)} className={`${base} mt-1.5`}>
          <option value="">Not answered</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      ) : q.type === 'longtext' ? (
        <textarea id={q.key} value={value} onChange={e => onChange(e.target.value)} rows={2}
          className={`${base} mt-1.5`} placeholder="Your answer" />
      ) : (
        <input id={q.key} value={value} onChange={e => onChange(e.target.value)}
          className={`${base} mt-1.5`} placeholder="Your answer" />
      )}
      {!value && (
        <p className="mt-1 text-xs text-amber-800">
          Until you answer, your policy has to write this for you: {q.prevents.toLowerCase()}
        </p>
      )}
    </div>
  )
}

export function PolicyIntakePanel({ token }: { token: string }) {
  const [intake, setIntake] = useState<TenantIntake | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    createApiClient(token).policies.intake()
      .then(r => { if (!live) return; setIntake(r.intake); setDraft(r.intake.answers); setOpen(r.intake.missing > 0) })
      .catch(e => { if (live) setError(e?.message ?? 'Could not load what we still need.') })
    return () => { live = false }
  }, [token])

  async function save() {
    setSaving(true); setError(''); setSaved('')
    try {
      const r = await createApiClient(token).policies.saveIntake(draft)
      setIntake(r.intake); setDraft(r.intake.answers)
      setSaved(r.intake.missing === 0
        ? 'Thank you. Your policies can now be written entirely from what you have told us.'
        : `Saved. ${r.intake.missing} still to answer.`)
    } catch (e: any) {
      setError(e?.message ?? 'Could not save those answers.')
    } finally { setSaving(false) }
  }

  if (!intake || intake.questions.length === 0) return null
  const done = intake.missing === 0
  const pct = Math.round((intake.answered / intake.questions.length) * 100)

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-start gap-3 px-5 py-4 text-left">
        <ChevronRight size={16} className={`mt-0.5 shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-90' : ''}`} />
        {done
          ? <Check size={16} className="mt-0.5 shrink-0 text-green-600" />
          : <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-neutral-dark">
            {done ? 'We have everything we need about your service' : 'Tell us about your service'}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-mid">
            {done
              ? 'Your policies are written from your answers rather than from assumptions. Update any of them whenever things change.'
              : `${intake.missing} question${intake.missing === 1 ? '' : 's'} left. Anything you do not answer, your policy has to assume, and a policy claiming something you do not do is worse than one that leaves it out.`}
          </p>
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
            <div className={`h-full ${done ? 'bg-green-500' : 'bg-teal'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="shrink-0 text-xs font-semibold text-neutral-mid">{intake.answered}/{intake.questions.length}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-2">
          <p className="flex items-start gap-2 py-3 text-xs text-neutral-mid">
            <ClipboardList size={13} className="mt-0.5 shrink-0 text-teal" />
            Asked once, and used across every policy you own. You can change any answer later
            and have the affected policies rewritten.
          </p>
          <div className="divide-y divide-gray-50">
            {intake.questions.map(q => (
              <Field key={q.key} q={q} value={draft[q.key] ?? ''}
                onChange={v => setDraft(d => ({ ...d, [q.key]: v }))} />
            ))}
          </div>
          {error && <p className="py-2 text-sm text-red-700">{error}</p>}
          {saved && <p className="py-2 text-sm text-green-700">{saved}</p>}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 py-3">
            <button onClick={save} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-40">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save answers
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
