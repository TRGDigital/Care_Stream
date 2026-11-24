// The tools for the Knowledge and Residents agents. Read only, tenant scoped, administrators only (the whole feature is). The Knowledge tools never return resident profile
// entries; the Residents tools never return funding, contact details, health detail, or the content of photos and videos (counts only). One named resident at a time.
import type { AskTool } from './tools'
import { ownSource } from './sources'
import {
  knowledgeOverview, knowledgeSearch, knowledgeStale, knowledgePending, knowledgeGaps,
  residentsOverview, residentsProfileGaps, residentsPendingApprovals, residentsFamilyEngagement, residentsRetentionDue, residentProfileSummary,
} from './knowledge-data'

const own = (label: string, today: string) => [ownSource(`${label} (CareStream records)`, today)]
const num = (v: any, d: number, min: number, max: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d }

export const KNOWLEDGE_TOOLS: AskTool[] = [
  // ── Knowledge base ───────────────────────────────────────────────────────────────
  {
    name: 'knowledge_overview',
    description: 'What is in the Home Knowledge Base: the number of entries by category (General, Business continuity, Policies and procedures, HR and staff handbook, Health and safety, Medication, Infection control), how many are approved or waiting for approval, how many were written by hand or come from your policies, and when each category was last updated. Use for "what is in our knowledge base, by category?".',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) { return { data: await knowledgeOverview(ctx.tenantId), method: 'Counted the knowledge base entries by category and status. Resident profile entries are not counted here.', sources: own('Home Knowledge Base', ctx.today) } },
  },
  {
    name: 'knowledge_search',
    description: 'Find what the home\'s own knowledge base says about a topic (for example "fire evacuation", "infection control", "lone working"). Returns the matching questions, their category, whether they are approved, when they were last updated and a short excerpt of the answer. Use for "what do we say about ...?".',
    input_schema: { type: 'object', properties: { topic: { type: 'string', description: 'The topic or keywords to look for.' }, limit: { type: 'number', description: 'How many to return (default 8, maximum 15).' } }, required: ['topic'] },
    async run(ctx, input) { return { data: await knowledgeSearch(ctx.tenantId, String(input?.topic ?? ''), num(input?.limit, 8, 1, 15)), method: 'Looked for the words of the topic in each entry\'s question (weighted more) and answer, and ranked the best matches.', sources: own('Home Knowledge Base', ctx.today) } },
  },
  {
    name: 'knowledge_stale',
    description: 'Knowledge base entries that have not been updated for a number of months, oldest first, so the manager can review them.',
    input_schema: { type: 'object', properties: { months: { type: 'number', description: 'Not updated for at least this many months (default 12, maximum 60).' } } },
    async run(ctx, input) { const m = num(input?.months, 12, 1, 60); return { data: await knowledgeStale(ctx.tenantId, m, ctx.today), method: `Listed entries whose last update was more than ${m} months before ${ctx.today}.`, sources: own('Home Knowledge Base', ctx.today) } },
  },
  {
    name: 'knowledge_pending',
    description: 'Knowledge base entries that are waiting for approval, with how many days each has waited.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) { return { data: await knowledgePending(ctx.tenantId, ctx.today), method: 'Listed entries that are not yet approved, oldest first.', sources: own('Home Knowledge Base', ctx.today) } },
  },
  {
    name: 'knowledge_gaps',
    description: 'Where the knowledge base is thin: categories with fewer than three entries, and the questions staff asked the assistant that found no answer (most often asked first, with contact details removed). Use for "which topics are staff asking about that we have no answer for?".',
    input_schema: { type: 'object', properties: { days: { type: 'number', description: 'Look back this many days (default 90, maximum 365).' } } },
    async run(ctx, input) { const d = num(input?.days, 90, 7, 365); return { data: await knowledgeGaps(ctx.tenantId, d, ctx.today), method: `Counted the questions in the last ${d} days where the assistant found no matching entry, grouped by wording, and listed categories with fewer than 3 entries.`, sources: own('Assistant question log and Home Knowledge Base', ctx.today) } },
  },
  // ── Residents ────────────────────────────────────────────────────────────────────
  {
    name: 'residents_overview',
    description: 'The "This is me" profiles: how many residents are living, have left or died, how many profiles are archived, and how complete the profiles are overall and by section (11 sections such as life story, likes, routine, comfort). Use for "how complete are our resident profiles?".',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) { return { data: await residentsOverview(ctx.tenantId), method: 'Counted, for each living resident, how many of the 11 profile sections have text, then averaged.', sources: own('Residents (This is me profiles)', ctx.today) } },
  },
  {
    name: 'residents_profile_gaps',
    description: 'The living residents with the least complete "This is me" profiles: first name, last initial, room, how many sections are filled and which are missing. Names are allowed because the administrator can see them on the Residents screen.',
    input_schema: { type: 'object', properties: { limit: { type: 'number', description: 'How many to list (default 10, maximum 40).' } } },
    async run(ctx, input) { return { data: await residentsProfileGaps(ctx.tenantId, num(input?.limit, 10, 1, 40)), method: 'Ranked living residents by how many of the 11 profile sections have text, fewest first.', sources: own('Residents (This is me profiles)', ctx.today) } },
  },
  {
    name: 'residents_pending_approvals',
    description: 'What families have shared that is waiting for a manager to approve: written answers, photos, video messages and voice notes, with how many days the oldest has waited, by resident (first name, last initial, room). Counts only: it never shows the photos, videos or voice notes themselves.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) { return { data: await residentsPendingApprovals(ctx.tenantId, ctx.today), method: 'Counted pending family answers, photos, ready video messages and voice notes for living residents, and the age of the oldest.', sources: own('Residents (family contributions)', ctx.today) } },
  },
  {
    name: 'residents_family_engagement',
    description: 'How families are responding to invitations: invitations sent, opened and replied (with rates), links that expired without a reply, and the reminder settings (weekly, fortnightly, monthly, off, stopped) and reminders due now. Counts only: no contact names or addresses.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) { return { data: await residentsFamilyEngagement(ctx.tenantId, ctx.today), method: 'Counted current invitations by opened and replied, and reminder settings by cadence. Rates are out of invitations sent.', sources: own('Residents (family invitations and reminders)', ctx.today) } },
  },
  {
    name: 'residents_retention_due',
    description: 'Archive and retention work: residents who have died or moved on whose profile has not yet been archived, and archived profiles whose seven year retention date has passed or falls within 90 days.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) { return { data: await residentsRetentionDue(ctx.tenantId, ctx.today), method: 'Listed residents who left or died without an archive, and archived profiles by their retention date (seven years after archiving).', sources: own('Residents (archive and retention)', ctx.today) } },
  },
  {
    name: 'resident_profile_summary',
    description: 'ONLY when the administrator names one resident: a plain English summary source of that person\'s approved "This is me" profile. Contact details are removed and any sentence mentioning health or medical detail is withheld (the result says how many). Never use it to read many residents or to browse. Never shows funding.',
    input_schema: { type: 'object', properties: { resident: { type: 'string', description: 'The resident\'s name as the administrator gave it (first name or full name).' } }, required: ['resident'] },
    async run(ctx, input) { return { data: await residentProfileSummary(ctx.tenantId, ctx.userId, String(input?.resident ?? '')), method: 'Read the approved profile sections for the named resident. Health sentences and contact details are removed. This view is recorded in the audit log.', sources: own('Residents (This is me profile)', ctx.today) } },
  },
]
