// Letters shared in the hub: how a letter is shared (and print only), the staff member's own letters (tenant and person scoped), the snapshot PDF that is served, acknowledgement only
// when required, withdraw, tablets, and the Letters agent asking how to share. Run with:  npx tsx --test src/lib/staff-letters.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import os from 'os'
import path from 'path'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
delete process.env.S3_BUCKET
process.env.LOCAL_STORAGE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-letters-'))
import express from 'express'
import type { AddressInfo } from 'net'
import { prisma } from '../db/client'
import * as letters from './staff-letters'
import { meLettersRouter } from '../routes/staff-letters'
import { readShareIntent, checkShareIntent, channelsFor, describeIntent, defaultNeedsAcknowledgement } from '../services/ask-docs/share-intent'
import { sharesFor, SHARE_METHODS } from '../services/ask-docs/workflow'
import { tabletRefusal } from './shared-tablets'
import { LETTER_TOOLS } from '../services/ask/letter-tools'
import { agentById } from '../services/ask/agents'
import { TOOLS } from '../services/ask/tools'

const here = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')

// ── A tiny in memory stand in for the staff_letters table, applying the same filters the SQL names ────────────────────────────────────────────
type Row = Record<string, any>
let rows: Row[] = []
const seen: Array<{ sql: string; params: any[] }> = []
const live = (r: Row) => r.withdrawn_at == null
;(prisma as any).$queryRawUnsafe = async (sql: string, ...p: any[]) => {
  seen.push({ sql, params: p })
  if (/select 1 from public.staff_letters/.test(sql)) return [{ '?column?': 1 }]
  if (/count\(\*\)::int as total/.test(sql)) { const mine = rows.filter(r => r.tenant_id === p[0] && r.user_id === p[1] && live(r)); return [{ total: mine.length, unread: mine.filter(r => !r.read_at).length, needs_ack: mine.filter(r => r.needs_acknowledgement && !r.acknowledged_at).length }] }
  if (/from public.staff_letters where tenant_id = \$1 and user_id = \$2 and withdrawn_at is null order by/.test(sql)) return rows.filter(r => r.tenant_id === p[0] && r.user_id === p[1] && live(r)).sort((a, b) => Number(!!a.read_at) - Number(!!b.read_at))
  if (/storage_key from public.staff_letters where id = \$1 and tenant_id = \$2 and user_id = \$3 and withdrawn_at is null/.test(sql)) return rows.filter(r => r.id === p[0] && r.tenant_id === p[1] && r.user_id === p[2] && live(r))
  if (/where notification_id = \$1 and tenant_id = \$2 and user_id = \$3 and withdrawn_at is null/.test(sql)) return rows.filter(r => r.notification_id === p[0] && r.tenant_id === p[1] && r.user_id === p[2] && live(r))
  if (/set read_at = coalesce\(read_at, now\(\)\) where id = \$1 and tenant_id = \$2 and user_id = \$3 and withdrawn_at is null returning read_at/.test(sql)) { const r = rows.find(x => x.id === p[0] && x.tenant_id === p[1] && x.user_id === p[2] && live(x)); if (!r) return []; r.read_at = r.read_at ?? new Date(); return [{ read_at: r.read_at }] }
  if (/select needs_acknowledgement from public.staff_letters where id = \$1 and tenant_id = \$2 and user_id = \$3 and withdrawn_at is null/.test(sql)) return rows.filter(r => r.id === p[0] && r.tenant_id === p[1] && r.user_id === p[2] && live(r)).map(r => ({ needs_acknowledgement: r.needs_acknowledgement }))
  if (/set acknowledged_at = coalesce/.test(sql)) { const r = rows.find(x => x.id === p[0] && x.tenant_id === p[1] && x.user_id === p[2] && live(x)); if (!r) return []; r.acknowledged_at = r.acknowledged_at ?? new Date(); r.read_at = r.read_at ?? new Date(); return [{ acknowledged_at: r.acknowledged_at }] }
  if (/set withdrawn_at = now\(\), withdrawn_by = \$3 where id = \$1 and tenant_id = \$2 and withdrawn_at is null/.test(sql)) { const r = rows.find(x => x.id === p[0] && x.tenant_id === p[1] && live(x)); if (!r) return []; r.withdrawn_at = new Date(); r.withdrawn_by = p[2]; return [{ id: r.id, document_id: r.document_id, notification_id: r.notification_id }] }
  if (/where document_id = \$1 and tenant_id = \$2 order by shared_at/.test(sql)) return rows.filter(r => r.document_id === p[0] && r.tenant_id === p[1])
  throw new Error('unexpected sql: ' + sql.slice(0, 120))
}
;(prisma as any).$executeRawUnsafe = async (sql: string, ...p: any[]) => {
  seen.push({ sql, params: p })
  if (/insert into public.staff_letters/.test(sql)) {
    rows.push({ id: p[0], tenant_id: p[1], document_id: p[2], user_id: p[3], title: p[4], filename: p[5], storage_key: p[6], size_bytes: p[7], signed: p[8], sent_by: p[9], sent_by_name: p[10], notification_id: p[11], needs_acknowledgement: p[12], shared_at: new Date(), read_at: null, acknowledged_at: null, withdrawn_at: null })
    return 1
  }
  if (/set notification_id = \$3 where id = \$1 and tenant_id = \$2/.test(sql)) { const r = rows.find(x => x.id === p[0] && x.tenant_id === p[1]); if (r) r.notification_id = p[2]; return r ? 1 : 0 }
  throw new Error('unexpected sql: ' + sql.slice(0, 120))
}
;const audits: any[] = []
;(prisma as any).auditLog = { create: async (a: any) => { audits.push(a.data); return {} } }
;(prisma as any).user = { findMany: async ({ where }: any) => (where.id.in as string[]).map(id => ({ id, name: id === 'u-sam' ? 'Sam Jones' : 'Other Person' })) }

