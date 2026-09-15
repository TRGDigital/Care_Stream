// Export the 11 care-setting configs as JSON, for seeding setting_pages.
//
// Imports the real modules rather than parsing the TypeScript, so the values are exactly what
// the live pages render today — no regex reading of source, and nothing retyped.
//
//   npx tsx scripts/export-setting-configs.ts > ../../setting-configs.json

import { SETTINGS_LIST } from '../src/lib/settings/list'

async function main() {
  const out: Record<string, unknown>[] = []
  for (const [i, s] of SETTINGS_LIST.entries()) {
    const mod = await import(`../src/lib/settings/${s.slug}`)
    const config = mod.config
    if (!config) throw new Error(`no config export for ${s.slug}`)
    out.push({ slug: config.slug, label: config.label, sort: i, config })
  }
  process.stdout.write(JSON.stringify(out, null, 1))
}

main().catch(e => { console.error(e); process.exit(1) })
