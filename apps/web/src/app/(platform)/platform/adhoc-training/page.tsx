'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { ChevronDown, FileCheck2, FileDown, Loader2 } from 'lucide-react'

type Data = Awaited<ReturnType<ReturnType<typeof createPlatformClient>['adhocTraining']['list']>>
type Mod = Data['tenants'][number]['modules'][number]

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

// Where a lesson's content came from, in the order the generator reads it.
function Sources({ m }: { m: Mod }) {
  if (!m.sources_recorded) {
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600" title="Generated before 21 Sep 2026, when sources started being saved. Regenerate to record them.">Not recorded</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
      <span className={`rounded-full px-2 py-0.5 ${m.home_policies ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{m.home_policies} home {m.home_policies === 1 ? 'policy' : 'policies'}</span>
      {m.training_seeds > 0 && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">training seed</span>}
      {m.example_policies > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">{m.example_policies} example</span>}
    </div>
  )
}

// How much of the lesson is supported by the home's own policies, from the check run when
// it was generated. Questions lead; sections follow.
function HomeShare({ m }: { m: Mod }) {
  const a = m.attribution
  if (!a) return <span className="text-xs text-neutral-mid" title="Generated before 21 Sep 2026, when checking began. Regenerate to check it.">Not checked</span>
  if (a.failed) return <span className="text-xs text-red-600">Check failed</span>
  const pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0)
  const q = pct(a.questions.home, a.questions.total)
  const tone = q >= 60 ? 'bg-green-500' : q >= 30 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="min-w-[150px]" title={`Questions: ${a.questions.home} home policy, ${a.questions.training_seed} training seed, ${a.questions.example} example, ${a.questions.none} general practice, ${a.questions.unverified} unverified`}>
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm font-semibold text-neutral-dark">{q}%</span>
        <span className="text-xs text-neutral-mid">of questions · {pct(a.sections.home, a.sections.total)}% of sections</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"><div className={`h-full ${tone}`} style={{ width: `${q}%` }} /></div>
      {!a.current && <p className="mt-0.5 text-[10px] text-amber-600">Questions edited since the check</p>}
    </div>
  )
}

export default function AdhocTrainingPage() {
  const token = usePlatformAuth()
  const [data, setData]       = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [busy, setBusy]       = useState<string | null>(null)
  const [open, setOpen]       = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!token) return
    createPlatformClient(token).adhocTraining.list()
      .then(d => { setData(d); if (d.tenants[0]) setOpen({ [d.tenants[0].tenant_id]: true }) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  async function download(m: Mod, account: string) {
    if (!token) return
    setBusy(m.id)
    try {
      const blob = await createPlatformClient(token).adhocTraining.reportPdf(m.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `adhoc-training-${account}-${m.name}.pdf`.replace(/[^a-z0-9.-]+/gi, '-').toLowerCase()
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  if (!token) return null

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-dark"><FileCheck2 size={22} className="text-teal" /> Adhoc Training</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-mid">Lessons homes have generated from their own policies (Training → Modules → Generate lesson). Download a record of any lesson to see every question and exactly what it was built from: the home&rsquo;s own policies first, then the curated training seed, then example policies.</p>
        </div>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-neutral-mid" /></div>
        ) : data && (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-lg bg-neutral-light px-3 py-1.5 font-semibold text-neutral-dark">{data.totals.tenants} {data.totals.tenants === 1 ? 'home' : 'homes'}</span>
              <span className="rounded-lg bg-neutral-light px-3 py-1.5 font-semibold text-neutral-dark">{data.totals.lessons} lessons</span>
              <span className="rounded-lg bg-green-50 px-3 py-1.5 font-semibold text-green-700">{data.totals.recorded} with sources recorded</span>
            </div>

            {data.tenants.length === 0 && <p className="text-sm text-neutral-mid">No home has generated an ad-hoc lesson yet.</p>}

            <div className="space-y-3">
              {data.tenants.map(t => (
                <div key={t.tenant_id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <button onClick={() => setOpen(o => ({ ...o, [t.tenant_id]: !o[t.tenant_id] }))}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-light/40">
                    <span>
                      <span className="font-semibold text-neutral-dark">{t.name}</span>
                      <span className="ml-2 text-xs text-neutral-mid">{t.account_number} · {t.modules.length} {t.modules.length === 1 ? 'lesson' : 'lessons'} · last generated {when(t.last_generated_at)}</span>
                    </span>
                    <ChevronDown size={16} className={`shrink-0 text-neutral-mid transition-transform ${open[t.tenant_id] ? 'rotate-180' : ''}`} />
                  </button>
                  {open[t.tenant_id] && (
                    <div className="overflow-x-auto border-t border-gray-100">
                      <table className="w-full min-w-[980px] text-sm">
                        <thead className="bg-neutral-light text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                          <tr>
                            <th className="px-4 py-2.5">Lesson</th>
                            <th className="px-4 py-2.5">Content</th>
                            <th className="px-4 py-2.5">Sources</th>
                            <th className="px-4 py-2.5 whitespace-nowrap">From home policies</th>
                            <th className="px-4 py-2.5 whitespace-nowrap">Last generated</th>
                            <th className="px-4 py-2.5">Enrolled</th>
                            <th className="px-4 py-2.5 text-right">Record</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {t.modules.map(m => (
                            <tr key={m.id} className="align-top hover:bg-neutral-light/40">
                              <td className="px-4 py-3 font-medium text-neutral-dark">{m.name}<p className="text-xs font-normal text-neutral-mid">Question version {m.version}</p></td>
                              <td className="px-4 py-3 whitespace-nowrap text-neutral-dark">{m.sections} sections · {m.questions} questions</td>
                              <td className="px-4 py-3"><Sources m={m} /></td>
                              <td className="px-4 py-3"><HomeShare m={m} /></td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-mid">{when(m.generated_at)}</td>
                              <td className="px-4 py-3 text-neutral-dark">{m.enrolled}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => download(m, t.account_number)} disabled={busy === m.id}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-dark hover:border-teal hover:text-teal disabled:opacity-50">
                                  {busy === m.id ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />} PDF
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PlatformShell>
  )
}
