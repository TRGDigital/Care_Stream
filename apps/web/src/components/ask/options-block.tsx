'use client'

// HOUSE RULE 2: when an agent offers a choice between things you can look at (a newsletter layout, a letter, a report, a notification, an email), each option is a card with a small
// picture, a Preview button and a Choose button. Preview opens the shared viewer with the real design, SAMPLE words only (none of the person's information) and the organisation's
// own logo and colour. The picture and the preview come from the server (never the model). Choose sends the choice back as one structured message.
import { useEffect, useState } from 'react'
import { Check, Eye, Loader2 } from 'lucide-react'
import { GoBack } from '@/components/ask/go-back'
import { ask, type OptionPreview } from '@/lib/ask-client'
import { ExpandViewer, useExpandViewer } from '@/components/ask/expand-viewer'
import { formatChoice, type OptionItem, type OptionSet } from '@/lib/ask-blocks'
import { templateCheck, type CheckItem } from '@/lib/ask-check'
import { paletteAccent } from '@/lib/ask-palettes'
import { CheckLine } from '@/components/ask/question-form'

const THUMB_W = 176, THUMB_H = 232
const PAGE_W: Record<string, number> = { newsletter_palette: 640, newsletter: 640, letter: 720, report: 720, notification: 600, email: 600, other: 600 }

/** A colour card: a small strip of the colour (the real preview of their own newsletter opens from Preview). Brand and category show a neutral strip with a label. */
function Swatch({ o }: { o: OptionItem }) {
  const c = paletteAccent(o.preview.template_id)
  return (
    <div style={{ width: THUMB_W, height: 64 }} className="flex items-stretch overflow-hidden rounded-lg border border-gray-200" aria-hidden="true">
      {c ? (<><span className="flex-1" style={{ background: c }} /><span className="flex-1" style={{ background: c, opacity: 0.55 }} /><span className="flex-1" style={{ background: c, opacity: 0.18 }} /></>)
        : <span className="flex flex-1 items-center justify-center bg-neutral-light text-xs font-semibold text-neutral-mid">{o.preview.template_id === 'brand' ? 'Your brand colour' : 'Normal colour'}</span>}
    </div>
  )
}

function Thumb({ token, o }: { token: string; o: OptionItem }) {
  const [p, setP] = useState<OptionPreview | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => { if (o.preview.kind === 'newsletter_palette') return; let live = true; ask.optionPreview(token, o.preview).then(r => { if (live) setP(r) }).catch(() => { if (live) setFailed(true) }); return () => { live = false } }, [token, o.preview.kind, o.preview.template_id, o.preview.layout])  // eslint-disable-line react-hooks/exhaustive-deps
  const w = PAGE_W[o.preview.kind] ?? 600
  if (o.preview.kind === 'newsletter_palette') return <Swatch o={o} />
  if (failed) return <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-neutral-light text-xs text-neutral-mid" style={{ width: THUMB_W, height: THUMB_H }}>No picture</div>
  if (!p) return <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-neutral-light" style={{ width: THUMB_W, height: THUMB_H }} role="status"><Loader2 size={16} className="animate-spin text-neutral-mid" aria-label="Loading the picture" /></div>
  return (
    <div style={{ width: THUMB_W, height: THUMB_H }} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {p.css && <style>{p.css}</style>}
      <div aria-hidden="true" style={{ width: w, transform: `scale(${THUMB_W / w})`, transformOrigin: 'top left', pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: p.html }} />
    </div>
  )
}

