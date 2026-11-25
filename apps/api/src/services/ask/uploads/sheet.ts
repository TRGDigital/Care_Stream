// Reads an uploaded spreadsheet (CSV, XLSX) or document (DOCX, PDF) into plain tables or text. Pure code apart from the optional document readers, which are
// loaded on demand. Nothing is stored here: the caller strips sensitive columns (sensitive.ts) before anything is kept or shown to the assistant.
import JSZip from 'jszip'

export const MAX_BYTES = 5 * 1024 * 1024
export const MAX_ROWS = 5000
export const MAX_COLS = 60
export const MAX_CELL = 200
const MAX_UNZIPPED = 30 * 1024 * 1024

export interface Sheet { name: string; headers: string[]; rows: string[][]; title_rows_skipped: number }
export type Parsed =
  | { ok: true; kind: 'spreadsheet'; ext: 'csv' | 'xlsx'; sheets: Sheet[] }
  | { ok: true; kind: 'document'; ext: 'docx' | 'pdf'; text: string }
  | { ok: false; reason: string }

const clean = (s: string) => s.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_CELL)

// ── CSV ───────────────────────────────────────────────────────────────────────────────
export function parseCsv(input: string): string[][] {
  let text = input.replace(/^﻿/, '')
  const first = text.split(/\r?\n/, 1)[0] ?? ''
  const count = (c: string) => (first.match(new RegExp(c === '\t' ? '\t' : '\\' + c, 'g')) ?? []).length
  const delim = [',', ';', '\t'].sort((a, b) => count(b) - count(a))[0]
  const rows: string[][] = []
  let row: string[] = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += c
    } else if (c === '"') q = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
    if (rows.length > MAX_ROWS + 50) break
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.map(r => r.map(clean))
}

// ── XLSX (a zip of XML files) ─────────────────────────────────────────────────────────
const entity = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&')
const textOfSi = (xml: string) => entity([...xml.replace(/<rPh[\s\S]*?<\/rPh>/g, '').matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join(''))
const colIndex = (ref: string) => { const m = /^([A-Z]+)/.exec(ref); if (!m) return 0; let n = 0; for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1 }
const DATE_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47])
/** An Excel serial date as 2026-04-30. */
export function serialToIso(n: number): string { return new Date(Math.round((n - 25569) * 86400000)).toISOString().slice(0, 10) }
const numText = (v: string) => { const n = Number(v); return Number.isFinite(n) ? String(Math.round(n * 1e6) / 1e6) : v }

export async function parseXlsx(buf: Buffer): Promise<Sheet[]> {
  const zip = await JSZip.loadAsync(buf)
  const get = async (p: string) => { const f = zip.file(p); return f ? await f.async('string') : '' }
  let total = 0
  for (const f of Object.values(zip.files)) total += (f as any)._data?.uncompressedSize ?? 0
  if (total > MAX_UNZIPPED) throw new Error('The spreadsheet is too large when opened.')
  const wb = await get('xl/workbook.xml')
  if (!wb) throw new Error('This does not look like an Excel workbook.')
  const rels = await get('xl/_rels/workbook.xml.rels')
  const relTarget = new Map<string, string>()
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) { const id = /\bId="([^"]+)"/.exec(m[0])?.[1], t = /\bTarget="([^"]+)"/.exec(m[0])?.[1]; if (id && t) relTarget.set(id, t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '')) }
  const shared = [...(await get('xl/sharedStrings.xml')).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m => textOfSi(m[1]))
  const styles = await get('xl/styles.xml')
  const customDate = new Set<number>()
  for (const m of styles.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) { const code = entity(m[2]).replace(/"[^"]*"|\[[^\]]*\]/g, ''); if (/[dmy]/i.test(code) && !/[hs]/i.test(code.replace(/mm?/gi, ''))) customDate.add(Number(m[1])) }
  const cellXfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(styles)?.[1] ?? ''
  const xfIsDate = [...cellXfs.matchAll(/<xf\b[^>]*>/g)].map(m => { const id = Number(/numFmtId="(\d+)"/.exec(m[0])?.[1] ?? 0); return DATE_IDS.has(id) || customDate.has(id) })
  const sheets: Sheet[] = []
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    if (sheets.length >= 4) break
    const name = entity(/\bname="([^"]*)"/.exec(m[0])?.[1] ?? 'Sheet'), rid = /\br:id="([^"]+)"/.exec(m[0])?.[1] ?? ''
    if (/\bstate="(hidden|veryHidden)"/.test(m[0])) continue
    const xml = await get(relTarget.get(rid) ?? '')
    if (!xml) continue
    const grid: string[][] = []
    for (const rm of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = []
      const rowNo = /\br="(\d+)"/.exec(rm[0])?.[1]
      for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cm[1], body = cm[2] ?? ''
        const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1] ?? '', t = /\bt="([^"]+)"/.exec(attrs)?.[1] ?? '', s = Number(/\bs="(\d+)"/.exec(attrs)?.[1] ?? -1)
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1]
        let out = ''
        if (t === 's' && v != null) out = shared[Number(v)] ?? ''
        else if (t === 'inlineStr') out = textOfSi(body)
        else if (v != null) out = t === 'str' || t === 'b' || t === 'e' ? entity(v) : (xfIsDate[s] ? serialToIso(Number(v)) : numText(v))
        const at = ref ? colIndex(ref) : cells.length
        while (cells.length < at) cells.push('')
        cells[at] = clean(out)
      }
      const idx = rowNo ? Number(rowNo) - 1 : grid.length
      while (grid.length < idx) grid.push([])
      grid[idx] = cells
      if (grid.length > MAX_ROWS + 50) break
    }
    const sh = toSheet(name, grid)
    if (sh) sheets.push(sh)
  }
  return sheets
}

