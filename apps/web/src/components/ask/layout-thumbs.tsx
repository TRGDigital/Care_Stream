'use client'

// Small pictures of each layout of a newsletter type (short, standard, detailed), made from sample text and marked SAMPLE, so the layout can be chosen by its looks. Click a picture
// (or press Enter or Space on it) to see it large in the shared viewer. Used in the chat when the agent offers layouts, and in the template browser.
import { GoBack } from '@/components/ask/go-back'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ask, type NewsletterSample } from '@/lib/ask-client'
import { ExpandViewer, Expandable, useExpandViewer } from '@/components/ask/expand-viewer'

const LABEL: Record<string, string> = { short: 'Short', standard: 'Standard', detailed: 'Detailed' }
const THUMB_W = 192, SCALE = THUMB_W / 640, THUMB_H = 280

export function LayoutThumbs({ token, type, onPick, selected, disabled, onBack }: { token: string; type: string; onPick: (s: NewsletterSample) => void; selected?: string | null; disabled?: boolean; /** HOUSE RULE 14: a quiet way back. */ onBack?: () => void }) {
  const [designs, setDesigns] = useState<NewsletterSample[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [big, setBig] = useState<NewsletterSample | null>(null)
  const viewer = useExpandViewer()
  useEffect(() => { let live = true; setDesigns(null); setFailed(false); ask.newsletterSamples(token, type).then(r => { if (live) setDesigns(r.designs) }).catch(() => { if (live) setFailed(true) }); return () => { live = false } }, [token, type])
  if (failed) return <p className="mt-2 text-xs text-neutral-mid">The layout pictures could not be loaded. You can still choose short, standard or detailed.</p>
  if (!designs) return <p className="mt-2 inline-flex items-center gap-2 text-xs text-neutral-mid" role="status"><Loader2 size={12} className="animate-spin" aria-hidden="true" />Making the layout pictures</p>
  const order = ['short', 'standard', 'detailed']
  const list = [...designs].sort((a, b) => order.indexOf(a.layout) - order.indexOf(b.layout))
  return (
    <div className="mt-3">
      <p className="text-xs text-neutral-mid">Sample layouts. They show the look, not your words. Click one to see it large.</p>
      <ul className="mt-2 flex flex-wrap gap-3">
        {list.map(d => (
          <li key={d.id} className="w-[192px]">
            <Expandable label={`${LABEL[d.layout] ?? d.layout} layout, sample`} onOpen={() => { setBig(d); viewer.show() }}>
              <div style={{ width: THUMB_W, height: THUMB_H }} className={`overflow-hidden rounded-lg border bg-white ${selected === d.layout ? 'border-teal ring-2 ring-teal/40' : 'border-gray-200'}`}>
                <div aria-hidden="true" style={{ width: 640, transform: `scale(${SCALE})`, transformOrigin: 'top left', pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: d.html }} />
              </div>
            </Expandable>
            <p className="mt-1 text-xs font-semibold text-neutral-dark">{LABEL[d.layout] ?? d.layout} <span className="font-normal text-neutral-mid">(sample)</span></p>
            <button type="button" disabled={disabled} onClick={() => onPick(d)} className={`mt-1 inline-flex min-h-[36px] w-full items-center justify-center rounded-lg border px-2 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50 ${selected === d.layout ? 'border-teal bg-teal text-white' : 'border-gray-300 bg-white text-neutral-dark hover:bg-gray-50'}`}>Use {(LABEL[d.layout] ?? d.layout).toLowerCase()}</button>
          </li>
        ))}
      </ul>
      {onBack && <div className="mt-2"><GoBack onBack={onBack} disabled={disabled} /></div>}
      <ExpandViewer open={viewer.open && !!big} onClose={() => { viewer.close() }} title={big ? `${big.title}: ${LABEL[big.layout] ?? big.layout} layout (sample)` : 'Layout'}
        items={big ? [{ kind: 'html', html: big.html }] : []}
        pdf={big ? { getPdf: () => ask.samplePdfBlob(token, { kind: 'newsletter', template_id: big.id, layout: big.layout }), sample: true } : undefined}
        actions={big ? [{ label: `Use the ${(LABEL[big.layout] ?? big.layout).toLowerCase()} layout`, primary: true, disabled, onClick: () => { const d = big; viewer.close(); onPick(d) } }] : []} />
    </div>
  )
}