export function OptionsBlock({ token, set, disabled, chosenId, onChoose, onBack, typed = [] }: { token: string; set: OptionSet; /** HOUSE RULE 14: back to where they were before. */ onBack?: () => void; disabled?: boolean; chosenId?: string | null; onChoose: (message: string) => void; /** What the administrator has typed in this chat: used for the one line check when they choose something other than what they asked for (HOUSE RULE 9). */ typed?: string[] }) {
  const viewer = useExpandViewer()
  const [big, setBig] = useState<{ o: OptionItem; p: OptionPreview } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState('')
  async function preview(o: OptionItem) {
    setBusy(o.id); setErr('')
    try { const p = await ask.optionPreview(token, o.preview); setBig({ o, p }); viewer.show() } catch { setErr('The preview could not be made just now.') } finally { setBusy(null) }
  }
  const done = !!chosenId
  // HOUSE RULE 9: they typed one template's name and are choosing another: one line check with buttons, then it goes. Once confirmed it is never asked again.
  const [check, setCheck] = useState<{ o: OptionItem; item: CheckItem } | null>(null)
  function choose(o: OptionItem) {
    const c = templateCheck(typed, o, set)
    if (c) { setCheck({ o, item: c }); return }
    onChoose(formatChoice(o))
  }
  return (
    <div className="mt-3" role="group" aria-label={set.title || 'Choose one'}>
      {set.title && <p className="mb-2 text-sm font-semibold text-neutral-dark">{set.title}</p>}
      <p className="mb-2 text-xs text-neutral-mid">{set.options.every(o => o.preview.kind === 'newsletter_palette') ? 'Preview shows your own newsletter in that colour. Nothing changes until you press Choose.' : `Previews show sample words, not your real information, with your own logo${set.options.some(o => o.preview.kind === 'newsletter') ? ' and colour' : ''}.`}</p>
      <ul className="flex flex-wrap gap-3">
        {set.options.map(o => {
          const mine = chosenId === o.id
          return (
            <li key={o.id} className={`flex w-[196px] flex-col rounded-xl border p-2.5 ${mine ? 'border-teal bg-teal/5 ring-2 ring-teal/30' : 'border-gray-200 bg-white'}`}>
              <button type="button" onClick={() => preview(o)} aria-label={`Preview ${o.title}`} className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"><Thumb token={token} o={o} /></button>
              <p className="mt-2 text-sm font-semibold text-neutral-dark">{o.title}{mine && <span className="ml-1.5 rounded-full bg-teal px-1.5 py-px text-[10px] font-bold text-white">Chosen</span>}</p>
              {o.description && <p className="mt-0.5 text-xs leading-snug text-neutral-mid">{o.description}</p>}
              <div className="mt-2 flex gap-1.5">
                <button type="button" onClick={() => preview(o)} disabled={busy === o.id} className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 px-2 text-xs font-semibold text-neutral-dark hover:bg-neutral-light disabled:opacity-50">{busy === o.id ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Eye size={12} aria-hidden="true" />}Preview</button>
                <button type="button" onClick={() => choose(o)} disabled={disabled || done} className={`inline-flex min-h-[34px] flex-1 items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold disabled:opacity-50 ${mine ? 'bg-teal text-white' : 'border border-teal text-teal hover:bg-teal/10'}`}>{mine && <Check size={12} aria-hidden="true" />}Choose</button>
              </div>
            </li>
          )
        })}
      </ul>
      {onBack && !done && <div className="mt-2"><GoBack onBack={onBack} disabled={disabled} /></div>}
      {check && !done && <CheckLine item={check.item} disabled={disabled} onYes={() => { const o = check.o; setCheck(null); onChoose(formatChoice(o)) }} onNo={() => setCheck(null)} />}
      {err && <p role="alert" className="mt-2 text-xs text-red-700">{err}</p>}
      <ExpandViewer open={viewer.open && !!big} onClose={() => viewer.close()} title={big ? big.p.title : 'Preview'} items={big ? [big.p.sheet ? { kind: 'sheet' as const, html: big.p.sheet, orientation: 'portrait' as const } : { kind: 'html' as const, html: big.p.html, css: big.p.css || undefined }] : []}
        pdf={big && big.o.preview.kind !== 'newsletter_palette' ? { getPdf: () => ask.samplePdfBlob(token, big.o.preview), sample: true } : undefined}
        actions={big && !done ? [{ label: `Choose ${big.o.title}`, primary: true, disabled, onClick: () => { const o = big.o; viewer.close(); choose(o) } }] : []} />
    </div>
  )
}
