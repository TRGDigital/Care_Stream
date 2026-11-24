'use client'

// The line at the top of the admin dashboard: "Good morning, Len", today's date, the home and the person's role.
// The greeting uses the time on the person's own device, so it is right wherever they are. It is worked out after the page loads
// (the server does not know their time), so the first paint shows the plain name and the greeting appears a moment later.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { LucideIcon } from 'lucide-react'
import { Activity, BedDouble, Building2, CalendarDays, Flower2, HandHeart, Home, Hospital, Smile, Stethoscope, ShieldCheck, Users, HeartPulse } from 'lucide-react'
import { greetingFor } from '@/lib/greeting'
import { createApiClient } from '@/lib/api-client'
import { SETTING_LABEL, settingFromFacilityType, type SettingKey } from '@/lib/care-setting-icon'

const SETTING_ICON: Record<SettingKey, LucideIcon> = {
  'residential-care': Home, 'nursing-homes': HeartPulse, 'domiciliary-care': Home, 'live-in-care': BedDouble, 'complex-care': Activity,
  'shared-lives': Users, 'substance-misuse': HandHeart, 'hospices': Flower2, 'independent-hospitals': Hospital, 'gp-practices': Stethoscope, 'dental-practices': Smile,
}

export function DashboardGreeting({ fallbackTitle = 'Dashboard' }: { fallbackTitle?: string }) {
  const { data: session } = useSession()
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = window.setInterval(() => setNow(new Date()), 5 * 60_000)   // stays right if the page is left open past noon or six
    return () => window.clearInterval(t)
  }, [])

  // The service type comes from Facility Type in Settings. Read once per visit and remembered for the session, so the dashboard does not wait for it.
  const [facility, setFacility] = useState<string | null>(null)
  const token = session?.accessToken
  useEffect(() => {
    if (!token) return
    try { const c = window.sessionStorage.getItem('cs-facility-type'); if (c !== null) { setFacility(c); return } } catch { /* storage blocked */ }
    let live = true
    createApiClient(token).settings.get()
      .then((s: any) => { const v = String(s?.facility_type ?? ''); if (live) setFacility(v); try { window.sessionStorage.setItem('cs-facility-type', v) } catch { /* ignore */ } })
      .catch(() => undefined)
    return () => { live = false }
  }, [token])
  const settingKey = facility ? settingFromFacilityType(facility) : null
  const SettingIcon = settingKey ? SETTING_ICON[settingKey] : null

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
        {date && (
          <span className="inline-flex items-center gap-1.5">
            {SettingIcon && settingKey && (
              <span title={SETTING_LABEL[settingKey]} aria-label={SETTING_LABEL[settingKey]} role="img" className="flex h-7 w-7 items-center justify-center rounded-full bg-teal/10 text-teal">
                <SettingIcon size={15} aria-hidden="true" />
              </span>
            )}
            <CalendarDays size={15} aria-hidden="true" />{date}
          </span>
        )}
        {org && <span className="inline-flex items-center gap-1.5"><Building2 size={15} aria-hidden="true" />{org}</span>}
        {role && <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} aria-hidden="true" />{role}</span>}
      </div>
    </div>
  )
}
