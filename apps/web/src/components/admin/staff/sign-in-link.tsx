'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import { createApiClient } from '@/lib/api-client'
import { Link2, Copy, Check, Mail, Loader2, X } from 'lucide-react'

// Manager tool: generate a passwordless sign-in link (+ QR) for a staff member so a
// care assistant can get into the hub on their phone without a password.
export function SignInLinkButton({ token, userId, userName }: { token: string; userId: string; userName: string }) {
  const [open, setOpen]       = useState(false)
  const [url, setUrl]         = useState('')
  const [qr, setQr]           = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [emailed, setEmailed] = useState(false)
  const [error, setError]     = useState('')

  async function openModal() {
    setOpen(true); setLoading(true); setError(''); setCopied(false); setEmailed(false); setUrl(''); setQr('')
    try {
      const res = await createApiClient(token).users.loginLink(userId, false)
      setUrl(res.url)
      setQr(await QRCode.toDataURL(res.url, { width: 220, margin: 1 }))
    } catch (e: any) {
      setError(e?.message ?? 'Could not create a sign-in link.')
    } finally { setLoading(false) }
  }

  async function emailIt() {
    try { await createApiClient(token).users.loginLink(userId, true); setEmailed(true) } catch { /* ignore */ }
  }

  function copy() {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }

  return (
    <>
      <button onClick={openModal}
        className="flex items-center gap-1.5 rounded-lg border border-teal px-3 py-2 text-sm font-medium text-teal hover:bg-teal hover:text-white transition-colors">
        <Link2 size={14} /> Sign-in link
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-neutral-dark">Sign-in link for {userName.split(' ')[0]}</h2>
              <button onClick={() => setOpen(false)}><X size={18} className="text-neutral-mid" /></button>
            </div>
            <div className="px-6 py-5">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-neutral-mid" /></div>
              ) : error ? (
                <p className="py-6 text-center text-sm text-red-600">{error}</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-neutral-mid">
                    They scan this QR (or open the link) on their phone to sign in — no password. Then they add CareStream to their home screen. Works once and lasts 14 days.
                  </p>
                  {qr && (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qr} alt="Sign-in QR code" className="rounded-lg border border-gray-100" width={200} height={200} />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input readOnly value={url} className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-neutral-mid" />
                    <button onClick={copy} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal-dark">
                      {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                    </button>
                  </div>
                  <button onClick={emailIt} disabled={emailed}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-neutral-dark hover:border-teal/40 hover:text-teal disabled:opacity-60">
                    <Mail size={14} /> {emailed ? 'Emailed to them' : 'Email it to them'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
