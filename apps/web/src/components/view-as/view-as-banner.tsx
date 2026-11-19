'use client'

// Shown across the top of the hub while an admin is looking at it as a staff member. Cannot be missed, and always one click from leaving.
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Eye, Loader2, ShieldAlert } from 'lucide-react'
import { endViewAs } from '@/lib/view-as-client'

export function ViewAsBanner() {
  const { data: session } = useSession()
  const [leaving, setLeaving] = useState(false)
  const imp = session?.user?.impersonation
  // The view has a time limit. When it runs out, bring the admin back instead of leaving them on a session that no longer works.
  useEffect(() => {
    if (!imp) return
    const ms = imp.expiresAt - Date.now()
    const t = setTimeout(() => { setLeaving(true); endViewAs(session?.accessToken) }, Math.max(ms, 0))
    return () => clearTimeout(t)
  }, [imp?.expiresAt]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!imp) return null
  const first = (session?.user?.name ?? 'this person').split(' ')[0]
  const act = imp.mode === 'act'
  return (
    <div role="status" className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-sm font-medium text-white ${act ? 'bg-amber-600' : 'bg-purple-700'}`}>
      <span className="flex items-center gap-2">
        {act ? <ShieldAlert size={16} /> : <Eye size={16} />}
        {act
          ? <>Acting as {first}. Anything you do here counts as {first}. Test accounts only.</>
          : <>You are viewing {first}&rsquo;s hub as {imp.byName}. This is a view only: nothing can be changed.</>}
      </span>
      <button type="button" disabled={leaving} onClick={() => { setLeaving(true); endViewAs(session?.accessToken) }}
        className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25 disabled:opacity-60">
        {leaving && <Loader2 size={12} className="animate-spin" />} Back to admin
      </button>
    </div>
  )
}
