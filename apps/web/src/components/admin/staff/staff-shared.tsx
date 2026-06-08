'use client'

// Shared staff helpers — used by both the Staff page (eager) and the lazy-loaded
// staff modals. Kept in one place so the modal bundle and the page stay in sync.

import { useState } from 'react'
import { createApiClient, type StaffContact } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Check, Copy, Loader2, Mail } from 'lucide-react'

// ─── Language options ─────────────────────────────────────────────────────────

export const LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'pol', name: 'Polish' },
  { code: 'ron', name: 'Romanian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'tgl', name: 'Tagalog (Filipino)' },
  { code: 'yor', name: 'Yoruba' },
  { code: 'ben', name: 'Bengali' },
  { code: 'urd', name: 'Urdu' },
  { code: 'hin', name: 'Hindi' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'ara', name: 'Arabic' },
  { code: 'som', name: 'Somali' },
  { code: 'swa', name: 'Swahili' },
  { code: 'lit', name: 'Lithuanian' },
  { code: 'guj', name: 'Gujarati' },
  { code: 'pan', name: 'Punjabi' },
  { code: 'tam', name: 'Tamil' },
  { code: 'zho', name: 'Chinese (Mandarin/Cantonese)' },
  { code: 'sin', name: 'Sinhala' },
  { code: 'nep', name: 'Nepali' },
  { code: 'cym', name: 'Welsh' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'kan', name: 'Kannada' },
  { code: 'mal', name: 'Malayalam' },
  { code: 'tel', name: 'Telugu' },
  // Creoles & related (common in UK care)
  { code: 'mfe', name: 'Mauritian Creole' },
  { code: 'hat', name: 'Haitian Creole' },
  { code: 'crs', name: 'Seychellois Creole' },
  { code: 'kea', name: 'Cape Verdean Creole' },
  { code: 'jam', name: 'Jamaican Patois (Creole)' },
  { code: 'gcf', name: 'Antillean Creole (Guadeloupe/Martinique)' },
  { code: 'pcm', name: 'Nigerian Pidgin' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function langNameOf(code: string | null | undefined, langs: { code: string; name: string }[] = LANGUAGES) {
  return langs.find(l => l.code === code)?.name ?? LANGUAGES.find(l => l.code === code)?.name ?? 'their first language'
}

// Per-staff toggle: when on, every outbound CareStream message is translated
// into the staff member's first language; when off, messages are sent in English.
export function CommsLanguageToggle({ on, onChange, langName, disabled }: {
  on: boolean
  onChange: (v: boolean) => void
  langName: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-dark">Always communicate in their first language</p>
        <p className="mt-0.5 text-xs text-neutral-mid">
          {on
            ? `All messages CareStream sends are translated into ${langName}.`
            : 'Messages are sent in English.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-teal' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

export function InitialAvatar({ name, role }: { name: string; role: string }) {
  const initial = (name ?? '?').charAt(0).toUpperCase()
  const bg = role === 'admin' ? 'bg-teal' : 'bg-purple-500'
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${bg}`}>
      {initial}
    </div>
  )
}

// ─── Credentials panel (shared by invite + reset password) ────────────────────

export function CredentialsPanel({
  title,
  subtitle,
  userId,
  email,
  password,
  contact,
  token,
  onDone,
}: {
  title:    string
  subtitle: string
  userId:   string
  email:    string
  password: string
  contact?: StaffContact
  token:    string
  onDone:   () => void
}) {
  const [copiedField,  setCopiedField]  = useState<string | null>(null)
  const [emailStatus,  setEmailStatus]  = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [emailError,   setEmailError]   = useState('')

  async function copy(value: string, field: string) {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  async function sendEmail() {
    setEmailStatus('sending')
    setEmailError('')
    try {
      await createApiClient(token).users.sendCredentials(userId, password)
      setEmailStatus('sent')
    } catch (e: any) {
      setEmailError(e.message ?? 'Failed to send email.')
      setEmailStatus('error')
    }
  }

  return (
    <>
      <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <p className="text-sm font-medium text-green-800">{title}</p>
        <p className="mt-1 text-xs text-green-700">{subtitle}</p>
      </div>

      <div className="space-y-3">
        {[
          { label: 'Username (email)', value: email,    field: 'email'    as const, mono: false },
          { label: 'Password',         value: password, field: 'password' as const, mono: true  },
        ].map(({ label, value, field, mono }) => (
          <div key={field}>
            <p className="mb-1 text-xs font-medium text-neutral-mid">{label}</p>
            <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-neutral-light px-3 py-2">
              <span className={`flex-1 select-all text-sm text-neutral-dark ${mono ? 'font-mono tracking-wide' : ''}`}>
                {value}
              </span>
              <button
                onClick={() => copy(value, field)}
                className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium text-neutral-mid transition-colors hover:bg-gray-200 hover:text-neutral-dark"
              >
                {copiedField === field ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                {copiedField === field ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* How to reach CareStream */}
      {contact && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">How {email.split('@')[0] || 'they'} reaches CareStream</p>
          <div className="space-y-2">
            {[
              { label: 'Log in',  value: contact.login_url,        field: 'login'   },
              ...(contact.inbound_email   ? [{ label: 'Email questions to', value: contact.inbound_email,   field: 'inbound' }] : []),
              ...(contact.whatsapp_number ? [{ label: 'WhatsApp',           value: contact.whatsapp_number, field: 'wa'      }] : []),
            ].map(({ label, value, field }) => (
              <div key={field}>
                <p className="mb-1 text-xs font-medium text-neutral-mid">{label}</p>
                <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-neutral-light px-3 py-2">
                  <span className="flex-1 select-all break-all text-sm text-neutral-dark">{value}</span>
                  <button onClick={() => copy(value, field)} className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium text-neutral-mid transition-colors hover:bg-gray-200 hover:text-neutral-dark">
                    {copiedField === field ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                    {copiedField === field ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
            {!contact.whatsapp_number && (
              <p className="text-xs text-neutral-mid">WhatsApp number not set up for this home yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Send by email */}
      <div className="mt-4 rounded-lg border border-gray-200 bg-neutral-light px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-dark">Send by email</p>
            <p className="mt-0.5 text-xs text-neutral-mid">
              Email these credentials directly to <span className="font-medium">{email}</span>
            </p>
          </div>
          <button
            onClick={sendEmail}
            disabled={emailStatus === 'sending' || emailStatus === 'sent'}
            className={`flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
              emailStatus === 'sent'
                ? 'bg-green-100 text-green-700'
                : 'bg-teal text-white hover:bg-teal-dark'
            }`}
          >
            {emailStatus === 'sending' ? (
              <><Loader2 size={14} className="animate-spin" /> Sending…</>
            ) : emailStatus === 'sent' ? (
              <><Check size={14} /> Sent</>
            ) : (
              <><Mail size={14} /> Send email</>
            )}
          </button>
        </div>
        {emailStatus === 'error' && (
          <p className="mt-2 text-xs text-red-600">{emailError}</p>
        )}
      </div>

      <p className="mt-3 text-xs text-neutral-mid">
        This is the only time this password will be shown. Copy or send it before closing.
      </p>

      <div className="mt-5 flex justify-end">
        <Button onClick={onDone}>Done</Button>
      </div>
    </>
  )
}
