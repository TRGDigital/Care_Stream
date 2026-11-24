// A manual check of the Ask CareStream agents against the REAL model and a REAL account. Not part of the tests (it costs money and needs a database).
//   cd apps/api && TENANT_ID=<tenant id> USER_ID=<admin user id> npx tsx src/scripts/ask-eval.ts [agent]
// It prints each question, the answer, the tools used and the sources, so a person can read them and judge: are the numbers from tools, are the as of dates shown,
// does it refuse sickness, does it name assumptions? Run it after changing a prompt or a tool.
import { runAgent } from '../services/ask/runner'
import { agentById } from '../services/ask/agents'
import { ukToday } from '../lib/holiday-math'

const QUESTIONS: Record<string, string[]> = {
  staff: [
    'How many staff do we have, by job role?', 'Who has been with us longest?', 'Whose DBS is due in the next 60 days?', 'Which staff are missing a start date or contracted hours?',
    'What is our total contracted hours a week?', 'How many people have under a year of service?', 'Who is missing a date of birth?', 'What do our staff cost each year, with 20 percent on costs?',
    'Give me the staff contact list.', 'Who is off sick this week?',
  ],
  holiday: [
    'Who has the most holiday left this year?', 'Who is off over the next four weeks?', 'What is our holiday liability?', 'Which weeks are busiest for holiday in the next three months?',
    'Who is over their allowance?', 'How much holiday has been taken so far this year, in total hours?', 'What does Christmas Day and Boxing Day cost us in extra pay if 5 carers work 12 hours at 13 pounds an hour?', 'List the bank holidays left this year and their pay rate.',
    'Who has no holiday allowance set up?', 'How many people are off next Monday?',
  ],
  pay: [
    'What is the National Living Wage now and what is the next rate?', 'What does the next rise cost us over a year, including 18 percent on costs?', 'Compare 3, 4, 5 and 6 percent pay rises.', 'What are CPI and CPIH now?',
    'Who is paid below the next minimum wage?', 'How much would our fees need to rise to cover a 5 percent pay rise?', 'What is statutory sick pay this year?', 'What is the HMRC mileage rate?',
    'What is the weekly fee income for one named resident, Mrs Test?', 'Is the Real Living Wage figure up to date?',
  ],
  notifications: [
    'Draft a reminder that holiday requests for December close this Friday.', 'Write a notification about the new holiday booking process.', 'Draft a message thanking the team for a busy week.', 'Write a reminder to complete mandatory training.',
    'Draft an urgent message about a fire drill tomorrow at 2pm.', 'Draft a welcome to two new starters.', 'Write a short message about the new shared tablets and PINs.', 'Draft a reminder to check the rota for bank holiday weekends.',
    'Draft a notice that the office is closed on Christmas Day.', 'Write a message to staff about the staff newsletter.',
  ],
}

async function main() {
  const tenantId = process.env.TENANT_ID, userId = process.env.USER_ID
  if (!tenantId || !userId) { console.error('Set TENANT_ID and USER_ID.'); process.exit(1) }
  const only = process.argv[2]
  for (const [agent, list] of Object.entries(QUESTIONS)) {
    if (only && only !== agent) continue
    console.log(`\n=== ${agentById(agent)?.name ?? agent} ===`)
    for (const q of list) {
      const t0 = Date.now()
      try {
        const r = await runAgent({ agentId: agent, ctx: { tenantId, userId, today: ukToday() }, orgName: 'Evaluation', history: [], message: q })
        console.log(`\nQ: ${q}\n${r.answer}\n[tools: ${r.tools_used.join(', ') || 'none'}] [${r.rounds} rounds, ${Math.round((Date.now() - t0) / 1000)}s]\n${r.sources.map(s => `  source: ${s.label}${s.as_of ? `, as of ${s.as_of}` : ''}${s.warning ? ` (warning: ${s.warning})` : ''}`).join('\n')}`)
      } catch (e: any) { console.log(`\nQ: ${q}\nERROR: ${String(e?.message ?? e).slice(0, 200)}`) }
    }
  }
  process.exit(0)
}
main()
