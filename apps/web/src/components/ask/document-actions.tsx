'use client'

// HOUSE RULE 4: the one set of document buttons used everywhere a document is shown (the library, the document panel, the viewer, option previews, answered cards): Save PDF and Print as
// two separate buttons, Word as a third where it exists, and Expand where it applies. A draft is stamped DRAFT and a sample SAMPLE; neither is recorded as shared.
import { useState } from 'react'
import { Download, FileText, Loader2, Maximize2, Printer } from 'lucide-react'
import { copyNote, printBlob, saveBlob } from '@/lib/document-actions'

const btn = 'inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-teal px-3 text-sm font-semibold text-teal hover:bg-teal/5 disabled:opacity-50'

export interface DocumentActionsProps {
  title: string
  getPdf: () => Promise<Blob>
  getDocx?: () => Promise<Blob>
  onExpand?: () => void
  draft?: boolean
  sample?: boolean
  disabled?: boolean
  onDone?: (what: 'pdf' | 'print' | 'word') => void
  onError?: (message: string) => void
  /** Hide the small note under the buttons (for a tight toolbar). */
  quiet?: boolean
}

export function DocumentActions({ title, getPdf, getDocx, onExpand, draft, sample, disabled, onDone, onError, quiet }: DocumentActionsProps) {
  const [busy, setBusy] = useState<'pdf' | 'print' | 'word' | ''>('')
  async function run(what: 'pdf' | 'print' | 'word') {
    setBusy(what)
    try {
      if (what === 'word') saveBlob(await getDocx!(), title, 'docx')
      else if (what === 'pdf') saveBlob(await getPdf(), title, 'pdf')
      else printBlob(await getPdf())
      onDone?.(what)
    } catch (e) { onError?.(e instanceof Error ? e.message : 'That could not be done just now.') } finally { setBusy('') }
  }
  const note = quiet ? '' : copyNote({ draft, sample })
  return (
    <div className="inline-flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Save or print ${title}`}>
        <button type="button" disabled={disabled || !!busy} onClick={() => run('pdf')} className={btn}>{busy === 'pdf' ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />} Save PDF</button>
        <button type="button" disabled={disabled || !!busy} onClick={() => run('print')} className={btn}>{busy === 'print' ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Printer size={14} aria-hidden="true" />} Print</button>
        {getDocx && <button type="button" disabled={disabled || !!busy} onClick={() => run('word')} className={btn}>{busy === 'word' ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <FileText size={14} aria-hidden="true" />} Word</button>}
        {onExpand && <button type="button" disabled={disabled} onClick={onExpand} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-neutral-dark hover:bg-neutral-light disabled:opacity-50"><Maximize2 size={14} aria-hidden="true" /> Expand</button>}
      </div>
      {note && <p className="text-xs text-neutral-mid">{note}</p>}
    </div>
  )
}
