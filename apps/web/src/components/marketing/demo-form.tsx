'use client'

import { useState } from 'react'
import { useAgentForm } from '@/components/agent/use-agent-form'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type DemoValues = { name: string; role: string; organisation: string; email: string; phone: string; homes: string; message: string }

// `variant="theme"` renders the rebuilt page's markup and nothing else changes: the same state,
// the same lead POST, the same WebMCP tool. A second form component would have been a second
// place for the lead payload to drift out of step with the API.
export function DemoForm({
  variant = 'default',
  formHeading = 'Request a demo',
  note = 'We respond within one business day.',
}: {
  variant?: 'default' | 'theme'
  /** Only used by the theme variant, which owns its own heading rather than the page. */
  formHeading?: string
  note?: string
}) {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<DemoValues>({ name: '', role: '', organisation: '', email: '', phone: '', homes: '', message: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function submitLead(values: DemoValues, source: 'web' | 'agent') {
    const res = await fetch(`${API_URL}/public/marketing/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'demo', source, ...values }),
    })
    if (!res.ok) throw new Error('submit failed')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await submitLead(form, 'web')
      setSubmitted(true)
    } catch {
      setError('Something went wrong, please try again, or email hello@carestreamai.com.')
    }
  }

  // Expose the demo request to AI agents via WebMCP (no-op where unsupported).
  useAgentForm({
    name: 'book_demo',
    title: 'Book a CareStream demo',
    description:
      'Request a product demo of CareStreamAI. Use when someone wants to see the product, arrange a walkthrough, or be contacted by sales.',
    fields: [
      { name: 'name', description: 'Full name', required: true },
      { name: 'role', description: 'Job title / role', required: true },
      { name: 'organisation', description: 'Care organisation name', required: true },
      { name: 'email', description: 'Work email address', required: true },
      { name: 'phone', description: 'Phone number (optional)' },
      { name: 'homes', description: 'Number of homes / locations', enum: ['1', '2-5', '6-15', '16+'] },
      { name: 'message', description: 'Anything specific to cover in the demo (optional)' },
    ],
    onSubmit: async (v) => {
      const merged = { ...form, ...v } as DemoValues
      setForm(merged)
      await submitLead(merged, 'agent')
      setSubmitted(true)
    },
  })

  const inputClass = "w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-neutral-dark placeholder:text-gray-400 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-colors"
  const labelClass = "mb-1.5 block text-sm font-semibold text-neutral-dark"

  // The theme's form is inert (`onsubmit="return false"`), so it has no success or error state
  // to copy. Both reuse classes the theme does style, with the one colour inline: a rule added
  // to the ported stylesheet would be lost the next time port_css.py regenerates it.
  if (submitted && variant === 'theme') {
    return (
      <div className="dmform">
        <h3>Request received</h3>
        <p className="dmnote">
          We will be in touch within one business day to confirm your demo time.
        </p>
      </div>
    )
  }

  if (variant === 'theme') {
    return (
      <form className="dmform" onSubmit={handleSubmit}>
        <h3>{formHeading}</h3>
        <div className="dmrow">
          <div className="dmfield">
            <label htmlFor="dmname">Full name <span>*</span></label>
            <input id="dmname" name="name" type="text" required value={form.name}
                   onChange={handleChange} placeholder="Your name" />
          </div>
          <div className="dmfield">
            <label htmlFor="dmrole">Job title <span>*</span></label>
            <input id="dmrole" name="role" type="text" required value={form.role}
                   onChange={handleChange} placeholder="Registered Manager" />
          </div>
        </div>
        <div className="dmfield">
          <label htmlFor="dmorg">Organisation <span>*</span></label>
          <input id="dmorg" name="organisation" type="text" required value={form.organisation}
                 onChange={handleChange} placeholder="Your care service" />
        </div>
        <div className="dmrow">
          <div className="dmfield">
            <label htmlFor="dmemail">Work email <span>*</span></label>
            <input id="dmemail" name="email" type="email" required value={form.email}
                   onChange={handleChange} placeholder="manager@yourhome.co.uk" />
          </div>
          <div className="dmfield">
            <label htmlFor="dmphone">Phone number</label>
            <input id="dmphone" name="phone" type="tel" value={form.phone}
                   onChange={handleChange} placeholder="01234 567890" />
          </div>
        </div>
        <div className="dmfield">
          <label htmlFor="dmsites">Number of homes / locations</label>
          <select id="dmsites" name="homes" value={form.homes} onChange={handleChange}>
            <option value="">Select&hellip;</option>
            <option value="1">1</option>
            <option value="2-5">2&ndash;5</option>
            <option value="6-15">6&ndash;15</option>
            <option value="16+">16 or more</option>
          </select>
        </div>
        <div className="dmfield">
          <label htmlFor="dmnotes">Anything you&apos;d like to cover?</label>
          <textarea id="dmnotes" name="message" value={form.message} onChange={handleChange}
                    placeholder="Policies we would like to see, questions about data security, anything else." />
        </div>
        {error && <p className="dmnote" style={{ color: '#B42318' }}>{error}</p>}
        <button className="dmbtn" type="submit">Request demo</button>
        <p className="dmnote">{note}</p>
      </form>
    )
  }

  if (submitted) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">✓</div>
        <h3 className="mb-2 text-xl font-bold text-neutral-dark">Request received</h3>
        <p className="leading-relaxed text-neutral-mid">We will be in touch within one business day to confirm your demo time.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Full name *</label>
          <input name="name" required value={form.name} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Job title *</label>
          <input name="role" required value={form.role} onChange={handleChange} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Organisation *</label>
        <input name="organisation" required value={form.organisation} onChange={handleChange} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Work email *</label>
        <input name="email" type="email" required value={form.email} onChange={handleChange} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Phone number</label>
        <input name="phone" type="tel" value={form.phone} onChange={handleChange} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Number of homes / locations</label>
        <select name="homes" value={form.homes} onChange={handleChange} className={inputClass}>
          <option value="">Select…</option>
          <option value="1">1</option>
          <option value="2-5">2–5</option>
          <option value="6-15">6–15</option>
          <option value="16+">16 or more</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Anything you&apos;d like to cover?</label>
        <textarea name="message" rows={3} value={form.message} onChange={handleChange} className={inputClass} placeholder="Optional, e.g. data security, multilingual demo, CQC reporting…" />
      </div>
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-amber w-full rounded-btn py-4 text-sm">
        Request Demo
      </button>
      <p className="text-center text-xs text-gray-400">We respond within one business day.</p>
    </form>
  )
}
