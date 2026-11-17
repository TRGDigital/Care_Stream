'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Info } from 'lucide-react'
import type { ResidentDetail, ResidentInput, ResidentSectionDef } from '@/lib/residents-api'
import { Field, ErrorBox, inputCls, btnPrimary, errMsg } from './ui'

type Client = ReturnType<typeof import('@/lib/residents-api').createResidentsClient>

export function ResidentEditor({ client, sections, resident, onSaved }: {
  client: Client
  sections: ResidentSectionDef[]
  resident: ResidentDetail | null          // null = adding a new resident
  onSaved: (id: string) => void
}) {
  const [first, setFirst] = useState(resident?.first_name ?? '')
  const [last, setLast] = useState(resident?.last_name ?? '')
  const [preferred, setPreferred] = useState(resident?.preferred_name ?? '')
  const [dob, setDob] = useState(resident?.dob ?? '')
  const [room, setRoom] = useState(resident?.room ?? '')
  const [texts, setTexts] = useState<Record<string, string>>(resident?.sections ?? {})
  const base = useRef<Record<string, string>>(resident?.sections ?? {})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // When approving a family answer changes a section on the server, pull it in unless the admin is editing that box.
  useEffect(() => {
    if (!resident) return
    const next = resident.sections ?? {}
    setTexts(cur => {
      const out = { ...cur }
      for (const k of new Set([...Object.keys(next), ...Object.keys(base.current)])) {
        if ((cur[k] ?? '') === (base.current[k] ?? '')) out[k] = next[k] ?? ''
      }
      return out
    })
    base.current = next
  }, [resident?.sections]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!first.trim() || !last.trim()) { setError('Please enter a first name and a last name.'); return }
    setBusy(true); setError(''); setSaved(false)
    const payload: ResidentInput = {
      first_name: first.trim(), last_name: last.trim(),
      preferred_name: preferred.trim() || null, dob: dob || null, room: room.trim() || null,
      sections: Object.fromEntries(sections.map(s => [s.key, (texts[s.key] ?? '').trim()])),
    }
    try {
      const r = resident ? await client.update(resident.id, payload) : await client.create(payload)
      base.current = payload.sections ?? {}
      setSaved(true)
      onSaved(r.id)
    } catch (err) { setError(errMsg(err)) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={save} className="space-y-4" aria-label={resident ? 'Edit resident' : 'Add resident'}>
      <div role="note" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>This is for what makes them who they are: likes, routines, life story. Do not put medical, medication or safeguarding information here. The assistant uses this to answer staff questions.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name" htmlFor="rs-first"><input id="rs-first" required className={inputCls} value={first} onChange={e => setFirst(e.target.value)} autoComplete="off" /></Field>
        <Field label="Last name" htmlFor="rs-last"><input id="rs-last" required className={inputCls} value={last} onChange={e => setLast(e.target.value)} autoComplete="off" /></Field>
        <Field label="Preferred name" htmlFor="rs-pref" hint="What they like to be called, if different."><input id="rs-pref" className={inputCls} value={preferred} onChange={e => setPreferred(e.target.value)} autoComplete="off" aria-describedby="rs-pref-hint" /></Field>
        <Field label="Date of birth" htmlFor="rs-dob"><input id="rs-dob" type="date" className={inputCls} value={dob} onChange={e => setDob(e.target.value)} /></Field>
        <Field label="Room" htmlFor="rs-room"><input id="rs-room" className={inputCls} value={room} onChange={e => setRoom(e.target.value)} autoComplete="off" /></Field>
      </div>

      <div className="space-y-4">
        {sections.map(s => (
          <Field key={s.key} label={s.label} htmlFor={`rs-sec-${s.key}`} hint={s.help}>
            <textarea id={`rs-sec-${s.key}`} rows={3} className={`${inputCls} resize-y`} aria-describedby={`rs-sec-${s.key}-hint`}
              value={texts[s.key] ?? ''} onChange={e => { setTexts(t => ({ ...t, [s.key]: e.target.value })); setSaved(false) }} />
          </Field>
        ))}
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy && <Loader2 size={14} className="animate-spin" />}{resident ? 'Save changes' : 'Add resident'}
        </button>
        <span role="status" aria-live="polite" className="text-sm text-green-700">
          {saved && <span className="inline-flex items-center gap-1"><Check size={14} /> Saved</span>}
        </span>
      </div>
    </form>
  )
}
