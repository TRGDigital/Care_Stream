'use client'

// Policy upload modals — extracted from the policies page and lazy-loaded
// (next/dynamic) so this code is only fetched when a user opens an upload dialog.

import { useState, useRef, useCallback } from 'react'
import { createApiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { X, AlertCircle, CheckCircle, FolderUp, Pencil, RefreshCw } from 'lucide-react'

type CategoryOption = { value: string; label: string }

export function UploadModal({
  token,
  sections,
  categories,
  onClose,
  onUploaded,
}: {
  token:      string
  sections:   string[]
  categories: CategoryOption[]
  onClose:    () => void
  onUploaded: () => void
}) {
  const [name,     setName]     = useState('')
  const [category, setCategory] = useState('internal_policy')
  const [section,  setSection]  = useState('')
  const [file,     setFile]     = useState<File | null>(null)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Please select a file.'); return }
    setError('')
    setLoading(true)

    const form = new FormData()
    form.append('file', file)
    form.append('name', name || file.name.replace(/\.[^.]+$/, ''))
    form.append('document_category', category)
    if (category === 'internal_policy' && section) form.append('section', section)

    const api = createApiClient(token)
    const res = await api.policies.upload(form)

    setLoading(false)
    if (!res.success) {
      setError(res.error?.message ?? 'Upload failed.')
      return
    }
    onUploaded()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-card bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-dark">Upload policy</h2>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">
              Policy name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Falls Prevention Policy"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            >
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          {category === 'internal_policy' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Section</label>
              <select
                value={section}
                onChange={e => setSection(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              >
                <option value="">— none —</option>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">
              Document (PDF, DOCX, ODT, or TXT)
            </label>
            <div
              className="flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-neutral-mid hover:border-teal"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <span className="text-neutral-dark">{file.name}</span>
              ) : (
                <span>Click to select a file</span>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.odt,.txt"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-status-error">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Bulk Upload Modal ────────────────────────────────────────────────────────

type BulkFile = {
  file:     File
  name:     string
  editing:  boolean
  status:   'pending' | 'done' | 'error' | 'skipped'
  error?:   string
}

type DupCheck = {
  classification: 'new' | 'exact_duplicate' | 'name_match'
  existing?: { id: string; name: string; version: number }
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Reject if a request hangs past `ms` so the upload loop reconciles against the
// server instead of freezing forever on a lost/slow response.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

function deriveNameFromFile(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/^[\d]+[\s.\-_]*/, '')   // strip leading number (e.g. "538 ", "001_", "12. ")
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function BulkUploadModal({
  token,
  sections,
  categories,
  onClose,
  onUploaded,
}: {
  token:      string
  sections:   string[]
  categories: CategoryOption[]
  onClose:    () => void
  onUploaded: () => void
}) {
  const [files,    setFiles]    = useState<BulkFile[]>([])
  const [category, setCategory] = useState('internal_policy')
  const [section,  setSection]  = useState('')
  const [uploading, setUploading] = useState(false)
  const [done,      setDone]      = useState(false)
  const [dragOver,  setDragOver]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Pre-flight duplicate detection (by content hash + name).
  const [phase,     setPhase]     = useState<'select' | 'review'>('select')
  const [checking,  setChecking]  = useState(false)
  const [checks,    setChecks]    = useState<Record<string, DupCheck>>({})       // by filename
  const [decisions, setDecisions] = useState<Record<string, 'replace' | 'keep'>>({}) // name_match → choice

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const accepted = Array.from(incoming).filter(f =>
      /\.(pdf|docx|odt|txt)$/i.test(f.name)
    )
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.file.name + f.file.size))
      const novel = accepted
        .filter(f => !existing.has(f.name + f.size))
        .map(f => ({ file: f, name: deriveNameFromFile(f.name), editing: false, status: 'pending' as const }))
      return [...prev, ...novel]
    })
  }, [])

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
  }

  function setName(i: number, value: string) {
    setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, name: value } : f))
  }

  function toggleEdit(i: number) {
    setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, editing: !f.editing } : f))
  }

  // Step 1 — hash files, ask the server which are duplicates / updates, then
  // show the review screen. Falls back to a direct upload if the check fails.
  async function runPreflight() {
    if (files.length === 0) return
    setChecking(true)
    const api = createApiClient(token)
    try {
      const payload = await Promise.all(files.map(async f => ({
        filename: f.file.name, name: f.name, hash: await sha256Hex(f.file),
      })))
      // Check in chunks (the endpoint takes ≤200 at a time) so any number of
      // selected files works.
      const result: Array<{ filename: string; classification: DupCheck['classification']; existing?: DupCheck['existing'] }> = []
      for (let i = 0; i < payload.length; i += 200) {
        const { checks } = await api.policies.check(payload.slice(i, i + 200))
        result.push(...checks)
      }
      const map: Record<string, DupCheck> = {}
      for (const c of result) {
        map[c.filename] = { classification: c.classification, existing: c.existing }
      }
      setChecks(map)
      setDecisions({})  // no default — the admin must explicitly choose Replace / Keep both
      setPhase('review')
    } catch {
      // Pre-flight unavailable — don't block; upload directly (server still
      // auto-skips exact duplicates as a fail-safe).
      await runUpload(true)
    } finally {
      setChecking(false)
    }
  }

  // Step 2 — upload. Exact duplicates are skipped; name matches the admin chose
  // to "replace" go through the versioning endpoint; everything else is a new
  // policy, uploaded in size-bounded batches (Vercel's 4.5MB body limit).
  async function runUpload(skipChecks = false, subset?: BulkFile[]) {
    setUploading(true)
    setDone(false)
    const api = createApiClient(token)
    const list = subset ?? files

    const succeeded = new Set<string>()
    const errored   = new Map<string, string>()
    const skipped   = new Set<string>()

    const toBulk: BulkFile[] = []
    const toReplace: BulkFile[] = []
    for (const f of list) {
      const c = skipChecks ? undefined : checks[f.file.name]
      if (c?.classification === 'exact_duplicate') { skipped.add(f.file.name); continue }
      if (c?.classification === 'name_match' && decisions[f.file.name] === 'replace' && c.existing) { toReplace.push(f); continue }
      toBulk.push(f)
    }

    const flush = () => setFiles(prev => prev.map(f => ({
      ...f,
      status: succeeded.has(f.file.name) ? 'done'
            : skipped.has(f.file.name)   ? 'skipped'
            : errored.has(f.file.name)   ? 'error' : f.status,
      error:  errored.get(f.file.name),
    })))
    flush()

    // Replacements (new version of an existing policy) — one request each.
    for (const f of toReplace) {
      const c = checks[f.file.name]!
      const form = new FormData()
      form.append('file', f.file)
      const vres = await api.policies.version(c.existing!.id, form).catch(() => null)
      if (vres?.success) succeeded.add(f.file.name)
      else errored.set(f.file.name, 'Replace failed — try again.')
      flush()
    }

    // New / keep-both → size-bounded batches under the 4.5MB body limit.
    const MAX_BATCH_BYTES = 4 * 1024 * 1024
    const MAX_BATCH_FILES = 20
    const batches: BulkFile[][] = []
    let current: BulkFile[] = []
    let currentBytes = 0
    for (const f of toBulk) {
      if (current.length > 0 && (currentBytes + f.file.size > MAX_BATCH_BYTES || current.length >= MAX_BATCH_FILES)) {
        batches.push(current); current = []; currentBytes = 0
      }
      current.push(f); currentBytes += f.file.size
    }
    if (current.length > 0) batches.push(current)

    for (const batch of batches) {
      const form = new FormData()
      batch.forEach(f => form.append('files', f.file))
      form.append('document_category', category)
      if (category === 'internal_policy' && section) form.append('section', section)
      form.append('names', JSON.stringify(batch.map(f => f.name)))

      // Cap each batch at 90s — if it hangs, fall through to the reconcile path
      // (re-fetch the policy list) rather than freezing the whole upload.
      const res = await withTimeout(api.policies.bulkUpload(form), 90_000).catch(() => null)
      if (res?.results) {
        ;(res.results as any[]).forEach(r => succeeded.add(r.filename))
        ;(res.errors ?? []).forEach((e: any) => errored.set(e.filename, e.error))
        ;(res.skipped ?? []).forEach((s: any) => skipped.add(s.filename))  // server-side exact-dup fail-safe
      } else {
        // Request lost — reconcile against the server so files that landed aren't
        // falsely marked failed (and we never invite a duplicate re-upload).
        try {
          const data: any = await api.policies.list()
          const landed = new Set<string>((data?.policies ?? data ?? []).map((p: any) => p.filename))
          batch.forEach(f => landed.has(f.file.name)
            ? succeeded.add(f.file.name)
            : errored.set(f.file.name, 'Could not confirm — check the policy list before re-uploading.'))
        } catch {
          batch.forEach(f => errored.set(f.file.name, 'Upload response was lost — check the policy list before re-uploading.'))
        }
      }
      flush()
    }

    // Final guard: anything the server never confirmed (not done/skipped/errored)
    // must be surfaced, never left as a silent 'pending'.
    list.forEach(f => {
      if (!succeeded.has(f.file.name) && !skipped.has(f.file.name) && !errored.has(f.file.name)) {
        errored.set(f.file.name, 'Not confirmed by the server — please re-upload this file.')
      }
    })
    flush()

    setUploading(false)
    setDone(true)
  }

  // Re-upload just the files that failed — reuses the files already in the
  // browser, so the admin doesn't have to find them on disk again. Server-side
  // dedup skips any that actually landed, so this never creates duplicates.
  async function retryFailed() {
    const failed = files.filter(f => f.status === 'error')
    if (failed.length === 0) return
    setFiles(prev => prev.map(f => f.status === 'error' ? { ...f, status: 'pending', error: undefined } : f))
    await runUpload(true, failed)
  }

  const doneCount    = files.filter(f => f.status === 'done').length
  const errorCount   = files.filter(f => f.status === 'error').length
  const skippedCount = files.filter(f => f.status === 'skipped').length

  // Review-phase tallies.
  const reviewNew     = files.filter(f => (checks[f.file.name]?.classification ?? 'new') === 'new').length
  const reviewExact   = files.filter(f => checks[f.file.name]?.classification === 'exact_duplicate').length
  const reviewMatches = files.filter(f => checks[f.file.name]?.classification === 'name_match')
  const allMatchesDecided = reviewMatches.every(f => decisions[f.file.name] !== undefined)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="flex w-full max-w-2xl flex-col rounded-card bg-white shadow-xl" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-dark">Bulk upload policies</h2>
            <p className="mt-0.5 text-xs text-neutral-mid">PDF, DOCX, ODT, or TXT files — upload as many as you need at once. Names are auto-detected from filenames — click the pencil to edit.</p>
          </div>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Category — only while selecting files; locked in once you reach the review step */}
          {phase === 'select' && !done && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-neutral-dark whitespace-nowrap">Category (all files):</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={uploading}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              >
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {category === 'internal_policy' && (
                <>
                  <label className="text-sm font-medium text-neutral-dark whitespace-nowrap">Section:</label>
                  <select
                    value={section}
                    onChange={e => setSection(e.target.value)}
                    disabled={uploading}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                  >
                    <option value="">— none —</option>
                    {sections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </>
              )}
            </div>
          )}

          {/* Drop zone */}
          {phase === 'select' && !done && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-8 text-sm transition-colors ${dragOver ? 'border-teal bg-teal/5' : 'border-gray-300 hover:border-teal'}`}
            >
              <FolderUp size={28} className="mb-2 text-neutral-mid" />
              <span className="text-neutral-mid">
                {files.length === 0
                  ? 'Drop files here or click to select (PDF, DOCX, ODT, TXT)'
                  : `${files.length} file${files.length !== 1 ? 's' : ''} selected — drop more or click to add`}
              </span>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.odt,.txt"
                className="hidden"
                onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
              />
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="rounded-md border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-2 text-xs font-medium text-neutral-mid">Policy name</th>
                    <th className="px-4 py-2 text-xs font-medium text-neutral-mid">File</th>
                    <th className="px-4 py-2 text-xs font-medium text-neutral-mid w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-2">
                        {f.editing ? (
                          <input
                            autoFocus
                            value={f.name}
                            onChange={e => setName(i, e.target.value)}
                            onBlur={() => toggleEdit(i)}
                            onKeyDown={e => e.key === 'Enter' && toggleEdit(i)}
                            className="w-full rounded border border-teal px-2 py-0.5 text-sm outline-none"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-neutral-dark">{f.name}</span>
                            {!done && (
                              <button onClick={() => toggleEdit(i)} className="text-neutral-mid hover:text-teal">
                                <Pencil size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-neutral-mid text-xs truncate max-w-[180px]">
                        {f.file.name}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {f.status === 'done'  && <CheckCircle size={16} className="ml-auto text-status-success" />}
                        {f.status === 'skipped' && <span className="text-xs font-medium text-neutral-mid">skipped</span>}
                        {f.status === 'error' && (
                          <span title={f.error} className="ml-auto block">
                            <AlertCircle size={16} className="text-status-error" />
                          </span>
                        )}
                        {f.status === 'pending' && !uploading && phase === 'select' && (
                          <button onClick={() => removeFile(i)} className="text-neutral-mid hover:text-status-error">
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Upload in progress — sits right where the Upload button is, so no scrolling back up */}
          {uploading && (
            <div className="flex items-center gap-3 rounded-md border border-teal/20 bg-teal/5 px-4 py-3 text-sm">
              <RefreshCw size={16} className="shrink-0 animate-spin text-teal" />
              <div>
                <p className="font-medium text-neutral-dark">Uploading your policies… please keep this window open.</p>
                <p className="mt-0.5 text-xs text-neutral-mid">
                  {doneCount} uploaded{skippedCount > 0 ? `, ${skippedCount} skipped` : ''}{errorCount > 0 ? `, ${errorCount} failed` : ''} of {files.length}. Larger batches can take a minute.
                </p>
              </div>
            </div>
          )}

          {/* Duplicate review (before upload) */}
          {phase === 'review' && !done && (
            <div className="space-y-3">
              <div className="rounded-md border border-teal/20 bg-teal/5 px-4 py-3 text-sm">
                <p className="flex items-center gap-1.5 font-medium text-neutral-dark">
                  <CheckCircle size={16} className="text-status-success" />
                  Duplicate check complete
                </p>
                <p className="mt-1 text-neutral-mid text-xs">
                  <span className="font-medium text-neutral-dark">{reviewNew}</span> new
                  {reviewExact > 0 && <> · <span className="font-medium text-amber-600">{reviewExact}</span> identical (will skip)</>}
                  {reviewMatches.length > 0 && <> · <span className="font-medium text-blue-600">{reviewMatches.length}</span> match an existing policy</>}
                </p>
                <p className="mt-2 text-xs text-neutral-dark">
                  {reviewMatches.length === 0
                    ? <>Nothing to review — press <strong>“Upload”</strong> at the bottom to start uploading.</>
                    : allMatchesDecided
                      ? <>All set — press <strong>“Upload”</strong> at the bottom to continue.</>
                      : <>Choose <strong>Replace</strong> or <strong>Keep both</strong> for each match below. The upload won&rsquo;t start until all are answered.</>}
                </p>
              </div>

              {reviewMatches.length > 0 && (
                <div className="rounded-md border border-blue-100 bg-blue-50/40 px-4 py-3">
                  <p className="mb-2 text-sm font-medium text-neutral-dark">These match a policy you already have — replace it, or keep both?</p>
                  <div className="space-y-2">
                    {reviewMatches.map(f => {
                      const ex = checks[f.file.name]?.existing
                      const choice = decisions[f.file.name]   // undefined until the admin chooses
                      return (
                        <div key={f.file.name} className={`flex flex-wrap items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-sm ${choice ? 'border-gray-100' : 'border-amber-200'}`}>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-neutral-dark">{f.name}</p>
                            <p className="truncate text-xs text-neutral-mid">
                              matches “{ex?.name}” (v{ex?.version}){!choice && <span className="ml-1 font-medium text-amber-600">— choose one</span>}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            {(['replace', 'keep'] as const).map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setDecisions(d => ({ ...d, [f.file.name]: opt }))}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${choice === opt ? 'bg-teal text-white ring-2 ring-teal/30' : 'border border-gray-200 text-neutral-mid hover:bg-neutral-light'}`}
                              >
                                {opt === 'replace' ? `Replace (→ v${(ex?.version ?? 1) + 1})` : 'Keep both'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary after upload */}
          {done && (() => {
            const failedFiles  = files.filter(f => f.status === 'error')
            const skippedFiles = files.filter(f => f.status === 'skipped')
            return (
              <div className="rounded-md border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                <p className="font-medium text-neutral-dark">
                  {doneCount} of {files.length} uploaded successfully.
                  {skippedCount > 0 && <span className="ml-1 text-neutral-mid">{skippedCount} skipped (duplicates).</span>}
                  {errorCount > 0 && <span className="ml-1 text-status-error">{errorCount} failed.</span>}
                </p>

                {failedFiles.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-semibold text-status-error">Did not upload:</p>
                    <ul className="space-y-1">
                      {failedFiles.map(f => (
                        <li key={f.file.name} className="flex items-start gap-1.5 text-xs">
                          <AlertCircle size={13} className="mt-0.5 shrink-0 text-status-error" />
                          <span className="text-neutral-dark"><span className="font-medium">{f.file.name}</span>{f.error ? <span className="text-neutral-mid"> — {f.error}</span> : null}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={retryFailed}
                      disabled={uploading}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-60"
                    >
                      <RefreshCw size={13} className={uploading ? 'animate-spin' : ''} />
                      {uploading ? 'Re-trying…' : `Re-try ${failedFiles.length} failed file${failedFiles.length !== 1 ? 's' : ''}`}
                    </button>
                    <p className="mt-1 text-[11px] text-neutral-mid">No need to find them again — this re-uploads the files you already selected. Any that actually landed are skipped automatically.</p>
                  </div>
                )}

                {skippedFiles.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-semibold text-neutral-mid">Skipped as duplicates:</p>
                    <ul className="space-y-1">
                      {skippedFiles.map(f => (
                        <li key={f.file.name} className="text-xs text-neutral-mid">• {f.file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mt-3 text-neutral-mid text-xs">New policies are now processing — they will become searchable once ingestion completes (usually under a minute each).</p>
              </div>
            )
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <span className="text-xs text-neutral-mid">
            {phase === 'review' && !done && reviewMatches.length > 0 && !allMatchesDecided
              ? <span className="text-amber-600">Answer all {reviewMatches.length} match{reviewMatches.length !== 1 ? 'es' : ''} to continue</span>
              : files.length > 0 && !done && `${files.length} file${files.length !== 1 ? 's' : ''} ready`}
          </span>
          <div className="flex gap-3">
            {done ? (
              <Button variant="success" onClick={onUploaded}>
                <CheckCircle size={15} className="mr-1.5" /> Done — close
              </Button>
            ) : phase === 'review' ? (
              <>
                <Button variant="secondary" onClick={() => setPhase('select')} disabled={uploading}>Back</Button>
                <Button onClick={() => runUpload()} disabled={uploading || (reviewMatches.length > 0 && !allMatchesDecided)}>
                  {uploading ? 'Uploading…' : (() => {
                    const willUpload = files.filter(f => checks[f.file.name]?.classification !== 'exact_duplicate').length
                    return `Upload ${willUpload} file${willUpload !== 1 ? 's' : ''}`
                  })()}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={onClose} disabled={checking}>Cancel</Button>
                <Button onClick={runPreflight} disabled={checking || files.length === 0}>
                  {checking ? 'Checking…' : `Continue (${files.length})`}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function NewVersionModal({
  token,
  policyId,
  policyName,
  onClose,
  onUploaded,
}: {
  token:      string
  policyId:   string
  policyName: string
  onClose:    () => void
  onUploaded: () => void
}) {
  const [file,    setFile]    = useState<File | null>(null)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Please select a replacement file.'); return }
    setError('')
    setLoading(true)

    const form = new FormData()
    form.append('file', file)

    const api = createApiClient(token)
    const res = await api.policies.version(policyId, form)

    setLoading(false)
    if (!res.success) {
      setError(res.error?.message ?? 'Upload failed.')
      return
    }
    onUploaded()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-card bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-dark">Upload new version</h2>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark">
            <X size={20} />
          </button>
        </div>
        <p className="mb-4 text-sm text-neutral-mid">
          Replacing <span className="font-medium text-neutral-dark">{policyName}</span>. The existing
          version will remain active until processing completes.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">
              Replacement document (PDF, DOCX, ODT, or TXT)
            </label>
            <div
              className="flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-neutral-mid hover:border-teal"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <span className="text-neutral-dark">{file.name}</span>
              ) : (
                <span>Click to select a file</span>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.odt,.txt"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-status-error">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Uploading…' : 'Upload new version'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
