'use client'

// A text box with the formatting buttons above it: Bold, Italic, Underline (and Ctrl or Cmd B, I, U), and Clear formatting. They wrap the selected words in the marks the documents understand
// (**bold**, *italic*, __underline__), so the designed page shows real bold, italic and underline. HOUSE RULE 11. No scroll bars: the box is given its rows and grows with them.
import { useRef } from 'react'
import { Bold, Eraser, Italic, Underline } from 'lucide-react'
import { clearMarks, markForKey, toggleMark, type MarkKind } from '@/lib/ask-marks'

const tb = 'inline-flex min-h-[30px] min-w-[30px] items-center justify-center rounded-md border border-gray-300 bg-white px-1.5 text-xs font-semibold text-neutral-dark hover:bg-neutral-light focus:outline-none focus-visible:ring-2 focus-visible:ring-teal'

export function MarkedTextarea({ id, value, onChange, rows = 4, className = '', maxLength, placeholder, label }: { id: string; value: string; onChange: (v: string) => void; rows?: number; className?: string; maxLength?: number; placeholder?: string; label?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  function put(r: { text: string; start: number; end: number }) {
    onChange(r.text)
    requestAnimationFrame(() => { const el = ref.current; if (el) { el.focus(); try { el.setSelectionRange(r.start, r.end) } catch { /* not selectable */ } } })
  }
  const mark = (k: MarkKind) => { const el = ref.current; if (el) put(toggleMark(value, el.selectionStart ?? 0, el.selectionEnd ?? 0, k)) }
  const clear = () => { const el = ref.current; if (el) put(clearMarks(value, el.selectionStart ?? 0, el.selectionEnd ?? 0)) }
  return (
    <div>
      <div role="toolbar" aria-label={`Formatting${label ? ` for ${label}` : ''}`} className="mb-1 flex flex-wrap items-center gap-1">
        <button type="button" className={tb} onClick={() => mark('bold')} aria-label="Bold (Ctrl or Cmd B)" title="Bold (Ctrl or Cmd B)"><Bold size={14} aria-hidden="true" /></button>
        <button type="button" className={tb} onClick={() => mark('italic')} aria-label="Italic (Ctrl or Cmd I)" title="Italic (Ctrl or Cmd I)"><Italic size={14} aria-hidden="true" /></button>
        <button type="button" className={tb} onClick={() => mark('underline')} aria-label="Underline (Ctrl or Cmd U)" title="Underline (Ctrl or Cmd U)"><Underline size={14} aria-hidden="true" /></button>
        <button type="button" className={`${tb} gap-1 px-2`} onClick={clear} aria-label="Clear formatting" title="Clear formatting (the selected words, or everything)"><Eraser size={14} aria-hidden="true" /> Clear</button>
      </div>
      <textarea ref={ref} id={id} rows={rows} maxLength={maxLength} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={e => { const k = markForKey(e); if (k) { e.preventDefault(); mark(k) } }}
        className={`no-scrollbar ${className || 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'}`} />
    </div>
  )
}
