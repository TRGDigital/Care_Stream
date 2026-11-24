// The agents: each one is a focused helper with its own tools and starter questions. Add one by adding an entry here (and its tools in tools.ts).
// status: 'ready' (answers questions now), 'shell' (opens and explains what is coming; a later build adds its tools), 'soon' (listed, not yet available).
import { SAFETY_RULES } from './safety'

export type AgentStatus = 'ready' | 'shell' | 'soon'
export interface AgentDef {
  id: string; name: string; blurb: string; icon: string; status: AgentStatus
  tools: string[]            // names from tools.ts
  starters: string[]         // four clickable starter prompts
  prompt: string             // what this agent is for and how it answers
  shell_message?: string     // for shells: what it will do and when
}

export const HOUSE_RULES = `You are Ask CareStream, a careful assistant for the administrators of a UK care service. You work only for this one organisation.
HOW TO ANSWER
- Use the tools for EVERY number, name, date and fact about this organisation. Never invent or estimate a figure yourself. If a tool says data is missing, say what is missing and how to add it.
- Do all calculations through the tools. When a tool gives a "method", show the working in plain words and list the assumptions (for example on costs, the weekend share of hours).
- For official figures (minimum wage, inflation, sick pay, mileage, bank holidays) say where each is from and when it applies from ("as of"). If a figure has a warning, or could not be confirmed (usable false), say so plainly and do not present it as fact.
- Write in British English. Do not use dashes in sentences (use commas, full stops or the word "to"). Be clear and practical, short paragraphs, simple lists. Tables only for comparing several people or options.
- Money in pounds with two decimals. Hours as hours. Do not name people unless the question needs it. Never give contact details.
- Admin only data (pay rates, funding) is shown to this administrator only. If asked about sickness or health, say that information is not available to this assistant.
- Say when something is an estimate. Offer a sensible next step, briefly.
${SAFETY_RULES}`

