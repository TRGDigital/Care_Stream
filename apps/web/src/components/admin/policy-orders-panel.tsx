'use client'

// A buyer's own policy orders, on /policies.
//
// This existed only inside MissingPoliciesBanner on /gaps, which meant a policy-shop
// buyer could never see it: /gaps is blocked for their tier, and the banner returns
// null unless a gap analysis has been run — which needs uploaded policies they do not
// have. So they paid, and their order was invisible, and nothing ever asked for the
// details their policy cannot be written without.
//
// Deliberately independent of the gap report: it asks for orders and nothing else.

import { useEffect, useState } from 'react'
import { createApiClient, type PolicyPurchase } from '@/lib/api-client'
import { FileText, Loader2, AlertTriangle, CheckCircle2, Clock, PenLine } from 'lucide-react'

const money = (p: number) => `£${(p / 100).toFixed(p % 100 === 0 ? 0 : 2)}`

const STATUS: Record<PolicyPurchase['status'], { label: string; hint: string; className: string }> = {
  awaiting_details: { label: 'Needs your details', hint: 'We cannot start writing until these are in.', className: 'bg-amber-50 text-amber-800' },
  paid:             { label: 'Queued to write',    hint: 'Everything we need is in. Ready within 2 working days.', className: 'bg-blue-50 text-blue-800' },
  drafting:         { label: 'Being written',      hint: 'Written from the legislation, then checked by a person.', className: 'bg-blue-50 text-blue-800' },
  drafted:          { label: 'In review',          hint: 'Written and now being read before it carries your name.', className: 'bg-blue-50 text-blue-800' },
  approved:         { label: 'Ready',              hint: 'Approved and in your policy library.', className: 'bg-green-50 text-green-800' },
  refunded:         { label: 'Refunded',           hint: '', className: 'bg-gray-100 text-neutral-mid' },
}

export function PolicyOrdersPanel({ token }: { token: string }) {
  const [purchases, setPurchases] = useState<PolicyPurchase[] | null>(null)
  const [intakeFor, setIntakeFor] = useState<PolicyPurchase | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () =>
    createApiClient(token).policyPurchases.list()
      .then(r => setPurchases(r.purchases))
      .catch((e: Error) => setError(e.message))

  useEffect(() => { load() }, [token])

  function openIntake(p: PolicyPurchase) {
    setIntakeFor(p); setError('')
    const init: Record<string, string> = {}
    for (const f of p.intake?.fields ?? []) init[f.key] = f.value ?? ''
    setValues(init)
  }

  async function save() {
    if (!intakeFor) return
    setSaving(true); setError('')
    try {
      await createApiClient(token).policyPurchases.submitIntake(intakeFor.id, values)
      setIntakeFor(null)
      await load()
    } catch (e: any) { setError(e?.message ?? 'Could not save those details') }
    finally { setSaving(false) }
  }

  if (purchases === null) {
    return <div className="mb-6 flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading your orders…</div>
  }
  if (!purchases.length) return null

  const needing = purchases.filter(p => p.status === 'awaiting_details').length

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <FileText size={16} className="text-teal" />
        <h2 className="text-sm font-semibold text-neutral-dark">
          Your policy orders <span className="font-normal text-neutral-mid">({purchases.length})</span>
        </h2>
      </div>

      {needing > 0 && (
        <p className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            {needing === 1 ? 'One policy needs' : `${needing} policies need`} a few details before we can
            start writing. It takes about three minutes.
          </span>
        </p>
      )}

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {purchases.map(p => {
          const s = STATUS[p.status] ?? STATUS.paid
          const missing = p.intake?.missing ?? 0
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-dark">{p.policy_title}</p>
                <p className="text-xs text-neutral-mid">{s.hint}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.className}`}>
                {s.label}
              </span>
              <span className="shrink-0 text-sm font-semibold text-neutral-dark">{money(p.price_pence)}</span>
              {p.status === 'awaiting_details' && (
                <button onClick={() => openIntake(p)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-teal px-3.5 py-2 text-xs font-bold text-white hover:bg-teal/90">
                  <PenLine size={12} /> Add details{missing ? ` (${missing})` : ''}
                </button>
              )}
              {p.status === 'approved' && <CheckCircle2 size={16} className="shrink-0 text-green-600" />}
              {(p.status === 'paid' || p.status === 'drafting' || p.status === 'drafted') && (
                <Clock size={15} className="shrink-0 text-neutral-mid" />
              )}
            </li>
          )
        })}
      </ul>

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      {intakeFor && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[90] flex items-center justify-center bg-neutral-dark/60 p-4"
          onClick={() => !saving && setIntakeFor(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-elevated"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-neutral-dark">{intakeFor.policy_title}</h3>
            <p className="mt-1 text-sm text-neutral-mid">
              These are the details your policy names. We ask once and reuse them for anything else you buy.
            </p>
            <div className="mt-5 space-y-3.5">
              {(intakeFor.intake?.fields ?? []).map(f => (
                <div key={f.key}>
                  <label htmlFor={`f-${f.key}`} className="block text-sm font-semibold text-neutral-dark">
                    {f.label}
                    {f.shared && <span className="ml-2 rounded-full bg-teal-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal">used for all your policies</span>}
                  </label>
                  {f.help && <p className="mt-0.5 text-xs text-neutral-mid">{f.help}</p>}
                  <input
                    id={`f-${f.key}`}
                    value={values[f.key] ?? ''}
                    onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setIntakeFor(null)} disabled={saving}
                className="rounded-btn border-2 border-gray-200 px-5 py-2.5 text-sm font-semibold text-neutral-dark disabled:opacity-50">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 rounded-btn bg-teal px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {saving && <Loader2 size={13} className="animate-spin" />} Save details
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
