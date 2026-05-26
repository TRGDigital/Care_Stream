import { google } from 'googleapis'
import { prisma } from '../../db/client'
import { CQC_SEEDS } from '../../data/cqc-seeds-data'

// CQC seeds Google Sheets sync — bidirectional.
//
// Environment variables required:
//   GOOGLE_SERVICE_ACCOUNT_JSON   — full JSON key file content as a string
//   GOOGLE_SHEETS_CQC_SEEDS_ID    — spreadsheet ID from the sheet URL
//
// Column order (row 1 is the header):
//   A  Framework Area      (Safe / Effective / Caring / Responsive / Well-led / Custom)
//   B  Also Known As       (comma-separated)
//   C  Description
//   D  Inspector Focus
//   E  Evidence Expected
//   F  Rating Indicators
//   G  Source URLs         (comma-separated)
//   H  Is Active           (TRUE / FALSE)

const RANGE  = 'Sheet1!A:H'
const HEADER = [
  'Framework Area',
  'Also Known As',
  'Description',
  'Inspector Focus',
  'Evidence Expected',
  'Rating Indicators',
  'Source URLs',
  'Is Active',
]

// ─── Google Sheets client ─────────────────────────────────────────────────────

function getSheetsClient() {
  const credJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!credJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var is not set')
  const spreadsheetId = process.env.GOOGLE_SHEETS_CQC_SEEDS_ID
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_CQC_SEEDS_ID env var is not set')

  const auth   = new google.auth.GoogleAuth({ credentials: JSON.parse(credJson), scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
  const sheets = google.sheets({ version: 'v4', auth })
  return { sheets, spreadsheetId }
}

// ─── Column helpers ───────────────────────────────────────────────────────────

function cell(row: string[], i: number) { return (row[i] ?? '').trim() }

function splitCsv(val: string): string[] {
  return val.split(',').map(s => s.trim()).filter(Boolean)
}

// ─── Slug derivation (mirrors platform page logic) ───────────────────────────

function deriveSlug(frameworkArea: string, existingSlugs: string[]): string {
  const base  = frameworkArea.toLowerCase().replace(/\s+/g, '-')
  const count = existingSlugs.filter(s => s.startsWith(base)).length
  return `${base}-${count + 1}`
}

// ─── Sync: Sheet → DB ─────────────────────────────────────────────────────────

export interface SyncResult {
  synced_at:  Date
  total_rows: number
  upserted:   number
  unchanged:  number
  errors:     string[]
}

export async function syncCqcSeedsFromSheets(): Promise<SyncResult> {
  const synced_at = new Date()
  const errors: string[] = []

  const { sheets, spreadsheetId } = getSheetsClient()
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: RANGE })
  const rows     = (response.data.values ?? []).slice(1) as string[][]  // skip header

  if (rows.length === 0) return { synced_at, total_rows: 0, upserted: 0, unchanged: 0, errors }

  const existing: any[] = await (prisma as any).cqcSeed.findMany()
  const existingSlugs   = existing.map((s: any) => s.slug as string)

  let upserted  = 0
  let unchanged = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const framework_area = cell(row, 0)
    if (!framework_area) continue

    const parsed = {
      framework_area,
      also_known_as:     splitCsv(cell(row, 1)),
      description:       cell(row, 2),
      inspector_focus:   cell(row, 3),
      evidence_expected: cell(row, 4),
      rating_indicators: cell(row, 5),
      source_urls:       splitCsv(cell(row, 6)),
      is_active:         cell(row, 7).toUpperCase() !== 'FALSE',
    }

    if (!parsed.description) {
      errors.push(`Row ${i + 2}: missing description — skipped`)
      continue
    }

    // Match by description (acts as a stable identifier from the sheet)
    const match = existing.find((s: any) => s.description === parsed.description)

    try {
      if (match) {
        const changed = (
          match.framework_area    !== parsed.framework_area    ||
          match.inspector_focus   !== parsed.inspector_focus   ||
          match.evidence_expected !== parsed.evidence_expected ||
          match.rating_indicators !== parsed.rating_indicators ||
          match.is_active         !== parsed.is_active         ||
          JSON.stringify(match.also_known_as?.slice().sort()) !== JSON.stringify(parsed.also_known_as.slice().sort()) ||
          JSON.stringify(match.source_urls?.slice().sort())   !== JSON.stringify(parsed.source_urls.slice().sort())
        )
        if (changed) {
          await (prisma as any).cqcSeed.update({ where: { id: match.id }, data: parsed })
          upserted++
        } else {
          unchanged++
        }
      } else {
        const slug = deriveSlug(parsed.framework_area, existingSlugs)
        existingSlugs.push(slug)
        await (prisma as any).cqcSeed.create({ data: { ...parsed, slug } })
        upserted++
      }
    } catch (e) {
      errors.push(`Row ${i + 2}: ${String(e)}`)
    }
  }

  return { synced_at, total_rows: rows.length, upserted, unchanged, errors }
}

// ─── Populate: data file → Sheet ─────────────────────────────────────────────

export interface PopulateResult {
  written: number
  errors:  string[]
}

export async function populateCqcSeedsSheet(): Promise<PopulateResult> {
  const errors: string[] = []
  const { sheets, spreadsheetId } = getSheetsClient()

  // Build rows from the canonical data file
  const dataRows: string[][] = CQC_SEEDS.map(seed => [
    seed.framework_area,
    seed.also_known_as.join(', '),
    seed.description,
    seed.inspector_focus,
    seed.evidence_expected,
    seed.rating_indicators,
    seed.source_urls.join(', '),
    'TRUE',
  ])

  // Clear the sheet and re-write with header + data
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: RANGE })

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range:          'Sheet1!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [HEADER, ...dataRows],
    },
  })

  return { written: dataRows.length, errors }
}
