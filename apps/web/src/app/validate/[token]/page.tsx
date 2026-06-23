'use client'

import { useEffect, useState } from 'react'

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

export default function ValidatePage({ params }: { params: { token: string } }) {
  const { token } = params
  const [name, setName] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mod, setMod] = useState<Module | null>(null)

  useEffect(() => {
    fetch(`${API}/public/training/shared/${token}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => setName(d?.data?.name ?? 'Training module'))
      .catch(() => setNotFound(true))
  }, [token])

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
    } catch {
      setError('Could not open this module. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-teal">CareStream</span>
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
            <p className="mt-2 text-sm text-gray-500">This training module is shared for review. Enter the password to view it.</p>
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
              <button
                type="submit"
                disabled={busy || !password}
                className="w-full rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal/90 disabled:opacity-50"
              >
                {busy ? 'Opening…' : 'View module'}
              </button>
            </form>
          </div>
        ) : (
          <article className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{mod.name}</h1>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {mod.frequency && <span className="rounded-full bg-teal/10 px-2.5 py-1 font-medium text-teal">{mod.frequency}</span>}
                {mod.pass_mark != null && <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-600">Pass mark {mod.pass_mark}%</span>}
                {mod.requires_practical && <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">Practical assessment also required</span>}
              </div>
              {mod.description && <p className="mt-3 text-gray-600">{mod.description}</p>}
            </div>

            {mod.summary && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Summary</h2>
                <p className="text-gray-800">{mod.summary}</p>
              </section>
            )}

            {mod.outcomes.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Learning outcomes</h2>
                <ul className="list-disc space-y-1 pl-5 text-gray-800">{mod.outcomes.map((o, i) => <li key={i}>{o}</li>)}</ul>
              </section>
            )}

            {mod.sections.map((s, i) => (
              <section key={i} className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{s.heading}</h3>
                {s.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${API}${s.image_url}`} alt={s.heading} className="mb-3 w-full rounded-lg" />
                )}
                <div className="prose prose-sm max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: s.body }} />
              </section>
            ))}

            {mod.key_points.length > 0 && (
              <section className="rounded-2xl border border-teal/30 bg-teal/5 p-6">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-teal">Key points</h2>
                <ul className="list-disc space-y-1 pl-5 text-gray-800">{mod.key_points.map((k, i) => <li key={i}>{k}</li>)}</ul>
              </section>
            )}

            {mod.questions.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Assessment questions ({mod.questions.length})</h2>
                <div className="space-y-4">
                  {mod.questions.map((q, i) => (
                    <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5">
                      <p className="font-medium text-gray-900">{i + 1}. {q.text}</p>
                      <ul className="mt-3 space-y-1.5">
                        {q.options.map((opt, oi) => (
                          <li
                            key={oi}
                            className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${oi === q.correct ? 'bg-green-50 font-medium text-green-800' : 'text-gray-700'}`}
                          >
                            <span>{String.fromCharCode(65 + oi)}.</span>
                            <span>{opt}</span>
                            {oi === q.correct && <span className="ml-auto text-xs font-semibold text-green-600">Correct</span>}
                          </li>
                        ))}
                      </ul>
                      {q.explanation && <p className="mt-2 text-xs text-gray-500">{q.explanation}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {mod.standards.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Mapped standards</h2>
                <div className="flex flex-wrap gap-2">{mod.standards.map((s, i) => <span key={i} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{s}</span>)}</div>
              </section>
            )}

            <p className="border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
              Shared for validation by CareStream. This content is confidential.
            </p>
          </article>
        )}
      </main>
    </div>
  )
}
