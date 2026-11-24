import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { AGENTS, agentById, systemPromptFor } from './agents'
import { TOOLS } from './tools'
import { ASK_PROMPTS, validateAskPrompt } from './prompt-register'
import { KNOWLEDGE_AGENT_DEFS, registerKnowledgeAgents } from './agents-knowledge'
import { KNOWLEDGE_TOOLS } from './tools-knowledge'
import { __setKnowledgeDb, stripContact, withholdHealth, knowledgeOverview, knowledgeSearch, knowledgeStale, knowledgePending, knowledgeGaps, residentsOverview, residentsProfileGaps, residentsPendingApprovals, residentsFamilyEngagement, residentsRetentionDue, residentProfileSummary } from './knowledge-data'

const T1 = 't1', T2 = 't2', TODAY = '2026-11-24'
const day = (s: string) => new Date(s + 'T10:00:00Z')

// A small fake database that RECORDS every query so the tests can check each one names the account, and honours tenant_id so another account's rows never appear.
function makeDb() {
  const calls: Array<{ model: string; where: any; select: any }> = []
  const rows: Record<string, any[]> = {
    knowledgeEntry: [
      { id: 'k1', tenant_id: T1, question: 'What is our fire evacuation procedure?', answer: 'Sound the alarm, call 999, use the assembly point at the car park. Ring the manager on 07700 900123 or fire@home.co.uk.', source_type: 'manual', source_name: 'Manual entry', knowledge_category: 'health_safety', approved: true, approved_at: day('2026-02-01'), created_at: day('2026-02-01'), updated_at: day('2026-02-01') },
      { id: 'k2', tenant_id: T1, question: 'How do we clean spills?', answer: 'Use the spill kit and the yellow bin.', source_type: 'policy', source_name: 'Infection control policy', knowledge_category: 'infection_control', approved: false, approved_at: null, created_at: day('2026-11-01'), updated_at: day('2026-11-01') },
      { id: 'k3', tenant_id: T1, question: 'This is me: Rose Hill: Likes', answer: 'Rose Hill likes tea.', source_type: 'manual', source_name: 'This is me: Rose Hill', knowledge_category: 'resident', approved: true, approved_at: day('2026-10-01'), created_at: day('2026-10-01'), updated_at: day('2026-10-01') },
      { id: 'k4', tenant_id: T2, question: 'Other account fire evacuation', answer: 'Secret of another account', source_type: 'manual', source_name: 'Manual entry', knowledge_category: 'health_safety', approved: true, approved_at: day('2026-01-01'), created_at: day('2026-01-01'), updated_at: day('2026-01-01') },
    ],
    queryRecord: [
      { tenant_id: T1, no_match: true, query_text: 'How do I report a lost key? 07911 123456', created_at: day('2026-11-20') },
      { tenant_id: T1, no_match: true, query_text: 'how do i report a lost key', created_at: day('2026-11-21') },
      { tenant_id: T1, no_match: false, query_text: 'answered one', created_at: day('2026-11-21') },
      { tenant_id: T2, no_match: true, query_text: 'other account question', created_at: day('2026-11-21') },
    ],
    resident: [
      { id: 'r1', tenant_id: T1, first_name: 'Rose', last_name: 'Hill', preferred_name: null, room: '4', status: 'living', status_at: null, sections: { about_me: 'Grew up in Leeds. She has diabetes and takes insulin twice a day. She loved dancing.', likes: 'Tea and jam tarts. Email her daughter at jan@family.co.uk.' }, archived_at: null, retention_until: null, created_at: day('2026-01-01') },
      { id: 'r2', tenant_id: T1, first_name: 'Arthur', last_name: 'Bell', preferred_name: 'Art', room: '7', status: 'living', status_at: null, sections: {}, archived_at: null, retention_until: null, created_at: day('2026-01-02') },
      { id: 'r3', tenant_id: T1, first_name: 'Mary', last_name: 'Cox', preferred_name: null, room: '2', status: 'deceased', status_at: day('2026-10-01'), sections: {}, archived_at: null, retention_until: null, created_at: day('2026-01-03') },
      { id: 'r4', tenant_id: T1, first_name: 'Joan', last_name: 'Ford', preferred_name: null, room: '9', status: 'left', status_at: day('2019-01-01'), sections: {}, archived_at: day('2019-02-01'), retention_until: day('2026-02-01'), created_at: day('2018-01-03') },
      { id: 'r5', tenant_id: T2, first_name: 'Other', last_name: 'Account', preferred_name: null, room: '1', status: 'living', status_at: null, sections: { about_me: 'x' }, archived_at: null, retention_until: null, created_at: day('2026-01-04') },
    ],
    residentContribution: [{ tenant_id: T1, resident_id: 'r1', status: 'pending', submitted_at: day('2026-11-10') }, { tenant_id: T2, resident_id: 'r5', status: 'pending', submitted_at: day('2026-11-10') }],
    residentPhoto: [{ tenant_id: T1, resident_id: 'r1', status: 'pending', submitted_at: day('2026-11-20') }],
    residentVideo: [{ tenant_id: T1, resident_id: 'r1', status: 'pending', state: 'ready', media_kind: 'audio', submitted_at: day('2026-11-22') }, { tenant_id: T1, resident_id: 'r1', status: 'pending', state: 'ready', media_kind: 'video', submitted_at: day('2026-11-23') }],
    residentInvite: [{ tenant_id: T1, revoked_at: null, sent_at: day('2026-11-01'), expires_at: day('2026-11-15'), opened_at: day('2026-11-02'), submitted_at: null }, { tenant_id: T1, revoked_at: null, sent_at: day('2026-11-01'), expires_at: day('2026-12-15'), opened_at: day('2026-11-02'), submitted_at: day('2026-11-03') }],
    residentReminderSetting: [{ tenant_id: T1, cadence: 'weekly', stopped_at: null, next_due_at: day('2026-11-20'), unanswered_count: 3 }, { tenant_id: T1, cadence: 'off', stopped_at: null, next_due_at: null, unanswered_count: 0 }],
  }
  const model = (name: string) => ({
    findMany: async (q: any) => {
      calls.push({ model: name, where: q.where, select: q.select })
      const w = q.where ?? {}
      return (rows[name] ?? []).filter(r => Object.entries(w).every(([k, v]: [string, any]) => v && typeof v === 'object' && !(v instanceof Date) ? (v.gte ? r[k] >= v.gte : true) : r[k] === v))
    },
  })
  return { calls, db: new Proxy({}, { get: (_t, k: string) => model(k) }) }
}

