'use client'

// Platform-INTERNAL: policy gap analysis. Classify a client's policies into
// canonical types, then compare against peers of the same care setting to see
// which policies they're missing — a future "write & sell the gap" pipeline.
// Not exposed to tenants.

import { useEffect, useMemo, useState } from 'react'
import { createPlatformClient } from '@/lib/platform-api'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { PlatformShell } from '@/components/platform-shell'
import { SearchCheck, Loader2, Building2, Sparkles, CheckCircle2, AlertTriangle, EyeOff, Lock } from 'lucide-react'

type Client = { id: string; name: string; account_number: string; setting: string; setting_label: string; policies: number; classified: number }
type Report = { tenant: { id: string; name: string; setting: string; setting_label: string }; peer_count: number; unclassified: number; have: string[]; missing: Array<{ type: string; peer_count: number; peer_pct: number }> }

export default function PolicyGapsPage() {
  const token = usePlatformAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [selected, setSelected] = useState<string>('')
  const [report, setReport]   = useState<Report | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  function loadClients() {
    if (!token) return
    createPlatformClient(token).policyGaps.clients()
      .then(r => setClients(r.clients))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(loadClients, [token])

  const selectedClient = clients.find(c => c.id === selected)

  async function loadReport(id: string) {
    if (!token) return
    setReportLoading(true); setReport(null); setError('')
    try { setReport(await createPlatformClient(token).policyGaps.report(id)) }
    catch (e: any) { setError(e.message) }
    finally { setReportLoading(false) }
  }

  function pick(id: string) { setSelected(id); if (id) loadReport(id) }

  async function classify() {
    if (!token || !selected) return
    setClassifying(true); setError(''); setProgress(null)
    const api = createPlatformClient(token)
    try {
      // Loop the batched classifier until nothing remains.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const r = await api.policyGaps.classify(selected)
        setProgress({ done: r.total - r.remaining, total: r.total })
        if (r.remaining <= 0) break
      }
      loadClients()
      await loadReport(selected)
    } catch (e: any) { setError(e.message) }
    finally { setClassifying(false); setProgress(null) }
  }

  async function ignoreType(name: string, setting: string) {
    if (!token) return
    setReport(prev => prev ? { ...prev, missing: prev.missing.filter(m => m.type !== name) } : prev)
    await createPlatformClient(token).policyGaps.ignoreType(name, setting).catch(() => {})
  }

  // Group clients by setting for the picker.
  const grouped = useMemo(() => {
    const m = new Map<string, Client[]>()
    for (const c of clients) { if (!m.has(c.setting_label)) m.set(c.setting_label, []); m.get(c.setting_label)!.push(c) }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [clients])

  return (
    <PlatformShell>
      <div className="max-w-4xl">
        <div className="mb-2 flex items-center gap-2">
          <SearchCheck size={22} className="text-teal" />
          <h1 className="text-2xl font-bold text-neutral-dark">Policy gaps</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-dark px-2 py-0.5 text-[11px] font-medium text-white"><Lock size={10} /> Internal</span>
        </div>
        <p className="mb-5 max-w-3xl text-sm text-neutral-mid">
          Classify a client&rsquo;s policies into canonical types, then compare them against other clients of the <strong>same care setting</strong> to spot policies they&rsquo;re missing, a pipeline for policies we can write and sell. Internal only; no client&rsquo;s policy content is ever shown to another, we compare policy <em>types</em> and peer coverage only.
        </p>

        {error && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Client picker */}
        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
          <label className="mb-1.5 block text-xs font-medium text-neutral-mid">Choose a client</label>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={15} className="animate-spin" /> Loading clients…</div>
          ) : (
            <select value={selected} onChange={e => pick(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal">
              <option value="">— select a client —</option>
              {grouped.map(([label, cs]) => (
                <optgroup key={label} label={label}>
                  {cs.map(c => <option key={c.id} value={c.id}>{c.name} — {c.classified}/{c.policies} classified</option>)}
                </optgroup>
              ))}
            </select>
          )}
          {selectedClient && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-mid">
              <span className="flex items-center gap-1"><Building2 size={12} className="text-teal" /> {selectedClient.setting_label}</span>
              <span>{selectedClient.policies} active policies · {selectedClient.classified} classified</span>
              <button onClick={classify} disabled={classifying}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50">
                {classifying ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {classifying ? (progress ? `Classifying ${progress.done}/${progress.total}…` : 'Classifying…') : selectedClient.classified < selectedClient.policies ? 'Classify policies' : 'Re-check classification'}
              </button>
            </div>
          )}
        </div>

        {/* Report */}
        {reportLoading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={15} className="animate-spin" /> Building the gap report…</div>
        ) : report ? (
          <div className="space-y-5">
            <p className="text-sm text-neutral-mid">
              Comparing <strong className="text-neutral-dark">{report.tenant.name}</strong> against <strong>{report.peer_count}</strong> other {report.tenant.setting_label} client{report.peer_count === 1 ? '' : 's'} with classified policies.
              {report.unclassified > 0 && <span className="ml-1 text-amber-700">{report.unclassified} of this client&rsquo;s policies aren&rsquo;t classified yet, run &ldquo;Classify policies&rdquo; for a complete picture.</span>}
            </p>

            {report.peer_count === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
                No other clients of this setting have classified policies yet, so there&rsquo;s nothing to compare against. Classify a few more {report.tenant.setting_label} clients to build the peer catalogue.
              </div>
            )}

            {/* Missing */}
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                <AlertTriangle size={15} className="text-amber-500" />
                <h2 className="text-sm font-semibold text-neutral-dark">Missing policies ({report.missing.length})</h2>
                <span className="text-xs text-neutral-mid">policies peers have that this client doesn&rsquo;t</span>
              </div>
              {report.missing.length === 0 ? (
                <p className="px-5 py-6 text-sm text-neutral-mid">No gaps found, this client has every policy type their peers have.</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {report.missing.map(m => (
                    <li key={m.type} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="flex-1 text-sm font-medium text-neutral-dark">{m.type}</span>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">{m.peer_pct}% of peers have this</span>
                      <span className="text-[11px] text-neutral-mid">{m.peer_count}/{report.peer_count}</span>
                      <button onClick={() => ignoreType(m.type, report.tenant.setting)} title="Not a real gap — hide this type for this setting" className="text-neutral-mid hover:text-neutral-dark"><EyeOff size={13} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Have */}
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                <CheckCircle2 size={15} className="text-green-500" />
                <h2 className="text-sm font-semibold text-neutral-dark">Has ({report.have.length})</h2>
              </div>
              {report.have.length === 0 ? (
                <p className="px-5 py-6 text-sm text-neutral-mid">No classified policies yet, run &ldquo;Classify policies&rdquo; above.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 px-5 py-4">
                  {report.have.map(t => <span key={t} className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">{t}</span>)}
                </div>
              )}
            </div>
          </div>
        ) : selected ? null : (
          <p className="rounded-md border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-neutral-mid">Pick a client above to see which policies they&rsquo;re missing compared to their peers.</p>
        )}
      </div>
    </PlatformShell>
  )
}
