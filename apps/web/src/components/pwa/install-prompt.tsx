'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

// Encourages staff to install the hub to their home screen. Android/desktop get a
// real "Install" button (via beforeinstallprompt); iOS Safari gets a "Share → Add to
// Home Screen" hint (iOS exposes no install event). Hidden once installed or dismissed.
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null)
  const [show, setShow]   = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    if (standalone) return
    try { if (localStorage.getItem('cs_install_dismissed') === '1') return } catch { /* ignore */ }

    const ua = navigator.userAgent
    const ios = /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios/i.test(ua)
    setIsIOS(ios)

    const onPrompt = (e: any) => { e.preventDefault(); setDeferred(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    if (ios) setShow(true) // iOS: no event — show the hint directly
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem('cs_install_dismissed', '1') } catch { /* ignore */ }
  }

  async function install() {
    if (!deferred) return
    deferred.prompt()
    try { await deferred.userChoice } catch { /* ignore */ }
    setDeferred(null)
    dismiss()
  }

  if (!show) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-teal/20 bg-white p-4 shadow-elevated">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-lg border border-gray-100" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-dark">Add CareStream to your phone</p>
          {isIOS ? (
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-mid">
              Tap the Share icon <Share size={11} className="inline align-text-bottom" /> in your browser bar, then <strong>Add to Home Screen</strong>. It opens like an app — no logging in each time.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-mid">Install the hub for one-tap access — and notifications when something needs you.</p>
          )}
          {!isIOS && deferred && (
            <button onClick={install} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-dark">
              <Download size={13} /> Install app
            </button>
          )}
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 rounded p-1 text-neutral-mid hover:text-neutral-dark"><X size={16} /></button>
      </div>
    </div>
  )
}
