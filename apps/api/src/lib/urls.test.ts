import test from 'node:test'
import assert from 'node:assert/strict'
import { siteUrl } from './urls'

test('email links never use a vercel.app address and use the www host', () => {
  const keep = { w: process.env.WEB_URL, f: process.env.FRONTEND_URL }
  process.env.WEB_URL = 'https://care-stream-web.vercel.app,https://carestreamai.com,https://www.carestreamai.com'
  assert.equal(siteUrl(), 'https://www.carestreamai.com')
  process.env.WEB_URL = 'https://care-stream-web.vercel.app'
  assert.equal(siteUrl(), 'https://www.carestreamai.com')
  process.env.WEB_URL = 'http://localhost:3000'
  assert.equal(siteUrl(), 'http://localhost:3000')
  delete process.env.WEB_URL; delete process.env.FRONTEND_URL
  assert.equal(siteUrl(), 'https://www.carestreamai.com')
  process.env.WEB_URL = keep.w; process.env.FRONTEND_URL = keep.f
  if (keep.w === undefined) delete process.env.WEB_URL
  if (keep.f === undefined) delete process.env.FRONTEND_URL
})
