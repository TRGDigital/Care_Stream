'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const TEAM_SIZES = ['1–10', '11–25', '26–50', '51–100', '100+']

// Low-friction lead capture for the training PPC landing pages. Posts to the
// existing marketing leads endpoint (persists to marketing_leads + emails sales)
// and fires a GA4 generate_lead event for conversion tracking.
export function GoLeadForm({ slug, moduleTitle }: { slug: string; moduleTitle: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [form, setForm] = useState({ name: '', email: '', home: '', team: '' })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      try {
        ;(window as any).gtag?.('event', 'generate_lead', { page: `/go/${slug}`, module: moduleTitle })
      } catch { /* tracking must never break the form */ }
      const res = await fetch(`${API_URL}/public/marketing/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'demo',
          name: form.name,
          email: form.email,
          organisation: form.home || null,
          homes: form.team || null,
          subject: `Training enquiry: ${moduleTitle}`,
          message: `Interested in ${moduleTitle} training for their team${form.team ? ` (team size: ${form.team})` : ''}. Submitted from /go/${slug}.`,
          source: 'web',
        }),
      })
      if (!res.ok) throw new Error('failed')
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle2 size={40} className="mx-auto mb-4 text-green-600" />
        <h3 className="mb-2 text-xl font-extrabold text-neutral-dark">Thank you.</h3>
        <p className="leading-relaxed text-neutral-mid">
          A member of the CareStream team will be in touch shortly with pricing and a rollout plan for
          {' '}{moduleTitle} training. In the meantime you can buy licences for your team straight away.
        </p>
      </div>
    )
  }

  const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-neutral-dark outline-none transition-colors focus:border-teal focus:ring-1 focus:ring-teal'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-neutral-dark">Your name</label>
        <input required value={form.name} onChange={set('name')} className={inputCls} autoComplete="name" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-neutral-dark">Work email</label>
        <input required type="email" value={form.email} onChange={set('email')} className={inputCls} autoComplete="email" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-neutral-dark">Care home or group</label>
        <input value={form.home} onChange={set('home')} className={inputCls} autoComplete="organization" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-neutral-dark">How many staff need training?</label>
        <select value={form.team} onChange={set('team')} className={inputCls}>
          <option value="">Select a team size</option>
          {TEAM_SIZES.map((t) => <option key={t} value={t}>{t} staff</option>)}
        </select>
      </div>
      {status === 'error' && (
        <p className="text-sm font-semibold text-red-600">Something went wrong — please try again, or email hello@carestreamai.com.</p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-btn bg-teal px-7 py-4 text-sm font-semibold text-white transition-colors hover:bg-teal-dark disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Get team pricing & a rollout plan'}
      </button>
      <p className="text-center text-xs leading-relaxed text-gray-400">
        No spam, ever. We only use your details to reply about {moduleTitle} training.
      </p>
    </form>
  )
}