/** Picks the header row (titles above it are skipped) and trims empty rows and columns. */
export function toSheet(name: string, grid: string[][]): Sheet | null {
  const rows = grid.filter(r => r.some(c => c !== ''))
  if (rows.length < 2) return null
  const isNum = (c: string) => /^[-£(]?\d[\d,]*\.?\d*\)?%?$/.test(c)
  let h = 0
  for (let i = 0; i < Math.min(rows.length - 1, 15); i++) {
    const filled = rows[i].filter(c => c !== '')
    if (filled.length >= 2 && filled.filter(c => !isNum(c)).length >= Math.ceil(filled.length * 0.7)) { h = i; break }
  }
  const width = Math.min(MAX_COLS, Math.max(...rows.slice(h).map(r => r.length)))
  const headers = Array.from({ length: width }, (_, i) => rows[h][i] || `Column ${i + 1}`)
  let body = rows.slice(h + 1).map(r => Array.from({ length: width }, (_, i) => r[i] ?? ''))
  // A totals row at the bottom is not a person or an invoice.
  body = body.filter(r => !/^(grand )?totals?$/i.test((r.find(c => c !== '') ?? '').trim()))
  return { name, headers, rows: body.slice(0, MAX_ROWS), title_rows_skipped: h }
}

// ── Documents ─────────────────────────────────────────────────────────────────────────
async function docxText(buf: Buffer): Promise<string> {
  const mammoth: any = await import('mammoth')
  return String((await (mammoth.default ?? mammoth).extractRawText({ buffer: buf })).value ?? '')
}
async function pdfText(buf: Buffer): Promise<string> {
  const mod: any = await import('pdf-parse')
  return String((await (mod.default ?? mod)(buf)).text ?? '')
}

/** Works out what a file really is from its first bytes (not just its name) and reads it. Old .xls files are refused with a plain way forward. */
export async function readUpload(buf: Buffer, filename: string): Promise<Parsed> {
  if (!buf.length) return { ok: false, reason: 'That file is empty.' }
  if (buf.length > MAX_BYTES) return { ok: false, reason: 'That file is over 5 MB. Please send a smaller one, or only the sheet you need.' }
  const lower = filename.toLowerCase()
  const zip = buf[0] === 0x50 && buf[1] === 0x4b
  const pdf = buf.slice(0, 5).toString('latin1') === '%PDF-'
  const ole = buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11
  try {
    if (ole) return { ok: false, reason: 'That is an old Excel or Word file. Please save it as .xlsx, .csv or .docx and upload it again.' }
    if (pdf) { const text = (await pdfText(buf)).slice(0, 60000); return text.trim().length < 20 ? { ok: false, reason: 'That PDF has no text I can read (it may be a scan). Please upload a spreadsheet, or type the totals.' } : { ok: true, kind: 'document', ext: 'pdf', text } }
    if (zip) {
      const z = await JSZip.loadAsync(buf)
      if (z.file('xl/workbook.xml')) { const sheets = await parseXlsx(buf); return sheets.length ? { ok: true, kind: 'spreadsheet', ext: 'xlsx', sheets } : { ok: false, reason: 'I could not find a table with a header row and some rows in that workbook.' } }
      if (z.file('word/document.xml')) return { ok: true, kind: 'document', ext: 'docx', text: (await docxText(buf)).slice(0, 60000) }
      return { ok: false, reason: 'That file type is not supported. Please use .xlsx, .csv, .docx or .pdf.' }
    }
    if (/\.(csv|txt|tsv)$/.test(lower) || !/[\u0000]/.test(buf.slice(0, 2000).toString('latin1'))) {
      const grid = parseCsv(buf.toString('utf8'))
      const sh = toSheet('CSV', grid)
      return sh ? { ok: true, kind: 'spreadsheet', ext: 'csv', sheets: [sh] } : { ok: false, reason: 'I could not find a header row and some rows in that file.' }
    }
  } catch (e: any) {
    return { ok: false, reason: /too large/.test(String(e?.message)) ? String(e.message) : 'That file could not be read. Please check it opens normally and try again.' }
  }
  return { ok: false, reason: 'That file type is not supported. Please use .xlsx, .csv, .docx or .pdf.' }
}

/** A number from the way people write money and hours in sheets: "£1,234.56", "(5.00)", "12.71", "8h". null when it is not a number. */
export function toNumber(s: string | null | undefined): number | null {
  if (s == null) return null
  let t = String(s).trim()
  if (!t) return null
  let neg = false
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1) }
  t = t.replace(/[£$€,\s]/g, '').replace(/(hrs?|hours?|h|p\/h|\/hr)$/i, '')
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null
  const n = Number(t)
  return Number.isFinite(n) ? (neg ? -n : n) : null
}
