// Chunked, resumable video upload for "This is me" video messages. The API cannot take a request body over about 4.5 MB, so a clip goes up
// in chunks (the size the API says, 4 MB), each one retried a few times, and the page can carry on from the last good chunk after a lost
// signal. Used by the family page (the link is the key) and by the manager's upload on the resident record (signed in).

import { API_URL } from './residents-api'

export interface UploadAdapter<V> {
  /** Creates the upload. */
  start: (size: number) => Promise<{ id: string; total: number; chunk: number }>
  /** The chunk numbers the API already holds (used to resume). */
  received: (id: string) => Promise<number[]>
  /** Joins and processes. Resolves when the clip is ready (or rejects with the plain message). */
  complete: (id: string) => Promise<V>
  /** Where each chunk is PUT, and the sign in token when there is one. */
  chunkPath: (id: string, n: number) => string
  token?: string | null
}

export interface UploadProgress { phase: 'uploading' | 'processing'; sent: number; total: number }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function putChunk(path: string, blob: Blob, token: string | null | undefined, onBytes: (loaded: number) => void, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest()
    x.open('PUT', `${API_URL}${path}`)
    x.setRequestHeader('Content-Type', 'application/octet-stream')
    if (token) x.setRequestHeader('Authorization', `Bearer ${token}`)
    x.upload.onprogress = e => { if (e.lengthComputable) onBytes(e.loaded) }
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) { resolve(); return }
      let msg = ''
      try { msg = JSON.parse(x.responseText)?.error?.message ?? '' } catch { /* not JSON */ }
      const e: any = new Error(msg || `Upload failed (${x.status})`); e.status = x.status; reject(e)
    }
    x.onerror = () => { const e: any = new Error('The connection was lost.'); e.network = true; reject(e) }
    x.ontimeout = x.onerror
    x.timeout = 120_000
    if (signal) signal.addEventListener('abort', () => { x.abort(); reject(new Error('Cancelled')) })
    x.send(blob)
  })
}

/**
 * Uploads a file chunk by chunk. If a chunk fails because of the connection it is tried again (up to 5 times, waiting a little longer each
 * time, and waiting for the phone to come back online first). Pass an existing id to resume an interrupted upload.
 */
export async function uploadVideoInChunks<V>(file: File, a: UploadAdapter<V>, onProgress: (p: UploadProgress) => void, opts: { resume?: { id: string; total: number; chunk: number }; signal?: AbortSignal } = {}): Promise<{ id: string; result: V }> {
  const begin = opts.resume ?? await a.start(file.size)
  const have = new Set(opts.resume ? await a.received(begin.id) : [])
  let sentBefore = 0
  for (let n = 0; n < begin.total; n++) if (have.has(n)) sentBefore += Math.min(begin.chunk, file.size - n * begin.chunk)
  let done = sentBefore
  onProgress({ phase: 'uploading', sent: done, total: file.size })

  for (let n = 0; n < begin.total; n++) {
    if (have.has(n)) continue
    const blob = file.slice(n * begin.chunk, Math.min(file.size, (n + 1) * begin.chunk))
    for (let attempt = 1; ; attempt++) {
      try {
        await putChunk(a.chunkPath(begin.id, n), blob, a.token, loaded => onProgress({ phase: 'uploading', sent: done + loaded, total: file.size }), opts.signal)
        break
      } catch (e: any) {
        if (e?.message === 'Cancelled') throw e
        const retryable = e?.network || e?.status === 429 || (e?.status >= 500 && e?.status < 600)
        if (!retryable || attempt >= 5) throw e
        if (typeof navigator !== 'undefined' && navigator.onLine === false) await new Promise<void>(r => { const f = () => { window.removeEventListener('online', f); r() }; window.addEventListener('online', f); setTimeout(f, 30_000) })
        await sleep(1000 * attempt * attempt)
      }
    }
    done += blob.size
    onProgress({ phase: 'uploading', sent: done, total: file.size })
  }
  onProgress({ phase: 'processing', sent: file.size, total: file.size })
  const result = await a.complete(begin.id)
  return { id: begin.id, result }
}

export const fmtDuration = (s: number | null | undefined) => {
  if (s == null || !Number.isFinite(s)) return ''
  const t = Math.round(s)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}
