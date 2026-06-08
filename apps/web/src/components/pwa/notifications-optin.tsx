'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { Bell, Loader2, X } from 'lucide-react'

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

// Prompts staff to turn on push notifications — but only inside the INSTALLED app
// (standalone), which is when push works reliably (and the only way it works on iOS).
// Until installed, the InstallPrompt shows instead, so the two never overlap.
export function NotificationsOptIn() {
  const { data: session } = useSession()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID) return
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    if (!standalone) return                                   // wait until installed
    if (Notification.permission !== 'default') return         // already decided
    try { if (localStorage.getItem('cs_push_dismissed') === '1') return } catch { /* ignore */ }
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => { if (!sub) setShow(true) })
      .catch(() => {})
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem('cs_push_dismissed', '1') } catch { /* ignore */ }
  }

  async function enable() {
    if (!session?.accessToken || !VAPID) return
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { dismiss(); return }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) as unknown as BufferSource })
      const json: any = sub.toJSON()
      await createApiClient(session.accessToken).me.pushSubscribe({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } })
      setShow(false)
    } catch { /* user blocked or failed — just hide */ dismiss() }
    finally { setBusy(false) }
  }

  if (!show) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-2xl border border-teal/20 bg-white p-4 shadow-elevated">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal/10"><Bell size={18} className="text-teal" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-dark">Turn on notifications</p>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-mid">Get a tap on the shoulder when there&apos;s new training, a CQC question, or something to review — so you don&apos;t miss it.</p>
          <button onClick={enable} disabled={busy} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-dark disabled:opacity-50">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />} Turn on
          </button>
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 rounded p-1 text-neutral-mid hover:text-neutral-dark"><X size={16} /></button>
      </div>
    </div>
  )
}
