// Drop the tsvector trigger that referenced the now-dropped also_known_as_tsv column.
// The also_known_as array is used directly for regulation detection — no tsv needed.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Drop trigger if it exists
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trg_external_regulations_tsv ON external_regulations;
  `)
  console.log('✓ Dropped tsv trigger (if it existed)')

  // Drop the associated function if it exists
  await prisma.$executeRawUnsafe(`
    DROP FUNCTION IF EXISTS update_also_known_as_tsv() CASCADE;
  `)
  console.log('✓ Dropped tsv function (if it existed)')

  // Verify regulation rows are intact
  const count = await (prisma as any).externalRegulation.count()
  console.log(`✓ external_regulations rows: ${count}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
