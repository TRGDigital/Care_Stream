'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Sits above the Features list. Two jobs, both of which otherwise need someone with database
// access: bring in the 9 pages that have no row, and preview a page in the rebuilt theme.
//
// The 9 are the 8 cluster pages the content theme assembles from their child capabilities, plus
// web-chat-interface, which was hand-built. The other 44 already hold the approved copy and are
// deliberately untouched — seeding them would replace live copy with a second copy of itself.

export function FeatureSeedBar({ token, onDone }: { token: string; onDone?: () => void }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function seed() {
    setBusy(true); setNote('')
    try {
      const res = await fetch(`${API_URL}/admin/feature-pages/seed`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      const d = (await res.json())?.data ?? {}
      setNote(
        `Added ${d.created?.length ?? 0}, refreshed ${d.updated?.length ?? 0}, ` +
        `left alone ${d.skipped?.length ?? 0}.` + (d.note ? ` ${d.note}` : ''),
      )
      onDone?.()
    } catch {
      setNote('Could not reach the API. Nothing was changed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-neutral-light/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-neutral-mid">
          Eight cluster pages and the web chat page have no content yet. <strong>Import approved
          copy</strong> brings across the wording you signed off in the content theme; the other
          44 feature pages already hold it and are left alone.
          <br />
          To see any page in the rebuilt theme, add <code className="rounded bg-white px-1 py-0.5 text-xs">?v2=1</code> to
          its address. A page must be published before it will load.
        </p>
        <button type="button" onClick={seed} disabled={busy}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-light disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          Import approved copy
        </button>
      </div>
      {note && <p className="rounded-md bg-white px-3 py-2 text-xs text-neutral-dark">{note}</p>}
    </div>
  )
}
