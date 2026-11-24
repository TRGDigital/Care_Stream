'use client'

// The line at the top of the admin dashboard: "Good morning, Len", today's date, the home and the person's role.
// The greeting uses the time on the person's own device, so it is right wherever they are. It is worked out after the page loads
// (the server does not know their time), so the first paint shows the plain name and the greeting appears a moment later.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Building2, CalendarDays, ShieldCheck } from 'lucide-react'
import { greetingFor } from '@/lib/greeting'

export function DashboardGreeting({ fallbackTitle = 'Dashboard' }: { fallbackTitle?: string }) {
  const { data: session } = useSession()
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = window.setInterval(() => setNow(new Date()), 5 * 60_000)   // stays right if the page is left open past noon or six
    return () => window.clearInterval(t)
  }, [])

  const user: any = session?.user ?? {}
  const first = String(user.name ?? '').trim().split(/\s+/)[0]
  const org = String(user.tenantName ?? '').trim()
  const role = String(user.role ?? '').toLowerCase() === 'admin' ? 'Admin' : ''

  const date = now?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold leading-tight text-neutral-dark md:text-3xl">
        {now && first ? <>{greetingFor(now.getHours())}, <span className="text-teal">{first}</span></> : (first ? <>Welcome, <span className="text-teal">{first}</span></> : fallbackTitle)}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-neutral-mid">
        {date && <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} aria-hidden="true" />{date}</span>}
        {org && <span className="inline-flex items-center gap-1.5"><Building2 size={15} aria-hidden="true" />{org}</span>}
        {role && <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} aria-hidden="true" />{role}</span>}
      </div>
    </div>
  )
}