test('every query names the account, and another account\'s rows never appear', async () => {
  const f = makeDb(); __setKnowledgeDb(f.db)
  const out = JSON.stringify([await knowledgeOverview(T1), await knowledgeSearch(T1, 'fire evacuation'), await knowledgeStale(T1, 6, TODAY), await knowledgePending(T1, TODAY), await knowledgeGaps(T1, 90, TODAY),
    await residentsOverview(T1), await residentsProfileGaps(T1), await residentsPendingApprovals(T1, TODAY), await residentsFamilyEngagement(T1, TODAY), await residentsRetentionDue(T1, TODAY), await residentProfileSummary(T1, 'u1', 'Rose')])
  assert.ok(f.calls.length > 10)
  for (const c of f.calls) assert.equal(c.where?.tenant_id, T1, `${c.model} query names the account`)
  assert.ok(!/Secret of another account|other account question|Other A\.|Other Account/.test(out))
  __setKnowledgeDb(null)
})

test('KNOWLEDGE: overview excludes resident entries, search finds the topic with contact details removed, pending and stale are listed', async () => {
  __setKnowledgeDb(makeDb().db)
  const o: any = await knowledgeOverview(T1)
  assert.equal(o.total_entries, 2); assert.equal(o.waiting_for_approval, 1); assert.equal(o.resident_profile_entries_not_counted, 1); assert.equal(o.from_your_own_policies, 1)
  assert.equal(o.by_category.find((c: any) => c.category === 'Health and safety').total, 1)
  const s: any = await knowledgeSearch(T1, 'fire evacuation')
  assert.equal(s.entries[0].category, 'Health and safety'); assert.ok(!/07700|fire@home\.co\.uk/.test(JSON.stringify(s))); assert.match(JSON.stringify(s), /number removed/)
  assert.ok(!JSON.stringify(s).includes('Rose Hill'), 'resident entries never come back from the knowledge search')
  const p: any = await knowledgePending(T1, TODAY); assert.equal(p.count, 1); assert.equal(p.entries[0].days_waiting, 23)
  const st: any = await knowledgeStale(T1, 6, TODAY); assert.equal(st.count, 1); assert.equal(st.entries[0].last_updated, '2026-02-01')
  __setKnowledgeDb(null)
})

