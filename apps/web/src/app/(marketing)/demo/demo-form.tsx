'use client'

import { useState } from 'react'

export function DemoForm() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', role: '', organisation: '', email: '', phone: '', homes: '', message: '' })

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
      <button type="submit" className="btn-amber w-full rounded-btn py-4 text-sm">
        Request Demo
      </button>
      <p className="text-center text-xs text-gray-400">We respond within one business day.</p>
    </form>
  )
}
