// Run with: npx tsx prisma/seed-regulations.ts
// Reads prisma/regulations.csv and upserts all rows into external_regulations.

import fs   from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Minimal RFC-4180 CSV parser ─────────────────────────────────────────────

function parseCsv(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < content.length) {
    const ch = content[i]

    if (inQuotes) {
      if (ch === '"' && content[i + 1] === '"') {
        field += '"'
        i += 2
      } else if (ch === '"') {
        inQuotes = false
        i++
      } else {
        field += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ',') {
        row.push(field)
        field = ''
        i++
      } else if (ch === '\r' && content[i + 1] === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
        i += 2
      } else if (ch === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
        i++
      } else {
        field += ch
        i++
      }
    }
  }

  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(key: string): string {
  return key
    .toLowerCase()
    .replace(/[()\/,]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function splitUrls(raw: string): string[] {
  return raw.split(';').map(u => u.trim()).filter(Boolean)
}

function splitAka(raw: string): string[] {
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = path.join(__dirname, 'regulations.csv')
  const rows    = parseCsv(fs.readFileSync(csvPath, 'utf-8'))

  // Skip header row
  const dataRows = rows.slice(1).filter(r => r[0]?.trim())

  console.log(`Seeding ${dataRows.length} external regulations…`)

  for (const row of dataRows) {
    const [refKey, officialName, alsoKnownAs, summary, careContext, interaction, practical, sourceUrl] = row

    const key = slugify(refKey)

    await (prisma as any).externalRegulation.upsert({
      where:  { reference_key: key },
      update: {
        official_name:            officialName,
        also_known_as:            splitAka(alsoKnownAs),
        summary,
        care_home_context:        careContext,
        care_company_interaction: interaction,
        practical_meaning:        practical,
        source_urls:              splitUrls(sourceUrl),
        is_active:                true,
        last_synced_at:           new Date(),
      },
      create: {
        reference_key:            key,
        official_name:            officialName,
        also_known_as:            splitAka(alsoKnownAs),
        summary,
        care_home_context:        careContext,
        care_company_interaction: interaction,
        practical_meaning:        practical,
        source_urls:              splitUrls(sourceUrl),
        is_active:                true,
        last_synced_at:           new Date(),
      },
    })

    console.log(`  ✓ ${key}`)
  }

  console.log(`\nDone — ${dataRows.length} regulations seeded.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
