'use client'

// Platform Console — standard annual-training library. Generate (seed-grounded),
// review/edit and publish standard modules that every tenant can assign for free.

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, platformAssetUrl } from '@/lib/platform-api'
import { SectionsEditor } from '@/components/training-sections-editor'
import { ActivitiesToolbar } from '@/components/platform/activities-editor'
import { CourseSpecification } from '@/components/course-specification'
import { CpdSubmissionSheet, CPD_DOCS, type CpdDoc } from '@/components/training/cpd-submission-pack'
import { ModulePreviewPlayer } from '@/components/training/module-preview-player'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, Sparkles, CheckCircle2, Circle, FileText, Pencil, Plus, Trash2, RefreshCw, ChevronLeft, ShieldAlert, Image as ImageIcon, Calendar, History, AlertTriangle, ShieldCheck, Share2, Wand2, Eye, Info, ChevronDown, ClipboardCheck } from 'lucide-react'

const FREQ_LABEL: Record<string, string> = { annual: 'Annual', biennial: 'Every 2 years', triennial: 'Every 3 years', once: 'One-off', adhoc: 'Ad-hoc' }
const FREQS = ['annual', 'biennial', 'triennial', 'once', 'adhoc']
const INPUT = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

function fmtDate(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '—' }
}

// Standard modules are re-approved on a 6-monthly cycle. A module's renewal falls
// due 6 months after its last approval (approved_at).
const RENEWAL_MONTHS = 6
const RENEWAL_HORIZON_DAYS = 60 // count renewals coming up within this window (or overdue)
function renewalDueMs(approvedAt: string): number {
  const d = new Date(approvedAt)
  d.setMonth(d.getMonth() + RENEWAL_MONTHS)
  return d.getTime()
}

function StatBox({ label, value, sub, tone, Icon }: {
  label: string; value: number; sub?: string
  tone: 'green' | 'amber' | 'red' | 'gray'; Icon: React.ElementType
}) {
  const accent = { green: 'text-green-600', amber: 'text-amber-600', red: 'text-red-600', gray: 'text-neutral-dark' }[tone]
  const ring   = { green: 'border-green-200', amber: 'border-amber-200', red: 'border-red-200', gray: 'border-gray-200' }[tone]
  return (
    <div className={`rounded-xl border ${ring} bg-white p-4`}>
      <div className="mb-1.5 flex items-center gap-1.5 text-neutral-mid">
        <Icon size={13} className={accent} />
        <p className="text-xs font-medium leading-tight">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-neutral-mid">{sub}</p>}
    </div>
  )
}

