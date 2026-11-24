// The people development agents: Training, CPD training, Staff onboarding, Compliance and Incentives. They are registered into the agent list by applyPeopleAgents (one line at the
// end of agents.ts), so this file does not import agents.ts (no cycle). Each agent has an editable prompt on the Prompts page (usage ask_agent_<id>) whose default is the wording below.
// The tools they use are in tools-people.ts (and a few shared staff tools in tools.ts). All read only.
import type { AgentDef } from './agents'

const TRAINING_PROMPT = 'You help an administrator understand training: who has completed which courses, who is overdue or due soon, who has not started, how long courses take, and who has gaps against the mandatory training matrix for their job role. Use training_overview for the headline, training_by_course for which courses are behind, training_by_person for which people are behind, training_due_overdue for what is overdue, due soon or expiring, training_not_started for courses never begun, training_completion_time for how long courses take, and training_matrix_gaps for required training gaps by role and person. Say whether a number counts each person once per course (it does: the newest assignment). Name people only when the question needs it, and keep lists short with the most urgent first. Offer one sensible next step, for example a reminder or a notification, but never claim to have sent anything.'
const CPD_PROMPT = 'You help an administrator with CPD (continuing professional development): CPD hours earned by each person from CPD certified courses, progress on CPD courses, and CPD certificates that have expired or will expire soon. Use cpd_hours for hours by person (explain that hours are the course learning time), cpd_by_course for progress by course, and cpd_certificates_expiring for what needs renewing. If courses have no time estimate say they are not counted. Keep answers short and practical.'
const ONBOARDING_PROMPT = 'You help an administrator see how new starters are getting on with induction and onboarding: who is enrolled, how far through they are, who is behind or overdue, and which new starters have not been enrolled in an induction yet. Use onboarding_progress for progress by person and onboarding_new_starters for people who started recently. Explain what behind and overdue mean when you use them. Name people and keep the most urgent first. Offer one next step, but never claim to have sent or changed anything.'
const COMPLIANCE_PROMPT = 'You help an administrator keep the workforce compliant: DBS, right to work, passport, professional registration (such as NMC), visa sponsorship, supervisions and appraisals, and probation. Use compliance_expiries for what has expired or expires in the next 30, 60 or 90 days, compliance_register for who is missing or has an expired core check, supervision_status for supervisions and appraisals (who is overdue and how often they happen), probation_status for probation, and training_matrix_gaps when the question is about required training. Only types, names and dates are available: you never see reference numbers, documents or the content of supervisions. Be clear about urgency: expired first, then within 30 days. Agency workers are excluded because their agency holds their checks, so say so when it matters. Offer one next step, but never claim to have chased anyone.'
const INCENTIVES_PROMPT = 'You help an administrator understand the staff incentive scheme: the campaigns, the points rules and rewards, who is earning points and how close they are to a reward, and the value of rewards claimed against the monthly budget. Use incentives_overview for how it is set up, incentives_leaderboard for points by person and by event, and incentives_claims for claims and budget. Keep it factual and encouraging in tone, never rank people in a way that shames anyone, and offer one next step such as a thank you notification, without claiming to have sent it.'

export const PEOPLE_AGENTS: Array<Partial<AgentDef> & { id: string }> = [
  {
    id: 'training', status: 'ready',
    tools: ['training_overview', 'training_by_course', 'training_by_person', 'training_due_overdue', 'training_not_started', 'training_completion_time', 'training_matrix_gaps', 'staff_roster'],
    starters: ['What is our overall training completion, and which courses are furthest behind?', 'Who is overdue on their training?', 'Who has not started the courses they were assigned?', 'Which people have gaps against the mandatory training matrix, by job role?'],
    prompt: TRAINING_PROMPT,
  },
  {
    id: 'cpd', status: 'ready',
    tools: ['cpd_hours', 'cpd_by_course', 'cpd_certificates_expiring', 'staff_roster'],
    starters: ['How many CPD hours has each person earned in the last 12 months?', 'Which CPD courses have the lowest completion?', 'Which CPD certificates expire in the next 90 days?', 'Who has earned no CPD hours this year?'],
    prompt: CPD_PROMPT,
  },
  {
    id: 'onboarding', status: 'ready',
    tools: ['onboarding_progress', 'onboarding_new_starters', 'training_not_started', 'staff_roster'],
    starters: ['How are our new starters getting on with induction?', 'Who is behind or overdue on onboarding?', 'Which new starters in the last 90 days have not been enrolled in an induction?', 'How many inductions have been completed, and how many are still open?'],
    prompt: ONBOARDING_PROMPT,
  },
  {
    id: 'compliance', status: 'ready',
    tools: ['compliance_expiries', 'compliance_register', 'supervision_status', 'probation_status', 'training_matrix_gaps', 'staff_credentials_due', 'staff_record_gaps'],
    starters: ['Whose DBS, right to work or registration expires in the next 30, 60 and 90 days?', 'Who is missing a DBS or right to work check?', 'Who is overdue a supervision or appraisal, and how often do we hold them?', 'Who is on probation and when does it end?'],
    prompt: COMPLIANCE_PROMPT,
  },
  {
    id: 'incentives', status: 'ready',
    tools: ['incentives_overview', 'incentives_leaderboard', 'incentives_claims'],
    starters: ['How is our incentive scheme set up this month?', 'Who has earned the most points, and who is close to a reward?', 'How much of the monthly budget have rewards used?', 'Which claims are waiting for a decision?'],
    prompt: INCENTIVES_PROMPT,
  },
]

export const PEOPLE_AGENT_IDS = PEOPLE_AGENTS.map(a => a.id)

/** Switch these agents on: fills in the entries already listed as "Coming soon" (name, blurb and icon stay as they were). */
export function applyPeopleAgents(list: AgentDef[]): void {
  for (const patch of PEOPLE_AGENTS) {
    const a = list.find(x => x.id === patch.id)
    if (a) Object.assign(a, patch)
  }
}

const NOTES: Record<string, string> = {
  training: 'Used for the Training agent: completion, overdue, not started, how long courses take, and mandatory training gaps by role.',
  cpd: 'Used for the CPD training agent: CPD hours by person, CPD course progress and certificates expiring.',
  onboarding: 'Used for the Staff onboarding agent: induction progress for new starters, who is behind, and who has not been enrolled.',
  compliance: 'Used for the Compliance agent: DBS, right to work and registration expiries, supervisions and appraisals, and probation. It never sees reference numbers, documents or what was said in a supervision.',
  incentives: 'Used for the Incentives agent: campaigns, points, rewards, claims and the monthly budget.',
}
const LABELS: Record<string, string> = { training: 'Training agent', cpd: 'CPD training agent', onboarding: 'Staff onboarding agent', compliance: 'Compliance agent', incentives: 'Incentives agent' }

/** The entries for the Prompts page (usage ask_agent_<id>), with the default wording from this file. */
export function peoplePromptMeta(): Array<{ usage: string; label: string; note: string; default: string }> {
  return PEOPLE_AGENTS.map(a => ({ usage: `ask_agent_${a.id}`, label: `Ask CareStream: ${LABELS[a.id]}`, note: NOTES[a.id], default: a.prompt ?? '' }))
}
