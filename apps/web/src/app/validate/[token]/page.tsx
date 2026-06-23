'use client'

import { useEffect, useMemo, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

type Question = { text: string; options: string[]; correct: number | null; explanation: string | null }
type Module = {
  name: string
  description: string | null
  frequency: string | null
  pass_mark: number | null
  requires_practical: boolean
  summary: string | null
  outcomes: string[]
  key_points: string[]
  sections: { heading: string; body: string; image_url: string | null }[]
  questions: Question[]
  standards: string[]
}

type Step = { type: 'overview' } | { type: 'section'; i: number } | { type: 'question'; i: number } | { type: 'done' }

export default function ValidatePage({ params }: { params: { token: string } }) {
  const { token } = params
  const [name, setName] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mod, setMod] = useState<Module | null>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    fetch(`${API}/public/training/shared/${token}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => setName(d?.data?.name ?? 'Training module'))
      .catch(() => setNotFound(true))
  }, [token])

  const steps: Step[] = useMemo(() => {
    if (!mod) return []
    const s: Step[] = [{ type: 'overview' }]
    mod.sections.forEach((_, i) => s.push({ type: 'section', i }))
    mod.questions.forEach((_, i) => s.push({ type: 'question', i }))
    s.push({ type: 'done' })
    return s
  }, [mod])

  useEffect(() => { if (typeof window !== 'undefined') window.scrollTo({ top: 0 }) }, [step])

  async function unlock(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`${API}/public/training/shared/${token}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.status === 401) { setError('Incorrect password. Please try again.'); return }
      if (!res.ok) { setError('Could not open this module. Please try again.'); return }
      const d = await res.json()
      setMod(d?.data?.module ?? null)
      setStep(0)
    } catch {
      setError('Could not open this module. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const cur = steps[step]
  const total = steps.length
  const progressPct = total > 1 ? Math.round((step / (total - 1)) * 100) : 0
  const sectionCount = mod?.sections.length ?? 0
  const questionCount = mod?.questions.length ?? 0
  const label =
    !cur ? '' :
    cur.type === 'overview' ? 'Overview' :
    cur.type === 'section' ? `Section ${cur.i + 1} of ${sectionCount}` :
    cur.type === 'question' ? `Question ${cur.i + 1} of ${questionCount}` :
    'Complete'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.png" alt="CareStream" className="h-16 w-auto sm:h-20" />
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Training module · for validation</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {notFound ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
            This share link is not available. It may have been disabled. Please ask for a new link.
          </div>
        ) : !mod ? (
          <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8">
            <h1 className="text-xl font-bold text-gray-900">{name ?? 'Loading…'}</h1>
            <p className="mt-2 text-sm text-gray-500">This training module is shared for review. Enter the password to view it as a staff member would.</p>
            <form onSubmit={unlock} className="mt-6 space-y-3">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={busy || !password} className="w-full rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal/90 disabled:opacity-50">
                {busy ? 'Opening…' : 'View module'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            {/* Title + progress */}
            <h1 className="mb-1 text-xl font-bold text-gray-900">{mod.name}</h1>
            <div className="mb-4 mt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span className="font-medium text-gray-700">{label}</span>
                <span>{progressPct}% complete</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100"><div className="h-2 rounded-full bg-teal transition-all duration-300" style={{ width: `${progressPct}%` }} /></div>
            </div>

            {/* Step content */}
            {cur?.type === 'overview' && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal">Learning — what to read first</p>
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                  {mod.frequency && <span className="rounded-full bg-teal/10 px-2.5 py-1 font-medium text-teal">{mod.frequency}</span>}
                  {mod.pass_mark != null && <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-600">Pass mark {mod.pass_mark}%</span>}
                  {mod.requires_practical && <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">Practical assessment also required</span>}
                </div>
                {mod.summary && <p className="text-sm text-gray-800">{mod.summary}</p>}
                {mod.outcomes.length > 0 && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-4">
                    <p className="mb-1.5 text-xs font-semibold text-gray-700">What you&apos;ll be able to do</p>
                    <ul className="space-y-1">{mod.outcomes.map((o, i) => <li key={i} className="flex gap-2 text-sm text-gray-800"><span className="text-teal">✓</span>{o}</li>)}</ul>
                  </div>
                )}
                {mod.key_points.length > 0 && (
                  <ul className="mt-4 space-y-1.5">{mod.key_points.map((p, i) => <li key={i} className="flex gap-2 text-sm text-gray-800"><span className="text-teal">✓</span>{p}</li>)}</ul>
                )}
              </div>
            )}

            {cur?.type === 'section' && mod.sections[cur.i] && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                {mod.sections[cur.i].image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${API}${mod.sections[cur.i].image_url}`} alt="" className="aspect-[16/9] w-full object-cover" />
                )}
                <div className="p-6">
                  {mod.sections[cur.i].heading && <p className="mb-2 text-base font-bold text-gray-900">{mod.sections[cur.i].heading}</p>}
                  <div className="prose prose-sm max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: mod.sections[cur.i].body }} />
                </div>
              </div>
            )}

            {cur?.type === 'question' && mod.questions[cur.i] && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Assessment question</p>
                <p className="font-medium text-gray-900">{mod.questions[cur.i].text}</p>
                <ul className="mt-3 space-y-1.5">
                  {mod.questions[cur.i].options.map((opt, oi) => (
                    <li key={oi} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${oi === mod.questions[cur.i].correct ? 'border-green-300 bg-green-50 font-medium text-green-800' : 'border-gray-200 text-gray-700'}`}>
                      <span>{String.fromCharCode(65 + oi)}.</span>
                      <span>{opt}</span>
                      {oi === mod.questions[cur.i].correct && <span className="ml-auto text-xs font-semibold text-green-600">Correct answer</span>}
                    </li>
                  ))}
                </ul>
                {mod.questions[cur.i].explanation && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">{mod.questions[cur.i].explanation}</p>}
              </div>
            )}

            {cur?.type === 'done' && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
                <div className="text-3xl">✅</div>
                <h2 className="mt-2 text-lg font-bold text-gray-900">End of module</h2>
                <p className="mt-1 text-sm text-gray-600">You&apos;ve reached the end of <span className="font-medium">{mod.name}</span>. {sectionCount} section{sectionCount === 1 ? '' : 's'} and {questionCount} assessment question{questionCount === 1 ? '' : 's'}.</p>
                {mod.standards.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Mapped standards</p>
                    <div className="flex flex-wrap justify-center gap-2">{mod.standards.map((s, i) => <span key={i} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{s}</span>)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
              >
                ← Back
              </button>
              {step < total - 1 ? (
                <button onClick={() => setStep(s => Math.min(total - 1, s + 1))} className="rounded-lg bg-teal px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal/90">
                  Next →
                </button>
              ) : (
                <button onClick={() => setStep(0)} className="rounded-lg border border-teal px-6 py-2.5 text-sm font-semibold text-teal transition-colors hover:bg-teal/10">
                  Start again
                </button>
              )}
            </div>

            <p className="mt-8 text-center text-xs text-gray-400">Shared for validation. This content is confidential.</p>
          </div>
        )}
      </main>
    </div>
  )
}
