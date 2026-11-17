'use client'

// Staff hub: "This is me". Warm, readable resident profiles for the care team.
// Everything shown comes from createResidentsClient(token).hub(), which only returns approved content for living residents.

import { useMemo, useState } from 'react'
import { ArrowLeft, Heart, Search } from 'lucide-react'
import type { HubResident, ResidentSectionDef } from '@/lib/residents-api'

// The API sends the real section labels (and their order) with the profiles; this only covers the moment before they arrive.
function fallbackLabel(key: string): string {
  const t = key.replace(/[_-]+/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : key
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function ThisIsMeView({ residents, defs = [] }: { residents: HubResident[]; defs?: ResidentSectionDef[] }) {
  const labelFor = (key: string) => defs.find(d => d.key === key)?.label ?? fallbackLabel(key)
  const orderOf = (key: string) => { const i = defs.findIndex(d => d.key === key); return i < 0 ? 999 : i }
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const open = openId ? residents.find(r => r.id === openId) ?? null : null

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase()
    const list = n
      ? residents.filter(r => [r.display_name, r.first_name, r.preferred_name ?? '', r.room ?? ''].some(v => v.toLowerCase().includes(n)))
      : residents
    return [...list].sort((a, b) => a.display_name.localeCompare(b.display_name, 'en-GB'))
  }, [residents, q])

  if (open) {
    const filled = Object.entries(open.sections ?? {}).filter(([, v]) => typeof v === 'string' && v.trim()).sort((a, b) => orderOf(a[0]) - orderOf(b[0]))
    const updated = fmtDate(open.updated_at)
    return (
      <div className="flex-1 overflow-y-auto bg-neutral-light/40">
        <div className="mx-auto max-w-2xl px-4 py-5">
          <button onClick={() => setOpenId(null)} className="mb-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-base font-medium text-teal hover:bg-white">
            <ArrowLeft size={18} /> Back
          </button>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-bold text-neutral-dark">{open.display_name}</h1>
            <p className="mt-1 text-base text-neutral-mid">
              {[open.age != null ? `Age ${open.age}` : '', open.room ? `Room ${open.room}` : ''].filter(Boolean).join(' · ') || 'This is me'}
            </p>
            {updated && <p className="mt-1 text-sm text-neutral-mid">Updated {updated}</p>}
          </div>
          <div className="mt-4 space-y-3">
            {filled.length === 0 && <p className="rounded-2xl border border-gray-200 bg-white p-5 text-base text-neutral-mid">Nothing has been written for {open.display_name} yet.</p>}
            {filled.map(([key, text]) => (
              <section key={key} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">{labelFor(key)}</h2>
                <p className="mt-2 whitespace-pre-line text-lg leading-relaxed text-neutral-dark">{text}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-light/40">
      <div className="mx-auto max-w-4xl px-4 py-5">
        <div className="flex items-center gap-2">
          <Heart size={22} className="text-teal" />
          <h1 className="text-2xl font-bold text-neutral-dark">This is me</h1>
        </div>
        <p className="mt-2 text-base leading-relaxed text-neutral-mid">Get to know the people you support. Ask the assistant in Chat about any resident too.</p>
        <label className="relative mt-4 block">
          <span className="sr-only">Search residents</span>
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-mid" />
          <input
            type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or room"
            className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-3 text-base text-neutral-dark outline-none focus:border-teal"
          />
        </label>
        {shown.length === 0 ? (
          <p className="mt-6 text-base text-neutral-mid">No one matches that search.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map(r => (
              <li key={r.id}>
                <button onClick={() => setOpenId(r.id)} className="flex min-h-[72px] w-full flex-col items-start rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-teal/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal">
                  <span className="text-lg font-semibold text-neutral-dark">{r.display_name}</span>
                  <span className="mt-0.5 text-sm text-neutral-mid">
                    {[r.age != null ? `Age ${r.age}` : '', r.room ? `Room ${r.room}` : ''].filter(Boolean).join(' · ') || 'View profile'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
