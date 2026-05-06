'use client'

import { useState } from 'react'

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  const inputClass = "w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-neutral-dark placeholder:text-gray-400 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 transition-colors"
  const labelClass = "mb-1.5 block text-sm font-semibold text-neutral-dark"

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
      <button type="submit" className="btn-amber w-full rounded-btn py-4 text-sm">
        Send Message
      </button>
      <p className="text-center text-xs text-gray-400">We respond within one business day.</p>
    </form>
  )
}
