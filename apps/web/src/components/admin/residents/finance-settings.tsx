'use client'

// Settings, Finance (pilot): whether managers, not only administrators, may see resident funding. Off by default.
import { useEffect, useState } from 'react'
import { funding } from '@/lib/funding-client'
import { LockedBadge } from '@/components/admin/locked-badge'

export function FinanceSettingsBody({ token }: { token: string }) {
  const [on, setOn] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { let live = true; funding.settings(token).then(r => { if (live) setOn(r.managers_can_see) }).catch(e => { if (live) setError(e?.message ?? 'Could not load.') }); return () => { live = false } }, [token])
  async function change(v: boolean) { setError(''); const was = on; setOn(v); try { await funding.setSettings(token, v) } catch (e: any) { setOn(was); setError(e?.message ?? 'Could not save.') } }
  return (
    <div className="space-y-3">
      <LockedBadge />
      <p className="text-sm text-neutral-mid">Resident funding and fees, and staff pay rates, are locked to administrators. Staff never see them.</p>
      <label className="flex items-start gap-2.5 text-sm text-neutral-dark">
        <input type="checkbox" className="mt-0.5 h-4 w-4" checked={!!on} disabled={on === null} onChange={e => change(e.target.checked)} />
        <span><strong>Let managers see funding.</strong> When on, care managers and registered managers can also see the funding and fees of residents. Off by default.</span>
      </label>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
    </div>
  )
}
