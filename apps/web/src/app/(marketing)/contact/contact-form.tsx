'use client'

import { useState } from 'react'
import { useAgentForm } from '@/components/agent/use-agent-form'

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type ContactValues = { name: string; email: string; subject: string; message: string }

// `variant="theme"` renders the rebuilt page's markup and nothing else changes: the same
// state, the same lead POST, the same WebMCP tool. A second form component would have been a
// second place for the lead payload to drift out of step with the API.
export function ContactForm({
  variant = 'default',
  formHeading = 'Send a message',
  note,
}: {
  variant?: 'default' | 'theme'
  /** Only used by the theme variant, which owns its own heading rather than the page. */
  formHeading?: string
  note?: React.ReactNode
} = {}) {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<ContactValues>({ name: '', email: '', subject: '', message: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function submitLead(values: ContactValues, source: 'web' | 'agent') {
    const res = await fetch(`${API_URL}/public/marketing/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'contact', source, ...values }),
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

  // Expose this form to AI agents via WebMCP (no-op where unsupported).
  useAgentForm({
    name: 'contact_carestream',
    title: 'Contact CareStream',
    description:
      'Send a message to the CareStream team. Use for product, pricing, data-protection/security, or support enquiries submitted through the website contact form.',
    fields: [
      { name: 'name', description: 'Full name of the person making contact', required: true },
      { name: 'email', description: 'Email address to reply to', required: true },
      { name: 'subject', description: 'Topic of the enquiry', required: true, enum: ['product', 'pricing', 'data', 'support', 'other'] },
      { name: 'message', description: 'The message body', required: true },
    ],
    onSubmit: async (v) => {
      const merged = { ...form, ...v } as ContactValues
      setForm(merged)
      await submitLead(merged, 'agent')
      setSubmitted(true)
    },
  })

  const inputClass = "w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-neutral-dark placeholder:text-gray-400 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-colors"
  const labelClass = "mb-1.5 block text-sm font-semibold text-neutral-dark"

  const SUBJECTS: [string, string][] = [
    ['product', 'Product question'],
    ['pricing', 'Pricing or plans'],
    ['data', 'Data protection / security'],
    ['support', 'Technical support'],
    ['other', 'Other'],
  ]

  if (variant === 'theme') {
    return (
      <form className="cfform" onSubmit={handleSubmit}>
        <h3>{formHeading}</h3>
        {/* The theme keeps the confirmation inside the form rather than replacing it, so the
            routes and the heading beside it do not jump when a message is sent. */}
        {submitted && <div className="cfsent">Message sent. We respond within one business day.</div>}
        {!submitted && (
          <>
            <div className="cfpair">
              <div className="cffield">
                <label htmlFor="cfName">Your name<span className="req">*</span></label>
                <input type="text" id="cfName" name="name" required autoComplete="name"
                       value={form.name} onChange={handleChange} />
              </div>
              <div className="cffield">
                <label htmlFor="cfEmail">Email<span className="req">*</span></label>
                <input type="email" id="cfEmail" name="email" required autoComplete="email"
                       placeholder="name@yourcarehome.co.uk"
                       value={form.email} onChange={handleChange} />
              </div>
            </div>
            <div className="cffield">
              <label htmlFor="cfSubject">What is it about?<span className="req">*</span></label>
              <select id="cfSubject" name="subject" required
                      value={form.subject} onChange={handleChange}>
                <option value="">Select a topic&hellip;</option>
                {SUBJECTS.map(([v, l]) => <option value={v} key={v}>{l}</option>)}
              </select>
            </div>
            <div className="cffield">
              <label htmlFor="cfMessage">Message<span className="req">*</span></label>
              <textarea id="cfMessage" name="message" required
                        placeholder="Tell us about your service and what you are trying to solve."
                        value={form.message} onChange={handleChange} />
            </div>
            {error && <p className="cfnote" style={{ color: '#B42318' }}>{error}</p>}
            <button type="submit" className="cfsubmit">Send message <Arrow /></button>
          </>
        )}
        {note && <p className="cfnote">{note}</p>}
      </form>
    )
  }

  if (submitted) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">✓</div>
        <h3 className="mb-2 text-xl font-bold text-neutral-dark">Message sent</h3>
        <p className="leading-relaxed text-neutral-mid">We will respond within one business day.</p>
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
          <label className={labelClass}>Email address *</label>
          <input name="email" type="email" required value={form.email} onChange={handleChange} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Subject *</label>
        <select name="subject" required value={form.subject} onChange={handleChange} className={inputClass}>
          <option value="">Select a topic…</option>
          <option value="product">Product question</option>
          <option value="pricing">Pricing or plans</option>
          <option value="data">Data protection / security</option>
          <option value="support">Technical support</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Message *</label>
        <textarea name="message" rows={5} required value={form.message} onChange={handleChange} className={inputClass} />
      </div>
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-amber w-full rounded-btn py-4 text-sm">
        Send Message
      </button>
      <p className="text-center text-xs text-gray-400">We respond within one business day.</p>
    </form>
  )
}
