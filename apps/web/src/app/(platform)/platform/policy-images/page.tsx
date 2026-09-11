'use client'

// Platform Console → Policy Images.
//
// The shop pages need two libraries of artwork and they are deliberately separate:
// a HERO per policy (the image that opens the intake game on /care-policies/<slug>),
// and one image per piece of LEGISLATION. The 65 policies cite only 57 distinct
// regulations, so keying the law art by regulation means Regulation 13 is drawn once
// and appears on every policy that cites it — 122 images rather than 142.
//
// Generation is one OpenAI image call each, so "Generate all missing" runs them one
// at a time with a visible count and a Stop, rather than firing a hundred at once.

import { useEffect, useState, useRef } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, RefreshCw, ImageIcon, Sparkles, AlertCircle, Square } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const money = (p: number) => `£${(p / 100).toFixed(p % 100 === 0 ? 0 : 2)}`
const full = (u: string | null) => (u ? (/^https?:\/\//.test(u) ? u : `${API_URL}${u}`) : null)

type Policy = { slug: string; title: string; description: string; price_pence: number; image_url: string | null }
type Regulation = { reference_key: string; official_name: string; used_by: number; image_url: string | null }

function Thumb({ url, alt }: { url: string | null; alt: string }) {
  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon size={18} className="text-gray-300" />
        </div>
      )}
    </div>
  )
}

function Row({
  title, sub, url, busy, onGenerate,
}: { title: string; sub: string; url: string | null; busy: boolean; onGenerate: () => void }) {
  return (
    <li className="flex items-center gap-4 px-5 py-3">
      <Thumb url={url} alt={title} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-dark">{title}</p>
        <p className="truncate text-xs text-neutral-mid">{sub}</p>
      </div>
      {!url && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">No image</span>}
      <button
        onClick={onGenerate}
        disabled={busy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark disabled:opacity-50"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : url ? <RefreshCw size={12} /> : <Sparkles size={12} />}
        {busy ? 'Generating' : url ? 'Regenerate' : 'Generate'}
      </button>
    </li>
  )
}

export default function PolicyImagesPage() {
  const token = usePlatformAuth()
  const [policies, setPolicies] = useState<Policy[] | null>(null)
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  // A run is "generate every missing image, one at a time". The ref is what the loop
  // reads, because state updates would not be visible inside an awaited loop.
  const [run, setRun] = useState<{ done: number; total: number; label: string } | null>(null)
  const stopped = useRef(false)

  const load = () => {
    if (!token) return
    createPlatformClient(token).policyImages.list()
      .then(r => { setPolicies(r.policies); setRegulations(r.regulations) })
      .catch((e: Error) => setError(e.message))
  }
  useEffect(load, [token])

  async function genPolicy(slug: string) {
    if (!token) return
    setBusy(`p:${slug}`); setError('')
    try {
      const r = await createPlatformClient(token).policyImages.generatePolicy(slug)
      setPolicies(ps => (ps ?? []).map(p => (p.slug === slug ? { ...p, image_url: r.image_url } : p)))
    } catch (e: any) { setError(`${slug}: ${e.message}`) }
    finally { setBusy(null) }
  }

  async function genRegulation(key: string) {
    if (!token) return
    setBusy(`r:${key}`); setError('')
    try {
      const r = await createPlatformClient(token).policyImages.generateRegulation(key)
      setRegulations(rs => rs.map(x => (x.reference_key === key ? { ...x, image_url: r.image_url } : x)))
    } catch (e: any) { setError(`${key}: ${e.message}`) }
    finally { setBusy(null) }
  }

  async function generateAllMissing() {
    if (!token || !policies) return
    const jobs: Array<{ kind: 'policy' | 'reg'; id: string; label: string }> = [
      ...policies.filter(p => !p.image_url).map(p => ({ kind: 'policy' as const, id: p.slug, label: p.title })),
      ...regulations.filter(r => !r.image_url).map(r => ({ kind: 'reg' as const, id: r.reference_key, label: r.official_name })),
    ]
    if (!jobs.length) return
    stopped.current = false
    setError('')
    for (let i = 0; i < jobs.length; i++) {
      if (stopped.current) break
      const job = jobs[i]
      setRun({ done: i, total: jobs.length, label: job.label })
      try {
        if (job.kind === 'policy') await genPolicy(job.id)
        else await genRegulation(job.id)
      } catch { /* the row keeps its "No image" badge; the run carries on */ }
    }
    setRun(null)
  }

  const missingPolicies = (policies ?? []).filter(p => !p.image_url).length
  const missingRegs = regulations.filter(r => !r.image_url).length
  const missing = missingPolicies + missingRegs
  const total = (policies?.length ?? 0) + regulations.length

  return (
    <PlatformShell>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-neutral-dark">Policy Images</h1>
        <p className="mt-0.5 text-sm text-neutral-mid">
          Artwork for the policy shop pages: one hero per policy, and one image per piece of
          legislation, shared by every policy that cites it.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-neutral-dark">
            {total - missing} of {total} images generated
          </p>
          <p className="text-xs text-neutral-mid">
            {policies === null ? 'Loading…'
              : `${(policies.length) - missingPolicies}/${policies.length} policy heroes · ${regulations.length - missingRegs}/${regulations.length} legislation images`}
          </p>
        </div>
        {run ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-mid">
              {run.done + 1} of {run.total} · {run.label}
            </span>
            <button onClick={() => { stopped.current = true }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-neutral-light">
              <Square size={11} /> Stop
            </button>
          </div>
        ) : (
          <button onClick={generateAllMissing} disabled={!missing}
            title="Generates every missing image, one at a time. Roughly 4p each."
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-xs font-semibold text-white hover:bg-teal/90 disabled:opacity-40">
            <Sparkles size={12} />
            {missing ? `Generate all ${missing} missing` : 'Nothing missing'}
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-800">
          <AlertCircle size={14} className="mt-px shrink-0" /> {error}
        </p>
      )}

      {policies === null ? (
        <p className="text-sm text-neutral-mid">Loading the image library…</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-neutral-dark">Policy heroes <span className="font-normal text-neutral-mid">({policies.length})</span></h2>
              <p className="text-xs text-neutral-mid">One per policy. This is the image that opens the intake on the shop page.</p>
            </div>
            <ul className="divide-y divide-gray-50">
              {policies.map(p => (
                <Row key={p.slug} title={p.title} sub={`${money(p.price_pence)} · /care-policies/${p.slug}`}
                  url={full(p.image_url)} busy={busy === `p:${p.slug}`} onGenerate={() => genPolicy(p.slug)} />
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-neutral-dark">Legislation <span className="font-normal text-neutral-mid">({regulations.length})</span></h2>
              <p className="text-xs text-neutral-mid">
                One per regulation, not per policy. Most-reused first, so the images that appear on
                several pages are the ones worth doing well.
              </p>
            </div>
            <ul className="divide-y divide-gray-50">
              {regulations.map(r => (
                <Row key={r.reference_key} title={r.official_name}
                  sub={`on ${r.used_by} polic${r.used_by === 1 ? 'y' : 'ies'}`}
                  url={full(r.image_url)} busy={busy === `r:${r.reference_key}`}
                  onGenerate={() => genRegulation(r.reference_key)} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </PlatformShell>
  )
}
