import { google } from 'googleapis'
import { prisma } from '../../db/client'
import { embedTexts } from '../rag/embedder'
import { upsertRegulationVectors } from '../vector/pinecone'
import type { RegulationVector } from '../vector/pinecone'

// §6.5 — Google Sheets sync pipeline.
//
// Environment variables required:
//   GOOGLE_SERVICE_ACCOUNT_JSON  — full JSON key file content as a string
//   GOOGLE_SHEETS_ID             — the spreadsheet ID from the sheet URL
//   GOOGLE_SHEETS_RANGE          — sheet range (default: "Sheet1!A:I")
//
// Expected column order (row 1 is the header, ignored):
//   A  Reference Key           (e.g. "gdpr")
//   B  Official Name           (e.g. "UK General Data Protection Regulation")
//   C  Additionally Known As   (comma-separated synonyms)
//   D  Summary
//   E  Care Home Context
//   F  Care Company Interaction
//   G  Practical Meaning
//   H  Source URLs             (comma-separated)
//   I  Is Active               ("TRUE" / "FALSE")
//
// Sync logic:
//   1. Fetch all rows from the Google Sheet
//   2. Compare with existing DB records (by reference_key)
//   3. Upsert new and changed records to PostgreSQL
//   4. Batch-embed the content of new/changed records
//   5. Upsert regulation vectors to the platform Pinecone namespace
//   6. Update pinecone_vector_id on the DB record
//   7. Return stats

export interface SyncResult {
  synced_at:   Date
  total_rows:  number
  upserted:    number   // new or changed records written to DB + re-embedded
  unchanged:   number   // records in sheet but already up-to-date
  errors:      string[]
}

// ─── Column indices (0-based) ─────────────────────────────────────────────────

const COL = {
  REFERENCE_KEY:            0,
  OFFICIAL_NAME:            1,
  ALSO_KNOWN_AS:            2,
  SUMMARY:                  3,
  CARE_HOME_CONTEXT:        4,
  CARE_COMPANY_INTERACTION: 5,
  PRACTICAL_MEANING:        6,
  SOURCE_URLS:              7,
  IS_ACTIVE:                8,
} as const

// ─── Sheet row parsing ────────────────────────────────────────────────────────

interface ParsedRow {
  reference_key:            string
  official_name:            string
  also_known_as:            string[]
  summary:                  string
  care_home_context:        string
  care_company_interaction: string
  practical_meaning:        string
  source_urls:              string[]
  is_active:                boolean
}

function cell(row: string[], col: number): string {
  return (row[col] ?? '').trim()
}

function parseRow(row: string[]): ParsedRow | null {
  const reference_key = cell(row, COL.REFERENCE_KEY).toLowerCase().replace(/\s+/g, '_')
  if (!reference_key) return null

  return {
    reference_key,
    official_name:            cell(row, COL.OFFICIAL_NAME),
    also_known_as:            cell(row, COL.ALSO_KNOWN_AS)
                                .split(',')
                                .map(s => s.trim())
                                .filter(Boolean),
    summary:                  cell(row, COL.SUMMARY),
    care_home_context:        cell(row, COL.CARE_HOME_CONTEXT),
    care_company_interaction: cell(row, COL.CARE_COMPANY_INTERACTION),
    practical_meaning:        cell(row, COL.PRACTICAL_MEANING),
    source_urls:              cell(row, COL.SOURCE_URLS)
                                .split(',')
                                .map(s => s.trim())
                                .filter(Boolean),
    is_active:                cell(row, COL.IS_ACTIVE).toUpperCase() !== 'FALSE',
  }
}

// ─── Change detection ─────────────────────────────────────────────────────────

function hasChanged(existing: any, parsed: ParsedRow): boolean {
  return (
    existing.official_name            !== parsed.official_name            ||
    existing.summary                  !== parsed.summary                  ||
    existing.care_home_context        !== parsed.care_home_context        ||
    existing.care_company_interaction !== parsed.care_company_interaction ||
    existing.practical_meaning        !== parsed.practical_meaning        ||
    existing.is_active                !== parsed.is_active                ||
    JSON.stringify(existing.also_known_as?.slice().sort()) !==
      JSON.stringify(parsed.also_known_as.slice().sort())                 ||
    JSON.stringify(existing.source_urls?.slice().sort()) !==
      JSON.stringify(parsed.source_urls.slice().sort())
  )
}

// Text embedded per regulation: summary + care home context + practical meaning (§6.2)
function buildEmbedText(row: ParsedRow): string {
  return [row.summary, row.care_home_context, row.practical_meaning]
    .filter(Boolean)
    .join('\n\n')
}

// ─── Google Sheets client ─────────────────────────────────────────────────────

async function fetchSheetRows(): Promise<string[][]> {
  const credJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!credJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var is not set')

  const credentials = JSON.parse(credJson)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const sheets    = google.sheets({ version: 'v4', auth })
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_ID env var is not set')

  const range = process.env.GOOGLE_SHEETS_RANGE ?? 'Sheet1!A:I'

  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range })
  const rows     = response.data.values ?? []

  // Skip the header row
  return rows.slice(1) as string[][]
}

