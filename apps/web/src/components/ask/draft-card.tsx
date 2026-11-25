'use client'

// A draft the agent has just made, shown in the chat as its DESIGNED version (never a plain block of text): a small picture of the real design with Expand, its title and status, and
// Save PDF and Print as separate buttons. The plain text stays one click away under Text in the document panel.
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ask, type AskDocFull } from '@/lib/ask-client'
import { Expandable, ExpandViewer, useExpandViewer } from '@/components/ask/expand-viewer'
import { DocumentActions } from '@/components/ask/document-actions'

const W = 640, THUMB_W = 220, THUMB_H = 280
type Paper = { html: string; css: string }
const isFinal = (d: Pick<AskDocFull, 'status'>) => d.status === 'approved' || d.status === 'shared'

/** The large viewer for one document, with Save PDF and Print as separate buttons. Opened by the Expand click or by the "See the designed version" button. */
export function DocViewer({ token, id, onClose }: { token: string; id: string; onClose: () => void }) {
  const [d, setD] = useState<AskDocFull | null>(null), [paper, setPaper] = useState<Paper | null>(null)
  useEffect(() => { let live = true; Promise.all([ask.document(token, id), ask.preview(token, id)]).then(([a, b]) => { if (live) { setD(a.document); setPaper(b) } }).catch(() => { if (live) onClose() }); return () => { live = false } }, [token, id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!d || !paper) return null
  const draft = !isFinal(d)
  return <ExpandViewer open onClose={onClose} title={d.title} items={[{ kind: 'html', html: paper.html, css: paper.css || undefined }]}
    pdf={{ getPdf: () => ask.documentBlob(token, id, 'pdf', { draft }), getDocx: () => ask.documentBlob(token, id, 'docx', { draft }), draft }} />
}

export function DraftCard({ token, id, onOpenViewer, onEdit }: { token: string; id: string; onOpenViewer: (id: string) => void; onEdit?: (id: string) => void }) {
  const [d, setD] = useState<AskDocFull | null>(null), [paper, setPaper] = useState<Paper | null>(null), [failed, setFailed] = useState(false), [err, setErr] = useState('')
  useEffect(() => { let live = true; Promise.all([ask.document(token, id), ask.preview(token, id)]).then(([a, b]) => { if (live) { setD(a.document); setPaper(b) } }).catch(() => { if (live) setFailed(true) }); return () => { live = false } }, [token, id])
  if (failed) return null
  if (!d || !paper) return <div className="mt-3 flex items-center gap-2 text-xs text-neutral-mid" role="status"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Getting the designed version</div>
  const draft = !isFinal(d)
  return (
    <div className="mt-3 flex flex-wrap items-start gap-4 rounded-xl border border-gray-200 bg-neutral-light/40 p-3">
      <Expandable label={`${d.title}, designed version`} onOpen={() => onOpenViewer(id)}>
        <div style={{ width: THUMB_W, height: THUMB_H }} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          {paper.css && <style>{paper.css}</style>}
          <div aria-hidden="true" style={{ width: W, transform: `scale(${THUMB_W / W})`, transformOrigin: 'top left', pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: paper.html }} />
        </div>
      </Expandable>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-semibold text-neutral-dark">{d.title}</p>
        <p className="text-xs text-neutral-mid">{d.status === 'draft' ? 'A draft in your library. It needs approving before it can be shared.' : d.status === 'pending' ? 'Waiting for approval.' : d.status === 'approved' ? 'Approved.' : 'Shared.'}</p>
        <DocumentActions title={d.title} draft={draft} onExpand={() => onOpenViewer(id)} onError={setErr}
          getPdf={() => ask.documentBlob(token, id, 'pdf', { draft })} getDocx={() => ask.documentBlob(token, id, 'docx', { draft })} />
        {onEdit && <button type="button" onClick={() => onEdit(id)} className="text-xs font-semibold text-teal underline">Open it in the library to edit or share</button>}
        {err && <p role="alert" className="text-xs text-red-700">{err}</p>}
      </div>
    </div>
  )
}
