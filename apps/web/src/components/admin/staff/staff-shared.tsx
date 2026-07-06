'use client'

// Shared staff helpers — used by both the Staff page (eager) and the lazy-loaded
// staff modals. Kept in one place so the modal bundle and the page stay in sync.

import { useState } from 'react'
import { createApiClient, type StaffContact } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Check, Copy, Loader2, Mail, Plus, X } from 'lucide-react'
import { InfoTip } from '@/components/info-tip'

// Sentinel value used by the Position / Specialist dropdowns for the
// "+ Add a new …" option.
export const ADD_NEW_ROLE = '__add_new_role__'

// Inline free-text field shown when a tenant picks "+ Add a new …". Trims,
// blocks duplicates (case-insensitive), Enter to add / Escape to cancel.
export function InlineAddRole({ placeholder, existing, onAdd, onCancel, busy }: {
  placeholder: string
  existing: string[]
  onAdd: (value: string) => void
  onCancel: () => void
  busy?: boolean
}) {
  const [val, setVal] = useState('')
  const [err, setErr] = useState('')
  function submit() {
    const v = val.trim()
    if (!v) return
    if (existing.some(r => r.toLowerCase() === v.toLowerCase())) { setErr('That already exists.'); return }
    onAdd(v)
  }
  return (
    <div className="mt-1.5">
      <div className="flex gap-1.5">
        <input
          autoFocus
          value={val}
          onChange={e => { setVal(e.target.value); setErr('') }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } if (e.key === 'Escape') onCancel() }}
          placeholder={placeholder}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
        />
        <button type="button" onClick={submit} disabled={busy || !val.trim()}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
        </button>
        <button type="button" onClick={onCancel} className="inline-flex shrink-0 items-center rounded-md border border-gray-300 px-2.5 py-2 text-sm text-neutral-mid hover:text-neutral-dark" title="Cancel"><X size={14} /></button>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  )
}

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

// Lets a staff member flip a single hub set (training/induction/CQC) into their
// SECOND language for that set only. Disabled until a second language is set.
export function LanguageSwitchToggle({ on, onChange, secondLangName, disabled }: {
  on: boolean
  onChange: (v: boolean) => void
  secondLangName: string | null
  disabled?: boolean
}) {
  const active = on && !!secondLangName
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-xs font-medium text-neutral-dark">
          Allow switching a set to their second language
          <InfoTip text="When on, this staff member sees a 'Read in their second language' button on each individual training, induction and CQC set in their hub. It flips just that one set (the lesson, the questions and the multiple-choice answers) into their second language so they can understand it, then resets to their first language next time. Ideal for staff who learn in English but occasionally need their own language for a tricky set." align="right" />
        </p>
        <p className="mt-0.5 text-xs text-neutral-mid">
          {!secondLangName
            ? 'Set a second language above to enable this.'
            : active
              ? `In the hub they can flip any single training, induction or CQC set into ${secondLangName}, just for that set, if they're struggling in their first language.`
              : 'Training is always shown in their first language.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        disabled={disabled || !secondLangName}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${active ? 'bg-teal' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

export function SuggestTranslationsToggle({ on, onChange, disabled }: {
  on: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-xs font-medium text-neutral-dark">
          Let them suggest better translations
          <InfoTip text="When on, this staff member sees a 'Suggest a better translation' option on translated training and content in their hub. Their suggestions come to you for approval; once approved, the improved wording is shown to everyone who reads that content in that language. Grant this only to staff you trust to improve translations, e.g. a fluent bilingual team member." align="right" />
        </p>
        <p className="mt-0.5 text-xs text-neutral-mid">
          {on
            ? 'They can propose improvements to translated content; changes need your approval before going live.'
            : 'They cannot suggest translation changes (default).'}
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
