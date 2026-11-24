'use client'

// "Attach documents" on the compose form. Each file is checked here first (count, size, type), then uploaded one at a time as a draft with a progress bar,
// and can be removed before sending. The server checks the real bytes again and scans every file.

import { useRef, useState } from 'react'
import { Loader2, Paperclip, X } from 'lucide-react'
import { adminNotifications, fmtSize, FILE_ACCEPT, FILE_MAX_BYTES, FILE_MAX_FILES, FILE_MAX_TOTAL_BYTES, type FileItem } from '@/lib/notifications-client'
import { fileIcon } from './attachments'

type Pending = { key: string; name: string; size: number; pct: number }
const EXT = /\.(pdf|docx|xlsx|pptx|csv|txt|jpe?g|png|webp)$/i

export function AttachPicker({ token, files, onChange, disabled }: { token?: string; files: FileItem[]; onChange: (f: FileItem[]) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending[]>([])
  const [error, setError] = useState('')

  async function add(list: FileList | null) {
    if (!list || !token) return
    setError('')
    let current = [...files]
    for (const f of Array.from(list)) {
      if (current.length >= FILE_MAX_FILES) { setError(`You can attach up to ${FILE_MAX_FILES} documents.`); break }
      if (!EXT.test(f.name)) { setError(`${f.name}: please add a PDF, Word, Excel or PowerPoint file (.docx, .xlsx, .pptx), a CSV or text file, or a JPG, PNG or WebP picture.`); continue }
      if (f.size > FILE_MAX_BYTES) { setError(`${f.name} is ${fmtSize(f.size)}. Each document can be up to 4 MB. Try saving it as a PDF.`); continue }
      if (current.reduce((n, x) => n + x.size_bytes, 0) + f.size > FILE_MAX_TOTAL_BYTES) { setError('The documents would be more than 20 MB in total.'); break }
      const key = `${f.name}-${f.size}-${Date.now()}`
      setPending(p => [...p, { key, name: f.name, size: f.size, pct: 0 }])
      try {
        const saved = await adminNotifications.uploadFile(token, f, pct => setPending(p => p.map(x => x.key === key ? { ...x, pct } : x)))
        current = [...current, saved]; onChange(current)
      } catch (e) { setError(`${f.name}: ${e instanceof Error ? e.message : 'the upload failed.'}`) }
      setPending(p => p.filter(x => x.key !== key))
    }
    if (input.current) input.current.value = ''
  }
  async function remove(f: FileItem) {
    if (!token) return
    onChange(files.filter(x => x.id !== f.id))
    try { await adminNotifications.removeFile(token, f.id) } catch { /* it is tidied up automatically after a day */ }
  }

  return (
    <fieldset>
      <legend className="mb-1 flex items-center gap-2 text-sm font-medium text-neutral-dark"><Paperclip size={14} aria-hidden="true" /> Attach documents <span className="text-xs font-normal text-neutral-mid">(optional)</span></legend>
      <p className="mb-2 text-xs text-neutral-mid">Up to {FILE_MAX_FILES} documents, 4 MB each: PDF, Word, Excel, PowerPoint, CSV, text, JPG, PNG or WebP. Staff open them in their hub, they are not attached to the email.</p>
      <input ref={input} id="n-files" type="file" multiple accept={FILE_ACCEPT} className="sr-only" disabled={disabled || !token || files.length >= FILE_MAX_FILES} onChange={e => void add(e.target.files)} />
      <label htmlFor="n-files" className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-neutral-dark hover:bg-neutral-light ${disabled || files.length >= FILE_MAX_FILES ? 'pointer-events-none opacity-50' : ''}`}><Paperclip size={15} aria-hidden="true" /> Choose documents</label>
      {(files.length > 0 || pending.length > 0) && (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {files.map(f => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <span className="text-teal">{fileIcon(f.mime, 18)}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-neutral-dark">{f.name}</span><span className="block text-xs text-neutral-mid">{fmtSize(f.size_bytes)}</span></span>
              <button type="button" onClick={() => remove(f)} aria-label={`Remove ${f.name}`} className="rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"><X size={16} /></button>
            </li>
          ))}
          {pending.map(p => (
            <li key={p.key} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-neutral-dark"><Loader2 size={14} className="animate-spin text-teal" aria-hidden="true" /><span className="min-w-0 flex-1 truncate">{p.name}</span><span className="text-xs text-neutral-mid">{p.pct < 100 ? `${p.pct}%` : 'Checking'}</span></div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200"><div className="h-full bg-teal transition-all" style={{ width: `${p.pct}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </fieldset>
  )
}
