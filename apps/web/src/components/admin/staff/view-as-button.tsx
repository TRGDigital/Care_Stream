'use client'

// "View hub" on a staff member's record: see their hub exactly as they do. Shown only where the account has it switched on
// (plan features view_as: 'view', or 'act' on test accounts). View mode is read only; act mode is for test accounts.
import { useState } from 'react'
import { Eye, Loader2, X } from 'lucide-react'
import { usePlanFeatures } from '@/lib/use-plan-features'
import { startViewAs } from '@/lib/view-as-client'

export function ViewAsButton({ token, userId, userName }: { token: string; userId: string; userName: string }) {
  const { features } = usePlanFeatures()
  const allowed = features?.view_as ?? 'off'
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<'view' | 'act' | null>(null)
  const [error, setError] = useState('')
  if (allowed === 'off') return null
  const first = userName.split(' ')[0] || 'them'

  async function go(mode: 'view' | 'act') {
    setBusy(mode); setError('')
    try { await startViewAs(token, userId, mode) }
    catch (e: any) { setError(e?.message ?? 'Could not open their hub.'); setBusy(null) }
  }

  // View only accounts: one click, nothing to choose.
  if (allowed === 'view') {
    return (
      <>
        <button onClick={() => go('view')} disabled={!!busy} className="flex items-center gap-1.5 rounded-lg border border-purple-300 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50 disabled:opacity-60">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} View hub
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </>
    )
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-purple-300 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50">
        <Eye size={14} /> View hub
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-neutral-dark">{first}&rsquo;s hub</h2>
              <button onClick={() => setOpen(false)} disabled={!!busy}><X size={18} className="text-neutral-mid" /></button>
            </div>
            <div className="space-y-3 px-6 py-5 text-sm text-neutral-dark">
              <button onClick={() => go('view')} disabled={!!busy} className="block w-full rounded-lg border border-gray-200 px-4 py-3 text-left hover:border-teal disabled:opacity-60">
                <span className="flex items-center gap-2 font-semibold">{busy === 'view' ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} className="text-teal" />} View only</span>
                <span className="mt-0.5 block text-xs text-neutral-mid">See exactly what {first} sees. Nothing can be changed, and nothing is recorded as them.</span>
              </button>
              <button onClick={() => go('act')} disabled={!!busy} className="block w-full rounded-lg border border-amber-300 bg-amber-50/50 px-4 py-3 text-left hover:border-amber-500 disabled:opacity-60">
                <span className="flex items-center gap-2 font-semibold">{busy === 'act' ? <Loader2 size={14} className="animate-spin" /> : null} Act as {first}</span>
                <span className="mt-0.5 block text-xs text-neutral-mid">Complete a course, answer questions, use the hub as {first}. What you do is recorded as {first}. Test accounts only.</span>
              </button>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <p className="text-xs text-neutral-mid">Ends after 45 minutes. &ldquo;Back to admin&rdquo; at the top of the hub brings you straight back.</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