test('KNOWLEDGE gaps: unanswered questions are grouped by wording, counted, and have contact details removed; thin categories are listed', async () => {
  __setKnowledgeDb(makeDb().db)
  const g: any = await knowledgeGaps(T1, 90, TODAY)
  assert.equal(g.unanswered_total, 2); assert.equal(g.distinct_questions, 1); assert.equal(g.top_unanswered[0].times_asked, 2)
  assert.ok(!/07911/.test(JSON.stringify(g))); assert.ok(g.thin_categories.some((c: any) => c.category === 'Medication' && c.entries === 0))
  __setKnowledgeDb(null)
})

test('RESIDENTS: completeness, least complete, pending items by kind (counts only), engagement, retention', async () => {
  __setKnowledgeDb(makeDb().db)
  const o: any = await residentsOverview(T1); assert.equal(o.living, 2); assert.equal(o.deceased, 1); assert.equal(o.archived, 1); assert.equal(o.empty_profiles, 1); assert.equal(o.average_sections_filled, 1)
  const g: any = await residentsProfileGaps(T1); assert.equal(g.least_complete[0].name, 'Art B.'); assert.equal(g.least_complete[0].room, '7'); assert.equal(g.least_complete[0].sections_filled, 0)
  const p: any = await residentsPendingApprovals(T1, TODAY); assert.deepEqual(p.totals, { family_answers: 1, photos: 1, video_messages: 1, voice_notes: 1 }); assert.equal(p.longest_wait_days, 14)
  const e: any = await residentsFamilyEngagement(T1, TODAY); assert.equal(e.invitations_sent, 2); assert.equal(e.replied, 1); assert.equal(e.link_expired_without_reply, 1); assert.equal(e.reminders_due_now, 1); assert.equal(e.reply_rate_percent, 50)
  const r: any = await residentsRetentionDue(T1, TODAY); assert.equal(r.archives_to_action, 1); assert.equal(r.retention_passed.length, 1); assert.equal(r.retention_passed[0].name, 'Joan F.')
  __setKnowledgeDb(null)
})

test('a named resident summary removes contact details and withholds health sentences, and says how many', async () => {
  const logged: any[] = []
  __setKnowledgeDb(makeDb().db, (async (p: any) => { logged.push(p) }) as any)
  const s: any = await residentProfileSummary(T1, 'u1', 'Rose')
  assert.equal(s.found, 1)
  const text = JSON.stringify(s)
  assert.ok(!/diabetes|insulin/i.test(text), 'medical detail is never shown'); assert.ok(!/jan@family/.test(text), 'contact details are never shown')
  assert.match(text, /loved dancing/); assert.equal(s.health_sentences_withheld, 1)
  const many: any = await residentProfileSummary(T1, 'u1', 'a'); assert.ok(many.found !== 1 || many.name, 'a vague name never opens a profile unless exactly one matches')
  assert.equal((await residentProfileSummary(T1, 'u1', 'Nobody Here') as any).found, 0)
  assert.equal((await residentProfileSummary(T2, 'u1', 'Rose') as any).found, 0, 'another account cannot read Rose')
  const viewed = logged.filter(l => l.event_type === 'ask_resident_profile_viewed'); assert.equal(viewed.length, 1, 'only the one successful view is logged')
  assert.equal(viewed[0].entity_id, 'r1'); assert.deepEqual(viewed[0].metadata, { via: 'ask_carestream' }); assert.equal(viewed[0].tenant_id, T1)
  __setKnowledgeDb(null)
})

test('the profile summary is audit logged (source level) with the resident id only', () => {
  const t = fs.readFileSync(path.resolve(__dirname, 'knowledge-data.ts'), 'utf8')
  assert.match(t, /event_type: 'ask_resident_profile_viewed'/); assert.match(t, /entity_id: r\.id, metadata: \{ via: 'ask_carestream' \}/)
})

test('redaction helpers', () => {
  assert.equal(stripContact('call 07700 900123 or mail a.b@c.co.uk'), 'call [number removed] or mail [email removed]')
  const w = withholdHealth('She loved gardening. She takes tablets daily. Her GP is Dr Jones. Her cat is Tibby.')
  assert.equal(w.text, 'She loved gardening. Her cat is Tibby.'); assert.equal(w.withheld, 2)
})