// ─── Main sync function ───────────────────────────────────────────────────────

export async function syncRegulationsFromSheets(): Promise<SyncResult> {
  const synced_at = new Date()
  const errors: string[] = []

  // 1. Fetch rows from Google Sheet
  let rawRows: string[][]
  try {
    rawRows = await fetchSheetRows()
  } catch (e) {
    throw new Error(`Failed to fetch Google Sheet: ${String(e)}`)
  }

  // 2. Parse rows, skip blanks
  const parsedRows: ParsedRow[] = []
  for (let i = 0; i < rawRows.length; i++) {
    const parsed = parseRow(rawRows[i])
    if (parsed) {
      parsedRows.push(parsed)
    } else if (rawRows[i]?.some(c => c?.trim())) {
      errors.push(`Row ${i + 2}: missing reference_key — skipped`)
    }
  }

  if (parsedRows.length === 0) {
    return { synced_at, total_rows: 0, upserted: 0, unchanged: 0, errors }
  }

  // 3. Load existing DB records
  const existingRows = await (prisma as any).externalRegulation.findMany({
    select: {
      id: true, reference_key: true, official_name: true,
      also_known_as: true, summary: true, care_home_context: true,
      care_company_interaction: true, practical_meaning: true,
      source_urls: true, is_active: true, pinecone_vector_id: true,
    },
  })
  const existingMap = new Map<string, any>(
    existingRows.map((r: any) => [r.reference_key as string, r])
  )

  // 4. Categorise rows
  const toUpsert:    ParsedRow[] = []
  const toEmbedRows: ParsedRow[] = []

  for (const row of parsedRows) {
    const existing = existingMap.get(row.reference_key)
    if (!existing || hasChanged(existing, row)) {
      toUpsert.push(row)
      toEmbedRows.push(row)
    }
    // Unchanged records still get last_synced_at updated — handled in the upsert below
  }

  // 5. Batch embed new/changed records
  let embeddings: number[][] = []
  if (toEmbedRows.length > 0) {
    try {
      embeddings = await embedTexts(toEmbedRows.map(buildEmbedText))
    } catch (e) {
      errors.push(`Embedding failed: ${String(e)}`)
      // Continue without Pinecone update — DB records will still be upserted
    }
  }

  // 6. Upsert to PostgreSQL (all rows get last_synced_at updated)
  let upserted = 0
  const regulationVectors: RegulationVector[] = []

  for (let i = 0; i < parsedRows.length; i++) {
    const row        = parsedRows[i]
    const needsEmbed = toEmbedRows.indexOf(row) !== -1
    const embedding  = needsEmbed ? embeddings[toEmbedRows.indexOf(row)] : null
    const vectorId   = `reg_${row.reference_key}`

    try {
      await (prisma as any).externalRegulation.upsert({
        where:  { reference_key: row.reference_key },
        update: {
          official_name:            row.official_name,
          also_known_as:            row.also_known_as,
          summary:                  row.summary,
          care_home_context:        row.care_home_context,
          care_company_interaction: row.care_company_interaction,
          practical_meaning:        row.practical_meaning,
          source_urls:              row.source_urls,
          is_active:                row.is_active,
          last_synced_at:           synced_at,
          ...(embedding ? { pinecone_vector_id: vectorId } : {}),
        },
        create: {
          reference_key:            row.reference_key,
          official_name:            row.official_name,
          also_known_as:            row.also_known_as,
          summary:                  row.summary,
          care_home_context:        row.care_home_context,
          care_company_interaction: row.care_company_interaction,
          practical_meaning:        row.practical_meaning,
          source_urls:              row.source_urls,
          is_active:                row.is_active,
          last_synced_at:           synced_at,
          pinecone_vector_id:       embedding ? vectorId : null,
        },
      })

      if (needsEmbed && embedding) {
        regulationVectors.push({
          id:     vectorId,
          values: embedding,
          metadata: {
            reference_key: row.reference_key,
            official_name: row.official_name,
          },
        })
        upserted++
      }
    } catch (e) {
      errors.push(`${row.reference_key}: DB upsert failed — ${String(e)}`)
    }
  }

  // 7. Upsert vectors to platform Pinecone namespace
  if (regulationVectors.length > 0) {
    try {
      await upsertRegulationVectors(regulationVectors)
    } catch (e) {
      errors.push(`Pinecone upsert failed: ${String(e)}`)
    }
  }

  console.log(
    `[sync] Complete: total=${parsedRows.length} upserted=${upserted} ` +
    `unchanged=${parsedRows.length - toEmbedRows.length} errors=${errors.length}`
  )

  return {
    synced_at,
    total_rows: parsedRows.length,
    upserted,
    unchanged:  parsedRows.length - toEmbedRows.length,
    errors,
  }
}
