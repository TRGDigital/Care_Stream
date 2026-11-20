'use client'

// Public, token-gated "help us get to know them" form for friends and family. No sign in.
// Answers are held for the home manager to approve before the care team can see them.

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Heart, Info, Loader2, LinkIcon } from 'lucide-react'
import { getFamilyForm, submitFamilyForm, type FamilyForm } from '@/lib/residents-api'
import { PhotoBox } from './photo-box'

const FIELD = 'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-light px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-xl justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-color.png" alt="CareStream" className="h-14 w-auto object-contain" />
      </div>
      <div className="mx-auto max-w-xl">{children}</div>
    </main>
  )
}

function DemoNotice() {
  return (
    <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900" role="note">
      <Info size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
      <p><strong>This is a demonstration for care managers.</strong> It shows exactly what a family member sees, using a sample resident and home. Nothing you type here is saved or sent to anyone.</p>
    </div>
  )
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto mb-3 flex justify-center">{icon}</div>
      <h1 className="text-xl font-bold text-neutral-dark">{title}</h1>
      <div className="mt-2 text-base leading-relaxed text-neutral-mid">{children}</div>
    </div>
  )
}

export default function FamilyFormPage() {
  const token = String(useParams()?.token ?? '')
  const [form, setForm] = useState<FamilyForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<'gone' | 'other' | null>(null)
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [photoCount, setPhotoCount] = useState(0)

  useEffect(() => {
    let live = true
    setLoading(true)
    getFamilyForm(token)
      .then(f => { if (!live) return; setForm(f); setName(f.invitee_name ?? ''); setPhotoCount((f.photos ?? []).filter(p => p.status !== 'rejected').length) })
      .catch((e: any) => { if (live) setLoadErr(e?.status === 410 || e?.status === 404 ? 'gone' : 'other') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [token])

  if (loading) return <Shell><div className="flex items-center justify-center gap-2 py-24 text-base text-neutral-mid" role="status"><Loader2 size={20} className="animate-spin text-teal" /> Loading</div></Shell>

  if (loadErr === 'gone' || (!form && loadErr !== 'other')) {
    return <Shell><Card icon={<LinkIcon size={30} className="text-amber-500" />} title="This link is no longer active">The link may have expired or been withdrawn. Please contact the home and they will be happy to send you a new one.</Card></Shell>
  }
  if (loadErr === 'other' || !form) {
    return <Shell><Card icon={<LinkIcon size={30} className="text-amber-500" />} title="We could not open this page">Something went wrong on our side. Please try again in a few minutes, or contact the home.</Card></Shell>
  }

  const home = form.home_name || 'The home'
  const resident = form.resident_name

  if (done && form.demo) {
    return (
      <Shell>
        <DemoNotice />
        <Card icon={<CheckCircle2 size={36} className="text-green-500" />} title="Thank you, that is the family's side">
          In a real link, the answers would now go to the manager. They appear under <strong>Approvals</strong> in the Residents screen, the manager reads each one, and can approve it, edit it or reject it. Staff and the hub chat never see an answer until it is approved. Nothing from this demonstration was saved.
        </Card>
        <p className="mt-5 text-center"><button type="button" onClick={() => { setDone(false); setAnswers({}); setRelationship(''); setPhotoCount(0) }} className="text-base font-semibold text-teal hover:underline">Try it again</button></p>
      </Shell>
    )
  }
  if (done) {
    return <Shell><Card icon={<CheckCircle2 size={36} className="text-green-500" />} title="Thank you">What you shared has been sent to the manager at {home}. They will check it before the care team sees it. You can close this page.</Card></Shell>
  }
  if (form.already_submitted) {
    return <Shell><Card icon={<CheckCircle2 size={36} className="text-green-500" />} title="Thank you, you have already shared your answers">If you would like to add more about {resident}, please ask {home} for a new link.</Card></Shell>
  }

  const firstName = (form.invitee_name ?? '').trim().split(/\s+/)[0]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(answers)) if (v.trim()) clean[k] = v.trim()
    if (!name.trim()) { setError('Please tell us your name.'); return }
    if (!relationship.trim()) { setError(`Please tell us how you know ${resident}.`); return }
    if (Object.keys(clean).length === 0 && photoCount === 0) { setError('Please answer at least one question or add a photo.'); return }
    setBusy(true); setError('')
    try {
      await submitFamilyForm(token, { name: name.trim(), relationship: relationship.trim(), answers: clean })
      setDone(true)
      window.scrollTo?.({ top: 0 })
    } catch (err: any) {
      if (err?.status === 410) setError('This link is no longer active. Please contact the home for a new one.')
      else if (err?.status === 429) setError('Too many attempts. Please wait a few minutes and try again.')
      else setError(err?.message || 'Something went wrong. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <Shell>
      {form.demo && <DemoNotice />}
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <Heart size={26} className="mb-2 text-teal" aria-hidden="true" />
          <h1 className="text-2xl font-bold leading-snug text-neutral-dark">{firstName ? `Hello ${firstName}. ` : 'Hello. '}{home} would love your help getting to know {resident}</h1>
          <p className="mt-2 text-base leading-relaxed text-neutral-mid">Small details about {resident}, such as what they enjoy and what comforts them, help the team give care that feels personal. Answer as many or as few questions as you like.</p>
          <p className="mt-3 rounded-xl bg-neutral-light px-4 py-3 text-sm leading-relaxed text-neutral-dark">Your answers go to the manager at {home}, who checks them before the care team can see them. Please do not include medical or private financial details.</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <label htmlFor="fam-name" className="mb-1 block text-base font-medium text-neutral-dark">Your name</label>
            <input id="fam-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" className={FIELD} />
          </div>
          <div>
            <label htmlFor="fam-rel" className="mb-1 block text-base font-medium text-neutral-dark">How you know {resident}</label>
            <input id="fam-rel" value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="For example daughter, friend, neighbour" className={FIELD} />
          </div>
        </div>

        {form.sections.map(s => (
          <div key={s.key} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <label htmlFor={`fam-${s.key}`} className="block text-lg font-semibold leading-snug text-neutral-dark">{s.family_prompt || s.label}</label>
            {s.help && <p id={`fam-${s.key}-hint`} className="mt-1 text-sm text-neutral-mid">{s.help}</p>}
            <textarea
              id={`fam-${s.key}`} rows={4} value={answers[s.key] ?? ''} maxLength={4000}
              onChange={e => setAnswers(a => ({ ...a, [s.key]: e.target.value }))}
              aria-describedby={s.help ? `fam-${s.key}-hint` : undefined}
              className={`${FIELD} mt-3`}
            />
          </div>
        ))}

        {form.photos_enabled && (
          <PhotoBox token={token} resident={resident} home={home} initial={form.photos ?? []} max={form.max_photos ?? 5} maxMb={form.max_photo_mb ?? 5}
            captionMax={form.caption_max ?? 140} onCount={setPhotoCount} />
        )}

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700">{error}</p>}

        <button type="submit" disabled={busy} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-teal px-6 py-3 text-lg font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
          {busy && <Loader2 size={18} className="animate-spin" />} Send what I have shared
        </button>
        <p className="pb-8 text-center text-sm text-neutral-mid">If you would like to add more later, ask {home} for a new link.</p>
      </form>
    </Shell>
  )
}
