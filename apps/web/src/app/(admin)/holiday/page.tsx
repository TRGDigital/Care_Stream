'use client'

// Holiday tracking (pilot: account CS-1001 only). Matrix, calendar, requests and import. See apps/api/src/routes/holiday.ts.
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import { useHolidayMeta } from '@/lib/holiday-client'
import { MatrixTab } from '@/components/admin/holiday/matrix-tab'
import { CalendarTab } from '@/components/admin/holiday/calendar-tab'
import { RequestsPanel } from '@/components/admin/holiday/requests-panel'
import { ImportTab } from '@/components/admin/holiday/import-tab'
import { SickOverlay } from '@/components/admin/holiday/sick-overlay'
import { Plus } from 'lucide-react'

const TABS = [['matrix', 'Matrix'], ['calendar', 'Calendar'], ['requests', 'Requests'], ['import', 'Import']] as const

export default function HolidayPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const { meta } = useHolidayMeta()
  const [tab, setTab] = useState<typeof TABS[number][0]>('matrix')
  const [pending, setPending] = useState<number | null>(null)
  const [addSick, setAddSick] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  if (!meta || !token) return <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p>
  if (!meta.enabled) return <p className="text-sm text-neutral-mid">Holiday tracking is not switched on for this account.</p>
  if (meta.ready === false) return <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Holiday tracking is being set up. It will be ready shortly.</p>

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">Holiday tracking</h1>
          <p className="mt-1 text-sm text-neutral-mid">Who has taken, who has booked and who is off. Staff ask for holiday in their hub. Only approved holiday is counted here.</p>
        </div>
        {meta.is_admin && <button type="button" onClick={() => setAddSick(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50"><Plus size={14} aria-hidden="true" /> Add sick day</button>}
      </div>
      {addSick && <SickOverlay token={token} onClose={() => setAddSick(false)} onSaved={() => { setAddSick(false); setReloadKey(n => n + 1) }} />}
      <div role="tablist" aria-label="Holiday tracking" className="flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === k ? 'border-teal text-teal' : 'border-transparent text-neutral-mid hover:text-neutral-dark'}`}>
            {l}{k === 'requests' && (pending ?? meta.pending_count ?? 0) > 0 && <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{pending ?? meta.pending_count}</span>}
          </button>
        ))}
      </div>
      {tab === 'matrix' && <MatrixTab token={token} />}
      {tab === 'calendar' && <CalendarTab token={token} reloadKey={reloadKey} />}
      {tab === 'requests' && <RequestsPanel token={token} onCount={setPending} />}
      {tab === 'import' && <ImportTab token={token} />}
    </div>
  )
}
