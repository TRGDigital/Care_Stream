// Run with:  npx tsx src/lib/growth-event.test.ts   (no network: fetch is injected)
import assert from 'node:assert/strict'
import { reportSignupToGrowth } from './growth-event'

let n = 0
const t = async (name: string, fn: () => Promise<void>) => { await fn(); n++; console.log('ok  ', name) }
const REF = '3f2c9a52-9a8e-4a55-8f6e-0d8b0c7e1a11'

async function main() {
  await t('secret unset: does nothing and never calls fetch', async () => {
    let calls = 0
    const r = await reportSignupToGrowth({ email: 'a@b.co.uk', tenantId: 't1' }, { env: {}, fetchImpl: (async () => { calls++; return new Response('{}') }) as any })
    assert.equal(calls, 0); assert.equal(r.ok, false); assert.equal(r.skipped, 'not configured')
  })
  await t('payload shape with a growth ref', async () => {
    let url = '', init: any
    const r = await reportSignupToGrowth({ email: 'a@b.co.uk', tenantId: 't1', growthRef: REF }, { env: { GROWTH_SECRET_CARESTREAM: 's3', GROWTH_ENGINE_URL: 'https://engine.example/' }, fetchImpl: (async (u: string, i: any) => { url = u; init = i; return new Response('{"ok":true}') }) as any })
    assert.equal(r.ok, true)
    assert.equal(url, 'https://engine.example/api/events')
    assert.equal(init.method, 'POST'); assert.equal(init.headers['x-growth-secret'], 's3')
    const b = JSON.parse(init.body)
    assert.deepEqual(b, { kind: 'signup', email: 'a@b.co.uk', contact_ref: REF, idempotency_key: 'signup-t1', detail: { tier: 'free', tenant_id: 't1', source: 'growth_email' } })
    assert.ok(init.signal instanceof AbortSignal)
  })
  await t('no growth ref: contact_ref absent, source organic, default engine url', async () => {
    let url = '', init: any
    await reportSignupToGrowth({ email: 'a@b.co.uk', tenantId: 't2', growthRef: null }, { env: { GROWTH_SECRET_CARESTREAM: 's' }, fetchImpl: (async (u: string, i: any) => { url = u; init = i; return new Response('{}') }) as any })
    assert.equal(url, 'https://trg-lead-engine.vercel.app/api/events')
    const b = JSON.parse(init.body)
    assert.ok(!('contact_ref' in b)); assert.equal(b.detail.source, 'organic')
  })
  await t('a throwing or timed out fetch is swallowed', async () => {
    const r = await reportSignupToGrowth({ email: 'a@b.co.uk', tenantId: 't3' }, { env: { GROWTH_SECRET_CARESTREAM: 's' }, fetchImpl: (async () => { throw new Error('boom') }) as any })
    assert.equal(r.ok, false); assert.equal(r.error, 'boom')
  })
  console.log(`\n${n} tests passed`)
}
main().catch((e) => { console.error(e); process.exit(1) })
