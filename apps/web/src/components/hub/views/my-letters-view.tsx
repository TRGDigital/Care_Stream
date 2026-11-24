'use client'

// Staff hub: My letters. The letters an administrator shared in my hub, newest first with the new ones on top. They stay here as a record (the administrator can withdraw one that
// was sent in error). Opening one shows the headed letter exactly as it was shared, with Print and Download, and "I have read and understood this" when the letter asks for it.
// Full width like the other hub pages, and no scroll bars of our own.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Check, ChevronLeft, Download, FileText, Loader2, Printer } from 'lucide-react'
import { myLetters, fmtLetterDate, type MyLetter } from '@/lib/letters-client'

export function MyLettersView({ initialId, onChanged }: { initialId?: string | null; onChanged?: () => void }) {
  const { data: session } = useSession()
  const token = session?.accessToken
  const viewingAs = !!(session?.user as any)?.impersonation
  const [items, setItems] = useState<MyLetter[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(initialId ?? null)
  const load = useCallback(() => { if (token) myLetters.list(token).then(r => setItems(r.letters)).catch(() => setItems([])) }, [token])
  useEffect(() => { load() }, [load])
  useEffect(() => { setOpenId(initialId ?? null) }, [initialId])
  const current = items?.find(l => l.id === openId) ?? null

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-5xl">
        {openId && token
          ? <Viewer key={openId} token={token} id={openId} letter={current} viewingAs={viewingAs} onBack={() => { setOpenId(null); load(); onChanged?.() }} onChanged={() => { load(); onChanged?.() }} />
          : (<>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-dark"><FileText size={22} className="text-teal" aria-hidden="true" /> My letters</h1>
            <p className="mt-1 text-sm text-neutral-mid">Letters your managers have shared with you. They stay here so you can read, print or download them whenever you need to.</p>
            <div className="mt-5">
              {items === null ? <p className="flex items-center gap-2 text-sm text-neutral-mid" role="status"><Loader2 size={16} className="animate-spin" /> Loading</p>
                : items.length === 0 ? <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-neutral-mid">You have no letters yet.</p>
                : (
                  <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
                    {items.map(l => (
                      <li key={l.id}>
                        <button type="button" onClick={() => setOpenId(l.id)} className="flex min-h-[60px] w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50">
                          <span className="min-w-0">
                            <span className={`block truncate text-base ${l.read_at ? 'font-medium text-neutral-dark' : 'font-bold text-neutral-dark'}`}>{l.title}</span>
                            <span className="block text-xs text-neutral-mid">From {l.from}, {fmtLetterDate(l.shared_at)}</span>
                          </span>
                          <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                            {l.needs_acknowledgement && !l.acknowledged_at && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Please confirm you have read it</span>}
                            {l.acknowledged_at && <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800"><Check size={12} aria-hidden="true" /> Acknowledged</span>}
                            {l.read_at ? <span className="inline-flex items-center gap-1 text-xs text-green-700"><Check size={14} aria-hidden="true" /> Read</span> : <span className="rounded-full bg-teal px-2.5 py-0.5 text-xs font-semibold text-white">New</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </>)}
      </div>
    </div>
  )
}

function Viewer({ token, id, letter, viewingAs, onBack, onChanged }: { token: string; id: string; letter: MyLetter | null; viewingAs: boolean; onBack: () => void; onChanged: () => void }) {
  const [meta, setMeta] = useState<MyLetter | null>(letter)
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const frame = useRef<HTMLIFrameElement>(null)

  useEffect(() => { let live = true; myLetters.get(token, id).then(r => { if (live) setMeta(r.letter) }).catch(() => { if (live) setMissing(true) }); return () => { live = false } }, [token, id])
  useEffect(() => {
    let live = true, made: string | null = null
    myLetters.fileUrl(token, id).then(u => { made = u; if (live) setUrl(u); else URL.revokeObjectURL(u) }).catch(() => { if (live) setError('The letter could not be opened just now. Please try again.') })
    return () => { live = false; if (made) URL.revokeObjectURL(made) }
  }, [token, id])
  // Opening a letter marks it as read (never when someone is only looking at this hub as the person).
  useEffect(() => { if (!viewingAs) myLetters.read(token, id).then(r => { setMeta(m => (m ? { ...m, read_at: m.read_at ?? r.read_at } : m)); onChanged() }).catch(() => undefined) }, [token, id, viewingAs]) // eslint-disable-line react-hooks/exhaustive-deps

  function print() {
    try { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print() }
    catch { if (url) window.open(url, '_blank') }
  }
  function download() {
    if (!url || !meta) return
    const a = document.createElement('a'); a.href = url; a.download = meta.filename || 'letter.pdf'; a.click()
  }
  async function acknowledge() {
    if (busy) return
    setBusy(true); setError('')
    try { const r = await myLetters.acknowledge(token, id); setMeta(m => (m ? { ...m, acknowledged_at: r.acknowledged_at, read_at: m.read_at ?? r.acknowledged_at } : m)); onChanged() }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not record that. Please try again.') } finally { setBusy(false) }
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="inline-flex min-h-[40px] items-center gap-1 text-sm font-medium text-teal hover:underline"><ChevronLeft size={16} aria-hidden="true" /> All my letters</button>
      {missing ? <p className="mt-6 rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-neutral-mid">We could not find that letter. It may have been withdrawn.</p> : (
        <>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-snug text-neutral-dark">{meta?.title ?? 'Letter'}</h1>
              {meta && <p className="text-sm text-neutral-mid">From {meta.from}, {fmtLetterDate(meta.shared_at)}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={print} disabled={!url} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-teal px-4 py-2 text-sm font-semibold text-teal hover:bg-teal/5 disabled:opacity-50"><Printer size={16} aria-hidden="true" /> Print</button>
              <button type="button" onClick={download} disabled={!url} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-neutral-dark hover:bg-neutral-light disabled:opacity-50"><Download size={16} aria-hidden="true" /> Download PDF</button>
            </div>
          </div>
          {meta?.needs_acknowledgement && (
            <div className={`mt-4 rounded-xl border px-4 py-3 ${meta.acknowledged_at ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
              {meta.acknowledged_at
                ? <p className="inline-flex items-center gap-2 text-sm font-semibold text-green-800" role="status"><Check size={16} aria-hidden="true" /> You confirmed you have read and understood this on {fmtLetterDate(meta.acknowledged_at)}.</p>
                : viewingAs ? <p className="text-sm text-amber-900">You are viewing this hub as someone else, so you cannot confirm for them.</p>
                : (<div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-amber-950">Your manager has asked you to confirm that you have read this letter.</p>
                    <button type="button" onClick={acknowledge} disabled={busy} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-base font-semibold text-white hover:bg-teal-dark disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} I have read and understood this</button>
                  </div>)}
            </div>
          )}
          {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {url
              ? <iframe ref={frame} src={url} title={meta?.title ?? 'Letter'} className="h-[78vh] w-full" />
              : <p className="flex items-center justify-center gap-2 py-24 text-sm text-neutral-mid" role="status"><Loader2 size={16} className="animate-spin" /> Opening the letter</p>}
          </div>
          {url && <p className="mt-2 text-xs text-neutral-mid">If the letter does not show above, <a href={url} download={meta?.filename || 'letter.pdf'} className="font-medium text-teal underline">download it</a> instead.</p>}
        </>
      )}
    </div>
  )
}
