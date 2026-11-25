'use client'

// HOUSE RULE 4: the one set of document buttons used everywhere a document is shown (the library, the document panel, the viewer, option previews, answered cards): Save PDF and Print as
// two separate buttons, Word as a third where it exists, and Expand where it applies. A draft is stamped DRAFT and a sample SAMPLE; neither is recorded as shared.
import { useState } from 'react'
import { Download, FileText, Loader2, Maximize2, Printer } from 'lucide-react'
import { copyNote, printBlob, saveBlob } from '../../lib/document-actions'
import { AskError } from '../../lib/ask-client'

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
  /** When the newsletter will not fit one page at a readable size (the PDF says TOO_LONG), the gentle check offers these. Without it the reason is still shown in words. */
  tooLong?: { orientation: 'portrait' | 'landscape'; canTwoPages?: boolean; onSwitch: (o: 'portrait' | 'landscape') => void | Promise<void>; onShorten: () => void; onTwoPages?: () => void | Promise<void> }
}

export function DocumentActions({ title, getPdf, getDocx, onExpand, draft, sample, disabled, onDone, onError, quiet, tooLong }: DocumentActionsProps) {
  const [busy, setBusy] = useState<'pdf' | 'print' | 'word' | ''>('')
  const [problem, setProblem] = useState<{ message: string; code: string } | null>(null)   // a failed Save PDF, Print or Word is NEVER silent: the reason is shown here, next to the buttons
  async function run(what: 'pdf' | 'print' | 'word') {
    setBusy(what); setProblem(null)
    try {
      if (what === 'word') saveBlob(await getDocx!(), title, 'docx')
      else if (what === 'pdf') saveBlob(await getPdf(), title, 'pdf')
      else printBlob(await getPdf())
      onDone?.(what)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'That could not be done just now.'
      setProblem({ message, code: e instanceof AskError ? e.code : '' }); onError?.(message)
    } finally { setBusy('') }
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
      {problem && problem.code === 'TOO_LONG' && tooLong ? <TooLongCheck t={tooLong} message={problem.message} onDone={() => setProblem(null)} />
        : problem && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">{problem.message}</p>}
      {note && <p className="text-xs text-neutral-mid">{note}</p>}
    </div>
  )
}

/** HOUSE RULES 9 and 10: when a newsletter will not fit one page at a readable size, one gentle line with buttons (never a dead end, never silently shrunk or cut). */
export function TooLongCheck({ t, message, onDone }: { t: NonNullable<DocumentActionsProps['tooLong']>; message?: string; onDone?: () => void }) {
  const other = t.orientation === 'portrait' ? 'landscape' : 'portrait'
  const cb = 'rounded-lg border px-3 py-1.5 text-xs font-semibold'
  return (
    <div role="alert" className="max-w-md rounded-lg border border-amber-300 bg-amber-50 p-3">
      <p className="text-sm text-neutral-dark">{message ?? 'This newsletter will not fit one page at a readable size.'} What would you like to do?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => { void t.onSwitch(other); onDone?.() }} className={`${cb} border-teal bg-teal text-white hover:bg-teal-dark`}>Switch to {other}</button>
        <button type="button" onClick={() => { t.onShorten(); onDone?.() }} className={`${cb} border-gray-300 bg-white text-neutral-dark hover:bg-neutral-light`}>Shorten it</button>
        {t.canTwoPages && t.onTwoPages && <button type="button" onClick={() => { void t.onTwoPages!(); onDone?.() }} className={`${cb} border-gray-300 bg-white text-neutral-dark hover:bg-neutral-light`}>Allow two pages</button>}
      </div>
    </div>
  )
}
