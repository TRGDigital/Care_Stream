'use client'

// The documents on a notification: an icon by type, the name and size, and a Download button (pictures can also be previewed here).
// The files are private, so each is fetched with the person's sign in and handed to the browser; there is no public address for them.

import { useEffect, useState } from 'react'
import { FileSpreadsheet, FileText, Image as ImageIcon, Loader2, Download, Paperclip, Presentation, Eye, EyeOff } from 'lucide-react'
import { fetchFileBlobUrl, fmtSize, type FileItem } from '@/lib/notifications-client'

export function fileIcon(mime: string, size = 20) {
  if (mime.startsWith('image/')) return <ImageIcon size={size} aria-hidden="true" />
  if (mime.includes('spreadsheet') || mime === 'text/csv') return <FileSpreadsheet size={size} aria-hidden="true" />
  if (mime.includes('presentation')) return <Presentation size={size} aria-hidden="true" />
  return <FileText size={size} aria-hidden="true" />
}

/** A small paperclip and count, for lists and the sign in alert. Nothing when there are no documents. */
export function PaperclipCount({ count, className = '' }: { count?: number; className?: string }) {
  if (!count || count < 1) return null
  return <span className={`inline-flex items-center gap-1 text-xs text-neutral-mid ${className}`} title={`${count} attached ${count === 1 ? 'document' : 'documents'}`}><Paperclip size={13} aria-hidden="true" /><span aria-hidden="true">{count}</span><span className="sr-only">{count} attached {count === 1 ? 'document' : 'documents'}</span></span>
}

function Row({ file, token, path }: { file: FileItem; token: string; path: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const isImage = file.mime.startsWith('image/')
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  async function download() {
    setBusy(true); setError('')
    try {
      const url = await fetchFileBlobUrl(token, path)
      const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not download it.') } finally { setBusy(false) }
  }
  async function togglePreview() {
    if (preview) { setPreview(null); return }
    setBusy(true); setError('')
    try { setPreview(await fetchFileBlobUrl(token, path)) } catch (e) { setError(e instanceof Error ? e.message : 'Could not open it.') } finally { setBusy(false) }
  }
  return (
    <li className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal/10 text-teal">{fileIcon(file.mime)}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-neutral-dark">{file.name}</span><span className="block text-xs text-neutral-mid">{fmtSize(file.size_bytes)}</span></span>
        {isImage && <button type="button" onClick={togglePreview} disabled={busy} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50">{preview ? <><EyeOff size={14} aria-hidden="true" /> Hide</> : <><Eye size={14} aria-hidden="true" /> Preview</>}</button>}
        <button type="button" onClick={download} disabled={busy} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />} Download
        </button>
      </div>
      {preview && /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt={file.name} className="mt-3 max-h-80 w-auto rounded-lg border border-gray-200" />}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </li>
  )
}

export function AttachmentList({ files, token, pathFor }: { files?: FileItem[]; token: string; pathFor: (fileId: string) => string }) {
  if (!files || files.length === 0) return null
  return (
    <section aria-label="Attachments" className="mt-6 border-t border-gray-100 pt-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-neutral-dark"><Paperclip size={15} aria-hidden="true" /> Attachments ({files.length})</h2>
      <ul className="space-y-2">{files.map(f => <Row key={f.id} file={f} token={token} path={pathFor(f.id)} />)}</ul>
    </section>
  )
}
