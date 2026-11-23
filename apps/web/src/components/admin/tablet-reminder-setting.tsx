'use client'

// Settings > Shared tablets: how often the account's admins are reminded to print a new "Connect a tablet" poster.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'

const CHOICES: Array<{ months: number; label: string; hint: string }> = [
  { months: 1, label: 'Monthly', hint: 'Every month' },
  { months: 3, label: 'Quarterly', hint: 'Every 3 months (recommended)' },
  { months: 6, label: 'Half yearly', hint: 'Every 6 months' },
  { months: 12, label: 'Yearly', hint: 'Once a year' },
]

export function TabletReminderSetting({ token }: { token: string }) {
  const [months, setMonths] = useState<number | null>(null)
  const [age, setAge] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(() => { createApiClient(token).tablets.list().then(r => { setMonths(r.poster.reminder_months); setAge(r.poster.days_old) }).catch(() => setMsg('Shared tablets could not be loaded.')) }, [token])

  async function pick(m: number) {
    const before = months
    setMonths(m); setBusy(true); setMsg('')
    try { await createApiClient(token).tablets.saveReminder(m); setMsg('Saved.') } catch (e: any) { setMonths(before); setMsg(e?.message ?? 'Could not save.') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-mid">If you use shared tablets, the "Connect a tablet" poster lets staff connect a tablet with their own PIN. For safety it should be replaced regularly. Choose how often your administrators are emailed to print a new one and take the old ones down. Tablets that are already connected stay connected.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CHOICES.map(c => (
          <button key={c.months} type="button" disabled={busy || months === null} onClick={() => pick(c.months)}
            className={`rounded-lg border px-3 py-3 text-left transition-colors disabled:opacity-60 ${months === c.months ? 'border-teal bg-teal/5' : 'border-gray-200 hover:border-teal/40'}`}>
            <span className="block text-sm font-semibold text-neutral-dark">{c.label}</span>
            <span className="block text-xs text-neutral-mid">{c.hint}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {busy && <Loader2 size={14} className="animate-spin text-teal" />}
        {msg && <span className={msg === 'Saved.' ? 'text-green-700' : 'text-red-600'}>{msg}</span>}
        {age !== null && <span className="text-neutral-mid">Your current poster is {age} day{age === 1 ? '' : 's'} old.</span>}
        <Link href="/staff" className="font-medium text-teal hover:underline">Open Staff, then Shared tablets, to print a poster</Link>
      </div>
    </div>
  )
}
