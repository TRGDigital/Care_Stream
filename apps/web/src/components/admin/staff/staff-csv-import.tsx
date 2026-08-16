'use client'

// Bulk staff onboarding: upload a CSV, map its columns to CareStream fields,
// fix or skip anything incomplete in a review step, then create every account
// in one pass. Built to make adoption fast for new tenants — works for full
// and training-only plans alike (the invite endpoint is shared).

import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

// ─── CSV parsing (quoted fields, "" escapes, CRLF, BOM) ───────────────────────

function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '')
  const rows: string[][] = []
  let row: string[] = [], cell = '', inQuotes = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++ } else inQuotes = false
      } else cell += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(cell); cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some(v => v.trim() !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some(v => v.trim() !== '')) rows.push(row)
  return rows
}

// ─── Field mapping ────────────────────────────────────────────────────────────

const FIELDS = [
  { key: 'name',     label: 'Full name',      required: true  },
  { key: 'email',    label: 'Email address',  required: true  },
  { key: 'job_role', label: 'Job role',       required: false },
  { key: 'phone',    label: 'Phone number',   required: false },
  { key: 'shift',    label: 'Shift pattern',  required: false },
  { key: 'language', label: 'First language', required: false },
  { key: 'access',   label: 'Access level',   required: false },
] as const
type FieldKey = typeof FIELDS[number]['key']

// Header aliases, matched after lowercasing and stripping non-letters.
// 'role'/'position' deliberately map to job role, not access level — CSVs from
// rota/HR systems almost always mean the job. Access defaults to Staff.
const ALIASES: Record<FieldKey, string[]> = {
  name:     ['name', 'fullname', 'staffname', 'employeename', 'staffmember', 'employee'],
  email:    ['email', 'emailaddress', 'username', 'workemail'],
  job_role: ['jobrole', 'role', 'jobtitle', 'position', 'job', 'title', 'occupation'],
  phone:    ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'whatsapp', 'whatsappnumber', 'tel', 'telephone', 'contactnumber'],
  shift:    ['shift', 'shifttype', 'shiftpattern', 'shifts', 'daynight'],
  language: ['language', 'firstlanguage', 'preferredlanguage', 'nativelanguage', 'spokenlanguage'],
  access:   ['access', 'accesslevel', 'systemrole', 'admin', 'isadmin', 'accounttype', 'usertype'],
}

function autoMap(headers: string[]): Record<FieldKey, number> {
  const norm = headers.map(h => h.toLowerCase().replace(/[^a-z]/g, ''))
  const used = new Set<number>()
  const map = {} as Record<FieldKey, number>
  for (const f of FIELDS) {
    map[f.key] = -1
    for (const alias of ALIASES[f.key]) {
      const idx = norm.findIndex((h, i) => h === alias && !used.has(i))
      if (idx >= 0) { map[f.key] = idx; used.add(idx); break }
    }
  }
  return map
}

// ─── Normalisers ──────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// UK-friendly E.164: "07911 123456" → +447911123456. Returns null when the
// value can't be made into a valid number (the row gets a fixable warning).
function normalisePhone(raw: string): string | null {
  const v = raw.replace(/[\s\-().]/g, '')
  if (!v) return null
  if (/^\+[1-9]\d{7,14}$/.test(v)) return v
  if (/^07\d{9}$/.test(v))  return `+44${v.slice(1)}`
  if (/^447\d{9}$/.test(v)) return `+${v}`
  if (/^00\d{8,15}$/.test(v) && /^\+?[1-9]/.test(v.slice(2))) return `+${v.slice(2)}`
  return null
}

function normaliseShift(raw: string): 'any' | 'day' | 'night' | null {
  const v = raw.trim().toLowerCase()
  if (!v) return 'any'
  if (/^days?$/.test(v) || v.includes('day shift')) return 'day'
  if (/^nights?$/.test(v) || v.includes('night shift')) return 'night'
  if (['any', 'both', 'flexible', 'flex', 'rotating', 'mixed', 'day/night', 'days/nights'].includes(v)) return 'any'
  return null
}

function normaliseAccess(raw: string): 'admin' | 'staff' {
  const v = raw.trim().toLowerCase()
  return ['admin', 'administrator', 'manager', 'yes', 'true', 'y'].includes(v) ? 'admin' : 'staff'
}

