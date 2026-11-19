'use client'

// What admins typed into the admin search box and did not find. Read it to decide what to rename, add or build.
import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, SearchX } from 'lucide-react'

type Miss = { query: string; searches: number; accounts: number; last_seen: string; tiers: string[] }

export default function SearchMissesPage() {
  const token = usePlatformAuth()
  const [days, setDays] = useState(30)
  const [rows, setRows] = useState<Miss[] | null>(null)

  useEffect(() => {
    if (!token) return
    setRows(null)
    createPlatformClient(token).searchMisses.list(days).then(d => setRows(d.misses)).catch(() => setRows([]))
  }, [token, days])

  if (!token) return null
  return (
    <PlatformShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-neutral-dark"><SearchX size={20} className="text-teal" /> Admin searches with no result</h1>
            <p className="mt-1 text-sm text-neutral-mid">What admins looked for in the admin search box and did not find. Most asked first. Use it to add search words, rename a feature or decide what to build.</p>
          </div>
          <select value={days} onChange={e => setDays(Number(e.target.value))} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm" aria-label="Period">
            {[7, 30, 90, 365].map(d => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </div>
        {rows === null ? <Loader2 className="animate-spin text-neutral-mid" /> : rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-neutral-mid">No searches without a result in this period.</p>
        ) : (
          <table className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
            <thead className="bg-neutral-light/60 text-left text-xs uppercase tracking-wide text-neutral-mid"><tr><th className="px-3 py-2">Search</th><th className="px-3 py-2">Times</th><th className="px-3 py-2">Accounts</th><th className="px-3 py-2">Plans</th><th className="px-3 py-2">Last</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.query} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-neutral-dark">{r.query}</td>
                  <td className="px-3 py-2">{r.searches}</td>
                  <td className="px-3 py-2">{r.accounts}</td>
                  <td className="px-3 py-2 text-xs text-neutral-mid">{r.tiers.join(', ')}</td>
                  <td className="px-3 py-2 text-xs text-neutral-mid">{new Date(r.last_seen).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PlatformShell>
  )
}
