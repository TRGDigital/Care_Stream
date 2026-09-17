'use client'

// Training > Training Matrix tab. One row per staff member against the training their job
// role requires: digital courses (required training by role, set here), face-to-face topics
// (mandatory by role, set on the Face-to-face tab) and "safe to work" checks (/workforce).

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown, Download, Info, Loader2, Printer, Search, Settings2, ShieldCheck, X,
} from 'lucide-react'
import { createApiClient, type TrainingMatrix, type TrainingMatrixStatus, type TrainingRequirementsConfig } from '@/lib/api-client'
import { MATRIX_STATUS, MatrixBadge, cellSummary } from './training-matrix-shared'

const ALL_STAFF = '*'

const LEGEND: TrainingMatrixStatus[] = ['in_date', 'due_soon', 'expired', 'overdue', 'practical_due', 'in_progress', 'not_started', 'missing', 'none']
const KIND_LABEL = { digital: 'Digital', face_to_face: 'Face-to-face', safe_to_work: 'Workforce' } as const
const GROUP_LABEL = { adhoc: 'Adhoc training', prebuilt: 'Pre-built training', cpd: 'CPD approved courses' } as const

const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

function pctClass(p: number | null) {
  if (p === null) return 'bg-neutral-light text-neutral-mid'
  if (p === 100) return 'bg-green-100 text-green-700'
  if (p >= 80) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function Help() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-teal/20 bg-teal-light/20">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-teal-light/40">
        <Info size={13} className="shrink-0 text-teal" />
        <span className="flex-1 text-xs font-semibold text-teal">How the Training Matrix works</span>
        <ChevronDown size={13} className={`shrink-0 text-teal transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-teal/10 px-4 py-3 text-xs leading-relaxed text-neutral-mid">
          <p><strong className="text-neutral-dark">What it shows</strong>: every staff member against the training their job role requires, in one grid. It is the view an inspector asks for: who is trained, who is not, and what is due next.</p>
          <p><strong className="text-neutral-dark">Required training by role</strong>: choose which digital courses each job role must hold, or pick <em>All staff</em> for training everyone needs. Staff are matched by the job role on their staff profile.</p>
          <p><strong className="text-neutral-dark">Face-to-face</strong>: topics marked mandatory for a role on the <strong>Face-to-face Training</strong> tab appear here automatically, using their attendance and renewal dates. Change them on that tab.</p>
          <p><strong className="text-neutral-dark">Safe to work</strong>: on Enterprise, DBS, right to work, passport, professional registration and references recorded on the <strong>Workforce</strong> page show as one column. Upload and update them on that page.</p>
          <p><strong className="text-neutral-dark">Compliance %</strong>: the share of a staff member&apos;s required training that is in date. A red <strong>!</strong> means the training is required but has not been assigned yet. Every staff member&apos;s record shows the same information.</p>
          <p><strong className="text-neutral-dark">Export</strong>: download a CSV, or print and save as PDF, to hand to an inspector or commissioner.</p>
        </div>
      )}
    </div>
  )
}

export function TrainingMatrixTab({ token, onOpenFaceToFace }: { token: string; onOpenFaceToFace: () => void }) {
  const [data, setData] = useState<TrainingMatrix | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [gapsOnly, setGapsOnly] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)

  function load() {
    if (!token) return
    setLoading(true)
    createApiClient(token).trainingMatrix.get()
      .then(d => { setData(d); setError('') })
      .catch(e => setError(e?.message ?? 'Could not load the training matrix.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token])

  const roles = useMemo(() => {
    const set = new Set<string>()
    let none = false
    for (const r of data?.rows ?? []) { if (r.job_role?.trim()) set.add(r.job_role.trim()); else none = true }
    return { list: [...set].sort((a, b) => a.localeCompare(b)), none }
  }, [data])

  const rows = useMemo(() => (data?.rows ?? []).filter(r => {
    if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false
    if (role === '__none') { if (r.job_role?.trim()) return false }
    else if (role && (r.job_role ?? '').trim() !== role) return false
    if (gapsOnly && r.gaps === 0) return false
    return true
  }), [data, q, role, gapsOnly])

  function exportCsv() {
    if (!data) return
    const esc = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    const head = ['Staff member', 'Job role', 'Compliance %', ...data.columns.map(c => `${c.label} (${KIND_LABEL[c.kind]})`)]
    const lines = [head.map(esc).join(',')]
    for (const r of rows) {
      lines.push([
        r.name, r.job_role ?? '', r.compliance_pct === null ? 'No requirements' : `${r.compliance_pct}%`,
        ...data.columns.map(c => { const cell = r.cells[c.key]; return cell ? cellSummary(c.label, cell).slice(c.label.length + 2) : '' }),
      ].map(v => esc(String(v))).join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `training-matrix-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }

  // A clean printable page (print, or save as PDF) rather than printing the whole console.
  function printMatrix() {
    if (!data) return
    const win = window.open('', '_blank')
    if (!win) return
    const h = (s: string) => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string))
    const colour: Record<string, string> = { in_date: '#dcfce7', due_soon: '#fef3c7', expired: '#fee2e2', overdue: '#fee2e2', practical_due: '#fef3c7', in_progress: '#e0f2f1', not_started: '#f3f4f6', missing: '#fee2e2', none: '#fff', agency: '#f3f4f6' }
    const headCells = data.columns.map(c => `<th><div>${h(c.label)}</div><small>${KIND_LABEL[c.kind]}</small></th>`).join('')
    const body = rows.map(r => `<tr><td class="n"><b>${h(r.name)}</b><br><small>${h(r.job_role ?? 'No job role')}</small></td><td>${r.compliance_pct === null ? '-' : r.compliance_pct + '%'}</td>${
      data.columns.map(c => { const cell = r.cells[c.key]; if (!cell) return '<td></td>'
        const st = MATRIX_STATUS[cell.status]
        const date = cell.valid_until ? `<br><small>to ${fmt(cell.valid_until)}</small>` : ''
        return `<td style="background:${colour[cell.status]}" title="${h(cellSummary(c.label, cell))}">${st.glyph}${date}</td>` }).join('')
    }</tr>`).join('')
    win.document.write(`<!doctype html><html><head><title>Training Matrix</title><style>
      body{font-family:system-ui,sans-serif;font-size:11px;color:#1f2937;margin:24px}
      h1{font-size:18px;margin:0 0 4px}p{margin:0 0 12px;color:#6b7280}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid #e5e7eb;padding:4px;text-align:center;vertical-align:middle}
      th{font-weight:600;font-size:10px}td.n{text-align:left;white-space:nowrap}small{color:#6b7280;font-weight:400}
      .key{margin-top:10px;color:#6b7280}@page{size:landscape;margin:12mm}
    </style></head><body><h1>Training Matrix</h1><p>${rows.length} staff · printed ${fmt(new Date().toISOString())}</p>
    <table><thead><tr><th>Staff member</th><th>Compliance</th>${headCells}</tr></thead><tbody>${body}</tbody></table>
    <p class="key">${LEGEND.map(k => `${MATRIX_STATUS[k].glyph} ${MATRIX_STATUS[k].label}`).join(' &nbsp; ')}</p>
    <script>window.onload=function(){window.print()}</script></body></html>`)
    win.document.close()
  }

  if (loading && !data) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-neutral-mid" /></div>
  if (error && !data) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
  if (!data) return null
  const s = data.summary

  return (
    <div>
      <Help />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Fully compliant staff', value: `${s.fully_compliant}/${s.staff}`, colour: 'text-green-600', bg: 'bg-green-50', note: 'all required training in date' },
          { label: 'Required, not assigned', value: s.missing, colour: 'text-red-600', bg: 'bg-red-50', note: 'assign these first' },
          { label: 'Expired or overdue', value: s.expired_or_overdue, colour: 'text-red-600', bg: 'bg-red-50', note: 'required training lapsed' },
          { label: 'Renewals due in 60 days', value: s.due_soon, colour: 'text-amber-600', bg: 'bg-amber-50', note: 'plan these now' },
        ].map(card => (
          <div key={card.label} className={`rounded-card ${card.bg} border border-white/60 p-4 shadow-sm`}>
            <p className="text-xs font-medium text-neutral-mid">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${card.colour}`}>{card.value}</p>
            <p className="mt-0.5 text-xs text-neutral-mid">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-mid" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search staff"
            className="w-44 rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-sm focus:border-teal focus:outline-none" />
        </div>
        <select value={role} onChange={e => setRole(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal focus:outline-none">
          <option value="">All job roles</option>
          {roles.list.map(r => <option key={r} value={r}>{r}</option>)}
          {roles.none && <option value="__none">No job role set</option>}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-neutral-dark">
          <input type="checkbox" checked={gapsOnly} onChange={e => setGapsOnly(e.target.checked)} className="accent-teal" /> Gaps only
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={() => setConfigOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-teal/90">
            <Settings2 size={14} /> Required training by role
          </button>
          <button onClick={exportCsv} disabled={!rows.length || !data.columns.length} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50">
            <Download size={14} /> CSV
          </button>
          <button onClick={printMatrix} disabled={!rows.length || !data.columns.length} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50">
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      {data.columns.length === 0 ? (
        <div className="rounded-card border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <ShieldCheck size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-neutral-dark">Set the training each role needs</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-mid">Choose the courses each job role must hold and the matrix fills in from your staff&apos;s training, face-to-face attendance and workforce checks.</p>
          <button onClick={() => setConfigOpen(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90">
            <Settings2 size={14} /> Required training by role
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-gray-100 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="sticky left-0 z-10 min-w-[200px] bg-white px-5 py-3 text-left text-xs font-medium text-neutral-mid">Staff member</th>
                {data.columns.map(c => (
                  <th key={c.key} className="min-w-[84px] max-w-[120px] px-2 py-3 text-center text-xs font-medium text-neutral-mid" title={c.label}>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${c.kind === 'digital' ? 'bg-teal/10 text-teal' : c.kind === 'face_to_face' ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>{KIND_LABEL[c.kind]}</span>
                      <span className="leading-tight">{c.label.length > 18 ? c.label.slice(0, 16) + '…' : c.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={data.columns.length + 1} className="px-5 py-8 text-center text-sm text-neutral-mid">No staff match these filters.</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.user_id} className="border-b border-gray-50 last:border-0 hover:bg-neutral-light/30">
                  <td className="sticky left-0 z-10 bg-white px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/staff/${r.user_id}`} className="font-medium text-neutral-dark hover:text-teal">{r.name}</Link>
                        <p className="truncate text-xs text-neutral-mid">{r.job_role || <span className="italic">No job role set</span>}</p>
                      </div>
                      <span title={r.compliance_pct === null ? 'No required training for this role' : `${r.met} of ${r.required} required courses in date`}
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${pctClass(r.compliance_pct)}`}>
                        {r.compliance_pct === null ? 'n/a' : `${r.compliance_pct}%`}
                      </span>
                    </div>
                  </td>
                  {data.columns.map(c => {
                    const cell = r.cells[c.key]
                    if (!cell) return <td key={c.key} />
                    const href = c.kind === 'safe_to_work' ? '/workforce' : `/staff/${r.user_id}`
                    return (
                      <td key={c.key} className="px-2 py-3 text-center">
                        <Link href={href} title={cellSummary(c.label, cell)} className="inline-flex"><MatrixBadge cell={cell} /></Link>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-5 py-3 text-xs text-neutral-mid">
            {LEGEND.map(k => (
              <span key={k} className="flex items-center gap-1.5"><MatrixBadge cell={{ status: k, required: true }} size="sm" />{MATRIX_STATUS[k].label}</span>
            ))}
            <span className="ml-auto">Faded cells are held but not required for that role</span>
          </div>
        </div>
      )}

      {configOpen && (
        <RequirementsModal token={token} onOpenFaceToFace={() => { setConfigOpen(false); onOpenFaceToFace() }}
          onClose={() => setConfigOpen(false)} onSaved={() => { setConfigOpen(false); load() }} />
      )}
    </div>
  )
}

function RequirementsModal({ token, onClose, onSaved, onOpenFaceToFace }: {
  token: string; onClose: () => void; onSaved: () => void; onOpenFaceToFace: () => void
}) {
  const [cfg, setCfg] = useState<TrainingRequirementsConfig | null>(null)
  const [selected, setSelected] = useState<Map<string, Set<string>>>(new Map())
  const [active, setActive] = useState(ALL_STAFF)
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    createApiClient(token).trainingMatrix.requirements().then(c => {
      setCfg(c)
      const m = new Map<string, Set<string>>()
      for (const i of c.items) { if (!m.has(i.job_role)) m.set(i.job_role, new Set()); m.get(i.job_role)!.add(i.module_id) }
      setSelected(m)
    }).catch(e => setError(e?.message ?? 'Could not load the requirements.'))
  }, [token])

  const set = selected.get(active) ?? new Set<string>()
  function toggle(id: string) {
    setSelected(prev => {
      const next = new Map(prev)
      const s = new Set(next.get(active) ?? [])
      if (s.has(id)) s.delete(id); else s.add(id)
      next.set(active, s)
      return next
    })
  }

  async function save() {
    setSaving(true); setError('')
    try {
      const items: Array<{ job_role: string; module_id: string }> = []
      for (const [job_role, ids] of selected) for (const module_id of ids) items.push({ job_role, module_id })
      await createApiClient(token).trainingMatrix.saveRequirements(items)
      onSaved()
    } catch (e: any) { setError(e?.message ?? 'Could not save.') } finally { setSaving(false) }
  }

  const f2fForRole = (cfg?.face_to_face ?? []).filter(m => m.job_role === active)
  const modules = (cfg?.modules ?? []).filter(m => !q || m.name.toLowerCase().includes(q.toLowerCase()))
  const groups = (['adhoc', 'prebuilt', 'cpd'] as const).map(g => ({ g, items: modules.filter(m => m.group === g) })).filter(x => x.items.length)
  const roleList = [{ name: ALL_STAFF, staff: null as number | null }, ...(cfg?.roles ?? [])]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-card bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="font-semibold text-neutral-dark">Required training by role</h2>
            <p className="text-xs text-neutral-mid">Pick a job role, then tick the digital courses it must hold. <em>All staff</em> applies to everyone.</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-neutral-mid hover:bg-neutral-light"><X size={16} /></button>
        </div>
        {!cfg ? (
          <div className="flex justify-center py-16">{error ? <p className="text-sm text-red-600">{error}</p> : <Loader2 className="animate-spin text-neutral-mid" />}</div>
        ) : (
          <div className="grid min-h-0 flex-1 md:grid-cols-[240px_1fr]">
            <div className="overflow-y-auto border-b border-gray-100 p-3 md:border-b-0 md:border-r">
              {roleList.map(r => {
                const n = selected.get(r.name)?.size ?? 0
                return (
                  <button key={r.name} onClick={() => setActive(r.name)}
                    className={`mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${active === r.name ? 'bg-teal/10 font-medium text-teal' : 'text-neutral-dark hover:bg-neutral-light'}`}>
                    <span className="min-w-0">
                      <span className="block truncate">{r.name === ALL_STAFF ? 'All staff' : r.name}</span>
                      {r.staff !== null && <span className="text-xs text-neutral-mid">{r.staff} staff</span>}
                    </span>
                    {n > 0 && <span className="rounded-full bg-teal px-1.5 text-xs font-semibold text-white">{n}</span>}
                  </button>
                )
              })}
              {cfg.roles.length === 0 && <p className="px-3 py-2 text-xs text-neutral-mid">No job roles yet. Set each person&apos;s job role on the Staff page.</p>}
              {cfg.unassigned_staff > 0 && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {cfg.unassigned_staff === 1 ? '1 staff member has' : `${cfg.unassigned_staff} staff have`} no job role, so only <em>All staff</em> training applies to them. <Link href="/staff" className="underline">Set roles on the Staff page</Link>.
                </p>
              )}
            </div>
            <div className="flex min-h-0 flex-col">
              <div className="border-b border-gray-100 px-4 py-3">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-mid" />
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search courses"
                    className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-sm focus:border-teal focus:outline-none" />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {groups.length === 0 && <p className="text-sm text-neutral-mid">No courses match.</p>}
                {groups.map(({ g, items }) => (
                  <div key={g} className="mb-4">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-mid">{GROUP_LABEL[g]}</p>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {items.map(m => (
                        <label key={m.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-dark hover:bg-neutral-light">
                          <input type="checkbox" checked={set.has(m.id)} onChange={() => toggle(m.id)} className="mt-0.5 accent-teal" />
                          <span>{m.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {active !== ALL_STAFF && (
                  <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2.5 text-xs text-neutral-mid">
                    <p className="font-semibold text-indigo-700">Face-to-face for {active}</p>
                    {f2fForRole.length
                      ? <p className="mt-1">{f2fForRole.map(m => m.module_name).join(', ')}</p>
                      : <p className="mt-1">None set.</p>}
                    <button onClick={onOpenFaceToFace} className="mt-1 font-medium text-indigo-700 underline">Change these on the Face-to-face tab</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-3">
          {error && cfg && <p className="mr-auto text-sm text-red-600">{error}</p>}
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light">Cancel</button>
          <button onClick={save} disabled={saving || !cfg} className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />} Save requirements
          </button>
        </div>
      </div>
    </div>
  )
}
