// Run: npx tsx src/lib/forward-client.test.mts
import assert from 'node:assert/strict'
const m: any = await import('./forward-client.ts')
const forwardHeaders = (m.forwardHeaders ?? m.default?.forwardHeaders) as typeof import('./forward-client').forwardHeaders
const env = { CS_FORWARD_SECRET: 's'.repeat(40) }
const h = { 'x-forwarded-for': '81.2.69.142, 76.76.21.9', 'x-vercel-ip-country': 'GB', 'x-vercel-ip-city': 'Bexley%20Heath', 'user-agent': 'Mozilla/5.0 (Linux; Android 14)', cookie: 'a=b; cs_app=android; c=d' }
const o = forwardHeaders(h, { env, mode: 'installed_web' })
assert.equal(o['x-cs-client-ip'], '81.2.69.142'); assert.equal(o['x-cs-client-city'], 'Bexley%20Heath'); assert.equal(o['x-cs-client-app'], 'android'); assert.equal(o['x-cs-client-mode'], 'installed_web'); assert.equal(o['x-cs-forward-secret'], env.CS_FORWARD_SECRET)
assert.deepEqual(forwardHeaders(h, { env: {} }), {}, 'no secret configured: sends nothing')
assert.equal(forwardHeaders({ 'x-real-ip': '1.2.3.4' }, { env })['x-cs-client-ip'], '1.2.3.4')
assert.equal(forwardHeaders({ 'x-forwarded-for': ['5.6.7.8'] as any }, { env })['x-cs-client-ip'], '5.6.7.8')
assert.equal(forwardHeaders(undefined, { env })['x-cs-client-ip'], undefined)
assert.equal(forwardHeaders({ 'user-agent': 'bad\u0000agenté' }, { env })['x-cs-client-ua'], 'badagent')
console.log('forward-client tests passed')
