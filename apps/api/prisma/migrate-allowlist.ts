import { config } from 'dotenv'
import pkg from 'pg'
const { Client } = pkg
config()

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_DIRECT_URL })
  await client.connect()
  await client.query("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_allowlist TEXT[] DEFAULT '{}'::TEXT[];")
  console.log('✓ Added email_allowlist to tenants')
  await client.query('ALTER TABLE email_sessions ALTER COLUMN user_id DROP NOT NULL;')
  console.log('✓ Made email_sessions.user_id nullable')
  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })
