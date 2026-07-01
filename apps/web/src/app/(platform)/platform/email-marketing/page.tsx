'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, Mail, Check, ChevronDown, ChevronUp, Eye, Send, Play, AlertTriangle } from 'lucide-react'

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

function EmailCard({ token, email, onSaved, onMoveUp, onMoveDown, canUp, canDown }: { token: string; email: EmailRow; onSaved: () => void; onMoveUp: () => void; onMoveDown: () => void; canUp: boolean; canDown: boolean }) {
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
        <div className="flex shrink-0 flex-col">
          <button onClick={onMoveUp} disabled={!canUp} title="Move earlier" className="text-neutral-mid hover:text-teal disabled:opacity-25"><ChevronUp size={15} /></button>
          <button onClick={onMoveDown} disabled={!canDown} title="Move later" className="text-neutral-mid hover:text-teal disabled:opacity-25"><ChevronDown size={15} /></button>
        </div>
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

      <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
        <button onClick={save} disabled={saving || !dirty} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save subject &amp; preview
        </button>
        {dirty && <button onClick={() => { setSubject(email.subject); setPreheader(email.preheader) }} className="text-xs font-medium text-neutral-mid hover:text-neutral-dark">Cancel</button>}
        {saved && <span className="text-xs font-medium text-green-600">Saved ✓</span>}
        {!dirty && !saved && <span className="text-xs text-neutral-mid">No unsaved changes</span>}
      </div>
      </div>
      )}
    </div>
  )
}

// Manual runner: sends today's DUE onboarding email on demand (bypasses the 10am
// gate). Scope to one tenant to test safely, or run for all enrolled tenants.
function RunDripNow({ token }: { token: string }) {
  const [enrolments, setEnrolments] = useState<Array<{ tenant_id: string; tenant_name: string | null; account_number: string | null; plan: string; start_date: string }>>([])
  const [scope, setScope] = useState('')   // '' = all enrolled tenants
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    createPlatformClient(token).onboarding.enrolments().then(d => setEnrolments(d.enrolments)).catch(() => {})
  }, [token])

  async function run() {
    setRunning(true); setResult(null)
    try {
      const r = await createPlatformClient(token).onboarding.dispatchNow(scope || undefined)
      if (r.reason) setResult(`Nothing due: ${r.reason}`)
      else {
        const due = (r.due ?? []).map(d => `${d.recipients} recipient(s) on day ${d.day}`).join('; ')
        setResult(`Done — ${r.sent} sent, ${r.skipped} already-sent, ${r.failed} failed${due ? ` · ${due}` : ''}.`)
      }
    } catch (e: any) { setResult(`Failed: ${e?.message ?? 'error'}`) }
    finally { setRunning(false) }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800"><Play size={15} /> Run drip now</p>
      <p className="mt-1 text-xs text-amber-700">Sends today&apos;s due email immediately (skips the 10am wait). Use this to test, or as a manual fallback if the scheduled send hasn&apos;t run.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={scope} onChange={e => setScope(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
          <option value="">All enrolled tenants ({enrolments.length})</option>
          {enrolments.map(e => <option key={e.tenant_id} value={e.tenant_id}>{e.account_number ? `${e.account_number} · ` : ''}{e.tenant_name ?? e.tenant_id} ({e.plan})</option>)}
        </select>
        <button onClick={run} disabled={running} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
          {running ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Run now
        </button>
      </div>
      {result && <p className="mt-2 text-xs font-medium text-neutral-dark">{result}</p>}
      <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> Each send is one-per-recipient: re-running won&apos;t resend an email a client has already received that day.</p>
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

  async function move(index: number, dir: -1 | 1) {
    if (!token) return
    const j = index + dir
    if (j < 0 || j >= emails.length) return
    const next = [...emails]
    ;[next[index], next[j]] = [next[j], next[index]]
    setEmails(next) // optimistic swap; day numbers refresh after the reload
    try { await createPlatformClient(token).onboarding.reorder(plan, next.map(e => e.id)) }
    finally { load() }
  }

  if (!token) return null

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-dark"><Mail size={22} className="text-teal" /> Email Marketing</h1>
          <p className="mt-1 text-sm text-neutral-mid">New-client onboarding drip. One email per working day from signup, sent 10am UK to every active admin. Edit the subject and preview inline (shared emails update on every plan), and use the arrows to reorder. Plans are cumulative: each tab shows only the emails it <em>adds</em>, and reordering flows up to the higher plans. Changes apply to future sends.</p>
        </div>

        <RunDripNow token={token} />

        <div className="flex gap-2">
          {PLANS.map(p => (
            <button key={p.key} onClick={() => setPlan(p.key)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${plan === p.key ? 'bg-teal text-white' : 'bg-neutral-light text-neutral-mid hover:bg-gray-200'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="-mt-2 text-xs text-neutral-mid">
          {plan === 'starter'
            ? 'The core sequence, shared by all plans (plus the Starter-only finale). Reordering here flows up to Professional and Enterprise.'
            : plan === 'professional'
              ? 'The emails Professional adds after the shared core. Reordering here also updates Enterprise.'
              : 'The emails Enterprise adds after the Professional sequence.'}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-neutral-mid" /></div>
        ) : (
          <div className="space-y-4">
            {emails.map((e, i) => <EmailCard key={e.id} token={token} email={e} onSaved={load} onMoveUp={() => move(i, -1)} onMoveDown={() => move(i, 1)} canUp={i > 0} canDown={i < emails.length - 1} />)}
          </div>
        )}
      </div>
    </PlatformShell>
  )
}