const PDF_A = Buffer.from('%PDF-1.4 the letter exactly as it was when it was shared')
async function share(o: Partial<Parameters<typeof letters.shareToHub>[0]> = {}) {
  return letters.shareToHub({ tenantId: 't1', documentId: 'doc1', userId: 'u-sam', title: 'Pay review outcome', filename: 'pay-review.pdf', pdf: PDF_A, signed: true, sentBy: 'a1', sentByName: 'Len Burgess', needsAcknowledgement: false, ...o })
}

// A small server with the real router and a fake sign in (the person comes from headers, as the real middleware would set req.user).
async function serve() {
  const app = express(); app.use(express.json())
  app.use((req: any, _res, next) => { req.user = { sub: String(req.headers['x-user'] ?? 'u-sam'), tenant_id: String(req.headers['x-tenant'] ?? 't1'), role: 'staff', ...(req.headers['x-imp'] ? { imp: { by: 'a1', by_name: 'Len', mode: 'act' } } : {}) }; next() })
  app.use('/me/letters', meLettersRouter)
  const server = app.listen(0); const port = (server.address() as AddressInfo).port
  const call = async (method: string, url: string, h: Record<string, string> = {}) => {
    const r = await fetch(`http://127.0.0.1:${port}${url}`, { method, headers: h })
    const ct = r.headers.get('content-type') ?? ''
    return { status: r.status, headers: r.headers, body: (ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer())) as any }
  }
  return { call, close: () => server.close() }
}

test('how a letter is shared: hub, email, both, or print only; print only is exclusive; nothing chosen means ask', () => {
  assert.equal(readShareIntent(undefined), null); assert.equal(readShareIntent({}), null)
  assert.equal(checkShareIntent(null).ok, false)
  assert.equal(checkShareIntent({ hub: false, email: false, print_only: false }).ok, false)
  assert.equal(checkShareIntent({ hub: true, email: false, print_only: false }).ok, true)
  assert.equal(checkShareIntent({ hub: true, email: true, print_only: false }).ok, true)
  assert.equal(checkShareIntent({ hub: true, email: false, print_only: true }).ok, false, 'print only cannot be mixed')
  assert.deepEqual(channelsFor({ hub: true, email: true, print_only: false }), ['hub', 'email'])
  assert.deepEqual(channelsFor({ hub: false, email: false, print_only: true }), [], 'print only has nothing to share')
  assert.match(describeIntent({ hub: true, email: true, print_only: false }), /hub and by email/); assert.match(describeIntent({ hub: false, email: false, print_only: true }), /does not see it/)
})

