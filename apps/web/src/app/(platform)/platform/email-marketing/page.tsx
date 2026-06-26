'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, Mail, Check, ChevronDown, Eye, Send } from 'lucide-react'

async function viewEmail(token: string, id: string) {
  const w = window.open('', '_blank')
  try {
    const { html } = await createPlatformClient(token).onboarding.preview(id)
    if (w) { w.document.open(); w.document.write(html); w.document.close() }
  } catch { w?.close() }
}

type EmailRow = Awaited<ReturnType<ReturnType<typeof createPlatformClient>['onboarding']['emails']>>['emails'][number]

const PLANS = [
  { key: 'starter',      label: 'Starter' },
  { key: 'professional', label: 'Professional' },
  { key: 'enterprise',   label: 'Enterprise' },
]

function fmtDate(iso: string | null) {
  if (!iso) return 'Not sent yet'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Stat({ label, value, pct }: { label: string; value: number; pct?: number | null }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-center">
      <p className="text-lg font-bold text-neutral-dark">{value}{pct != null && <span className="ml-1 text-xs font-medium text-neutral-mid">{pct}%</span>}</p>
      <p className="text-[10px] uppercase tracking-wide text-neutral-mid">{label}</p>
    </div>
  )
}

function EmailCard({ token, email, onSaved }: { token: string; email: EmailRow; onSaved: () => void }) {
  const [open, setOpen]           = useState(false)
  const [subject, setSubject]     = useState(email.subject)
  const [preheader, setPreheader] = useState(email.preheader)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [testTo, setTestTo]       = useState('')
  const [testing, setTesting]     = useState(false)
  const [testMsg, setTestMsg]     = useState('')
  const dirty = subject !== email.subject || preheader !== email.preheader

  async function sendTest() {
    if (!testTo.trim()) return
    setTesting(true); setTestMsg('')
    try { await createPlatformClient(token).onboarding.test(email.id, testTo.trim()); setTestMsg(`Sent to ${testTo.trim()}`) }
    catch (e: any) { setTestMsg(e?.message ?? 'Could not send') }
    finally { setTesting(false) }
  }

  async function save() {
    setSaving(true)
    try { await createPlatformClient(token).onboarding.update(email.id, { subject, preheader }); setSaved(true); setTimeout(() => setSaved(false), 2000); onSaved() }
    finally { setSaving(false) }
  }

  const s = email.stats
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Accordion header */}
      <div className="flex items-center gap-2 px-5 py-3">
        <button onClick={() => setOpen(o => !o)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs font-bold text-teal">Day {email.day_index}</span>
          {email.badge && <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 sm:inline">{email.badge}</span>}
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-dark">{email.subject}</span>
          <span className="hidden whitespace-nowrap text-xs text-neutral-mid md:inline">{s.sent} sent · {s.opened} opened</span>
          <ChevronDown size={16} className={`shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={() => viewEmail(token, email.id)} title="View email" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal/40 px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/40">
          <Eye size={13} /> View
        </button>
      </div>

      {!open ? null : (
      <div className="border-t border-gray-100 p-5">
      <div className="mb-3 flex items-center gap-2">
        {email.badge && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{email.badge}</span>}
        <span className="ml-auto text-xs text-neutral-mid">Date sent: <span className="font-medium text-neutral-dark">{fmtDate(s.first_sent_at)}</span></span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">Subject line</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">Preview text</span>
            <input value={preheader} onChange={e => setPreheader(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20" />
          </label>
          <p className="text-xs text-neutral-mid">From: <span className="font-medium text-neutral-dark">{email.from_email ?? 'hello@carestreamai.com'}</span></p>
        </div>
        {email.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={email.image} alt="" className="hidden h-24 w-40 shrink-0 rounded-lg border border-gray-200 object-cover object-top sm:block" />
        )}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <Stat label="Sent"      value={s.sent} />
        <Stat label="Delivered" value={s.delivered} pct={s.delivered_pct} />
        <Stat label="Opened"    value={s.opened}    pct={s.open_pct} />
        <Stat label="Clicked"   value={s.clicked}   pct={s.click_pct} />
      </div>

      {/* Send a test */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
        <span className="text-xs font-semibold text-neutral-mid">Send a test to:</span>
        <input
          type="email"
          value={testTo}
          onChange={e => { setTestTo(e.target.value); setTestMsg('') }}
          onKeyDown={e => { if (e.key === 'Enter') sendTest() }}
          placeholder="you@example.com"
          className="min-w-[180px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
        />
        <button onClick={sendTest} disabled={testing || !testTo.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
          {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Test now
        </button>
        {testMsg && <span className={`text-xs font-medium ${testMsg.startsWith('Sent') ? 'text-green-600' : 'text-red-600'}`}>{testMsg}</span>}
      </div>

      {dirty && (
        <div className="mt-3 flex items-center gap-2">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save changes
          </button>
          <button onClick={() => { setSubject(email.subject); setPreheader(email.preheader) }} className="text-xs font-medium text-neutral-mid hover:text-neutral-dark">Cancel</button>
        </div>
      )}
      {saved && <p className="mt-2 text-xs font-medium text-green-600">Saved</p>}
      </div>
      )}
    </div>
  )
}

export default function EmailMarketingPage() {
  const token = usePlatformAuth()
  const [plan, setPlan]       = useState('enterprise')
  const [emails, setEmails]   = useState<EmailRow[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    if (!token) return
    setLoading(true)
    createPlatformClient(token).onboarding.emails(plan)
      .then(d => setEmails(d.emails))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token, plan])

  if (!token) return null

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-dark"><Mail size={22} className="text-teal" /> Email Marketing</h1>
          <p className="mt-1 text-sm text-neutral-mid">New-client onboarding drip. One email per working day from signup, sent 10am UK to every active admin. Edit the subject line and preview text inline; changes apply to future sends.</p>
        </div>

        <div className="flex gap-2">
          {PLANS.map(p => (
            <button key={p.key} onClick={() => setPlan(p.key)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${plan === p.key ? 'bg-teal text-white' : 'bg-neutral-light text-neutral-mid hover:bg-gray-200'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-neutral-mid" /></div>
        ) : (
          <div className="space-y-4">
            {emails.map(e => <EmailCard key={e.id} token={token} email={e} onSaved={load} />)}
          </div>
        )}
      </div>
    </PlatformShell>
  )
}
