// Run: npx tsx src/services/training/weeklyReminderEmails.test.ts
import assert from 'node:assert/strict'
process.env.WEB_URL = 'https://www.carestreamai.com'
import { renderStaffEmail, renderAdminDigest, withNext } from './weeklyReminderEmails'
import { planTenant, type UserFacts, type OutstandingItem } from './weeklyReminderLogic'

const now = new Date('2026-11-23T09:30:00Z'); const day = 86_400_000; const ago = (d: number) => new Date(now.getTime() - d * day)
const it = (name: string, o: Partial<OutstandingItem> = {}): OutstandingItem => ({ module_name: name, category: 'statutory', source: 'manual', status: 'not_started', due_date: null, ...o })
const u = (id: string, o: Partial<UserFacts> = {}): UserFacts => ({ id, name: `${id} Smith`, email: `${id}@crossways.co.uk`, role: 'staff', is_active: true, is_reviewer: false, is_agency: false, agency_end: null, first_login_at: ago(20), last_login_at: ago(20), items: [], assigned_total: 48, completed_total: 1, completed_7d: 0, last_completed_at: null, sent_weekly: [], ...o })
const BASE = 'https://www.carestreamai.com'
const plan = planTenant({ id: 't', name: 'Crossways <Residential> & Care', reminders_enabled: true, users: [
  u('boss', { role: 'admin' }),
  u('anusha', { name: 'Anusha Chembiparambil Muraleedharan', items: [it('Medication Administration'), it('Care Certificate', { source: 'ai_generated' }), it('Late one', { due_date: ago(2) }), ...Array.from({ length: 10 }, (_, i) => it(`Extra ${i}`))], completed_7d: 1 }),
  u('fresh', { first_login_at: null, last_login_at: null, items: [it('Induction')], completed_total: 0, assigned_total: 3 }),
] }, BASE, now)

const staff = plan.staff.find((s) => s.first_name === 'Anusha')!
let r = renderStaffEmail(staff)
assert.match(r.subject, /^13 training courses to complete at Crossways <Residential> & Care$/)
assert.match(r.html, /Hi Anusha,/); assert.match(r.html, /You have <strong>13 courses<\/strong> still to complete/)
assert.match(r.html, /1 of 48 done so far/); assert.match(r.html, /Well done, you completed 1 course this week/); assert.match(r.html, /1 course is<\/strong>|1 course is overdue/)
assert.match(r.html, /and 7 more in your hub/)
assert.ok(r.html.indexOf('Late one') < r.html.indexOf('Care Certificate'), 'overdue listed first')
assert.match(r.html, /href="https:\/\/www\.carestreamai\.com\/chat\?view=annual"[^>]*>Open my annual training \(1\)/)
assert.match(r.html, /href="https:\/\/www\.carestreamai\.com\/chat\?view=training"[^>]*>Open my training \(12\)/)
assert.ok(!r.html.includes('Crossways <Residential>'), 'org name is escaped'); assert.match(r.html, /Crossways &lt;Residential&gt; &amp; Care/)
assert.ok(!/[–—]/.test(r.html + r.text), 'no em or en dashes')
assert.match(r.text, /Open my annual training \(1\): https:\/\/www\.carestreamai\.com\/chat\?view=annual/)

// never signed in: one tap link that lands on the right hub page
const fresh = plan.staff.find((s) => s.first_name === 'fresh')!
r = renderStaffEmail(fresh, { magicUrl: 'https://www.carestreamai.com/auth/link?token=abc123' })
assert.match(r.html, /href="https:\/\/www\.carestreamai\.com\/auth\/link\?token=abc123&amp;next=%2Fchat%3Fview%3Dtraining"[^>]*>Sign in and start my training/)
assert.match(r.html, /expires in 7 days/)
assert.equal(withNext('https://x.test/auth/link?token=t', 'https://x.test/chat?view=annual'), 'https://x.test/auth/link?token=t&next=%2Fchat%3Fview%3Dannual')
// the same person without a magic link (a preview) gets the plain hub link
assert.match(renderStaffEmail(fresh).html, /chat\?view=training/)

// admin digest
const d = renderAdminDigest(plan.digests[0])
assert.match(d.subject, /^Weekly training update for Crossways <Residential> & Care: 2 of 2 staff have training to complete$/)
assert.match(d.html, /Have not signed in yet/); assert.match(d.html, /fresh Smith \(fresh@crossways\.co\.uk\), 1 course allocated/)
assert.match(d.html, /Most training outstanding/); assert.ok(d.html.indexOf('Anusha Chembiparambil Muraleedharan') > 0)
assert.match(d.html, /href="https:\/\/www\.carestreamai\.com\/training\?tab=progress"[^>]*>Open Staff Progress/)
assert.match(d.html, /1 course/); assert.ok(!/[–—]/.test(d.html + d.text))
// stalled section
const stalledPlan = planTenant({ id: 't', name: 'Oak', reminders_enabled: true, users: [u('boss', { role: 'admin' }), u('quiet', { items: [it('X')], last_login_at: ago(90), first_login_at: ago(95), sent_weekly: Array.from({ length: 6 }, (_, i) => ago(7 * (i + 1))) })] }, BASE, now)
const sd = renderAdminDigest(stalledPlan.digests[0]); assert.match(sd.html, /Gone quiet, so we have stopped reminding them/); assert.match(sd.html, /6 weeks/); assert.match(sd.html, /quiet Smith/)
console.log('weekly reminder email tests passed')