export const AGENTS: AgentDef[] = [
  { id: 'staff', name: 'Staff', icon: 'users', status: 'ready', blurb: 'Roster, length of service, hours, checks due and gaps in staff records.',
    tools: ['staff_roster', 'staff_summary', 'staff_credentials_due', 'staff_record_gaps', 'staff_cost', 'care_setting'],
    starters: ['How many staff do we have, and what are their roles?', 'Whose DBS or right to work checks are due in the next 90 days?', 'Which staff records are missing key details?', 'How long have our staff been with us? Show me the length of service.'],
    prompt: 'You help with questions about the staff team: who they are, their hours, length of service, checks that are due and gaps in their records. For the cost of staff use staff_cost.' },
  { id: 'holiday', name: 'Holiday', icon: 'calendar', status: 'ready', blurb: 'Balances, who is off, busiest weeks, holiday liability and bank holiday cover.',
    tools: ['holiday_balances', 'holiday_over_allowance', 'holiday_who_is_off', 'holiday_busiest_weeks', 'holiday_liability', 'bank_holiday_pay', 'staff_roster'],
    starters: ['Who has the most holiday left this year?', 'Who is off over the next four weeks?', 'What is our holiday liability, in hours and pounds?', 'Which weeks in the next three months are busiest for holiday?'],
    prompt: 'You help with holiday: balances, who is off and when, busiest weeks, how much holiday is still owed (the liability), and the extra cost of bank holidays. Only approved holiday counts as taken or booked. Today\'s date is given in the context.' },
  { id: 'pay', name: 'Pay and inflation', icon: 'pound', status: 'ready', blurb: 'Minimum wage, inflation and what pay changes cost, with fees to cover them.',
    tools: ['get_figures', 'nlw_impact', 'pay_rise_cost', 'pay_review_table', 'fee_uplift_needed', 'funding_summary', 'funding_for_person', 'staff_cost', 'staff_record_gaps', 'bank_holiday_pay', 'care_setting'],
    starters: ['What does the next National Living Wage rise cost us over a year?', 'Compare the cost of a 3, 4, 5 and 6 percent pay rise.', 'What are CPI and CPIH inflation now, and what does that mean for our costs?', 'How much would our fees need to rise to cover a 5 percent pay rise?'],
    prompt: 'You help with pay, the National Living Wage, inflation and the cost of pay changes, and how fees would need to change to cover them. Use get_figures for official rates and always give the as of date. For scenarios use nlw_impact, pay_rise_cost and pay_review_table, then fee_uplift_needed with the weekly extra cost. State any assumption (on costs, weekend share). Resident funding is locked: use totals only, and one named person only if the administrator named them.' },
  { id: 'letters', name: 'Letters', icon: 'file', status: 'shell', blurb: 'Draft staff letters from approved templates, for an administrator to approve.', tools: [],
    starters: ['Draft a pay review letter', 'Write an annual leave statement for a staff member', 'Draft a probation passed letter', 'Draft a thank you letter'],
    prompt: '', shell_message: 'Letters is coming next. You will choose a letter (pay review, annual leave statement, probation passed, supervision or training reminders, thank you and more), CareStream fills in the details from your records, and an administrator or manager approves it before it is shared. Nothing is sent without approval.' },
  { id: 'newsletter', name: 'Staff newsletter', icon: 'newspaper', status: 'shell', blurb: 'Build an internal newsletter for your team from your own news and figures.', tools: [],
    starters: ['Build this month\'s staff newsletter', 'Add a welcome for new starters', 'Add a holiday and training reminders section', 'Write a thank you to the team'],
    prompt: '', shell_message: 'The staff newsletter is coming next. You will pick a template, add your news, and CareStream can add sections from your own data (new starters, holiday reminders, training, thank yous). It is for your own staff only, and an administrator approves it before it is shared.' },
  { id: 'notifications', name: 'Notifications', icon: 'bell', status: 'ready', blurb: 'Draft a message to staff, then open it in Notifications to review and send.', tools: ['staff_summary'],
    starters: ['Draft a reminder that holiday requests for December close this Friday', 'Write a notification about the new holiday booking process', 'Draft a message thanking the team for a busy week', 'Write a reminder to complete mandatory training'],
    prompt: 'You draft short, warm, clear messages from the administrator to staff. After the draft, ALWAYS add a fenced block exactly like this so the screen can offer a button to open it in Notifications (the administrator reviews and sends it, you never send):\n```notification\nTITLE: <a title of up to 100 characters>\nBODY:\n<the message, plain text, paragraphs separated by blank lines, up to 1800 characters>\n```\nDo not include real names unless the administrator gave them.' },
  { id: 'incentives', name: 'Incentives', icon: 'award', status: 'soon', blurb: 'Points, rewards and who is close to earning them.', tools: [], starters: [], prompt: '' },
  { id: 'analytics', name: 'Analytics', icon: 'chart', status: 'soon', blurb: 'Questions asked, topics and usage across your team.', tools: [], starters: [], prompt: '' },
  { id: 'cqc-analytics', name: 'CQC analytics', icon: 'shield', status: 'soon', blurb: 'How your records line up with the CQC key questions.', tools: [], starters: [], prompt: '' },
  { id: 'training', name: 'Training', icon: 'graduation', status: 'soon', blurb: 'Who is overdue, who is due, and completion trends.', tools: [], starters: [], prompt: '' },
  { id: 'cpd', name: 'CPD training', icon: 'badge', status: 'soon', blurb: 'CPD courses, progress and certificates.', tools: [], starters: [], prompt: '' },
  { id: 'cqc-prep', name: 'CQC prep', icon: 'clipboard', status: 'soon', blurb: 'Prepare staff and evidence for an inspection.', tools: [], starters: [], prompt: '' },
  { id: 'audits', name: 'Audits', icon: 'check', status: 'soon', blurb: 'Audit results, gaps and actions.', tools: [], starters: [], prompt: '' },
  { id: 'onboarding', name: 'Staff onboarding', icon: 'userplus', status: 'soon', blurb: 'Induction progress for new starters.', tools: [], starters: [], prompt: '' },
  { id: 'compliance', name: 'Compliance', icon: 'lock', status: 'soon', blurb: 'DBS, right to work and registration expiries across the team.', tools: [], starters: [], prompt: '' },
  { id: 'governance', name: 'Governance reports', icon: 'report', status: 'soon', blurb: 'Monthly governance review and an inspection evidence pack.', tools: [], starters: [], prompt: '' },
  { id: 'incidents', name: 'Complaints and incidents', icon: 'alert', status: 'soon', blurb: 'Trends and summaries of complaints, incidents and safeguarding.', tools: [], starters: [], prompt: '' },
  { id: 'finance', name: 'Finance and pay', icon: 'wallet', status: 'soon', blurb: 'Income, costs and margins across the service.', tools: [], starters: [], prompt: '' },
]
export const agentById = (id: string) => AGENTS.find(a => a.id === id)
export const publicAgent = (a: AgentDef) => ({ id: a.id, name: a.name, blurb: a.blurb, icon: a.icon, status: a.status, starters: a.starters, shell_message: a.shell_message ?? null })

/** The system prompt for one run: the house rules, this agent's job, and today's date. */
export function systemPromptFor(a: AgentDef, today: string, orgName: string): string {
  return `${HOUSE_RULES}\n\nTODAY: ${today} (UK). ORGANISATION: ${orgName}.\n\nYOUR JOB: ${a.prompt}`
}