test('the two agents are ready, have four starters and valid tools, sit after the others, and are registered once', () => {
  for (const id of ['knowledge', 'residents']) { const a = agentById(id)!; assert.equal(a.status, 'ready'); assert.equal(a.starters.length, 4); for (const n of a.tools) assert.ok(TOOLS.some(t => t.name === n), `${id} -> ${n}`) }
  const before = AGENTS.length; registerKnowledgeAgents(AGENTS); assert.equal(AGENTS.length, before, 'registering twice adds nothing')
  assert.equal(AGENTS.slice(0, 6).map(a => a.id).join(), 'staff,holiday,pay,letters,newsletter,notifications')
  assert.ok(AGENTS.findIndex(a => a.id === 'knowledge') > AGENTS.findIndex(a => a.id === 'notifications'))
  assert.equal(KNOWLEDGE_TOOLS.length, 11)
  for (const t of KNOWLEDGE_TOOLS) { assert.ok(t.description.length > 40, t.name); assert.equal(t.input_schema.type, 'object') }
})

test('the agents cannot reach funding, other agents\' tools, or write; the knowledge tools never include resident entries', () => {
  const k = agentById('knowledge')!.tools, r = agentById('residents')!.tools
  assert.ok(k.every(n => n.startsWith('knowledge_'))); assert.ok(r.every(n => n.startsWith('resident')))
  assert.ok(!r.some(n => /funding|pay|staff|holiday/.test(n)))
  for (const t of ['tools-knowledge.ts', 'knowledge-data.ts', 'agents-knowledge.ts']) {
    const code = fs.readFileSync(path.resolve(__dirname, t), 'utf8').replace(/\/\/.*$/gm, '')
    assert.ok(!/\.(create|update|updateMany|upsert|delete|deleteMany)\(|\$executeRaw|insert into/i.test(code), `${t} writes`)
    assert.ok(!/sick_spells|sick_days|sickness/i.test(code), `${t} touches sickness`)
    assert.ok(!/\bdob\b|date_of_birth|phone_number|\.email\b/.test(code.replace(/no_date_of_birth/g, '')), `${t} reads dates of birth or contact fields`)
  }
  const data = fs.readFileSync(path.resolve(__dirname, 'knowledge-data.ts'), 'utf8')
  assert.match(data, /knowledge_category !== 'resident'/)
})

test('TOOL SELECTION: each starter question maps to a tool whose description fits it', () => {
  const desc = (n: string) => TOOLS.find(t => t.name === n)!.description.toLowerCase()
  assert.match(desc('knowledge_overview'), /by category/); assert.match(desc('knowledge_pending'), /waiting for approval/); assert.match(desc('knowledge_search'), /what do we say/)
  assert.match(desc('knowledge_gaps'), /no answer/); assert.match(desc('residents_overview'), /how complete/); assert.match(desc('residents_profile_gaps'), /least complete/)
  assert.match(desc('residents_pending_approvals'), /photos/); assert.match(desc('residents_retention_due'), /retention/)
})

test('PROMPTS: the two prompts are in the register with the code wording as default, can be edited, and say publishing is not available and funding is locked', () => {
  for (const u of ['ask_agent_knowledge', 'ask_agent_residents']) { const p = ASK_PROMPTS.find(x => x.usage === u)!; assert.ok(p && p.default.length > 200); assert.equal(validateAskPrompt(u, p.default), null) }
  assert.match(agentById('knowledge')!.prompt, /publishing from here is not available yet/); assert.match(agentById('knowledge')!.prompt, /\/gaps/)
  assert.match(agentById('residents')!.prompt, /funding or fees/); assert.match(agentById('residents')!.prompt, /NAMES one resident/)
  const sys = systemPromptFor(agentById('residents')!, TODAY, 'Ferndale')
  assert.ok(sys.trimEnd().endsWith(sys.slice(sys.indexOf('LOCKED RULES')).trimEnd()), 'the locked rules stay last')
  assert.ok(!/[–—]/.test(agentById('knowledge')!.prompt + agentById('residents')!.prompt + KNOWLEDGE_AGENT_DEFS.map(a => a.blurb + a.starters.join('')).join('')), 'no dashes')
})