export default function StandardTrainingPage() {
  const token = usePlatformAuth()
  const api = token ? createPlatformClient(token) : null
  const [groups, setGroups] = useState<Record<string, string>>({})
  const [settings, setSettings] = useState<{ key: string; label: string }[]>([])
  const [activeSetting, setActiveSetting] = useState<string | null>(null) // null = the universal "All settings" base; 'ANNUAL' = the CPD set
  const [bulkOpen, setBulkOpen] = useState(false)
  // Work-state filter: the library is ~98 rows, so surface what still needs doing.
  const [buildFilter, setBuildFilter] = useState<'all' | 'todo' | 'draft' | 'published'>('all')
  // CPD accreditation submission pack — opened per CPD course, printed to PDF.
  const [packFor, setPackFor] = useState<any | null>(null)
  const [packDoc, setPackDoc] = useState<CpdDoc | null>(null)
  const [packLoading, setPackLoading] = useState<string | null>(null)
  const [checklistBusy, setChecklistBusy] = useState(false)
  useEffect(() => {
    const applyFromUrl = () => {
      if (window.location.hash === '#annual' || new URLSearchParams(window.location.search).get('tab') === 'annual') {
        setActiveSetting('ANNUAL')
      }
    }
    applyFromUrl()
    window.addEventListener('hashchange', applyFromUrl)
    return () => window.removeEventListener('hashchange', applyFromUrl)
  }, [])
  const [topics, setTopics] = useState<any[]>([])
  const [cpdModules, setCpdModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [neutralising, setNeutralising] = useState<string | null>(null) // a module id, or 'all'
  const [neutProgress, setNeutProgress] = useState<{ done: number; total: number } | null>(null)
  const [preview, setPreview] = useState<any | null>(null)       // normalised module for the staff-view player
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)

  // Open the module exactly as tenant staff see it (stepped lesson player with
  // scenarios, quick checks, glossary, references and the assessment).
  async function openPreview(moduleId: string) {
    if (!api || previewLoading) return
    setPreviewLoading(moduleId)
    try {
      const { module: raw } = await api.standardTraining.moduleFull(moduleId)
      const lc = (raw.learning_content ?? {}) as any
      const img = (key?: string | null) => key ? `/public/training/image/${String(key).split('/').pop()}` : null
      setPreview({
        name: raw.name, frequency: raw.frequency ?? null, pass_mark: raw.pass_mark ?? null,
        requires_practical: !!raw.requires_practical, duration_minutes: raw.duration_minutes ?? null,
        summary: typeof lc.summary === 'string' ? lc.summary : null,
        outcomes: Array.isArray(lc.outcomes) ? lc.outcomes : [],
        key_points: Array.isArray(lc.key_points) ? lc.key_points : [],
        sections: (Array.isArray(lc.sections) ? lc.sections : []).map((s: any) => ({
          heading: String(s?.heading ?? ''), body: String(s?.body ?? ''), image_url: img(s?.image_key),
          scenario: s?.scenario ?? null,
          check: s?.check ? { question: String(s.check.question ?? ''), options: Array.isArray(s.check.options) ? s.check.options : [], correct: typeof s.check.correct === 'number' ? s.check.correct : null } : null,
        })),
        questions: (Array.isArray(raw.questions) ? raw.questions : []).map((q: any) => ({ text: String(q?.text ?? ''), options: Array.isArray(q?.options) ? q.options : [], correct: typeof q?.correct === 'number' ? q.correct : null, explanation: q?.explanation ?? null })),
        standards: (Array.isArray(raw.standards) ? raw.standards : []).map((s: any) => s?.label).filter(Boolean),
        illustration_url: raw.illustration_url ?? null,
        learning_content: lc,
      })
    } catch (e: any) { alert(e?.message ?? 'Could not load the module preview.') }
    finally { setPreviewLoading(null) }
  }

  function load() {
    if (!api) return
    setLoading(true)
    api.standardTraining.catalogue().then(d => { setGroups(d.groups); setTopics(d.topics); setCpdModules(d.cpd_modules ?? []); setSettings(d.settings ?? []) }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fill the observed competency checklist on practical modules in the current tab.
  // Previews first so the counts are seen before anything is written.
  async function applyChecklists() {
    if (!api || checklistBusy) return
    const scope: 'universal' | 'setting' | 'all' =
      activeSetting === 'ANNUAL' ? 'all' : activeSetting ? 'setting' : 'universal'
    const careSetting = scope === 'setting' ? activeSetting! : undefined
    setChecklistBusy(true)
    try {
      const pre = await api.standardTraining.applyPracticalChecklists({ scope, care_setting: careSetting, dry_run: true })
      if (!pre.updated.length) {
        const parts = [`No practical modules in this tab need a checklist.`]
        if (pre.skipped.length) parts.push(`${pre.skipped.length} already have one.`)
        if (pre.no_checklist_available.length) parts.push(`No curated checklist yet for: ${pre.no_checklist_available.join(', ')}.`)
        alert(parts.join(' '))
        return
      }
      const lines = pre.updated.map(u => `• ${u.name} (${u.items} items)`).join('\n')
      const extra = pre.no_checklist_available.length
        ? `\n\nNo curated checklist yet for: ${pre.no_checklist_available.join(', ')}`
        : ''
      if (!confirm(`Add an observed competency checklist to ${pre.updated.length} module(s)?\n\n${lines}${extra}\n\nThe lesson, questions and approval state are not changed.`)) return
      const r = await api.standardTraining.applyPracticalChecklists({ scope, care_setting: careSetting })
      load()
      alert(`Done — checklists added to ${r.updated.length} module(s).${r.skipped.length ? ` ${r.skipped.length} skipped.` : ''}`)
    } catch (e: any) {
      alert(e?.message ?? 'Could not apply the checklists.')
    } finally { setChecklistBusy(false) }
  }

  // The submission documents are generated from the course's own content, so the
  // full module is fetched before opening one.
  async function openPack(moduleId: string, doc: CpdDoc) {
    if (!api || packLoading) return
    setPackLoading(`${doc}:${moduleId}`)
    try { const { module } = await api.standardTraining.moduleFull(moduleId); setPackFor(module); setPackDoc(doc) }
    catch (e: any) { alert(e?.message ?? 'Could not open the document.') }
    finally { setPackLoading(null) }
  }

  // Duplicate a published pre-built module onto the CPD shelf as a draft copy.
  async function createCpdCopy(moduleId: string, name: string) {
    if (!api || busy) return
    if (!confirm(`Create a CPD copy of “${name}”?\n\nThe pre-built module keeps serving ad-hoc training unchanged. The copy lands on the CPD Approved shelf as a draft, ready to be deepened (more sections, more questions, interactive elements) and taken to CPD.`)) return
    setBusy(moduleId)
    try {
      const { module } = await api.standardTraining.createCpdCopy(moduleId)
      load()
      setActiveSetting('ANNUAL')
      setReviewId(module.id)
    } catch (e: any) {
      alert(e?.message ?? 'Could not create the CPD copy.')
    } finally { setBusy(null) }
  }

  async function generate(topicId: string) {
    if (!api || busy) return
    setBusy(topicId)
    try { const { module } = await api.standardTraining.generate(topicId); load(); setReviewId(module.id) }
    catch (e: any) { alert(e?.message ?? 'Generation failed — the AI may have timed out. Please try again.') } finally { setBusy(null) }
  }

  // Rewrite a module's wording to setting-neutral voice (images + answers kept).
  async function neutralise(moduleId: string) {
    if (!api || neutralising) return
    setNeutralising(moduleId)
    try { await api.standardTraining.neutralise(moduleId); load() }
    catch (e: any) { alert(e?.message ?? 'Neutralise failed — please try again.') }
    finally { setNeutralising(null) }
  }

  // Bulk-neutralise every universal (cross-over) module, one at a time with progress.
  async function neutraliseAll() {
    if (!api || neutralising) return
    const ids = topics.filter(t => !t.care_setting && t.module).map(t => t.module.id)
    if (!ids.length) return
    if (!confirm(`Neutralise the voice of ${ids.length} universal module(s)? Their wording is rewritten to be setting-neutral — images and answers are kept — and they are un-published for re-approval.`)) return
    setNeutralising('all'); setNeutProgress({ done: 0, total: ids.length })
    for (let i = 0; i < ids.length; i++) {
      try { await api.standardTraining.neutralise(ids[i]) } catch { /* skip failures, continue */ }
      setNeutProgress({ done: i + 1, total: ids.length })
    }
    setNeutralising(null); setNeutProgress(null); load()
  }

  if (reviewId && token) return (
    <PlatformShell>
      <Review token={token} id={reviewId} onBack={() => { load(); setReviewId(null) }} />
    </PlatformShell>
  )

  if (preview) return (
    <PlatformShell>
      <ModulePreviewPlayer m={preview} name={preview.name} onBack={() => setPreview(null)} />
    </PlatformShell>
  )

  // Universal (care_setting = null) topics form the cross-over base shown under every
  // setting; a setting tab shows only that setting's own topics. Count both for tabs.
  const settingCount = (key: string | null) => key === 'ANNUAL' ? cpdModules.length : topics.filter(t => key ? t.care_setting === key : !t.care_setting).length

  // Library-wide governance summary (across every setting).
  const allModules = topics.map(t => t.module).filter(Boolean) as any[]
  const approvedCount = allModules.filter(m => m.approved).length
  const outstandingCount = allModules.filter(m => !m.approved).length
  const notGeneratedCount = topics.filter(t => !t.module).length
  const renewalHorizonMs = Date.now() + RENEWAL_HORIZON_DAYS * 86_400_000
  const renewalModules = allModules.filter(m => m.approved && m.approved_at && renewalDueMs(m.approved_at) <= renewalHorizonMs)
  const overdueCount = renewalModules.filter(m => renewalDueMs(m.approved_at) <= Date.now()).length

  // 'ANNUAL' = the CPD Approved shelf: deepened copies of pre-built modules, across all settings.
  const visibleTopics = topics.filter(t =>
    activeSetting === 'ANNUAL' ? false : activeSetting ? t.care_setting === activeSetting : !t.care_setting)
  const matchesBuild = (t: any) => buildFilter === 'all'
    || (buildFilter === 'todo'      && !t.module)
    || (buildFilter === 'draft'     && !!t.module && !t.module.approved)
    || (buildFilter === 'published' && !!t.module && t.module.approved)
  const filteredTopics = visibleTopics.filter(matchesBuild)
  const buildCounts = {
    all:       visibleTopics.length,
    todo:      visibleTopics.filter((t: any) => !t.module).length,
    draft:     visibleTopics.filter((t: any) => !!t.module && !t.module.approved).length,
    published: visibleTopics.filter((t: any) => !!t.module && t.module.approved).length,
  }
  const byGroup = Object.keys(groups).map(g => ({ key: g, label: groups[g], items: filteredTopics.filter(t => t.group_key === g) })).filter(g => g.items.length)
  const activeLabel = activeSetting === 'ANNUAL' ? 'CPD Approved' : settings.find(s => s.key === activeSetting)?.label ?? 'All settings'

  return (
    <PlatformShell>
      <h1 className="text-2xl font-bold text-neutral-dark">Standard Training</h1>
      <p className="mb-4 mt-1 max-w-3xl text-sm text-neutral-mid">
        Generate standard annual-training modules (grounded in the anonymised <strong>policy seeds</strong>). Review and <strong>publish</strong> them, and every tenant can assign them to staff at <strong>no AI-generation cost</strong>. Tenants who want policy-specific versions use &ldquo;Tailor to our policies&rdquo; (metered).
      </p>

      {/* How the three tiers relate. Kept collapsed by default so it explains the
          model to anyone new to this console without pushing the library down the page. */}
      <details className="group mb-6 max-w-4xl rounded-xl border border-teal/25 bg-teal-light/15 open:bg-teal-light/20">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-semibold text-teal-dark">
          <Info size={15} className="shrink-0 text-teal" />
          How Pre-built Training, CPD Approved Courses and Diplomas fit together
          <ChevronDown size={15} className="ml-auto shrink-0 text-teal transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-4 border-t border-teal/20 px-4 pb-4 pt-4 text-sm text-neutral-dark">
          <div>
            <p className="font-semibold text-teal-dark">1 · Pre-built training — the everyday library</p>
            <p className="mt-1 text-neutral-mid">
              What tenants pull from for <strong>ad-hoc training</strong> in their own account, alongside the training they
              generate from their own policies. Every published module here is available to assign to any staff member at
              no AI-generation cost. This is the breadth layer: a module for each mandatory, statutory, clinical and
              role-specific topic a service needs to cover. The <strong>All settings</strong> tab holds the universal
              modules that apply everywhere; each setting tab holds only that setting&apos;s specialist modules.
              A pre-built module <strong>stays pre-built</strong> — the tenant chooses which tier to assign, and picking
              pre-built (say, for a quick refresher) is a legitimate choice the system never overrides.
            </p>
          </div>

          <div>
            <p className="font-semibold text-teal-dark">2 · CPD Approved — deepened copies, on their own shelf</p>
            <p className="mt-1 text-neutral-mid">
              A CPD course starts as a <strong>copy</strong> of a published pre-built module (the <em>CPD copy</em> button
              on its row). The copy is then built up before it goes to CPD for approval: more lesson sections, more
              interactive elements (order / sort / match activities), a longer and more demanding question bank, a
              pre-course baseline check and a practical checklist where the topic needs observed competence — the depth
              is what the accreditation assesses. The pre-built original keeps serving ad-hoc training unchanged, and a
              module never changes shelf. Once accredited, the copy carries CPD branding and CPD hours on its certificate.
            </p>
          </div>

          <div>
            <p className="font-semibold text-teal-dark">3 · Diplomas &amp; Pathways — combinations, with their own certificate</p>
            <p className="mt-1 text-neutral-mid">
              A diploma or pathway pulls <strong>several published modules together into one programme</strong> with its own
              completion rule, a <strong>synoptic assessment</strong> spanning more than one unit, a reflective account, and a
              single combined certificate showing cumulative hours, measured learning gain and a transcript of every unit.
              Progress is derived from the learner&apos;s ordinary training records, so a unit taken inside a diploma is the
              same record as one taken on its own — it still renews on its own cycle and still counts once.
              Build these under <strong>Diplomas &amp; Pathways</strong>.
            </p>
          </div>

          <p className="rounded-lg border border-teal/20 bg-white/70 p-3 text-xs text-neutral-mid">
            <strong className="text-neutral-dark">Published is not CPD accredited.</strong> A module only needs to be
            published to be used in a diploma, so programmes can be built and piloted from the current library now and
            gain CPD branding later, as their units are accredited, with no rebuild. Until a programme&apos;s units are all
            accredited its certificate shows &ldquo;learning hours&rdquo; rather than &ldquo;CPD hours&rdquo;.
          </p>
        </div>
      </details>

      {/* Library governance summary — across every setting. */}
      {!loading && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="Signed off & approved" value={approvedCount} tone="green" Icon={ShieldCheck} sub="published to all tenants" />
          <StatBox label="Outstanding" value={outstandingCount} tone="amber" Icon={FileText} sub="generated, awaiting sign-off" />
          <StatBox
            label="Due for 6-monthly renewal"
            value={renewalModules.length}
            tone={overdueCount ? 'red' : renewalModules.length ? 'amber' : 'gray'}
            Icon={RefreshCw}
            sub={overdueCount ? `${overdueCount} overdue · within 60 days` : 'within the next 60 days'}
          />
          <StatBox label="Not yet generated" value={notGeneratedCount} tone="gray" Icon={Circle} sub="topics with no module" />
        </div>
      )}

      {/* Setting tabs — "All settings" is the universal cross-over base; each setting
          tab holds only that setting's specific modules. */}
      {!loading && (
        <div className="mb-5 flex flex-wrap gap-1.5 border-b border-gray-200 pb-3">
          {[{ key: null as string | null, label: 'All settings' }, { key: 'ANNUAL' as string | null, label: 'CPD Approved' }, ...settings].map(tab => {
            const active = activeSetting === tab.key
            const count = settingCount(tab.key)
            return (
              <button
                key={tab.key ?? 'all'}
                onClick={() => setActiveSetting(tab.key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${active ? 'bg-teal text-white' : 'bg-gray-100 text-neutral-mid hover:bg-gray-200'}`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/20' : 'bg-white text-neutral-mid'}`}>{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {!loading && activeSetting !== 'ANNUAL' && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-neutral-mid">Show:</span>
          {([
            ['all',       'All'],
            ['todo',      'Needs building'],
            ['draft',     'Draft'],
            ['published', 'Published'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setBuildFilter(key)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                buildFilter === key ? 'bg-neutral-dark text-white' : 'bg-gray-100 text-neutral-mid hover:bg-gray-200'
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 text-[10px] ${buildFilter === key ? 'bg-white/20' : 'bg-white text-neutral-mid'}`}>{buildCounts[key]}</span>
            </button>
          ))}
          {buildFilter === 'todo' && buildCounts.todo > 0 && (
            <span className="ml-1 text-xs text-neutral-mid">
              These topics have no course yet — tenants see them under <strong>Live policy training</strong> until one is published.
            </span>
          )}
        </div>
      )}

      {!loading && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-neutral-mid">
            {activeSetting
              ? <>Showing modules specific to <strong>{activeLabel}</strong>. The universal modules under <strong>All settings</strong> also apply here.</>
              : <>Universal (cross-over) modules — these apply to <strong>every</strong> setting. Setting-specific modules live under each setting tab.</>}
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
          {activeSetting !== 'ANNUAL' && (
            <button
              onClick={() => setBulkOpen(true)}
              title="Attest and publish every draft in this tab with one named attestation. The Annual Training (CPD) set is never included."
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-teal/30 bg-teal/5 px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/10"
            >
              <ShieldCheck size={13} /> Bulk approve drafts
            </button>
          )}
          <button
            onClick={applyChecklists}
            disabled={checklistBusy}
            title="Fill in the observed competency checklist on every practical module in this tab that has none. Does not change the lesson, questions or approval state."
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-teal/30 bg-teal/5 px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/10 disabled:opacity-50"
          >
            {checklistBusy
              ? <><Loader2 size={13} className="animate-spin" /> Applying…</>
              : <><ClipboardCheck size={13} /> Fill practical checklists</>}
          </button>
          {!activeSetting && topics.some(t => !t.care_setting && t.module) && (
            <button
              onClick={neutraliseAll}
              disabled={!!neutralising}
              title="Rewrite every universal module's wording to be setting-neutral. Images and answers are kept; modules are un-published for re-approval."
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-teal/30 bg-teal/5 px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/10 disabled:opacity-50"
            >
              {neutralising === 'all'
                ? <><Loader2 size={13} className="animate-spin" /> Neutralising {neutProgress ? `${neutProgress.done}/${neutProgress.total}` : ''}…</>
                : <><Wand2 size={13} /> Neutralise voice (all)</>}
            </button>
          )}
          </div>
        </div>
      )}

      {packFor && packDoc && (
        <CpdSubmissionSheet doc={packDoc} m={packFor} onClose={() => { setPackFor(null); setPackDoc(null) }} />
      )}

      {bulkOpen && api && (
        <BulkApprovePanel
          api={api}
          scope={activeSetting && activeSetting !== 'ANNUAL' ? 'setting' : 'universal'}
          careSetting={activeSetting && activeSetting !== 'ANNUAL' ? activeSetting : undefined}
          scopeLabel={activeSetting && activeSetting !== 'ANNUAL' ? activeLabel : 'All settings (universal)'}
          onClose={() => setBulkOpen(false)}
          onDone={() => { setBulkOpen(false); load() }}
        />
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}</div>
      ) : activeSetting === 'ANNUAL' ? (
        /* ── The CPD shelf: deepened copies of pre-built modules ─────────────── */
        cpdModules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
            <p className="text-sm font-medium text-neutral-dark">No CPD copies yet</p>
            <p className="mx-auto mt-1 max-w-lg text-xs text-neutral-mid">
              A CPD course starts as a <strong>copy</strong> of a published pre-built module. Find the module under
              its setting tab and use <strong>CPD copy</strong> — the copy lands here as a draft to be deepened
              (more sections, more questions, interactive elements) and taken through CPD accreditation.
              The pre-built original keeps serving ad-hoc training unchanged.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {cpdModules.map((m, i) => (
              <div key={m.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                {m.cpd_state === 'accredited' ? <ShieldCheck size={16} className="shrink-0 text-violet-600" /> : m.cpd_state === 'awaiting_cpd' ? <History size={16} className="shrink-0 text-blue-500" /> : <FileText size={16} className="shrink-0 text-amber-500" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-dark">{m.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-mid">
                    {m.cpd_state === 'accredited'
                      ? <span className="rounded-full bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-700">CPD accredited</span>
                      : m.cpd_state === 'awaiting_cpd'
                        ? <span className="rounded-full bg-blue-50 px-1.5 py-0.5 font-medium text-blue-600">Published — awaiting CPD accreditation</span>
                        : <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-medium text-amber-600">Draft — being deepened</span>}
                    {m.requires_practical && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-medium text-amber-600">Practical also required</span>}
                    <span>· {m.question_count} questions</span>
                    {m.duration_minutes ? <span>· {m.duration_minutes} min ({(m.duration_minutes / 60).toFixed(1)} CPD h)</span> : null}
                    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${m.image_count >= m.image_slots ? 'bg-green-50 text-green-600' : m.image_count > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-neutral-mid'}`}><ImageIcon size={10} /> {m.image_count}/{m.image_slots} images</span>
                    {m.qa_hard_fails > 0 ? <span className="flex items-center gap-0.5 text-red-500"><ShieldAlert size={11} /> {m.qa_hard_fails} QA issue{m.qa_hard_fails === 1 ? '' : 's'}</span> : null}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><Calendar size={11} /> Copied {fmtDate(m.created_at)}{m.approved_at ? ` · Published ${fmtDate(m.approved_at)}` : ''}</span>
                    {m.attested_by_name ? <span className="flex items-center gap-0.5 text-green-600"><ShieldCheck size={11} /> Approved by {m.attested_by_name}{m.attested_by_role ? `, ${m.attested_by_role}` : ''}</span> : null}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openPreview(m.id)}
                    disabled={!!previewLoading}
                    title="Open the course exactly as tenant staff see it."
                    className="flex items-center gap-1 rounded-lg border border-teal/30 bg-teal/5 px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/10 disabled:opacity-50"
                  >
                    {previewLoading === m.id ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />} Preview as staff
                  </button>
                  <button onClick={() => setReviewId(m.id)} className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal"><Pencil size={12} /> {m.approved ? 'Edit' : 'Deepen & review'}</button>
                </div>

                {/* CPD accreditation submission pack — the four documents the CPD
                    Certification Service asks for, generated from this course. */}
                <div className="w-full border-t border-gray-50 pt-2.5">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">CPD submission pack</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CPD_DOCS.map(d => (
                      <button
                        key={d.key}
                        onClick={() => openPack(m.id, d.key)}
                        disabled={!!packLoading}
                        title={d.hint}
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50/60 px-2.5 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50"
                      >
                        {packLoading === `${d.key}:${m.id}` ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : byGroup.length === 0 && buildFilter !== 'all' ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-neutral-dark">Nothing in “{buildFilter === 'todo' ? 'Needs building' : buildFilter === 'draft' ? 'Draft' : 'Published'}” for {activeLabel}</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-neutral-mid">Switch the filter to <strong>All</strong> to see the rest of this tab.</p>
        </div>
      ) : byGroup.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-neutral-dark">No {activeLabel}-specific modules yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-neutral-mid">The universal modules under <strong>All settings</strong> already apply to {activeLabel}. Setting-specific topics for {activeLabel} will appear here once added.</p>
        </div>
      ) : (
        <div className="space-y-7">
          {byGroup.map(group => (
            <div key={group.key}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-mid">{group.label}</h2>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {group.items.map((t, i) => {
                  const m = t.module
                  return (
                    <div key={t.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                      {m?.approved ? <CheckCircle2 size={16} className="shrink-0 text-green-500" /> : m ? <FileText size={16} className="shrink-0 text-amber-500" /> : <Circle size={16} className="shrink-0 text-gray-300" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-dark">{t.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-mid">
                          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 font-medium">{FREQ_LABEL[t.default_frequency] ?? t.default_frequency}</span>
                          {t.requires_practical && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-medium text-amber-600">Practical also required</span>}
                          {m && <span className={`rounded-full px-1.5 py-0.5 font-medium ${m.approved ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{m.approved ? 'Published' : 'Draft'}</span>}
                          {m?.cpd_accredited && <span className="rounded-full bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-700">CPD approved</span>}
                          {m && <span>· {m.question_count} questions</span>}
                          {m?.duration_minutes ? <span>· {m.duration_minutes} min ({(m.duration_minutes / 60).toFixed(1)} CPD h)</span> : null}
                          {m && <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${m.image_count >= m.image_slots ? 'bg-green-50 text-green-600' : m.image_count > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-neutral-mid'}`}><ImageIcon size={10} /> {m.image_count}/{m.image_slots} images</span>}
                        </p>
                        {m && (
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400">
                            <span className="flex items-center gap-1"><Calendar size={11} /> Created {fmtDate(m.created_at)}{m.approved_at ? ` · Published ${fmtDate(m.approved_at)}` : ''}</span>
                            {m.attested_by_name ? <span className="flex items-center gap-0.5 text-green-600"><ShieldCheck size={11} /> Approved by {m.attested_by_name}{m.attested_by_role ? `, ${m.attested_by_role}` : ''}{m.attested_at ? ` · ${fmtDate(m.attested_at)}` : ''}</span> : null}
                            {m.standards_count > 0 ? <span>· {m.standards_count} standards</span> : null}
                            {m.qa_hard_fails > 0 ? <span className="flex items-center gap-0.5 text-red-500"><ShieldAlert size={11} /> {m.qa_hard_fails} QA issue{m.qa_hard_fails === 1 ? '' : 's'}</span> : null}
                            {!m.attested_by_name && m.review_status === 'changes_requested' ? <span className="flex items-center gap-0.5 font-semibold text-amber-600"><AlertTriangle size={11} /> Reviewer changes ({m.review_changes_open} open)</span> : !m.attested_by_name && m.review_status === 'approved' ? <span className="flex items-center gap-0.5 text-green-600"><ShieldCheck size={11} /> Externally approved — publish to confirm</span> : !m.attested_by_name && m.review_status === 'pending' ? <span className="flex items-center gap-0.5 text-blue-600"><History size={11} /> Awaiting review</span> : null}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* CPD shelf: copy a published pre-built module, or show its existing copy. */}
                        {m?.approved && (t.cpd_module_id
                          ? <button onClick={() => { setActiveSetting('ANNUAL'); setReviewId(t.cpd_module_id) }} title="This topic already has a CPD copy — open it on the CPD Approved shelf." className="flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100"><ShieldCheck size={12} /> CPD copy ✓</button>
                          : <button onClick={() => createCpdCopy(m.id, t.title)} disabled={busy === m.id} title="Duplicate this module onto the CPD Approved shelf as a draft, ready to be deepened and taken to CPD. The pre-built original is unchanged." className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-violet-300 hover:text-violet-700 disabled:opacity-50">{busy === m.id ? <Loader2 size={13} className="animate-spin" /> : <Plus size={12} />} CPD copy</button>)}
                        {/* Per-module neutralise — only for universal modules (the cross-over base). */}
                        {m && !t.care_setting && (
                          <button
                            onClick={() => neutralise(m.id)}
                            disabled={!!neutralising}
                            title="Rewrite this module's wording to be setting-neutral (images and answers kept; un-publishes for re-approval)."
                            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal/40 hover:text-teal disabled:opacity-50"
                          >
                            {neutralising === m.id ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                          </button>
                        )}
                        {m && (
                          <button
                            onClick={() => openPreview(m.id)}
                            disabled={!!previewLoading}
                            title="Open the course exactly as tenant staff see it — lessons, scenarios, quick checks, glossary, references and the assessment."
                            className="flex items-center gap-1 rounded-lg border border-teal/30 bg-teal/5 px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/10 disabled:opacity-50"
                          >
                            {previewLoading === m.id ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />} Preview as staff
                          </button>
                        )}
                        {!m
                          ? <button onClick={() => generate(t.id)} disabled={busy === t.id} className="flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy === t.id ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><Sparkles size={13} /> Generate</>}</button>
                          : <button onClick={() => setReviewId(m.id)} className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal"><Pencil size={12} /> {m.approved ? 'Edit' : 'Review'}</button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </PlatformShell>
  )
}

function Review({ token, id, onBack }: { token: string; id: string; onBack: () => void }) {
  const api = createPlatformClient(token)
  const [m, setM] = useState<any>(null)
  const [hist, setHist] = useState<any>(null)
  const [qa, setQa] = useState<any>(null)
  const [stdCat, setStdCat] = useState<any[]>([])
  const [reviewLinks, setReviewLinks] = useState<any[]>([])
  const [newLink, setNewLink] = useState<any>(null)
  const [creatingLink, setCreatingLink] = useState(false)
  const [copied, setCopied] = useState<'link' | 'password' | null>(null)
  const [shareBusy, setShareBusy] = useState(false)
  const [sharePw, setSharePw] = useState('')
  const [shareCopied, setShareCopied] = useState<'link' | 'pw' | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenQ, setRegenQ] = useState(false)
  const [imgBusy, setImgBusy] = useState(false)
  const [savedNote, setSavedNote] = useState('')
  const [attestOpen, setAttestOpen] = useState(false)
  const [specOpen, setSpecOpen] = useState(false)
  const [revName, setRevName] = useState('')
  const [revRole, setRevRole] = useState('')
  const [attest1, setAttest1] = useState(false)
  const [attest2, setAttest2] = useState(false)

  function load() { setLoading(true); api.standardTraining.moduleFull(id).then(d => { setM(d.module); setHist(d.question_history); setQa(d.qa); setStdCat(d.standards_catalogue); setReviewLinks(d.review_links ?? []) }).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  function setField(k: string, v: any) { setM((p: any) => ({ ...p, [k]: v })) }
  function setLearning(k: string, v: any) { setM((p: any) => ({ ...p, learning_content: { ...(p.learning_content ?? {}), [k]: v } })) }
  function setQuestion(i: number, patch: any) { setM((p: any) => ({ ...p, questions: p.questions.map((q: any, j: number) => j === i ? { ...q, ...patch } : q) })) }
  function setOption(qi: number, oi: number, v: string) { setM((p: any) => ({ ...p, questions: p.questions.map((q: any, j: number) => j === qi ? { ...q, options: q.options.map((o: string, k: number) => k === oi ? v : o) } : q) })) }

  async function save() {
    setSaving(true); setSavedNote('')
    try { await saveEdits(); load(); setSavedNote('Saved'); setTimeout(() => setSavedNote(''), 2000) }
    catch { /* ignore */ } finally { setSaving(false) }
  }
  function saveEdits() {
    return api.standardTraining.updateModule(id, { name: m.name, learning_content: m.learning_content, questions: m.questions, pass_mark: m.pass_mark, frequency: m.frequency, duration_minutes: m.duration_minutes, standards: m.standards ?? [], cpd_accredited: !!m.cpd_accredited })
  }
  async function unpublish() {
    setSaving(true)
    try { const { module } = await api.standardTraining.approveModule(id, { approved: false }); setM(module); load() }
    catch { /* ignore */ } finally { setSaving(false) }
  }
  async function openAttest() {
    setSaving(true)
    try { await saveEdits(); const d = await api.standardTraining.moduleFull(id); setM(d.module); setQa(d.qa)
      if (!d.qa.ok_to_approve) { alert(`Cannot publish yet — fix these quality checks first:\n\n${d.qa.checks.filter((c: any) => c.status === 'fail').map((c: any) => `• ${c.label}: ${c.detail}`).join('\n')}`); return }
      setAttestOpen(true)
    } catch (e: any) { alert(e?.message ?? 'Could not save.') } finally { setSaving(false) }
  }
  async function confirmAttest() {
    if (!revName.trim() || !revRole.trim() || !attest1 || !attest2) return
    setSaving(true)
    try { const { module } = await api.standardTraining.approveModule(id, { reviewer_name: revName.trim(), reviewer_role: revRole.trim() }); setM(module); setAttestOpen(false); load() }
    catch (e: any) { alert(e?.message ?? 'Could not publish.') } finally { setSaving(false) }
  }
  async function createReviewLink() {
    setCreatingLink(true)
    try { await saveEdits(); const r = await api.standardTraining.createReviewLink(id); setNewLink(r); load() }
    catch (e: any) { alert(e?.message ?? 'Could not create the review link.') } finally { setCreatingLink(false) }
  }
  async function revokeLink(linkId: string) {
    if (!confirm('Revoke this review link? The reviewer will no longer be able to open it.')) return
    try { await api.standardTraining.revokeReviewLink(linkId); load() } catch { /* ignore */ }
  }
  async function resolveItem(linkId: string, ref: string, resolved: boolean) {
    setReviewLinks(links => links.map(l => l.id === linkId ? { ...l, item_feedback: (l.item_feedback ?? []).map((it: any) => it.ref === ref ? { ...it, resolved } : it) } : l))
    try { await api.standardTraining.resolveReviewItem(linkId, ref, resolved) } catch { load() }
  }
  async function publishExternal(linkId: string) {
    if (!confirm('Publish this module to all tenants, citing the external reviewer\'s approval?')) return
    setSaving(true)
    try { const { module } = await api.standardTraining.approveModule(id, { external_link_id: linkId }); setM(module); load() }
    catch (e: any) { alert(e?.message ?? 'Could not publish.') } finally { setSaving(false) }
  }
  function reviewUrl(token: string) { return `${typeof window !== 'undefined' ? window.location.origin : ''}/review/${token}` }
  function validateUrl(token: string) { return `${typeof window !== 'undefined' ? window.location.origin : ''}/validate/${token}` }
  function copyShare(which: 'link' | 'pw', text: string) { navigator.clipboard?.writeText(text); setShareCopied(which); setTimeout(() => setShareCopied(c => c === which ? null : c), 1500) }
  async function setShare(enabled: boolean) {
    setShareBusy(true)
    try {
      const r = await api.standardTraining.setShare(id, { enabled, password: enabled && sharePw.trim() ? sharePw.trim() : undefined })
      setM((p: any) => ({ ...p, share_enabled: r.share_enabled, share_token: r.share_token, share_password: r.share_password }))
      setSharePw('')
    } catch (e: any) { alert(e?.message ?? 'Could not update sharing.') } finally { setShareBusy(false) }
  }
  async function updateSharePw() {
    if (!sharePw.trim()) return
    setShareBusy(true)
    try {
      const r = await api.standardTraining.setShare(id, { enabled: true, password: sharePw.trim() })
      setM((p: any) => ({ ...p, share_enabled: r.share_enabled, share_token: r.share_token, share_password: r.share_password }))
      setSharePw('')
    } catch (e: any) { alert(e?.message ?? 'Could not update the password.') } finally { setShareBusy(false) }
  }
  function copy(which: 'link' | 'password', text: string) { navigator.clipboard?.writeText(text); setCopied(which); setTimeout(() => setCopied(c => c === which ? null : c), 1500) }
  function toggleStandard(framework: string, code: string, label: string) {
    const cur: any[] = Array.isArray(m.standards) ? m.standards : []
    const exists = cur.some(s => s.framework === framework && s.code === code)
    setField('standards', exists ? cur.filter(s => !(s.framework === framework && s.code === code)) : [...cur, { framework, code, label }])
  }
  async function regenerate() {
    if (!confirm('Rebuild the whole module from the policy seeds? The lesson (sections, scenarios, outcomes) and questions are regenerated, current edits are replaced, and it returns to draft.')) return
    setRegenerating(true)
    try { const { module } = await api.standardTraining.generate(m.topic_id); load(); alert(`Rebuilt — ${Array.isArray(module.learning_content?.sections) ? module.learning_content.sections.length : 0} lesson sections and ${Array.isArray(module.questions) ? module.questions.length : 0} questions generated. It's now a draft (note: the AI may have updated the title) — review and Approve & publish.`) }
    catch (e: any) { alert(e?.message ?? 'Rebuild failed — the AI generation may have timed out. Please try again.') }
    finally { setRegenerating(false) }
  }
  async function generateImage() {
    setImgBusy(true)
    try { const { illustration_url } = await api.standardTraining.generateImage(id); setM((p: any) => ({ ...p, illustration_url })) }
    catch { /* ignore */ } finally { setImgBusy(false) }
  }
  async function regenerateQuestions() {
    if (!confirm('Generate a fresh ASSESSMENT question bank that AVOIDS every question used before?\n\nThis refreshes the assessment questions ONLY — your lesson (sections & scenarios) is left unchanged. To regenerate the lesson too, use "Rebuild whole module".\n\nThe current questions are saved to history, and the module returns to draft for review before re-publishing.')) return
    setRegenQ(true)
    try { const r = await api.standardTraining.regenerateQuestions(id); load(); alert(`Generated ${r.generated} new questions, avoiding ${r.avoided} previously-used. Review and re-publish.`) }
    catch (e: any) { alert(e?.message ?? 'Regeneration failed') } finally { setRegenQ(false) }
  }

  if (loading || !m) return <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}</div>
  const kp: string[] = m.learning_content?.key_points ?? []

  return (
    <div className="mx-auto max-w-3xl pb-16">
      {/* Sticky toolbar — pinned flush to the top so the actions follow you down the page.
          Full-bleed + page-matching background so it doesn't read as a mismatched white block. */}
      <div className="sticky -top-6 z-30 -mx-6 -mt-6 mb-4 flex flex-wrap items-center gap-2 border-b border-gray-200 bg-neutral-light px-6 pt-6 pb-3 shadow-sm">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-neutral-mid hover:text-teal"><ChevronLeft size={14} /> Standard Training</button>
        <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:block" />
        <button onClick={save} disabled={saving} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-neutral-dark hover:bg-neutral-light disabled:opacity-50">{saving ? 'Saving…' : 'Save draft'}</button>
        {!m.approved
          ? <button onClick={openAttest} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"><ShieldCheck size={14} /> Attest &amp; publish</button>
          : <button onClick={unpublish} disabled={saving} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-neutral-mid hover:border-amber-300 hover:text-amber-600">Unpublish</button>}
        <button onClick={regenerate} disabled={regenerating} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-neutral-mid hover:border-teal/40 hover:text-teal disabled:opacity-50">{regenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Rebuild</button>
        <button onClick={() => setSpecOpen(true)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-neutral-mid hover:border-teal/40 hover:text-teal"><FileText size={13} /> Course spec</button>
        {savedNote && <span className="text-sm font-medium text-green-600">{savedNote}</span>}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.approved ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{m.approved ? 'Published' : 'Draft'}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-neutral-mid">Standard library · shared to all tenants</span>
      </div>

      {/* Open external-review change requests — surfaced prominently */}
      {(() => {
        const open = reviewLinks.flatMap((l: any) => (Array.isArray(l.item_feedback) ? l.item_feedback : []).filter((it: any) => it.status === 'changes_requested' && !it.resolved))
        if (!open.length) return null
        return (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-amber-700"><AlertTriangle size={15} /> {open.length} change{open.length === 1 ? '' : 's'} requested by your external reviewer</p>
            <ul className="space-y-1 text-xs text-amber-800">
              {open.map((it: any, i: number) => <li key={i}><strong>{it.label}:</strong> {it.note || '(no detail)'}</li>)}
            </ul>
            <p className="mt-1.5 text-[11px] text-amber-600">Action each one, then tick it off under <strong>CPD governance → Independent external review</strong> below.</p>
          </div>
        )
      })()}

      {/* Tracking & question history */}
      <div className={`mb-4 rounded-xl border p-4 ${hist?.review_due ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-white'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 text-xs text-neutral-mid">
            <p className="flex items-center gap-1.5"><Calendar size={13} className="text-neutral-mid" /> <span className="font-medium text-neutral-dark">Created</span> {fmtDate(m.created_at)}</p>
            <p className="flex items-center gap-1.5"><CheckCircle2 size={13} className={m.approved_at ? 'text-green-500' : 'text-gray-300'} /> <span className="font-medium text-neutral-dark">Published</span> {m.approved_at ? fmtDate(m.approved_at) : 'not yet published'}</p>
            <p className="flex items-center gap-1.5"><History size={13} className="text-neutral-mid" /> <span className="font-medium text-neutral-dark">Questions current since</span> {fmtDate(hist?.last_regenerated_at ?? m.created_at)}{hist?.prior_versions ? ` · ${hist.prior_versions} prior version${hist.prior_versions === 1 ? '' : 's'} on record` : ''}</p>
            <p className="text-[11px] text-gray-400">{hist?.used_count ?? 0} question{(hist?.used_count ?? 0) === 1 ? '' : 's'} used to date — a regeneration avoids all of them.</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {hist?.review_due && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700"><AlertTriangle size={11} /> Review due</span>}
            <button onClick={regenerateQuestions} disabled={regenQ} className="inline-flex items-center gap-1.5 rounded-lg border border-teal/30 bg-white px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal hover:text-white disabled:opacity-50">
              {regenQ ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><RefreshCw size={13} /> Regenerate questions</>}
            </button>
            <span className="text-[10px] text-gray-400">assessment only · avoids repeats · {hist?.interval_months ?? 6}-monthly</span>
          </div>
        </div>
      </div>

      {m.requires_practical && (
        <div className="mb-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-800">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <span>This topic also needs a <strong>practical / observed competency assessment</strong>. This module is the knowledge component only.</span>
        </div>
      )}

      <label className="mb-1 block text-xs font-medium text-neutral-mid">Module title</label>
      <input value={m.name} onChange={e => setField('name', e.target.value)} className={`${INPUT} mb-3 font-medium`} />

      <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {m.illustration_url
          ? <img src={platformAssetUrl(m.illustration_url) ?? ''} alt="" className="aspect-[16/9] w-full object-cover" />
          : <div className="flex aspect-[16/9] w-full items-center justify-center bg-neutral-light/60"><ImageIcon size={28} className="text-gray-300" /></div>}
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="text-xs text-neutral-mid">Cover illustration <span className="text-gray-400">· free for standard library</span></p>
          <button onClick={generateImage} disabled={imgBusy} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal disabled:opacity-50">
            {imgBusy ? <><Loader2 size={12} className="animate-spin" /> Generating…</> : <><Sparkles size={12} /> {m.illustration_url ? 'Regenerate image' : 'Generate image'}</>}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div><label className="mb-1 block text-xs font-medium text-neutral-mid">Frequency</label><select value={m.frequency} onChange={e => setField('frequency', e.target.value)} className={INPUT}>{FREQS.map(f => <option key={f} value={f}>{FREQ_LABEL[f]}</option>)}</select></div>
        <div><label className="mb-1 block text-xs font-medium text-neutral-mid">Pass mark (%)</label><input type="number" min={0} max={100} value={m.pass_mark} onChange={e => setField('pass_mark', Number(e.target.value))} className={INPUT} /></div>
        <div><label className="mb-1 block text-xs font-medium text-neutral-mid">Duration (min)</label><input type="number" min={0} max={600} value={m.duration_minutes ?? ''} onChange={e => setField('duration_minutes', e.target.value === '' ? null : Number(e.target.value))} className={INPUT} /><p className="mt-1 text-[11px] text-neutral-mid">{m.duration_minutes ? `≈ ${(m.duration_minutes / 60).toFixed(1)} CPD hours` : 'estimated learning time'}</p></div>
      </div>

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-neutral-dark">Learning — what staff read first</p>
        <label className="mb-1 block text-xs font-medium text-neutral-mid">Summary</label>
        <textarea value={m.learning_content?.summary ?? ''} onChange={e => setLearning('summary', e.target.value)} rows={3} className={`${INPUT} mb-1`} />
        <p className="mb-3 text-xs text-neutral-mid">A short intro shown above the lesson sections.</p>

        <label className="mb-1 block text-xs font-medium text-neutral-mid">Learning outcomes — &ldquo;by the end you will be able to…&rdquo;</label>
        <div className="mb-3 space-y-2">
          {(m.learning_content?.outcomes ?? []).map((o: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <input value={o} onChange={e => setLearning('outcomes', (m.learning_content?.outcomes ?? []).map((x: string, j: number) => j === i ? e.target.value : x))} className={INPUT} />
              <button onClick={() => setLearning('outcomes', (m.learning_content?.outcomes ?? []).filter((_: string, j: number) => j !== i))} className="shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
          <button onClick={() => setLearning('outcomes', [...(m.learning_content?.outcomes ?? []), ''])} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add outcome</button>
        </div>

        <label className="mb-1 block text-xs font-medium text-neutral-mid">Lesson sections — teach → scenario → quick check → activity</label>
        <ActivitiesToolbar
          activities={m.learning_content?.activities ?? []}
          onChange={next => setLearning('activities', next)}
          sectionHeadings={(m.learning_content?.sections ?? []).map((s: any) => String(s?.heading ?? ''))}
          onDraft={async () => (await api.standardTraining.draftActivities(id)).activities}
        />
        <SectionsEditor
          value={m.learning_content?.sections ?? []}
          onChange={next => setLearning('sections', next)}
          assetUrl={platformAssetUrl}
          imageHint="free"
          onGenerateImage={async (i) => { await saveEdits(); await api.standardTraining.generateSectionImage(id, i); load() }}
          activities={m.learning_content?.activities ?? []}
          onActivitiesChange={next => setLearning('activities', next)}
          onDraftActivity={async (sectionIndex) => (await api.standardTraining.draftActivities(id, undefined, sectionIndex)).activities}
        />

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Key points (recap)</label>
          <div className="space-y-2">
            {kp.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={p} onChange={e => setLearning('key_points', kp.map((x, j) => j === i ? e.target.value : x))} className={INPUT} />
                <button onClick={() => setLearning('key_points', kp.filter((_, j) => j !== i))} className="shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={() => setLearning('key_points', [...kp, ''])} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add key point</button>
          </div>
        </div>
      </div>

      <p className="mb-2 text-sm font-semibold text-neutral-dark">Assessment — {m.questions?.length ?? 0} questions</p>
      <div className="space-y-3">
        {(m.questions ?? []).map((q: any, qi: number) => (
          <div key={qi} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-start gap-2">
              <span className="mt-1.5 text-xs font-semibold text-neutral-mid">{qi + 1}.</span>
              <textarea value={q.text} onChange={e => setQuestion(qi, { text: e.target.value })} rows={2} className={INPUT} />
              <button onClick={() => setM((p: any) => ({ ...p, questions: p.questions.filter((_: any, j: number) => j !== qi) }))} className="mt-1 shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={14} /></button>
            </div>
            <div className="space-y-1.5 pl-5">
              {q.options.map((o: string, oi: number) => (
                <label key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`c-${qi}`} checked={q.correct === oi} onChange={() => setQuestion(qi, { correct: oi })} className="accent-green-500" />
                  <input value={o} onChange={e => setOption(qi, oi, e.target.value)} className={`flex-1 rounded-md border px-3 py-1.5 text-sm outline-none ${q.correct === oi ? 'border-green-300 bg-green-50/40' : 'border-gray-300 focus:border-teal'}`} />
                </label>
              ))}
            </div>
          </div>
        ))}
        <button onClick={() => setM((p: any) => ({ ...p, questions: [...p.questions, { id: `q${p.questions.length + 1}`, text: '', options: ['', '', '', ''], correct: 0 }] }))} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add question</button>
      </div>

      {/* ── CPD governance ───────────────────────────────────────────────── */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><ShieldCheck size={15} className="text-teal" /> CPD governance</p>
        <p className="mb-3 text-xs text-neutral-mid">Quality assurance, source evidence and standards mapping that back the reviewer attestation for accreditation.</p>

        {/* Automated QA checks */}
        {qa && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Automated quality checks</p>
            <div className="space-y-1">
              {qa.checks.map((c: any) => (
                <div key={c.key} className="flex items-start gap-2 text-sm">
                  {c.status === 'pass' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green-500" /> : c.status === 'warn' ? <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" /> : <ShieldAlert size={15} className="mt-0.5 shrink-0 text-red-500" />}
                  <span className="text-neutral-dark"><span className="font-medium">{c.label}</span> <span className="text-neutral-mid">— {c.detail}</span></span>
                </div>
              ))}
            </div>
            {qa.hard_fails > 0 && <p className="mt-1.5 text-xs font-medium text-red-600">{qa.hard_fails} blocking issue(s) — fix before publishing.</p>}
            {qa.checks.some((c: any) => (c.key === 'sections' || c.key === 'outcomes') && c.status === 'fail') && (
              <p className="mt-1 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700">This is an older-format module. Learning outcomes &amp; lesson sections are generated by <strong>Rebuild whole module</strong> — &ldquo;Regenerate questions&rdquo; only refreshes the assessment bank.</p>
            )}
          </div>
        )}

        {/* Provenance / evidence base */}
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Evidence base — grounded in</p>
          {Array.isArray(m.policy_refs) && m.policy_refs.length > 0
            ? <div className="flex flex-wrap gap-1.5">{m.policy_refs.map((r: any, i: number) => <span key={i} className="rounded-full bg-neutral-light px-2 py-0.5 text-[11px] text-neutral-mid">{r.title}{r.section ? ` · ${r.section}` : ''}</span>)}</div>
            : <p className="text-xs text-neutral-mid">No sources recorded — rebuild so the module cites the reference policies.</p>}
        </div>

        {/* Standards mapping */}
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Mapped standards <span className="font-normal normal-case">({Array.isArray(m.standards) ? m.standards.length : 0} selected)</span></p>
          <div className="space-y-2">
            {stdCat.map(fw => (
              <div key={fw.framework}>
                <p className="mb-1 text-[11px] font-medium text-neutral-dark">{fw.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {fw.items.map((it: any) => {
                    const on = Array.isArray(m.standards) && m.standards.some((s: any) => s.framework === fw.framework && s.code === it.code)
                    return <button key={it.code} onClick={() => toggleStandard(fw.framework, it.code, it.label)} className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${on ? 'bg-teal text-white' : 'bg-gray-100 text-neutral-mid hover:bg-gray-200'}`}>{it.label}</button>
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-gray-400">Selections save with the module (Save draft / Approve).</p>
        </div>

        {/* Attestation status */}
        {m.attested_by_name && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50/60 p-2.5 text-xs text-green-700">
            <ShieldCheck size={13} className="mr-1 inline" /> Attested by <strong>{m.attested_by_name}</strong>{m.attested_by_role ? `, ${m.attested_by_role}` : ''}{m.attested_at ? ` on ${fmtDate(m.attested_at)}` : ''}.
          </div>
        )}

        {/* CPD accreditation flag */}
        <label className="mt-4 flex items-start gap-2 rounded-lg border border-gray-200 p-2.5 text-xs">
          <input type="checkbox" checked={!!m.cpd_accredited} onChange={e => setField('cpd_accredited', e.target.checked)} className="mt-0.5 accent-teal" />
          <span>
            <span className="font-medium text-neutral-dark">CPD accredited</span> — when on, certificates for this module show the <strong>CPD Certified</strong> mark + CPD hours.
            <span className="mt-0.5 block text-gray-400">Only enable once The CPD Certification Service has formally accredited this module. Set the provider number via the <code className="rounded bg-gray-100 px-1">CPD_PROVIDER_NUMBER</code> env var.</span>
          </span>
        </label>

        {/* Independent external review */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Independent external review</p>
            <button onClick={createReviewLink} disabled={creatingLink} className="inline-flex items-center gap-1 rounded-lg border border-teal/30 bg-white px-2.5 py-1 text-xs font-semibold text-teal hover:bg-teal hover:text-white disabled:opacity-50">{creatingLink ? <><Loader2 size={12} className="animate-spin" /> Creating…</> : <><Share2 size={12} /> Send for external review</>}</button>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Generates a password-protected, read-only link (30 days) for a specialist outside CareStream to review &amp; sign off. Their approval enables publishing.</p>

          {newLink && (
            <div className="mt-3 rounded-lg border border-teal/30 bg-teal-light/20 p-3">
              <p className="mb-2 text-xs font-semibold text-teal-dark">Link created — share the link and password <strong>separately</strong> with your reviewer:</p>
              <div className="mb-1.5 flex items-center gap-2">
                <input readOnly value={reviewUrl(newLink.token)} className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px]" />
                <button onClick={() => copy('link', reviewUrl(newLink.token))} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-white transition-colors ${copied === 'link' ? 'bg-green-500' : 'bg-teal'}`}>{copied === 'link' ? <><CheckCircle2 size={11} /> Copied</> : 'Copy link'}</button>
              </div>
              <div className="flex items-center gap-2">
                <input readOnly value={newLink.password} className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-mono tracking-wider" />
                <button onClick={() => copy('password', newLink.password)} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-white transition-colors ${copied === 'password' ? 'bg-green-500' : 'bg-teal'}`}>{copied === 'password' ? <><CheckCircle2 size={11} /> Copied</> : 'Copy password'}</button>
              </div>
              <p className="mt-1.5 text-[10px] text-gray-400">The password is shown once. It can&apos;t be recovered — note it now.</p>
            </div>
          )}

          {reviewLinks.length > 0 && (
            <div className="mt-3 space-y-2">
              {reviewLinks.map(l => (
                <div key={l.id} className="rounded-lg border border-gray-200 p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${l.status === 'approved' ? 'bg-green-50 text-green-600' : l.status === 'changes_requested' ? 'bg-amber-50 text-amber-600' : l.status === 'revoked' || l.status === 'superseded' ? 'bg-gray-100 text-neutral-mid' : 'bg-blue-50 text-blue-600'}`}>
                      {l.status === 'approved' ? 'Approved' : l.status === 'changes_requested' ? 'Changes requested' : l.status === 'revoked' ? 'Revoked' : l.status === 'superseded' ? 'Superseded (content changed)' : 'Awaiting review'}
                    </span>
                    <span className="text-[10px] text-gray-400">Sent {fmtDate(l.created_at)} · expires {fmtDate(l.expires_at)}</span>
                  </div>
                  {l.reviewer_name && <p className="mt-1 text-neutral-dark">{l.decision === 'approved' ? 'Approved' : 'Reviewed'} by <strong>{l.reviewer_name}</strong>{l.reviewer_role ? `, ${l.reviewer_role}` : ''}{l.reviewer_org ? ` (${l.reviewer_org})` : ''}{l.decided_at ? ` · ${fmtDate(l.decided_at)}` : ''}</p>}
                  {l.comments && <p className="mt-1 rounded bg-neutral-light/60 p-1.5 text-neutral-mid">&ldquo;{l.comments}&rdquo;</p>}
                  {Array.isArray(l.item_feedback) && l.item_feedback.filter((it: any) => it.status === 'changes_requested').length > 0 && (
                    <div className="mt-2">
                      <p className="mb-1 text-[11px] font-semibold text-amber-600">Changes requested ({l.item_feedback.filter((it: any) => it.status === 'changes_requested' && !it.resolved).length} open):</p>
                      <div className="space-y-1">
                        {l.item_feedback.filter((it: any) => it.status === 'changes_requested').map((it: any) => (
                          <div key={it.ref} className={`flex items-start gap-2 rounded border p-1.5 ${it.resolved ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-amber-200 bg-amber-50/50'}`}>
                            <input type="checkbox" checked={!!it.resolved} onChange={e => resolveItem(l.id, it.ref, e.target.checked)} className="mt-0.5 accent-teal" title="Mark addressed" />
                            <span className={it.resolved ? 'line-through' : ''}><span className="font-medium text-neutral-dark">{it.label}:</span> <span className="text-neutral-mid">{it.note || '(no detail)'}</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {l.stale && l.status === 'approved' && <p className="mt-1 flex items-center gap-1 text-amber-600"><AlertTriangle size={11} /> Content changed since this approval — send a fresh link.</p>}
                  <div className="mt-1.5 flex gap-2">
                    {l.status === 'approved' && !l.stale && !m.approved && <button onClick={() => publishExternal(l.id)} disabled={saving} className="rounded-md bg-teal px-2 py-1 text-[11px] font-semibold text-white hover:bg-teal-dark disabled:opacity-50">Publish citing this approval</button>}
                    {l.status === 'pending' && <button onClick={() => revokeLink(l.id)} className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-neutral-mid hover:text-red-500">Revoke</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* External validation share — a password-protected /validate link that plays the module
            step-by-step, exactly as staff see it. For sharing with outside companies to validate. */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Share for external validation</p>
            <button
              onClick={() => setShare(!m.share_enabled)}
              disabled={shareBusy}
              role="switch"
              aria-checked={!!m.share_enabled}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${m.share_enabled ? 'bg-teal' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${m.share_enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Generates a password-protected public link that plays this module step-by-step (lesson sections then the assessment, with the correct answers shown) — exactly how staff experience it. Use it to let an outside company review the module without a CareStream login.</p>

          {m.share_enabled && m.share_token && (
            <div className="mt-3 rounded-lg border border-teal/30 bg-teal-light/20 p-3">
              <p className="mb-2 text-xs font-semibold text-teal-dark">Link is live — share the link and password with the company:</p>
              <div className="mb-1.5 flex items-center gap-2">
                <input readOnly value={validateUrl(m.share_token)} className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px]" />
                <button onClick={() => copyShare('link', validateUrl(m.share_token))} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-white transition-colors ${shareCopied === 'link' ? 'bg-green-500' : 'bg-teal'}`}>{shareCopied === 'link' ? <><CheckCircle2 size={11} /> Copied</> : 'Copy link'}</button>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <input readOnly value={m.share_password ?? ''} className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-mono tracking-wider" />
                <button onClick={() => copyShare('pw', m.share_password ?? '')} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-white transition-colors ${shareCopied === 'pw' ? 'bg-green-500' : 'bg-teal'}`}>{shareCopied === 'pw' ? <><CheckCircle2 size={11} /> Copied</> : 'Copy password'}</button>
              </div>
              <div className="flex items-center gap-2 border-t border-teal/20 pt-2">
                <input value={sharePw} onChange={e => setSharePw(e.target.value)} placeholder="Set a new password" className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px]" />
                <button onClick={updateSharePw} disabled={shareBusy || !sharePw.trim()} className="rounded-md border border-teal/30 bg-white px-2 py-1 text-[11px] font-semibold text-teal hover:bg-teal hover:text-white disabled:opacity-50">{shareBusy ? 'Saving…' : 'Update password'}</button>
              </div>
              <p className="mt-1.5 text-[10px] text-gray-400">Turning the toggle off disables the link immediately. The same link returns when you turn it back on.</p>
            </div>
          )}
        </div>
      </div>

      {specOpen && <CourseSpecification m={m} qa={qa} onClose={() => setSpecOpen(false)} />}

      {/* Attestation modal */}
      {attestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <p className="mb-1 flex items-center gap-1.5 text-base font-bold text-neutral-dark"><ShieldCheck size={18} className="text-teal" /> Attest &amp; publish</p>
            <p className="mb-4 text-xs text-neutral-mid">All automated quality checks have passed. Confirm your review to publish this module to all tenants as a CPD-governed standard module.</p>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Your name</label>
            <input value={revName} onChange={e => setRevName(e.target.value)} className={`${INPUT} mb-2`} placeholder="e.g. Jane Smith" />
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Your role</label>
            <input value={revRole} onChange={e => setRevRole(e.target.value)} className={`${INPUT} mb-3`} placeholder="e.g. Registered Manager / Clinical Lead" />
            <label className="mb-2 flex items-start gap-2 text-xs text-neutral-dark"><input type="checkbox" checked={attest1} onChange={e => setAttest1(e.target.checked)} className="mt-0.5 accent-teal" /> I confirm the content is accurate, safe, and grounded in the cited sources.</label>
            <label className="mb-4 flex items-start gap-2 text-xs text-neutral-dark"><input type="checkbox" checked={attest2} onChange={e => setAttest2(e.target.checked)} className="mt-0.5 accent-teal" /> I confirm it meets the stated learning outcomes and the mapped standards.</label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAttestOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light">Cancel</button>
              <button onClick={confirmAttest} disabled={saving || !revName.trim() || !revRole.trim() || !attest1 || !attest2} className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{saving ? 'Publishing…' : <><ShieldCheck size={14} /> Attest &amp; publish</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Bulk approve ─────────────────────────────────────────────────────────────
// One named attestation applied to every draft in the current tab. Previews first
// (dry run) so you see exactly what would publish and what would be skipped, and
// why, before anything is written. The Annual Training (CPD) set is never included.
function BulkApprovePanel({
  api, scope, careSetting, scopeLabel, onClose, onDone,
}: {
  api: any
  scope: 'universal' | 'setting'
  careSetting?: string
  scopeLabel: string
  onClose: () => void
  onDone: () => void
}) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [busy, setBusy] = useState<'preview' | 'apply' | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const base = { scope, care_setting: careSetting, include_annual: false }

  async function run(dry: boolean) {
    if (!name.trim() || !role.trim()) { setError('Enter the reviewer name and role first.'); return }
    setBusy(dry ? 'preview' : 'apply'); setError('')
    try {
      const r = await api.standardTraining.bulkApprove({ ...base, reviewer_name: name.trim(), reviewer_role: role.trim(), dry_run: dry })
      if (dry) setPreview(r); else { setResult(r); setPreview(null) }
    } catch (e: any) {
      setError(e?.message ?? 'Failed.')
    } finally { setBusy(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-5 shadow-card">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-dark">Bulk approve drafts</h2>
            <p className="mt-0.5 text-sm text-neutral-mid">
              Scope: <strong>{scopeLabel}</strong>. The Annual Training (CPD) set is excluded.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="shrink-0 text-xl leading-none text-neutral-mid hover:text-neutral-dark">&times;</button>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          This writes the same named attestation to every module it publishes, exactly as approving them one by one
          does. It is an <strong>internal</strong> attestation — it never marks a module as independently reviewed.
          Modules failing a quality hard-check are skipped, not published.
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Reviewer name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" />
          <input value={role} onChange={e => setRole(e.target.value)} placeholder="Reviewer role / qualification"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" />
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => run(true)} disabled={!!busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50">
            {busy === 'preview' ? <><Loader2 size={14} className="animate-spin" /> Checking…</> : <><Eye size={14} /> Preview</>}
          </button>
          {preview && preview.approved.length > 0 && (
            <button onClick={() => run(false)} disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
              {busy === 'apply' ? <><Loader2 size={14} className="animate-spin" /> Publishing…</> : <><ShieldCheck size={14} /> Attest &amp; publish {preview.approved.length}</>}
            </button>
          )}
        </div>

        {(preview || result) && (() => {
          const r = result ?? preview
          return (
            <div className="mt-4 space-y-3 text-sm">
              {result && (
                <p className="rounded-lg border border-green-200 bg-green-50 p-3 font-medium text-green-800">
                  Published {result.approved.length} module{result.approved.length === 1 ? '' : 's'}.
                  {result.skipped.length > 0 && ` ${result.skipped.length} skipped.`}
                </p>
              )}
              {!result && (
                <p className="text-neutral-mid">
                  {r.total_candidates} draft{r.total_candidates === 1 ? '' : 's'} in scope · <strong className="text-neutral-dark">{r.approved.length} would publish</strong>
                  {r.skipped.length > 0 && <> · {r.skipped.length} would be skipped</>}
                </p>
              )}

              {r.excluded_annual?.length > 0 && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 text-xs text-indigo-900">
                  <strong>Excluded (Annual Training / CPD set — handle separately):</strong> {r.excluded_annual.join(', ')}
                </div>
              )}

              {r.approved.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-700">
                    {result ? 'Published' : 'Will publish'} ({r.approved.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-md border border-gray-100 p-2 text-xs text-neutral-dark">
                    {r.approved.map((m: any) => <p key={m.id}>✓ {m.name}</p>)}
                  </div>
                </div>
              )}

              {r.skipped.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Skipped — fix these, then run again ({r.skipped.length})
                  </p>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-amber-100 bg-amber-50/40 p-2 text-xs">
                    {r.skipped.map((m: any) => (
                      <p key={m.id} className="text-neutral-dark">✗ {m.name} — <span className="text-amber-700">{m.reason}</span></p>
                    ))}
                  </div>
                </div>
              )}

              {result && (
                <button onClick={onDone} className="rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark">
                  Done — refresh the library
                </button>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
