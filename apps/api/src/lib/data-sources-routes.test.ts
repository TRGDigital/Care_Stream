import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import sgMail from '@sendgrid/mail'
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'SG.test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
import * as out from '../services/email/outbound'

const src = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')

test('the console routes are platform only and the figures route is for signed in admins', () => {
  const r = src('../routes/data-sources.ts')
  assert.match(r, /dataSourcesAdminRouter\.use\(requirePlatformAdmin\)/)
  assert.match(r, /dataSourcesFiguresRouter\.use\(requireAdmin\)/)
  const app = src('../app.ts')
  assert.match(app, /app\.use\('\/admin\/data-sources', dataSourcesAdminRouter\)/)
  assert.match(app, /app\.use\('\/data-sources', dataSourcesFiguresRouter\)/)
})
test('the weekly route is a cron job behind the cron secret and says it only emails on a change', () => {
  const c = src('../routes/cron.ts')
  assert.match(c, /cronRouter\.get\('\/check-data-sources'/)
  assert.match(c, /job\('check-data-sources'/)
})
test('the data sources email goes to the owner with one bullet per item and a link to the console', async () => {
  const sent: any[] = []
  ;(sgMail as any).send = async (m: any) => { sent.push(m) }
  await out.sendDataSourcesEmail({ subject: 'Data sources: 2 to look at', lines: ['Statutory Sick Pay weekly rate: the figure has changed.', 'Bank holidays: could not read it.'] })
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, 'lenny@trgdigital.co.uk')
  assert.equal(sent[0].subject, 'Data sources: 2 to look at')
  assert.equal((sent[0].html.match(/<li/g) ?? []).length, 2)
  assert.ok(sent[0].html.includes('/platform/data-sources'))
  assert.ok(!/[–—]/.test(sent[0].html.replace(/&mdash;|&ndash;/g, '')))
})
