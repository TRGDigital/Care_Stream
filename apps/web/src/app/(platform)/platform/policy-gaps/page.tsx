'use client'

// Platform-INTERNAL: policy gap analysis. Classify a client's policies into
// canonical types, then compare against peers of the same care setting to see
// which policies they're missing — a future "write & sell the gap" pipeline.
// Not exposed to tenants.

import { useEffect, useMemo, useState } from 'react'
import { createPlatformClient, type MissingPolicyReport, type CatalogueGapItem, type GapVerification } from '@/lib/platform-api'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { PolicyOrders } from '@/components/platform/policy-orders'
import { PlatformShell } from '@/components/platform-shell'
import { Send, SearchCheck, Loader2, Building2, Sparkles, CheckCircle2, AlertTriangle, EyeOff, Lock, ChevronDown, ChevronRight, Grid3x3, User, Copy, Check } from 'lucide-react'

type Client = { id: string; name: string; account_number: string; setting: string; setting_label: string; policies: number; classified: number }
type Report = { tenant: { id: string; name: string; setting: string; setting_label: string }; peer_count: number; unclassified: number; have: string[]; missing: Array<{ type: string; peer_count: number; peer_pct: number }> }
type Matrix = { setting: string; setting_label: string; client_count: number; type_count: number; types: Array<{ type: string; have_count: number; have_pct: number; missing: Array<{ id: string; name: string }> }>; clients: Array<{ id: string; name: string; have: number; missing: number }> }

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
  const [view, setView] = useState<'client' | 'setting'>('client')
  const [matrixSetting, setMatrixSetting] = useState('')
  const [matrix, setMatrix] = useState<Matrix | null>(null)
  const [matrixLoading, setMatrixLoading] = useState(false)
  const [expandedType, setExpandedType] = useState<string | null>(null)
  // Missing against legislation, as opposed to missing against peers. Read is free; the run
  // costs Anthropic credit, so the two are kept apart on screen as well as in the API.
  const [missingReport, setMissingReport] = useState<MissingPolicyReport | null>(null)
  const [missingLoading, setMissingLoading] = useState(false)
  const [coverageRunning, setCoverageRunning] = useState(false)
  const [coverageProgress, setCoverageProgress] = useState<{ done: number; total: number } | null>(null)

  // Our policy catalogue judged against what the client holds (the second question: what we sell that they lack).
  const [catItems, setCatItems] = useState<CatalogueGapItem[] | null>(null)
  const [catMeta, setCatMeta] = useState<{ total: number; client_policies: number } | null>(null)
  const [verifs, setVerifs] = useState<Record<string, GapVerification | 'error'>>({})
  const [catRanAt, setCatRanAt] = useState<string | null>(null)
  const [catChanged, setCatChanged] = useState(false)
  const [catSaveFailed, setCatSaveFailed] = useState(false)
  const [catRunning, setCatRunning] = useState(false)
  const [catProgress, setCatProgress] = useState<{ done: number; total: number } | null>(null)
  const [pushing, setPushing] = useState(false)
  const [pushMsg, setPushMsg] = useState('')
  const [pushInfo, setPushInfo] = useState<{ pushed_at: string; count: number; dismissed: number } | null>(null)
  const [copied, setCopied] = useState<'' | 'law' | 'cat'>('')

  function loadClients() {
    if (!token) return
    createPlatformClient(token).policyGaps.clients()
      .then(r => setClients(r.clients))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(loadClients, [token])

  // Free: reads coverage already analysed. Never starts a run.
  async function loadMissing(id: string) {
    if (!token) return
    setMissingLoading(true); setMissingReport(null)
    try { setMissingReport(await createPlatformClient(token).policyGaps.missingPolicies(id)) }
    catch (e: any) { setError(e.message) }
    finally { setMissingLoading(false) }
  }

  // COSTS CREDIT. Reads every policy this client holds against every regulation in scope.
  // Batched, so the progress is honest rather than a spinner over an unknown wait.
  async function runCoverage() {
    if (!token || !selected) return
    if (!window.confirm(
      'This reads every policy this client holds against every regulation in scope, and spends Anthropic credit to do it.\n\nRun the analysis now?'
    )) return
    setCoverageRunning(true); setError('')
    try {
      const api = createPlatformClient(token)
      const { total } = await api.policyGaps.coverageStart(selected)
      setCoverageProgress({ done: 0, total })
      for (;;) {
        const p = await api.policyGaps.coverageBatch(selected)
        setCoverageProgress({ done: p.analysed, total: p.total })
        if (p.remaining <= 0) break
      }
      await loadMissing(selected)
    } catch (e: any) { setError(e.message) }
    finally { setCoverageRunning(false); setCoverageProgress(null) }
  }

  const selectedClient = clients.find(c => c.id === selected)

  // Copy as rich text (so bold and links survive pasting into an email) with a plain text fallback.
  async function copyRich(html: string, text: string, which: 'law' | 'cat') {
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })])
      } else await navigator.clipboard.writeText(text)
      setCopied(which); setTimeout(() => setCopied(''), 2500)
    } catch { setError('Could not copy. Select the list and copy it by hand.') }
  }
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const gbp = (p: number) => `£${p % 100 === 0 ? p / 100 : (p / 100).toFixed(2)}`

  // The legislation analysis as an email: what we found, in plain words, with the regulations as the evidence.
  function copyLegislation() {
    if (!missingReport?.analysed || !selectedClient) return
    const r = missingReport
    const when = r.analysed_at ? new Date(r.analysed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
    const head = `We checked ${selectedClient.name}'s ${selectedClient.policies} policies against the ${r.regulations_in_scope} regulations that apply to a ${selectedClient.setting_label.toLowerCase()}${when ? ` (analysis run ${when})` : ''}.`
    const summary = `${r.counts.covered} are fully covered, ${r.counts.partial} are covered in part (a policy exists but is missing elements the regulation expects) and ${r.counts.gap} have no policy behind them at all.`
    const lead = r.missing.length ? `Policies ${selectedClient.name} does not have:` : 'Every regulation in scope has a policy behind it.'
    const text = [head, summary, '', lead, ...r.missing.map((m, i) => `${i + 1}. ${m.title}${m.regulations.length ? `\n   Required by: ${m.regulations.map(x => x.official_name).join('; ')}` : ''}`)].join('\n')
    const html = `<p>${esc(head)}</p><p>${esc(summary)}</p><p><strong>${esc(lead)}</strong></p>` + (r.missing.length ? `<ol>${r.missing.map(m => `<li><strong>${esc(m.title)}</strong><br>Required by: ${esc(m.regulations.map(x => x.official_name).join('; '))}</li>`).join('')}</ol>` : '')
    copyRich(html, text, 'law')
  }

  // The catalogue comparison as an email: what we can write for them, with prices and links.
  function copyCatalogue() {
    if (!catItems || !selectedClient) return
    const miss = catItems.filter(i => !i.held && (verifs[i.slug] as GapVerification | undefined)?.real_gap === true)
    const head = `We compared the ${catMeta?.client_policies ?? selectedClient.policies} policies ${selectedClient.name} holds with the ${catItems.length} CareStream policies written for a ${selectedClient.setting_label.toLowerCase()}. ${miss.length} are not covered by any of your policies.`
    const url = (slug: string) => `https://www.carestreamai.com/care-policies/${slug}`
    const text = [head, '', ...miss.map((m, i) => `${i + 1}. ${m.title}: ${m.description}\n   ${url(m.slug)}`)].join('\n')
    const html = `<p>${esc(head)}</p><ol>${miss.map(m => `<li><strong><a href="${url(m.slug)}">${esc(m.title)}</a></strong><br>${esc(m.description)}</li>`).join('')}</ol>`
    copyRich(html, text, 'cat')
  }

  // Push the confirmed gaps to the client's /policies page. Replaces whatever was pushed before.
  async function pushToClient() {
    if (!token || !selected || !selectedClient || !catItems) return
    const slugs = catItems.filter(i => !i.held && (verifs[i.slug] as GapVerification | undefined)?.real_gap === true).map(i => i.slug)
    if (!slugs.length) return
    if (!window.confirm(`Show these ${slugs.length} missing policies to ${selectedClient.name} at the top of their Policies page, and email their admins to say so? This replaces anything you pushed before. They can dismiss each one.`)) return
    setPushing(true); setError('')
    try { const c = createPlatformClient(token); const r = await c.policyGaps.pushGaps(selected, slugs); setPushMsg(r.emailed ? `Pushed, and ${r.emailed} admin${r.emailed === 1 ? '' : 's'} emailed.` : 'Pushed. No admin was emailed (test account or no admin email).'); setPushInfo(await c.policyGaps.getPush(selected)) }
    catch (e: any) { setError(e?.message ?? 'Could not push to the client.') }
    finally { setPushing(false) }
  }
  async function removePush() {
    if (!token || !selected || !window.confirm('Remove the pushed list from this client\'s Policies page?')) return
    setPushing(true)
    try { await createPlatformClient(token).policyGaps.removePush(selected); setPushInfo(null) } catch (e: any) { setError(e?.message ?? 'Could not remove.') } finally { setPushing(false) }
  }

  // COSTS a little credit (Haiku, titles only): one slice of the catalogue per call, accumulated here.
  async function runCatalogue() {
    if (!token || !selected) return
    if (!window.confirm('Step 1 compares every CareStream policy that suits this service with the names of the policies this client holds. Step 2 then reads the client\'s own policy text for each policy that looks missing, to confirm it is a real gap (about 15 reads). Both use Anthropic credit.\n\nRun it now?')) return
    setCatRunning(true); setError(''); setCatItems([]); setCatProgress(null); setVerifs({})
    try {
      const api = createPlatformClient(token)
      let offset = 0; const all: CatalogueGapItem[] = []; let clientPolicies = 0
      for (;;) {
        const b = await api.policyGaps.catalogueGapsBatch(selected, offset)
        all.push(...b.items); setCatItems([...all]); clientPolicies = b.client_policies; setCatMeta({ total: b.total, client_policies: b.client_policies })
        setCatProgress({ done: all.length, total: b.total })
        if (b.next_offset === null) break
        offset = b.next_offset
      }
      // Step 2: read their actual policy text for every apparent gap, three at a time.
      const todo = all.filter(i => !i.held)
      let done = 0; setCatProgress({ done: 0, total: todo.length })
      let idx = 0; const finalV: Record<string, GapVerification | 'error'> = {}
      await Promise.all(Array.from({ length: 3 }, async () => {
        while (idx < todo.length) {
          const it = todo[idx++]
          try { const v = await api.policyGaps.verifyGap(selected, it.slug); finalV[it.slug] = v; setVerifs(prev => ({ ...prev, [it.slug]: v })) }
          catch { finalV[it.slug] = 'error'; setVerifs(prev => ({ ...prev, [it.slug]: 'error' })) }
          done++; setCatProgress({ done, total: todo.length })
        }
      }))
      // Save the finished result so it is here next time the page is opened.
      const total0 = all.length
      try {
        await api.policyGaps.saveCatalogue(selected, { items: all, meta: { total: total0, client_policies: clientPolicies }, verifs: finalV })
        setCatRanAt(new Date().toISOString()); setCatChanged(false); setCatSaveFailed(false)
      } catch { setCatSaveFailed(true) }
    } catch (e: any) { setError(e.message) }
    finally { setCatRunning(false); setCatProgress(null) }
  }

  async function loadReport(id: string) {
    if (!token) return
    setReportLoading(true); setReport(null); setError('')
    try { setReport(await createPlatformClient(token).policyGaps.report(id)) }
    catch (e: any) { setError(e.message) }
    finally { setReportLoading(false) }
  }

  async function loadSavedCatalogue(id: string) {
    if (!token) return
    try {
      const saved = await createPlatformClient(token).policyGaps.getSavedCatalogue(id)
      if (!saved?.payload) return
      setCatItems(saved.payload.items ?? null); setCatMeta(saved.payload.meta ?? null); setVerifs(saved.payload.verifs ?? {})
      setCatRanAt(saved.ran_at); setCatChanged(!!saved.changed_since)
    } catch { /* nothing saved yet */ }
  }

  function pick(id: string) { setSelected(id); setCatItems(null); setCatMeta(null); setVerifs({}); setCatRanAt(null); setCatChanged(false); setPushInfo(null); if (id) { createPlatformClient(token!).policyGaps.getPush(id).then(setPushInfo).catch(() => {}); loadReport(id); loadMissing(id); loadSavedCatalogue(id) } }

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

  // Distinct settings that have clients (for the matrix selector).
  const settings = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of clients) m.set(c.setting, c.setting_label)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [clients])

  async function loadMatrix(setting: string) {
    if (!token || !setting) { setMatrix(null); return }
    setMatrixLoading(true); setMatrix(null); setError(''); setExpandedType(null)
    try { setMatrix(await createPlatformClient(token).policyGaps.matrix(setting)) }
    catch (e: any) { setError(e.message) }
    finally { setMatrixLoading(false) }
  }
  function pickSetting(setting: string) { setMatrixSetting(setting); loadMatrix(setting) }

  return (
    <PlatformShell>
      <div className="w-full">
        <div className="mb-2 flex items-center gap-2">
          <SearchCheck size={22} className="text-teal" />
          <h1 className="text-2xl font-bold text-neutral-dark">Policy gaps</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-dark px-2 py-0.5 text-[11px] font-medium text-white"><Lock size={10} /> Internal</span>
        </div>
        <p className="mb-5 text-sm text-neutral-mid">
          Which policies a client <strong>does not have at all</strong>, so we know what we can write and sell them. Judged against the legislation in scope for their service, with a weaker peer comparison below it. Gaps inside the policies they already hold are their own work and live on their gaps page, not here. Internal only; no client&rsquo;s policy content is ever shown to another.
        </p>

        {error && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* View toggle */}
        <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-sm font-medium">
          <button onClick={() => setView('client')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${view === 'client' ? 'bg-white text-neutral-dark shadow-sm' : 'text-neutral-mid'}`}><User size={13} /> Per client</button>
          <button onClick={() => setView('setting')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${view === 'setting' ? 'bg-white text-neutral-dark shadow-sm' : 'text-neutral-mid'}`}><Grid3x3 size={13} /> By setting</button>
        </div>

        {view === 'setting' ? (
          <SettingMatrix
            settings={settings}
            value={matrixSetting}
            onPick={pickSetting}
            matrix={matrix}
            loading={matrixLoading}
            expandedType={expandedType}
            setExpandedType={setExpandedType}
            onIgnore={(name) => { ignoreType(name, matrix?.setting ?? ''); setMatrix(prev => prev ? { ...prev, types: prev.types.filter(t => t.type !== name) } : prev) }}
            onOpenClient={(id) => { setView('client'); pick(id) }}
          />
        ) : (<>
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
                  {/* CS number first: several tenants share a name (four are some form of
                      "Ferndale Nursing Home"), so the account number is the only thing that
                      tells them apart at a glance. */}
                  {cs.map(c => <option key={c.id} value={c.id}>{c.account_number} · {c.name} — {c.classified}/{c.policies} classified</option>)}
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

        {/* Orders from SUBSCRIBED clients only. Shop buyers without a full licence
            (policies_only accounts) have their own queue on the Paid Policies tab —
            two different customer bases, never mixed. */}
        <p className="mb-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs text-blue-900">
          <strong>This queue is full CareStream clients</strong> buying policies from their own gaps page.
          Standalone shop customers (policies-only accounts, no CareStream licence) are on the{' '}
          <a href="/platform/paid-policies" className="font-semibold underline">Paid Policies</a> tab.
        </p>
        {token && <PolicyOrders token={token} scope="subscribers" />}

        {/* Missing against legislation, as opposed to missing against peers.
            The peer report below answers "what do similar homes have that this one does not".
            This answers "what does the law require that this one has not written", which is
            the question that found Gas Safety, Electrical Safety and Asbestos at Ferndale
            when no peer held them either. */}
        {selectedClient && (
          <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-neutral-dark">Missing against legislation</h2>
                <p className="mt-0.5 text-xs text-neutral-mid">
                  {missingReport?.analysed
                    ? `${missingReport.regulations_analysed} of ${missingReport.regulations_in_scope} regulations analysed${missingReport.analysed_at ? ` · last run ${new Date(missingReport.analysed_at).toLocaleDateString('en-GB')}` : ''}`
                    : 'Not analysed yet for this client.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
              {missingReport?.analysed && (
                <button onClick={copyLegislation}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal"
                  title="Copy this analysis as an email: what we found, and the regulation behind each missing policy.">
                  {copied === 'law' ? <><Check size={12} className="text-green-600" /> Copied</> : <><Copy size={12} /> Copy analysis for an email</>}
                </button>
              )}
              <button onClick={runCoverage} disabled={coverageRunning}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                title="Reads every policy against every regulation in scope. Spends Anthropic credit.">
                {coverageRunning ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {coverageRunning
                  ? (coverageProgress ? `Analysing ${coverageProgress.done}/${coverageProgress.total}…` : 'Analysing…')
                  : missingReport?.analysed ? 'Re-run analysis (uses credit)' : 'Run analysis (uses credit)'}
              </button>
              </div>
            </div>

            {missingLoading ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Reading the analysis…</p>
            ) : !missingReport?.analysed ? (
              <p className="mt-3 rounded-lg bg-neutral-light px-3 py-2.5 text-sm text-neutral-mid">
                Nothing has been analysed for this client yet, which is not the same as nothing being missing. Run the analysis to find out.
              </p>
            ) : (
              <>
                {/* Two different things, and conflating them cost Ferndale eleven real gaps.
                    Unusable means the verdict cannot be believed, so say so loudly. Dated
                    means a policy changed after the run, which makes one entry possibly
                    answered, not the list wrong. */}
                {missingReport.stale && (
                  missingReport.usable === false ? (
                    <p className="mt-3 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-900">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                      <span><strong>Do not act on this list.</strong> {missingReport.stale_reason}</span>
                    </p>
                  ) : (
                    <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                      <span>{missingReport.stale_reason}</span>
                    </p>
                  )
                )}
                <p className="mt-3 text-xs text-neutral-mid">
                  Read against {missingReport.regulations_in_scope} regulations in scope for this service.
                  Gaps inside the policies they already hold are their own work and are not shown here;
                  they are on the client&rsquo;s own gaps page.
                </p>

                {missingReport.missing.length === 0 ? (
                  <p className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-900">
                    <CheckCircle2 size={15} /> Every regulation in scope has a policy behind it. Nothing to write for this client.
                  </p>
                ) : (
                  <>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-mid">
                      {missingReport.missing.length} {missingReport.missing.length === 1 ? 'policy' : 'policies'} they do not have
                    </p>
                    <ul className={`mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200 ${missingReport.usable === false ? 'opacity-50' : ''}`}>
                      {missingReport.missing.map(m => (
                        <li key={m.title} className="px-3 py-2.5">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-sm font-medium text-neutral-dark">{m.title}</span>
                            <span className="text-xs text-neutral-mid">
                              {m.regulations.length === 1 ? '1 regulation' : `${m.regulations.length} regulations`}
                            </span>
                          </div>
                          {/* Naming the regulations matters: it is the evidence for charging
                              for this policy, and the answer when a client asks why. */}
                          <p className="mt-1 text-xs text-neutral-mid">
                            {m.regulations.map(r => r.official_name).join(' · ')}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Missing against our catalogue: what we sell that this client does not appear to hold. The legislation check
            above cannot name most of these (they sit under regulations a home already partly covers), so this asks
            the product question directly. */}
        {selectedClient && (
          <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-neutral-dark">Missing against our policy catalogue</h2>
                <p className="mt-0.5 text-xs text-neutral-mid">
                  {catRanAt && <span className="mr-1 font-medium text-neutral-dark">Last run {new Date(catRanAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.{catChanged ? ' They have added policies since, so re-run for a current picture.' : ''}</span>}
                  {pushMsg && <span className="mr-1 font-medium text-green-700">{pushMsg}</span>}
                  {pushInfo && <span className="mr-1 text-teal">On the client&rsquo;s Policies page since {new Date(pushInfo.pushed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: {pushInfo.count} pushed{pushInfo.dismissed ? `, ${pushInfo.dismissed} dismissed by them` : ''}. <button onClick={removePush} className="underline hover:no-underline">Remove</button>.</span>}
                  {catSaveFailed && <span className="mr-1 text-red-700">Could not save this result (the saved results table may not exist yet).</span>}
                  {catItems && catItems.length
                    ? (() => { const notHeld = catItems.filter(i => !i.held); const vs = notHeld.map(i => verifs[i.slug]).filter((v): v is GapVerification => !!v && v !== 'error'); const real = vs.filter(v => v.real_gap).length
                        return `${notHeld.length} looked missing by name. After reading their policy text: ${real} confirmed real gaps, ${vs.length - real} already covered, ${notHeld.length - vs.length} not yet checked.` })()
                    : 'Compares every CareStream policy that suits this service with the policies they hold, by subject. Not run yet.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {catItems && catItems.some(i => (verifs[i.slug] as GapVerification | undefined)?.real_gap) && (
                  <button onClick={copyCatalogue} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal"
                    title="Copy only the confirmed gaps as an email, with prices and links.">
                    {copied === 'cat' ? <><Check size={12} className="text-green-600" /> Copied</> : <><Copy size={12} /> Copy for an email</>}
                  </button>
                )}
                {catItems && catItems.some(i => (verifs[i.slug] as GapVerification | undefined)?.real_gap) && (
                  <button onClick={pushToClient} disabled={pushing || catRunning}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/5 px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal/10 disabled:opacity-50"
                    title="Show the confirmed gaps at the top of this client's Policies page, with prices and links.">
                    {pushing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Push to client
                  </button>
                )}
                <button onClick={runCatalogue} disabled={catRunning}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                  title="Judges each CareStream policy against the names and types of the policies they hold. Uses a small amount of Anthropic credit.">
                  {catRunning ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {catRunning ? (catProgress ? `Reading policies ${catProgress.done}/${catProgress.total}…` : 'Comparing names…') : catItems ? 'Re-run comparison (uses credit)' : 'Run comparison (uses credit)'}
                </button>
              </div>
            </div>
            {catItems && catItems.length > 0 && (
              <>
                <p className="mt-3 text-xs text-neutral-mid">
                  Step 1 judges by policy names; step 2 reads their policy text against what a policy on the subject must contain, and only items that survive are called gaps. Open “Why” on any item to see the evidence.
                </p>
                {(() => {
                  const notHeld = catItems.filter(i => !i.held)
                  const vOf = (i: CatalogueGapItem) => verifs[i.slug]
                  const confirmed = notHeld.filter(i => (vOf(i) as GapVerification | undefined)?.real_gap === true)
                  const covered = notHeld.filter(i => { const v = vOf(i); return v && v !== 'error' && !v.real_gap })
                  const pending = notHeld.filter(i => !vOf(i) || vOf(i) === 'error')
                  const label: Record<string, string> = { covered: 'Covered by a dedicated policy', covered_elsewhere: 'Covered inside another policy', needs_review: 'Borderline: check before pitching', mention_only: 'Only a passing mention', not_found: 'Nothing found' }
                  const row = (i: CatalogueGapItem, tone: 'gap' | 'ok' | 'wait') => {
                    const v = vOf(i) as GapVerification | undefined
                    return (
                      <li key={i.slug} className="px-3 py-2.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="min-w-0 flex-1">
                            <a href={`/care-policies/${i.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-neutral-dark hover:text-teal">{i.title}</a>
                            {i.is_new && <span className="ml-2 rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-bold uppercase text-yellow-950">New</span>}
                            {v && v !== ('error' as any) && <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone === 'gap' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{label[v.verdict]}</span>}
                            {tone === 'wait' && <span className="ml-2 text-[10px] text-neutral-mid">{vOf(i) === 'error' ? 'Check failed, re-run' : 'Checking their policy text…'}</span>}
                          </span>
                          <span className="text-sm font-semibold text-neutral-dark">{gbp(i.price_pence)}</span>
                        </div>
                        {v && v !== ('error' as any) && (
                          <details className="mt-1 text-xs text-neutral-mid">
                            <summary className="cursor-pointer">Why: {v.reasoning || 'see evidence'}</summary>
                            <ul className="mt-1.5 space-y-1 rounded-md bg-gray-50 p-2">
                              {v.elements.map((e, k) => (
                                <li key={k}>
                                  <span className={e.found ? 'text-green-700' : 'text-red-700'}>{e.found ? '✓' : '✗'}</span> <strong className="text-neutral-dark">{e.element}</strong>
                                  {e.found && e.quote && <span> in <em>{e.policy}</em>: “{e.quote}”</span>}
                                </li>
                              ))}
                              {v.elements.length === 0 && <li>No relevant passages in their library.</li>}
                            </ul>
                          </details>
                        )}
                      </li>
                    )
                  }
                  return (
                    <>
                      <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-red-700">Confirmed gaps ({confirmed.length})</h3>
                      <p className="text-xs text-neutral-mid">Their own policy text was read. Nothing in it deals with this subject in substance. These are the ones to put to the client.</p>
                      <ul className="mt-1.5 divide-y divide-gray-100 rounded-lg border border-gray-200">{confirmed.map(i => row(i, 'gap'))}{confirmed.length === 0 && <li className="px-3 py-2.5 text-xs text-neutral-mid">None confirmed.</li>}</ul>
                      {pending.length > 0 && (<><h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Not yet checked ({pending.length})</h3><ul className="mt-1.5 divide-y divide-gray-100 rounded-lg border border-gray-200">{pending.map(i => row(i, 'wait'))}</ul></>)}
                      {covered.length > 0 && (<><h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-green-700">Already covered, or borderline ({covered.length}). Do not pitch these without checking.</h3><ul className="mt-1.5 divide-y divide-gray-100 rounded-lg border border-gray-200">{covered.map(i => row(i, 'ok'))}</ul></>)}
                    </>
                  )
                })()}
                {catItems.some(i => i.held) && (
                  <details className="mt-3 text-xs text-neutral-mid">
                    <summary className="cursor-pointer">{catItems.filter(i => i.held).length} policies they already hold (and which of theirs covers it)</summary>
                    <ul className="mt-2 space-y-1">
                      {catItems.filter(i => i.held).map(i => <li key={i.slug}><strong className="text-neutral-dark">{i.title}</strong> &larr; {i.held_by ?? 'a policy in their library'}</li>)}
                    </ul>
                  </details>
                )}
              </>
            )}
          </div>
        )}

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
                <h2 className="text-sm font-semibold text-neutral-dark">Also missing compared with similar homes ({report.missing.length})</h2>
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

          </div>
        ) : selected ? null : (
          <p className="rounded-md border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-neutral-mid">Pick a client above to see which policies they do not have.</p>
        )}
        </>)}
      </div>
    </PlatformShell>
  )
}

// ─── Setting-wide matrix (the sales pipeline view) ────────────────────────────
function SettingMatrix({ settings, value, onPick, matrix, loading, expandedType, setExpandedType, onIgnore, onOpenClient }: {
  settings: Array<[string, string]>
  value: string
  onPick: (setting: string) => void
  matrix: Matrix | null
  loading: boolean
  expandedType: string | null
  setExpandedType: (t: string | null) => void
  onIgnore: (name: string) => void
  onOpenClient: (id: string) => void
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="mb-1.5 block text-xs font-medium text-neutral-mid">Choose a care setting</label>
        <select value={value} onChange={e => onPick(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal">
          <option value="">— select a setting —</option>
          {settings.map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={15} className="animate-spin" /> Building the matrix…</div>
      ) : !matrix ? (
        <p className="rounded-md border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-neutral-mid">Pick a setting to see, across every client, which policies each is missing.</p>
      ) : matrix.client_count === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">No {matrix.setting_label} clients have classified policies yet. Classify a few clients (Per client tab) to build the picture.</div>
      ) : (
        <>
          <p className="text-sm text-neutral-mid">
            <strong className="text-neutral-dark">{matrix.setting_label}</strong> · {matrix.client_count} assessable client{matrix.client_count === 1 ? '' : 's'} · {matrix.type_count} policy types in the peer catalogue.
          </p>

          {/* Policy types → who's missing (the sales list) */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3"><h2 className="text-sm font-semibold text-neutral-dark">Policies &amp; who&rsquo;s missing them</h2></div>
            <ul className="divide-y divide-gray-50">
              {matrix.types.map(t => {
                const open = expandedType === t.type
                return (
                  <li key={t.type}>
                    <div className="flex items-center gap-3 px-5 py-2.5">
                      <button onClick={() => setExpandedType(open ? null : t.type)} className="flex flex-1 items-center gap-2 text-left">
                        {t.missing.length > 0 ? (open ? <ChevronDown size={14} className="text-neutral-mid" /> : <ChevronRight size={14} className="text-neutral-mid" />) : <span className="w-3.5" />}
                        <span className="text-sm font-medium text-neutral-dark">{t.type}</span>
                      </button>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-teal" style={{ width: `${t.have_pct}%` }} /></div>
                      <span className="w-10 text-right text-xs text-neutral-mid">{t.have_pct}%</span>
                      <span className={`w-24 text-right text-xs font-medium ${t.missing.length ? 'text-amber-700' : 'text-green-600'}`}>{t.missing.length ? `${t.missing.length} missing` : 'all have it'}</span>
                      <button onClick={() => onIgnore(t.type)} title="Not a real policy type — hide it" className="text-neutral-mid hover:text-neutral-dark"><EyeOff size={13} /></button>
                    </div>
                    {open && t.missing.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 bg-neutral-light/40 px-5 py-2.5">
                        {t.missing.map(c => (
                          <button key={c.id} onClick={() => onOpenClient(c.id)} className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal">{c.name}</button>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Clients ranked by number of gaps */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3"><h2 className="text-sm font-semibold text-neutral-dark">Clients by gap count</h2></div>
            <ul className="divide-y divide-gray-50">
              {matrix.clients.map(c => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-2.5">
                  <button onClick={() => onOpenClient(c.id)} className="flex-1 text-left text-sm font-medium text-neutral-dark hover:text-teal">{c.name}</button>
                  <span className="text-xs text-neutral-mid">{c.have} policies</span>
                  <span className={`w-24 text-right text-xs font-medium ${c.missing ? 'text-amber-700' : 'text-green-600'}`}>{c.missing ? `${c.missing} gap${c.missing === 1 ? '' : 's'}` : 'no gaps'}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