test('acknowledgement defaults on for templates that carry an acknowledgement block (and its condition), off otherwise', () => {
  assert.equal(defaultNeedsAcknowledgement('contract-hours-change'), true)
  assert.equal(defaultNeedsAcknowledgement('policy-change-notice', { ack_required: 'yes' }), true)
  assert.equal(defaultNeedsAcknowledgement('policy-change-notice', { ack_required: 'no' }), false)
  assert.equal(defaultNeedsAcknowledgement('thank-you'), false)
  assert.equal(defaultNeedsAcknowledgement('no-such-letter'), false)
})

test('PRINT ONLY is never put in the hub: the share code and the route both refuse it', () => {
  const share = here('../services/ask-docs/share.ts'), route = here('../routes/ask.ts')
  assert.match(share, /print_only === true\) return \{ ok: false/)
  assert.match(route, /share_intent\?\.print_only === true\) \{ err\(res, 'NOT_ALLOWED'/)
  assert.match(route, /This letter is print only/)
  assert.ok(sharesFor('letter', null).includes('hub')); assert.ok(SHARE_METHODS.includes('hub')); assert.ok(!sharesFor('newsletter', null).includes('hub'), 'only a letter goes to a hub')
})

test('the snapshot PDF is what is stored and what is served (a roundtrip through private storage), and the hub notification is hub only and linked', async () => {
  rows = []
  const id = await share()
  assert.equal(rows.length, 1); assert.match(rows[0].storage_key, /^tenants\/t1\/staff-letters\/.+\.pdf$/)
  const s = await serve()
  const f = await s.call('GET', `/me/letters/${id}/file`)
  assert.equal(f.status, 200); assert.equal(f.headers.get('content-type'), 'application/pdf'); assert.equal(f.headers.get('cache-control'), 'private, no-store')
  assert.deepEqual(f.body, PDF_A, 'the bytes served are the bytes that were shared')
  assert.ok(audits.some(a => a.event_type === 'staff_letter_file_downloaded' && a.entity_id === id && a.user_id === 'u-sam'), 'each download is audited')
  const dl = await s.call('GET', `/me/letters/${id}/file?download=1`); assert.match(String(dl.headers.get('content-disposition')), /^attachment/)
  s.close()
  const src = here('../services/ask-docs/share.ts')
  assert.match(src, /createAndSendNotification\(\{[^}]*email: false[^}]*skipDailyLimit: true/s); assert.match(src, /setNotificationFor\(o\.tenantId, letterId, n\.id\)/)
  const file = here('../routes/staff-letters.ts')
  assert.ok(!/pdfFor|renderDocument|renderPdf/.test(file), 'the staff route serves the snapshot and never re-renders the draft')
})

test('a staff member can only read their own letters, in their own account; a withdrawn letter is gone', async () => {
  rows = []
  const mine = await share(), theirs = await share({ userId: 'u-other' }), otherAccount = await share({ tenantId: 't2' })
  const s = await serve()
  const list = await s.call('GET', '/me/letters'); assert.deepEqual(list.body.data.letters.map((l: any) => l.id), [mine])
  assert.equal((await s.call('GET', `/me/letters/${theirs}`)).status, 404, 'another person\'s letter')
  assert.equal((await s.call('GET', `/me/letters/${theirs}/file`)).status, 404)
  assert.equal((await s.call('GET', `/me/letters/${otherAccount}`)).status, 404, 'another account\'s letter')
  assert.equal((await s.call('POST', `/me/letters/${theirs}/read`)).status, 404)
  assert.equal((await s.call('GET', `/me/letters/${mine}`)).status, 200)
  const w = await letters.withdraw('t1', mine, 'a1'); assert.ok(w)
  assert.deepEqual((await s.call('GET', '/me/letters')).body.data.letters, [], 'withdrawn letters vanish from the hub')
  assert.equal((await s.call('GET', `/me/letters/${mine}`)).status, 404); assert.equal((await s.call('GET', `/me/letters/${mine}/file`)).status, 404)
  assert.equal(await letters.withdraw('t1', mine, 'a1'), null, 'withdrawing twice does nothing')
  assert.equal(rows.find(r => r.id === mine)!.withdrawn_by, 'a1', 'the record stays, with who withdrew it')
  s.close()
})

test('acknowledge only when the letter asks for it; read and acknowledge are recorded once; the menu item shows only for people who have a letter', async () => {
  rows = []
  const plain = await share(), needs = await share({ needsAcknowledgement: true, title: 'Policy change' })
  const s = await serve()
  assert.equal((await s.call('POST', `/me/letters/${plain}/acknowledge`)).status, 409, 'not asked for')
  const meta = (await s.call('GET', '/me/letters/meta')).body.data; assert.deepEqual({ enabled: meta.enabled, unread: meta.unread, ack: meta.needs_acknowledgement }, { enabled: true, unread: 2, ack: 1 })
  const a = await s.call('POST', `/me/letters/${needs}/acknowledge`); assert.equal(a.status, 200); const first = a.body.data.acknowledged_at; assert.ok(first)
  assert.equal((await s.call('POST', `/me/letters/${needs}/acknowledge`)).body.data.acknowledged_at, first, 'the first date stays')
  assert.equal((await s.call('POST', `/me/letters/${plain}/read`)).status, 200)
  assert.ok(audits.some(a => a.event_type === 'staff_letter_acknowledged' && a.entity_id === needs), 'the acknowledgement is audited'); assert.ok(audits.some(a => a.event_type === 'staff_letter_read' && a.entity_id === plain))
  const m2 = (await s.call('GET', '/me/letters/meta')).body.data; assert.equal(m2.unread, 0)
  const nobody = (await s.call('GET', '/me/letters/meta', { 'x-user': 'u-nobody' })).body.data; assert.equal(nobody.enabled, false)
  // someone looking at (or acting as) the hub never marks a letter read or acknowledged for the person
  rows = []; const l = await share({ needsAcknowledgement: true })
  assert.equal((await s.call('POST', `/me/letters/${l}/acknowledge`, { 'x-imp': '1' })).status, 403)
  await s.call('POST', `/me/letters/${l}/read`, { 'x-imp': '1' }); assert.equal(rows[0].read_at, null)
  s.close()
})

test('the admin list shows who has read and acknowledged it, and the notification can find its letter', async () => {
  rows = []
  const id = await share({ notificationId: 'n9', needsAcknowledgement: true })
  const shares = await letters.sharesOfDocument('t1', 'doc1'); assert.equal(shares.length, 1); assert.equal(shares[0].person_name, 'Sam Jones'); assert.equal(shares[0].needs_acknowledgement, true)
  const s = await serve(); const b = await s.call('GET', '/me/letters/by-notification/n9'); assert.equal(b.body.data.letter.id, id)
  assert.equal((await s.call('GET', '/me/letters/by-notification/n9', { 'x-user': 'u-other' })).body.data.letter, null); s.close()
})

test('every read of a person\'s letters names the account and the person; withdrawn rows are excluded; every audited action has an event', () => {
  seen.length = 0
  const src = here('./staff-letters.ts')
  for (const m of src.matchAll(/\$queryRawUnsafe\(`?'?([^`']*)/g)) {
    const sql = m[1]
    if (/from public\.staff_letters/.test(sql) && /user_id = \$/.test(sql) && !/document_id/.test(sql)) assert.ok(/tenant_id = \$/.test(sql) && /withdrawn_at is null/.test(sql), `unscoped: ${sql.slice(0, 80)}`)
  }
  const route = here('../routes/staff-letters.ts'), audit = here('./audit.ts')
  for (const ev of ['staff_letter_read', 'staff_letter_acknowledged', 'staff_letter_file_downloaded']) { assert.match(route, new RegExp(ev)); assert.match(audit, new RegExp(ev)) }
  assert.match(here('../routes/ask.ts'), /staff_letter_shared/); assert.match(here('../routes/ask.ts'), /staff_letter_withdrawn/); assert.match(audit, /staff_letter_withdrawn/)
})

test('a shared tablet\'s own login never reaches My letters; a person signed in by PIN does', () => {
  const req = (method: string, url: string, dev: any) => ({ method, originalUrl: url, user: { sub: 'u', tenant_id: 't', role: 'staff', dev } }) as any
  for (const [m, u] of [['GET', '/me/letters'], ['GET', '/me/letters/l1/file'], ['POST', '/me/letters/l1/acknowledge']]) {
    assert.ok(tabletRefusal(req(m, u, { t: 'device', d: 'd1' })), `${m} ${u} refused for the tablet itself`)
    assert.equal(tabletRefusal(req(m, u, { t: 'personal', d: 'd1' })), null, `${m} ${u} allowed after a PIN`)
  }
})

test('the Letters agent must ask how the letter is shared: the tool refuses without it, never defaults, and the prompt says so', async () => {
  const save = LETTER_TOOLS.find(t => t.name === 'save_letter_draft')!, set = LETTER_TOOLS.find(t => t.name === 'set_share_intent')!
  assert.ok(save && set); assert.ok((save.input_schema as any).properties.share_intent, 'the schema carries share_intent')
  assert.match(save.description, /HOW it is to be shared/); assert.match(save.description, /Never guess/)
  const a = agentById('letters')!
  assert.ok(a.tools.includes('set_share_intent') && a.tools.every(n => TOOLS.some(t => t.name === n)))
  assert.match(a.prompt, /ask HOW the letter is to be shared/); assert.match(a.prompt, /Never guess and never pick a default/); assert.match(a.prompt, /print only/); assert.match(a.prompt, /never see/)
  assert.match(a.prompt, /You never share anything yourself/)
  // the source of the save tool: the share check sits before the draft is written
  const src = here('../services/ask/letter-tools.ts'); const at = src.indexOf('share_intent_missing: true'), saveAt = src.indexOf('await saveDocument(')
  assert.ok(at > 0 && saveAt > at, 'no draft is saved before the share choice is known')
  assert.match(src, /share_intent: check\.intent/)
})

// ── The screens (source level: nothing here has been seen in a browser) ─────────────────────────────────────────────────────────────────
const web = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../web/src', f), 'utf8')

test('HUB: My letters opens inside the hub, shows only for people who have a letter, and keeps the sidebar', () => {
  const chat = web('app/(portal)/chat/page.tsx')
  assert.match(chat, /'my-letters'/); assert.match(chat, /lettersMeta\.enabled/); assert.match(chat, /My letters/); assert.match(chat, /<MyLettersView /)
  assert.match(chat, /v === 'my-letters'/, 'the query string opens it (view=my-letters&id=)')
  const view = web('components/hub/views/my-letters-view.tsx')
  assert.match(view, /max-w-5xl/, 'as wide as the other hub pages'); assert.match(view, /no-scrollbar/)
  assert.match(view, /Print/); assert.match(view, /Download PDF/); assert.match(view, /I have read and understood this/)
  assert.match(view, /myLetters\.fileUrl/, 'the private file is fetched with the signed in token (a blob), never a public address')
  assert.match(view, /viewingAs/, 'viewing the hub as someone else never marks anything')
})

test('HUB: the notification about a letter offers Open the letter', () => {
  const n = web('components/hub/views/notification-detail-view.tsx')
  assert.match(n, /byNotification/); assert.match(n, /Open the letter/)
  assert.match(web('app/(portal)/chat/page.tsx'), /onOpenLetter=/)
})

test('ADMIN: the document panel asks how the letter is shared, offers Share now for the chosen way, shows hub status and can withdraw', () => {
  const p = web('components/ask/document-panel.tsx')
  assert.match(p, /How will this letter be shared\?/); assert.match(p, /Print only\./); assert.match(p, /never sees it/)
  assert.match(p, /Share now/); assert.match(p, /method: 'now'/); assert.match(p, /Withdraw/); assert.match(p, /window\.confirm\(`Withdraw this letter/)
  assert.match(p, /Shared in their hub/); assert.match(p, /Waiting for them to acknowledge it/)
  const c = web('lib/ask-client.ts'); assert.match(c, /setShareIntent/); assert.match(c, /withdrawHubShare/); assert.match(c, /'now'/)
})
