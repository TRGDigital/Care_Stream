// Documents attached to an admin notification. The checks are on the real bytes, never on the name or the browser's idea of the type:
//   PDF, JPEG, PNG, WebP by signature; Word, Excel and PowerPoint (.docx .xlsx .pptx) by looking inside the zip's file list (no unpacking);
//   .csv and .txt by being plain text. Anything that can carry a macro or run (.docm .xlsm .pptm, old .doc .xls .ppt, embedded objects, scripts,
//   programs) is refused with a message that says what to send instead. The file's extension must also agree with what it really is.
// A request to our API can be about 4.5 MB at most on this host, so each file is limited to 4 MB (the form says so).

export const NOTIFICATION_FILE_MAX_FILES = 5
export const NOTIFICATION_FILE_MAX_BYTES = 4 * 1024 * 1024
export const NOTIFICATION_FILE_MAX_TOTAL_BYTES = 20 * 1024 * 1024

export type DetectedFile = { ok: true; mime: string; ext: string; kind: 'pdf' | 'image' | 'word' | 'excel' | 'powerpoint' | 'text' | 'csv' }
export type Refused = { ok: false; reason: string }

const MIME = {
  pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', csv: 'text/csv',
} as const

const NEVER = /\.(exe|dll|bat|cmd|com|scr|msi|js|jse|vbs|vbe|ps1|sh|jar|app|apk|html?|svg|zip|rar|7z)$/i

/** The names of the files inside a zip, read from its central directory. Nothing is unpacked, so a zip bomb cannot hurt. Null when it is not a readable zip. */
export function zipEntryNames(buf: Buffer): string[] | null {
  if (buf.length < 22 || buf.readUInt32LE(0) !== 0x04034b50) return null
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) { if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break } }
  if (eocd < 0) return null
  const count = buf.readUInt16LE(eocd + 10)
  let off = buf.readUInt32LE(eocd + 16)
  if (count > 5000) return null
  const names: string[] = []
  for (let n = 0; n < count; n++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) return null
    const nameLen = buf.readUInt16LE(off + 28), extraLen = buf.readUInt16LE(off + 30), commentLen = buf.readUInt16LE(off + 32)
    if (off + 46 + nameLen > buf.length) return null
    names.push(buf.toString('utf8', off + 46, off + 46 + nameLen))
    off += 46 + nameLen + extraLen + commentLen
  }
  return names
}

const extOf = (name: string) => (name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '')