// ─── Draft rows ───────────────────────────────────────────────────────────────

type Draft = {
  include:  boolean
  name:     string
  email:    string
  job_role: string
  phone:    string          // already normalised, or '' when blank/unusable
  shift:    'any' | 'day' | 'night'
  language: string          // 3-letter code
  access:   'admin' | 'staff'
  notes:    string[]        // what we changed or dropped while normalising
}

function rowErrors(d: Draft, takenEmails: Set<string>): string[] {
  const errs: string[] = []
  if (!d.name.trim()) errs.push('Name is missing.')
  if (!d.email.trim()) errs.push('Email is missing.')
  else if (!EMAIL_RE.test(d.email.trim())) errs.push('Email address is not valid.')
  else if (takenEmails.has(d.email.trim().toLowerCase())) errs.push('This email already has an account.')
  return errs
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'review' | 'import' | 'done'
type Cred = { name: string; email: string; password: string }
type Fail = { name: string; email: string; reason: string }

export function CsvImportModal({
  token, languages, existingEmails, onClose, onImported,
}: {
  token:          string
  languages:      { code: string; name: string }[]
  existingEmails: string[]
  onClose:        () => void
  onImported:     () => void
}) {
  const [step,     setStep]     = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [headers,  setHeaders]  = useState<string[]>([])
  const [raw,      setRaw]      = useState<string[][]>([])
  const [mapping,  setMapping]  = useState<Record<FieldKey, number>>({} as any)
  const [drafts,   setDrafts]   = useState<Draft[]>([])
  const [emailCreds, setEmailCreds] = useState(false)
  const [progress, setProgress] = useState(0)
  const [creds,    setCreds]    = useState<Cred[]>([])
  const [fails,    setFails]    = useState<Fail[]>([])
  const [stopped,  setStopped]  = useState('')     // plan-limit abort message
  const [parseErr, setParseErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const taken = useMemo(() => new Set(existingEmails.map(e => e.toLowerCase())), [existingEmails])
  const langByCode = useMemo(() => new Map(languages.map(l => [l.code, l.name])), [languages])

  // ── Step 1: file ──
  function handleFile(file: File) {
    setParseErr('')
    file.text().then(text => {
      const rows = parseCsv(text)
      if (rows.length < 2) { setParseErr('That file needs a header row plus at least one staff row.'); return }
      if (rows[0].length < 2) { setParseErr('Only one column found. Please save the spreadsheet as CSV (comma separated).'); return }
      setFileName(file.name)
      setHeaders(rows[0].map(h => h.trim()))
      setRaw(rows.slice(1))
      setMapping(autoMap(rows[0]))
      setStep('map')
    }).catch(() => setParseErr('Could not read that file. Please upload a .csv file.'))
  }

  function downloadTemplate() {
    const csv = 'Name,Email,Job role,Phone number,Shift,First language\nJane Smith,jane.smith@example.com,Care Assistant,07911 123456,Day,English\n'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'carestream-staff-template.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // ── Step 2 → 3: build drafts from the mapping ──
  function buildDrafts() {
    const seen = new Set<string>()
    const list: Draft[] = raw.map(r => {
      const get = (k: FieldKey) => (mapping[k] >= 0 ? (r[mapping[k]] ?? '').trim() : '')
      const notes: string[] = []

      const phoneRaw = get('phone')
      const phone = phoneRaw ? normalisePhone(phoneRaw) : null
      if (phoneRaw && !phone) notes.push(`Phone "${phoneRaw}" is not usable, it will be left blank unless corrected.`)

      const shiftRaw = get('shift')
      const shift = normaliseShift(shiftRaw)
      if (shiftRaw && shift === null) notes.push(`Shift "${shiftRaw}" was not recognised, set to Flexible.`)

      const langRaw = get('language')
      let language = 'eng'
      if (langRaw) {
        const v = langRaw.toLowerCase()
        const hit = languages.find(l => l.name.toLowerCase() === v || l.code === v)
        if (hit) language = hit.code
        else notes.push(`Language "${langRaw}" was not recognised, set to English.`)
      }

      const email = get('email')
      if (email && seen.has(email.toLowerCase())) notes.push('Duplicate of an earlier row in this file, unticked.')
      const dup = email !== '' && seen.has(email.toLowerCase())
      if (email) seen.add(email.toLowerCase())

      return {
        include:  !dup,
        name:     get('name'),
        email,
        job_role: get('job_role'),
        phone:    phone ?? '',
        shift:    shift ?? 'any',
        language,
        access:   mapping.access >= 0 ? normaliseAccess(get('access')) : 'staff',
        notes,
      }
    })
    setDrafts(list)
    setStep('review')
  }

  function patchDraft(i: number, patch: Partial<Draft>) {
    setDrafts(prev => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  }

  const included   = drafts.filter(d => d.include)
  const blocked    = included.filter(d => rowErrors(d, taken).length > 0)
  const importable = included.filter(d => rowErrors(d, taken).length === 0)

  // ── Step 4: import ──
  async function runImport() {
    setStep('import')
    setProgress(0); setCreds([]); setFails([]); setStopped('')
    const api = createApiClient(token)
    const ok: Cred[] = [], bad: Fail[] = []
    for (let i = 0; i < importable.length; i++) {
      const d = importable[i]
      try {
        const res = await api.users.invite({
          name: d.name.trim(), email: d.email.trim(), role: d.access,
          job_role: d.job_role.trim() || undefined,
          phone_number: d.phone || undefined,
          shift_type: d.shift, first_language: d.language,
        })
        ok.push({ name: d.name.trim(), email: d.email.trim(), password: res.temp_password })
        if (emailCreds) {
          try { await api.users.sendCredentials(res.user.id, res.temp_password) } catch { /* creds still shown + downloadable */ }
        }
      } catch (e: any) {
        const msg: string = e?.message ?? 'Could not create this account.'
        // Seat-limit errors end the run — every later row would fail the same way.
        if (/limit|plan|allocation/i.test(msg) ) {
          bad.push(...importable.slice(i).map(r => ({ name: r.name, email: r.email, reason: 'Not imported, your plan’s staff limit was reached.' })))
          setStopped(msg)
          break
        }
        bad.push({ name: d.name, email: d.email, reason: msg })
      }
      setProgress(i + 1)
      setCreds([...ok])
    }
    setCreds(ok); setFails(bad)
    setStep('done')
    if (ok.length > 0) onImported()
  }

  function downloadCreds() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = 'Name,Email,Temporary password\n' + creds.map(c => [c.name, c.email, c.password].map(esc).join(',')).join('\n') + '\n'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'carestream-staff-logins.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const stepLabel: Record<Step, string> = {
    upload: 'Upload your staff list', map: 'Match your columns', review: 'Check the details',
    import: 'Creating accounts…', done: 'Import complete',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      {/* The review step needs the full width so every person fits on one line. */}
      <div className={`flex max-h-full w-full ${step === 'review' ? 'max-w-6xl' : 'max-w-3xl'} flex-col rounded-card bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet size={18} className="text-teal" />
            <h2 className="text-lg font-semibold text-neutral-dark">{stepLabel[step]}</h2>
          </div>
          {step !== 'import' && (
            <button onClick={onClose} className="rounded p-1 text-neutral-mid hover:text-neutral-dark" aria-label="Close"><X size={18} /></button>
          )}
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {/* ── Upload ── */}
          {step === 'upload' && (
            <div>
              <p className="mb-4 text-sm text-neutral-mid">
                Upload a CSV export from your rota, HR or payroll system and we will match the columns for you.
                Each person needs a <strong>name</strong> and an <strong>email address</strong>; job role, phone number,
                shift and first language are picked up too when your file has them. Anything missing can be completed
                on the next screen, or skipped.
              </p>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-6 py-10 text-center transition-colors hover:border-teal hover:bg-teal-light/20"
              >
                <Upload size={24} className="text-teal" />
                <p className="text-sm font-semibold text-neutral-dark">Drop your CSV here, or click to choose a file</p>
                <p className="text-xs text-neutral-mid">.csv exported from Excel, Google Sheets or your HR system</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
              {parseErr && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{parseErr}</p>}
              <button onClick={downloadTemplate} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:underline">
                <Download size={13} /> Download a blank template
              </button>
            </div>
          )}

          {/* ── Map columns ── */}
          {step === 'map' && (
            <div>
              <p className="mb-4 text-sm text-neutral-mid">
                We matched <strong>{fileName}</strong> ({raw.length} row{raw.length === 1 ? '' : 's'}) to CareStream fields.
                Check each one and correct any we got wrong; fields your file does not have can stay as
                &ldquo;Not in my file&rdquo;.
              </p>
              <div className="space-y-2.5">
                {FIELDS.map(f => (
                  <div key={f.key} className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-neutral-dark">
                      {f.label}{f.required && <span className="ml-1 text-red-500">*</span>}
                      {f.key === 'access' && <span className="ml-2 text-xs font-normal text-neutral-mid">(Admin or Staff, defaults to Staff)</span>}
                    </span>
                    <select
                      value={mapping[f.key]}
                      onChange={e => setMapping(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                      className="w-56 rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                    >
                      <option value={-1}>Not in my file</option>
                      {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {(mapping.name < 0 || mapping.email < 0) && (
                <p className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  Full name and email address are needed to create accounts. If your file does not include one of them,
                  you can still continue and type the missing details in on the next screen.
                </p>
              )}
              <div className="mt-5 flex justify-between">
                <Button variant="secondary" onClick={() => setStep('upload')}>Back</Button>
                <Button onClick={buildDrafts}>Continue</Button>
              </div>
            </div>
          )}

          {/* ── Review / fix ── */}
          {step === 'review' && (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold text-green-700">{importable.length} ready to import</span>
                {blocked.length > 0 && <span className="font-semibold text-amber-700">{blocked.length} need{blocked.length === 1 ? 's' : ''} attention</span>}
                {drafts.length - included.length > 0 && <span className="text-neutral-mid">{drafts.length - included.length} skipped</span>}
              </div>
              {blocked.length > 0 && (
                <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Rows highlighted below are missing something. Fill in the boxes to include them, or untick a row to
                  leave that person out, you can always add them individually later.
                </p>
              )}
              <div className="overflow-x-auto">
                <div className="min-w-[880px]">
                  {/* Column headers */}
                  <div className="flex items-center gap-2 px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">
                    <span className="w-4 shrink-0" />
                    <span className="w-[19%]">Full name</span>
                    <span className="flex-1">Email address</span>
                    <span className="w-[17%]">Job role</span>
                    <span className="w-24 shrink-0">Shift</span>
                    <span className="w-32 shrink-0">Language</span>
                    <span className="w-12 shrink-0" />
                  </div>
                  <div className="max-h-[48vh] space-y-1.5 overflow-y-auto pr-1">
                    {drafts.map((d, i) => {
                      const errs = rowErrors(d, taken)
                      const problem = d.include && errs.length > 0
                      return (
                        <div key={i} className={`rounded-lg border px-3 py-2 ${!d.include ? 'border-gray-100 bg-gray-50 opacity-60' : problem ? 'border-amber-300 bg-amber-50/60' : 'border-gray-100'}`}>
                          <div className="flex flex-nowrap items-center gap-2">
                            <input type="checkbox" checked={d.include} onChange={e => patchDraft(i, { include: e.target.checked })} className="h-4 w-4 shrink-0 accent-[#9B52B5]" title={d.include ? 'Untick to skip this person' : 'Tick to include this person'} />
                            <input value={d.name} onChange={e => patchDraft(i, { name: e.target.value })} placeholder="Full name"
                              className={`w-[19%] min-w-0 rounded-md border px-2 py-1 text-sm ${d.include && !d.name.trim() ? 'border-amber-400' : 'border-gray-200'}`} />
                            <input value={d.email} onChange={e => patchDraft(i, { email: e.target.value })} placeholder="Email address"
                              className={`min-w-0 flex-1 rounded-md border px-2 py-1 text-sm ${d.include && (!d.email.trim() || !EMAIL_RE.test(d.email.trim()) || taken.has(d.email.trim().toLowerCase())) ? 'border-amber-400' : 'border-gray-200'}`} />
                            <input value={d.job_role} onChange={e => patchDraft(i, { job_role: e.target.value })} placeholder="Job role (optional)"
                              className="w-[17%] min-w-0 rounded-md border border-gray-200 px-2 py-1 text-sm" />
                            <select value={d.shift} onChange={e => patchDraft(i, { shift: e.target.value as Draft['shift'] })} className="w-24 shrink-0 rounded-md border border-gray-200 px-1.5 py-1 text-sm">
                              <option value="any">Flexible</option><option value="day">Day</option><option value="night">Night</option>
                            </select>
                            <select value={d.language} onChange={e => patchDraft(i, { language: e.target.value })} className="w-32 shrink-0 rounded-md border border-gray-200 px-1.5 py-1 text-sm">
                              {!langByCode.has(d.language) && <option value={d.language}>{d.language}</option>}
                              {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                            </select>
                            <span className="w-12 shrink-0 text-center">
                              {d.access === 'admin' && <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-bold text-teal">Admin</span>}
                            </span>
                          </div>
                          {d.include && (errs.length > 0 || d.notes.length > 0) && (
                            <ul className="ml-6 mt-1 space-y-0.5 text-xs">
                              {errs.map((e, j) => <li key={`e${j}`} className="text-amber-800">{e}</li>)}
                              {d.notes.map((n, j) => <li key={`n${j}`} className="text-neutral-mid">{n}</li>)}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-neutral-dark">
                <input type="checkbox" checked={emailCreds} onChange={e => setEmailCreds(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#9B52B5]" />
                <span>Email each new staff member their login details as their account is created<span className="block text-xs text-neutral-mid">You will also get every login shown on screen and downloadable as a file either way.</span></span>
              </label>
              <div className="mt-4 flex items-center justify-between">
                <Button variant="secondary" onClick={() => setStep('map')}>Back</Button>
                <div className="flex items-center gap-3">
                  {blocked.length > 0 && (
                    <button onClick={() => setDrafts(prev => prev.map(d => (d.include && rowErrors(d, taken).length > 0 ? { ...d, include: false } : d)))} className="text-xs font-semibold text-neutral-mid hover:text-neutral-dark hover:underline">
                      Skip all rows that need attention
                    </button>
                  )}
                  <Button onClick={runImport} disabled={importable.length === 0 || blocked.length > 0}
                    title={blocked.length > 0 ? 'Fix or untick the highlighted rows first' : undefined}>
                    Import {importable.length} staff member{importable.length === 1 ? '' : 's'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Importing ── */}
          {step === 'import' && (
            <div className="py-6 text-center">
              <Loader2 size={28} className="mx-auto animate-spin text-teal" />
              <p className="mt-3 text-sm font-semibold text-neutral-dark">Creating accounts&hellip; {progress} of {importable.length}</p>
              <div className="mx-auto mt-3 h-2 w-64 overflow-hidden rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-teal transition-all" style={{ width: `${importable.length ? Math.round((progress / importable.length) * 100) : 0}%` }} />
              </div>
              <p className="mt-3 text-xs text-neutral-mid">Please keep this page open, this only takes a moment.</p>
            </div>
          )}

          {/* ── Done ── */}
          {step === 'done' && (
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-green-700">
                <CheckCircle2 size={16} /> {creds.length} staff account{creds.length === 1 ? '' : 's'} created{emailCreds && creds.length > 0 ? ', login details emailed' : ''}
              </p>
              {stopped && <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{stopped}</p>}
              {fails.length > 0 && (
                <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                  <p className="font-semibold">{fails.length} row{fails.length === 1 ? ' was' : 's were'} not imported:</p>
                  <ul className="mt-1 space-y-0.5">{fails.map((f, i) => <li key={i}>{f.name || f.email}: {f.reason}</li>)}</ul>
                </div>
              )}
              {creds.length > 0 && (
                <>
                  <p className="mt-4 text-xs text-neutral-mid">
                    Temporary passwords are shown once only, download them now and share each one securely. Staff are
                    asked to set their own password when they first log in.
                  </p>
                  <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-neutral-mid">
                        <th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 font-medium">Email</th><th className="px-3 py-2 font-medium">Temporary password</th>
                      </tr></thead>
                      <tbody>
                        {creds.map((c, i) => (
                          <tr key={i} className="border-b border-gray-50 last:border-0">
                            <td className="px-3 py-1.5">{c.name}</td>
                            <td className="px-3 py-1.5 text-neutral-mid">{c.email}</td>
                            <td className="px-3 py-1.5 font-mono text-xs">{c.password}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button variant="secondary" size="sm" onClick={downloadCreds} className="mt-3">
                    <Download size={14} className="mr-1.5" /> Download logins as CSV
                  </Button>
                </>
              )}
              <div className="mt-5 flex justify-end">
                <Button onClick={onClose}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
