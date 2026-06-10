'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2 } from 'lucide-react'
import type { LpField, LpPage } from '@/lib/lp/types'
import { track, getAttribution } from '@/lib/lp/tracker'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const FREE_EMAIL = /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|aol|icloud|me|mac|proton|protonmail|gmx|mail\.com|yandex|zoho)\./i
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Fire client-side ad-platform conversions if IDs are configured (no-op otherwise).
function fireConversions(page: LpPage) {
  const t = page.tracking
  const w = window as any
  try {
    if (t.google_ads_conversion_id && t.google_ads_conversion_label && typeof w.gtag === 'function') {
      w.gtag('event', 'conversion', { send_to: `${t.google_ads_conversion_id}/${t.google_ads_conversion_label}` })
    }
    if (t.ga4_measurement_id && typeof w.gtag === 'function') {
      w.gtag('event', 'generate_lead', { campaign: page.campaign_slug })
    }
    if (t.meta_pixel_id && typeof w.fbq === 'function') {
      w.fbq('track', t.meta_event_name || 'Lead', { content_name: page.campaign_slug, currency: 'GBP' })
    }
    if (t.linkedin_conversion_id && typeof w.lintrk === 'function') {
      w.lintrk('track', { conversion_id: Number(t.linkedin_conversion_id) })
    }
  } catch {
    // never block the confirmation on a tracking error
  }
}

export function LpForm({ page, withAnchor = false }: { page: LpPage; withAnchor?: boolean }) {
  const f = page.content.form
  const [values, setValues]       = useState<Record<string, string>>({})
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [emailWarn, setEmailWarn] = useState(false)
  const [focused, setFocused]     = useState<Set<string>>(new Set())
  const [started, setStarted]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [serverError, setServerError] = useState('')

  function setField(name: string, v: string) {
    if (!started) { setStarted(true); track('form_start') }
    setValues(prev => ({ ...prev, [name]: v }))
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n })
  }

  function onFocus(name: string) {
    if (!focused.has(name)) { setFocused(prev => new Set(prev).add(name)); track('field_focus', name) }
  }
  function onBlur(field: LpField) {
    const v = (values[field.name] ?? '').trim()
    if (!v) track('field_blur', field.name)
    if (field.type === 'email' && field.validation?.warnFreeEmail) {
      setEmailWarn(!!v && FREE_EMAIL.test(v))
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    for (const field of f.fields) {
      const v = (values[field.name] ?? '').trim()
      if (field.required && !v) { errs[field.name] = 'This field is required'; continue }
      if (!v) continue
      if (field.type === 'email' && !EMAIL_RE.test(v)) errs[field.name] = 'Enter a valid email address'
      if (field.validation?.minLength && v.length < field.validation.minLength) errs[field.name] = `Too short`
    }
    setErrors(errs)
    Object.keys(errs).forEach(name => track('field_error', name))
    return Object.keys(errs).length === 0
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    if (!validate()) return
    setSubmitting(true)
    track('form_submit')
    const data: Record<string, string> = {}
    for (const field of f.fields) {
      const v = (values[field.name] ?? '').trim()
      if (v) data[field.name] = v
    }
    try {
      const res = await fetch(`${API_URL}/public/lp/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landing_page_id: page.id,
          company_website: values['company_website'] ?? '',   // honeypot
          data,
          variant_group: page.variant_group ?? null,
          variant_label: page.variant_label ?? null,
          ...getAttribution(),
        }),
      })
      if (!res.ok) throw new Error('failed')
      fireConversions(page)
      setSubmitted(true)
    } catch {
      setServerError('Something went wrong. Please try again, or email hello@carestreamai.com.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-elevated">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="text-green-600" size={28} />
        </div>
        <h3 className="mb-2 text-xl font-bold text-neutral-dark">{f.successHeadline || 'Thank you'}</h3>
        <p className="leading-relaxed text-neutral-mid">{f.successMessage}</p>
      </div>
    )
  }

  const inputClass = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-neutral-dark placeholder:text-gray-400 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'
  const labelClass = 'mb-1.5 block text-sm font-semibold text-neutral-dark'

  return (
    <div id={withAnchor ? 'form' : undefined} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-elevated sm:p-8">
      {f.headline && <h2 className="text-2xl font-extrabold leading-tight text-neutral-dark">{f.headline}</h2>}
      {f.subheadline && <p className="mt-2 text-sm leading-relaxed text-neutral-mid">{f.subheadline}</p>}
      <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
        {/* Honeypot — visually hidden, off the tab order */}
        <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
          <label>Company website<input type="text" name="company_website" tabIndex={-1} autoComplete="off" value={values['company_website'] ?? ''} onChange={e => setValues(prev => ({ ...prev, company_website: e.target.value }))} /></label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {f.fields.map(field => {
            const err = errors[field.name]
            const span = field.columnSpan === 'half' ? 'sm:col-span-1' : 'sm:col-span-2'
            return (
              <div key={field.name} className={span}>
                <label className={labelClass} htmlFor={`lp_${field.name}`}>
                  {field.label}{field.required && ' *'}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={`lp_${field.name}`}
                    name={field.name}
                    rows={3}
                    placeholder={field.placeholder}
                    value={values[field.name] ?? ''}
                    onChange={e => setField(field.name, e.target.value)}
                    onFocus={() => onFocus(field.name)}
                    onBlur={() => onBlur(field)}
                    className={`${inputClass} ${err ? 'border-red-300' : ''}`}
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={`lp_${field.name}`}
                    name={field.name}
                    value={values[field.name] ?? ''}
                    onChange={e => setField(field.name, e.target.value)}
                    onFocus={() => onFocus(field.name)}
                    onBlur={() => onBlur(field)}
                    className={`${inputClass} ${err ? 'border-red-300' : ''}`}
                  >
                    <option value="">Select…</option>
                    {(field.options ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input
                    id={`lp_${field.name}`}
                    name={field.name}
                    type={field.type}
                    inputMode={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : undefined}
                    autoComplete={field.autocomplete}
                    placeholder={field.placeholder}
                    value={values[field.name] ?? ''}
                    onChange={e => setField(field.name, e.target.value)}
                    onFocus={() => onFocus(field.name)}
                    onBlur={() => onBlur(field)}
                    className={`${inputClass} ${err ? 'border-red-300' : ''}`}
                  />
                )}
                {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
                {field.type === 'email' && emailWarn && !err && (
                  <p className="mt-1 text-xs text-amber-brand">A work email helps us respond faster, but any email is fine.</p>
                )}
              </div>
            )
          })}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button type="submit" disabled={submitting} className="btn-amber flex w-full items-center justify-center gap-2 rounded-btn py-4 text-sm disabled:opacity-60">
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? 'Sending…' : (f.submitLabel || 'Book my demo')}
        </button>

        <p className="text-center text-xs leading-relaxed text-gray-400">
          {f.consentText}{' '}
          <Link href={f.privacyLinkUrl} className="underline hover:text-neutral-mid">Privacy policy</Link>.
        </p>
      </form>
    </div>
  )
}