/** What the file really is, and whether we accept it. `filename` is only used to check the extension agrees and to give a helpful message. */
export function detectNotificationFile(buf: Buffer, filename: string): DetectedFile | Refused {
  const ext = extOf(filename)
  const ascii = (i: number, s: string) => buf.length >= i + s.length && s.split('').every((c, k) => buf[i + k] === c.charCodeAt(0))
  if (buf.length < 4) return { ok: false, reason: 'That file is empty or too small to be a document.' }

  const agree = (real: string, accepts: string[], mime: string, kind: DetectedFile extends { kind: infer K } ? K : never): DetectedFile | Refused =>
    accepts.includes(ext) ? { ok: true, mime, ext: real, kind } : { ok: false, reason: `That file's name ends in .${ext || '(nothing)'} but it is really a ${real.toUpperCase()} file. Please rename it so it ends in .${real}.` }

  if (ascii(0, '%PDF-')) return agree('pdf', ['pdf'], MIME.pdf, 'pdf')
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return agree('jpg', ['jpg', 'jpeg'], MIME.jpg, 'image')
  if (buf[0] === 0x89 && ascii(1, 'PNG') && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return agree('png', ['png'], MIME.png, 'image')
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return agree('webp', ['webp'], MIME.webp, 'image')

  // The old Office formats (.doc .xls .ppt) are one container that can hide macros and cannot be checked from outside.
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
    return { ok: false, reason: 'Old Word, Excel and PowerPoint files (.doc, .xls, .ppt) are not accepted because they can hide macros. Please save it as .docx, .xlsx, .pptx or PDF and add that.' }
  }
  if (buf[0] === 0x4d && buf[1] === 0x5a) return { ok: false, reason: 'Programs cannot be attached.' }

  if (buf.readUInt32LE(0) === 0x04034b50) {
    const names = zipEntryNames(buf)
    if (!names) return { ok: false, reason: 'That file could not be read as a Word, Excel or PowerPoint document.' }
    const lower = names.map(n => n.toLowerCase())
    if (lower.some(n => /vbaproject\.bin$|\/macros\/|\.vba$/.test(n)) || /^(docm|xlsm|pptm|dotm|xltm|potm|xlam|ppam|ppsm)$/.test(ext)) {
      return { ok: false, reason: 'Files that can contain macros (.docm, .xlsm, .pptm) are not accepted. Please save a copy as .docx, .xlsx, .pptx or PDF without macros.' }
    }
    if (lower.some(n => n.includes('/embeddings/') || n.includes('/activex/') || NEVER.test(n))) {
      return { ok: false, reason: 'That document has other files or objects embedded inside it, so it was not accepted. Please save it as a PDF and add that.' }
    }
    if (!lower.includes('[content_types].xml')) return { ok: false, reason: 'That is not a Word, Excel or PowerPoint document. Zip and other archive files are not accepted.' }
    if (lower.some(n => n.startsWith('word/'))) return agree('docx', ['docx'], MIME.docx, 'word')
    if (lower.some(n => n.startsWith('xl/'))) return agree('xlsx', ['xlsx'], MIME.xlsx, 'excel')
    if (lower.some(n => n.startsWith('ppt/'))) return agree('pptx', ['pptx'], MIME.pptx, 'powerpoint')
    return { ok: false, reason: 'That is not a Word, Excel or PowerPoint document.' }
  }

  // Plain text and CSV: only when the extension says so and the bytes really are text (no zero bytes, mostly printable).
  if (ext === 'txt' || ext === 'csv') {
    const sample = buf.subarray(0, Math.min(buf.length, 16384))
    if (sample.includes(0)) return { ok: false, reason: `That does not look like a plain ${ext.toUpperCase()} file.` }
    const text = sample.toString('utf8')
    const odd = (text.match(/[\u0000-\u0008\u000e-\u001f]/g) ?? []).length
    if (odd > text.length * 0.02) return { ok: false, reason: `That does not look like a plain ${ext.toUpperCase()} file.` }
    if (/^\s*<(!doctype|html|script|svg)/i.test(text)) return { ok: false, reason: 'Web pages and scripts cannot be attached.' }
    return ext === 'csv' ? { ok: true, mime: MIME.csv, ext: 'csv', kind: 'csv' } : { ok: true, mime: MIME.txt, ext: 'txt', kind: 'text' }
  }
  return { ok: false, reason: 'Please add a PDF, a Word, Excel or PowerPoint file (.docx, .xlsx, .pptx), a CSV or text file, or a JPG, PNG or WebP picture.' }
}

/** A name that is safe to store, show and send in a header: no paths, no control characters, no odd symbols, at most 120 characters, real extension kept. */
export function cleanFileName(name: unknown, ext: string): string {
  const base = String(name ?? '').split(/[\\/]/).pop() ?? ''
  const stem = base.replace(/\.[A-Za-z0-9]{1,6}$/, '').normalize('NFC').replace(/[\u0000-\u001f\u007f<>:"|?*\\/]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '')
  return `${(stem || 'document').slice(0, 110).trim()}.${ext}`
}

/** Types that are safe to show in the browser; everything else is offered as a download. */
export const INLINE_TYPES = new Set<string>([MIME.pdf, MIME.jpg, MIME.png, MIME.webp])

export function checkTotals(files: Array<{ size_bytes: number }>): string | null {
  if (files.length > NOTIFICATION_FILE_MAX_FILES) return `You can attach up to ${NOTIFICATION_FILE_MAX_FILES} documents.`
  if (files.reduce((n, f) => n + f.size_bytes, 0) > NOTIFICATION_FILE_MAX_TOTAL_BYTES) return 'The documents are more than 20 MB in total. Please remove one.'
  return null
}
