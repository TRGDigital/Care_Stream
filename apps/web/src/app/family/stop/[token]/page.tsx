'use client'

// The "Stop these reminders" link in a family reminder email. Opening it switches the reminders off (no sign in; the signed link is the key)
// and confirms in a few words. A mail scanner that only fetches the page does not run this, so it cannot stop reminders by itself.

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, LinkIcon, Loader2 } from 'lucide-react'
import { stopFamilyReminders } from '@/lib/reminders-api'

export default function StopRemindersPage() {
  const token = String(useParams()?.token ?? '')
  const [state, setState] = useState<'working' | 'done' | 'gone' | 'error'>('working')
  const [names, setNames] = useState<{ resident_name: string; home_name: string } | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    stopFamilyReminders(token)
      .then(r => { setNames({ resident_name: r.resident_name, home_name: r.home_name }); setState('done') })
      .catch((e: any) => setState(e?.status === 410 || e?.status === 404 ? 'gone' : 'error'))
  }, [token])

  return (
    <main className="min-h-screen bg-neutral-light px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-xl justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-color.png" alt="CareStream" className="h-14 w-auto object-contain" />
      </div>
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm" role="status" aria-live="polite">
        {state === 'working' && <div className="flex items-center justify-center gap-2 py-6 text-base text-neutral-mid"><Loader2 size={20} className="animate-spin text-teal" /> One moment</div>}
        {state === 'done' && (
          <>
            <div className="mx-auto mb-3 flex justify-center"><CheckCircle2 size={36} className="text-green-500" /></div>
            <h1 className="text-xl font-bold text-neutral-dark">The reminders have stopped</h1>
            <p className="mt-2 text-base leading-relaxed text-neutral-mid">
              You will not get any more reminder emails about {names?.resident_name} from {names?.home_name}. Thank you for everything you have shared. If you would like to share something again, just ask the home for a new link.
            </p>
          </>
        )}
        {state === 'gone' && (
          <>
            <div className="mx-auto mb-3 flex justify-center"><LinkIcon size={30} className="text-amber-500" /></div>
            <h1 className="text-xl font-bold text-neutral-dark">This link is not working</h1>
            <p className="mt-2 text-base leading-relaxed text-neutral-mid">Please contact the home and they will stop the reminders for you.</p>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="mx-auto mb-3 flex justify-center"><LinkIcon size={30} className="text-amber-500" /></div>
            <h1 className="text-xl font-bold text-neutral-dark">We could not do that just now</h1>
            <p className="mt-2 text-base leading-relaxed text-neutral-mid">Please try the link again in a few minutes, or contact the home.</p>
          </>
        )}
      </div>
    </main>
  )
}
