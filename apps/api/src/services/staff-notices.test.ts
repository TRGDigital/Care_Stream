import test from 'node:test'
import assert from 'node:assert/strict'
import { recordNotices, listNotices, markNoticeSeen, markAllNoticesSeen, MAX_NOTICES, type NoticeDeps } from './staff-notices'
import { allocationContent } from './email/person-content'

// A small in-memory stand-in for the database.
function fakeDeps(opts: { missingTable?: boolean } = {}): NoticeDeps & { rows: any[] } {
  const rows: any[] = []
  let n = 0
  const gone = () => { throw new Error('relation "staff_notices" does not exist') }
  const match = (r: any, w: any) => Object.entries(w).every(([k, v]) => v === null ? r[k] == null : r[k] === v)
  const db = {
    user: {
      findUnique: async ({ where }: any) => where.id === 'admin-1' ? { name: 'Sarah Jones' } : null,
      findMany: async () => [{ id: 'admin-1', name: 'Sarah Jones', job_role: 'Care Manager', role: 'admin', tenant_id: 't1' }],
    },
    tenant: { findMany: async () => [{ id: 't1', name: 'Ferndale Nursing Home' }] },
    staffNotice: {
      createMany: async ({ data }: any) => { if (opts.missingTable) gone(); for (const d of data) rows.push({ id: `n${++n}`, created_at: new Date(1_700_000_000_000 + n * 1000), seen_at: null, ...d }); return { count: data.length } },
      findMany: async ({ where, orderBy, take }: any) => { if (opts.missingTable) gone(); return rows.filter(r => match(r, where)).sort((a, b) => orderBy.created_at === 'desc' ? +b.created_at - +a.created_at : 0).slice(0, take) },
      updateMany: async ({ where, data }: any) => { if (opts.missingTable) gone(); const hit = rows.filter(r => match(r, where)); hit.forEach(r => Object.assign(r, data)); return { count: hit.length } },
    },
  }
  return { db, rows, photoUrls: async (_t, ids) => new Map(ids.map(i => [i, `/public/staff-photo/${i}?sig`])) }
}
const make = (deps: NoticeDeps, userIds: string[], kind: any = 'training', actor: string | null = 'admin-1') =>
  recordNotices({ tenantId: 't1', userIds, actorUserId: actor, kind: 'allocation_' + kind, build: n => allocationContent(n, kind) }, deps)

test('a notice carries the same headline, details and button as the email content', async () => {
  const deps = fakeDeps()
  await make(deps, ['u1'], 'annual_training')
  const [n] = await listNotices('t1', 'u1', deps)
  const c = allocationContent('Sarah Jones', 'annual_training')
  assert.equal(n.headline, c.headline)
  assert.deepEqual(n.details, c.details)
  assert.equal(n.intro, c.intro ?? null)
  assert.equal(n.button_label, c.buttonLabel)
  assert.equal(n.href, c.path)
  assert.deepEqual(n.actor, { name: 'Sarah Jones', job_role: 'Care Manager', home_name: 'Ferndale Nursing Home', photo_url: '/public/staff-photo/admin-1?sig' })
})

test('no acting person (automated email) or allocating to yourself creates nothing', async () => {
  const deps = fakeDeps()
  assert.equal(await make(deps, ['u1'], 'follow_up', null), 0)
  assert.equal(await make(deps, ['admin-1']), 0)
  assert.equal(deps.rows.length, 0)
})

test('only my own notices are listed and only I can mark mine seen', async () => {
  const deps = fakeDeps()
  await make(deps, ['u1', 'u2'])
  const [mine] = await listNotices('t1', 'u1', deps)
  assert.equal((await listNotices('t1', 'u2', deps)).length, 1)
  assert.equal(await markNoticeSeen('t1', 'u2', mine.id, deps), false, 'another user cannot mark it')
  assert.equal(await markNoticeSeen('t9', 'u1', mine.id, deps), false, 'another tenant cannot mark it')
  assert.equal((await listNotices('t1', 'u1', deps)).length, 1)
  assert.equal(await markNoticeSeen('t1', 'u1', mine.id, deps), true)
  assert.equal((await listNotices('t1', 'u1', deps)).length, 0)
  assert.equal((await listNotices('t1', 'u2', deps)).length, 1, 'u2 still has theirs')
  assert.equal(await markAllNoticesSeen('t1', 'u1', deps), 0)
  assert.equal(await markAllNoticesSeen('t1', 'u2', deps), 1)
})

test('newest first, capped at 10', async () => {
  const deps = fakeDeps()
  for (let i = 0; i < 13; i++) await make(deps, ['u1'], i % 2 ? 'training' : 'induction')
  const list = await listNotices('t1', 'u1', deps)
  assert.equal(list.length, MAX_NOTICES)
  const times = list.map(n => +new Date(n.created_at))
  assert.deepEqual([...times].sort((a, b) => b - a), times)
})

test('a missing table never throws: no notices, empty lists, nothing marked', async () => {
  const deps = fakeDeps({ missingTable: true })
  assert.equal(await make(deps, ['u1']), 0)
  assert.deepEqual(await listNotices('t1', 'u1', deps), [])
  assert.equal(await markNoticeSeen('t1', 'u1', 'x', deps), false)
  assert.equal(await markAllNoticesSeen('t1', 'u1', deps), 0)
})
