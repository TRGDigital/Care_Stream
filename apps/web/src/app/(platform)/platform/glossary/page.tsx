'use client'

import { useEffect, useState } from 'react'
import { createPlatformClient, type GlossaryTerm } from '@/lib/platform-api'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { PlatformShell } from '@/components/platform-shell'
import { Button } from '@/components/ui/button'
import { Languages, Plus, X, Loader2 } from 'lucide-react'

const INPUT = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

export default function PlatformGlossaryPage() {
  const token = usePlatformAuth()
  const [terms,   setTerms]   = useState<GlossaryTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [newTerm, setNewTerm] = useState('')
  const [newNote, setNewNote] = useState('')
  const [busy,    setBusy]    = useState(false)

  function load() {
    if (!token) return
    createPlatformClient(token).platformGlossary.list()
      .then(r => setTerms(r.terms))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token])

  async function add() {
    const term = newTerm.trim()
    if (!token || !term) return
    setBusy(true); setError('')
    try {
      const r = await createPlatformClient(token).platformGlossary.add({ term, keep: true, note: newNote.trim() })
      setTerms(prev => [...prev, r.term].sort((a, b) => a.term.localeCompare(b.term)))
      setNewTerm(''); setNewNote('')
    } catch (e: any) { setError(e?.message ?? 'Could not add the term.') }
    finally { setBusy(false) }
  }

  async function toggleKeep(t: GlossaryTerm) {
    if (!token) return
    setTerms(prev => prev.map(x => x.id === t.id ? { ...x, keep: !x.keep } : x))   // optimistic
    try { await createPlatformClient(token).platformGlossary.update(t.id, { keep: !t.keep }) }
    catch { setTerms(prev => prev.map(x => x.id === t.id ? { ...x, keep: t.keep } : x)) }
  }

  async function remove(t: GlossaryTerm) {
    if (!token) return
    const prev = terms
    setTerms(p => p.filter(x => x.id !== t.id))   // optimistic
    try { await createPlatformClient(token).platformGlossary.remove(t.id) }
    catch { setTerms(prev) }
  }

  return (
    <PlatformShell>
      <div className="max-w-4xl">
        <div className="mb-2 flex items-center gap-2">
          <Languages size={22} className="text-teal" />
          <h1 className="text-2xl font-bold text-neutral-dark">Universal translation glossary</h1>
        </div>
        <p className="mb-6 max-w-2xl text-sm text-neutral-mid">
          Terms here apply to <strong>every care setting</strong> when CareStream translates training, policies, CQC prep
          and staff messages. Use it for sector-wide words that should always stay in English (e.g. <strong>CQC</strong>,
          <strong> DoLS</strong>, <strong>eMAR</strong>, <strong>NMC</strong>) or add a
          note explaining what a term means so it&rsquo;s translated correctly everywhere. Each care setting can add its own
          terms on top in their Settings, and a care setting&rsquo;s own entry for the same term overrides the universal one.
          Changes take effect within a few minutes.
        </p>

        {error && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Add */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Plus size={14} className="text-teal" /> Add a universal term</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={newTerm} onChange={e => { setNewTerm(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Term, e.g. eMAR" className={`${INPUT} sm:max-w-[34%]`} />
            <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Optional note, e.g. “electronic Medication Administration Record”" className={INPUT} />
            <Button onClick={add} disabled={busy || !newTerm.trim()} size="md">
              {busy ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Plus size={14} className="mr-1.5" />}Add
            </Button>
          </div>
          <p className="mt-2 text-xs text-neutral-mid">New terms default to <strong>Keep in English</strong>. Switch a term to <strong>Translatable</strong> if you only want it to carry a translation note rather than stay in English.</p>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={15} className="animate-spin" /> Loading…</div>
        ) : terms.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-neutral-mid">No universal terms yet. Add sector-wide acronyms like CQC, DoLS, eMAR or NMC to keep them consistent across every care setting.</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {terms.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-dark">{t.term}</p>
                  {t.note && <p className="truncate text-xs text-neutral-mid">{t.note}</p>}
                </div>
                <button
                  onClick={() => toggleKeep(t)}
                  title={t.keep ? 'Kept in English everywhere — click to allow translating this term' : 'Translatable — click to keep this term in English'}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${t.keep ? 'border-teal/30 bg-teal-light/30 text-teal' : 'border-gray-200 bg-neutral-light text-neutral-mid'}`}
                >
                  {t.keep ? 'Keep in English' : 'Translatable'}
                </button>
                <button onClick={() => remove(t)} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-neutral-mid hover:bg-gray-200 hover:text-neutral-dark" title="Remove">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
        {terms.length > 0 && <p className="mt-3 text-xs text-neutral-mid">{terms.length} universal term{terms.length === 1 ? '' : 's'}.</p>}
      </div>
    </PlatformShell>
  )
}
