import type { SlotDef } from './types'

// Editable copy for /business-continuity. Defaults are the current live copy;
// editing a slot in the platform (Main site pages → /business-continuity)
// overrides it without touching the design.
export const BUSINESS_CONTINUITY_SLOTS: SlotDef[] = [
  // Hero
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'Business Continuity' },
  { key: 'hero.h1', group: 'Hero', label: 'Headline', default: 'When things go wrong, your staff need answers fast. Not a folder they have never read.' },
  { key: 'hero.intro', group: 'Hero', label: 'Intro paragraph', multiline: true, default: 'CQC requires every registered care service to have a business continuity plan. But a plan that sits in a filing cabinet and has never been accessed by frontline staff is not a plan your service can actually use. CareStreamAI makes every procedure in your plan instantly queryable by any member of your team, on any channel, at any time.' },

  // The problem
  { key: 'problem.label', group: 'The problem', label: 'Eyebrow', default: 'The Problem With Business Continuity Plans' },
  { key: 'problem.h2', group: 'The problem', label: 'Heading', default: 'Most BC plans are written for inspectors. Not for staff who need them at 2am.' },
  { key: 'problem.p1', group: 'The problem', label: 'Paragraph 1', rich: true, default: 'Care setting managers spend hours writing business continuity plans that cover power failures, staff shortages, IT outages, severe weather, and supply disruptions. Those plans are filed, reviewed at the annual inspection, and rarely opened again.' },
  { key: 'problem.p2', group: 'The problem', label: 'Paragraph 2', rich: true, default: 'When a real disruption happens, the care worker on a night shift does not know where the plan is, what it says about their specific scenario, or who to contact. CareStreamAI makes the plan accessible to everyone, in the moment they need it, on the phone already in their pocket.' },
  { key: 'problem.compare1.label', group: 'The problem', label: 'Comparison 1 label', default: 'Traditional BC plan' },
  { key: 'problem.compare1.text', group: 'The problem', label: 'Comparison 1 body', multiline: true, default: 'A detailed document that satisfies inspectors during a visit, but which frontline staff have never read and cannot access during an actual disruption.' },
  { key: 'problem.compare2.label', group: 'The problem', label: 'Comparison 2 label', default: 'CareStreamAI BC plan' },
  { key: 'problem.compare2.text', group: 'The problem', label: 'Comparison 2 body', multiline: true, default: 'Your business continuity procedures are uploaded as knowledge and instantly queryable by any staff member via the hub, email, or voice, even when other systems are unavailable.' },

  // How it works
  { key: 'how.label', group: 'How it works', label: 'Eyebrow', default: 'How CareStreamAI Business Continuity Works' },
  { key: 'how.h2', group: 'How it works', label: 'Heading', default: 'Upload your plan once. Your whole team can query it instantly.' },
  { key: 'how.intro', group: 'How it works', label: 'Intro', multiline: true, default: 'No new system. No login. No session to attend. Your business continuity plan becomes a live, queryable resource that any staff member can access via the hub or email, even when your care management system or internet connection is unavailable.' },
  { key: 'how.step1.title', group: 'How it works', label: 'Step 1 title', default: 'Upload your business continuity plan' },
  { key: 'how.step1.body', group: 'How it works', label: 'Step 1 body', multiline: true, default: 'Add your business continuity plan to the CareStreamAI knowledge base. It joins your policies, procedures, and other documents as a source the AI can draw from when staff ask questions. Updates to the plan are reflected immediately.' },
  { key: 'how.step2.title', group: 'How it works', label: 'Step 2 title', default: 'Staff ask what to do in any scenario' },
  { key: 'how.step2.body', group: 'How it works', label: 'Step 2 body', multiline: true, default: 'During a disruption, any staff member can ask CareStreamAI exactly what the procedure is for their specific situation. Via the hub, email, or voice, they get an answer drawn from your actual plan, not a generic response.' },
  { key: 'how.step3.title', group: 'How it works', label: 'Step 3 title', default: 'Gaps in your plan are surfaced automatically' },
  { key: 'how.step3.body', group: 'How it works', label: 'Step 3 body', multiline: true, default: 'CareStreamAI identifies questions your staff ask that your current plan does not cover. The policy gaps report shows you which scenarios are undocumented, so you can update the plan before a real disruption exposes the weakness.' },

  // See it in action
  { key: 'action.label', group: 'See it in action', label: 'Eyebrow', default: 'See It In Action' },
  { key: 'action.h2', group: 'See it in action', label: 'Heading', default: 'A staff member gets the right answer in under 30 seconds during a live incident.' },
  { key: 'action.h3', group: 'See it in action', label: 'Sub-heading', default: 'The answer comes from your plan. Not from memory.' },
  { key: 'action.p1', group: 'See it in action', label: 'Paragraph 1', rich: true, default: 'When a care worker asks what to do during a specific disruption, CareStreamAI retrieves the relevant section of your business continuity plan and delivers a clear, step-by-step response. The answer is specific to your service and your procedures, not a generic guide.' },
  { key: 'action.p2', group: 'See it in action', label: 'Paragraph 2', rich: true, default: 'Because the response comes via the hub or email, staff can access it on any device, even when your care management system or internet connection is down.' },
  { key: 'action.scenario1.tag', group: 'See it in action', label: 'Scenario 1 tag', default: 'Staff shortage' },
  { key: 'action.scenario1.q', group: 'See it in action', label: 'Scenario 1 question', multiline: true, default: 'We have three call-outs this morning and cannot safely cover the floor. What is the procedure?' },
  { key: 'action.scenario2.tag', group: 'See it in action', label: 'Scenario 2 tag', default: 'IT outage' },
  { key: 'action.scenario2.q', group: 'See it in action', label: 'Scenario 2 question', multiline: true, default: 'The care management system is down on a night shift and we cannot access care records. What do we do?' },
  { key: 'action.scenario3.tag', group: 'See it in action', label: 'Scenario 3 tag', default: 'Severe weather' },
  { key: 'action.scenario3.q', group: 'See it in action', label: 'Scenario 3 question', multiline: true, default: 'Two members of staff cannot get in due to snow. What are the steps for managing a weather-related staff shortage?' },

  // Resilience features
  { key: 'resilience.label', group: 'Resilience features', label: 'Eyebrow', default: 'Built for Real Disruptions' },
  { key: 'resilience.h2', group: 'Resilience features', label: 'Heading', default: 'A business continuity resource that actually works when things go wrong.' },
  { key: 'resilience.intro', group: 'Resilience features', label: 'Intro', multiline: true, default: 'The true test of a business continuity plan is not whether it satisfies an inspector. It is whether a care worker on a night shift can use it.' },
  { key: 'resilience.card1.title', group: 'Resilience features', label: 'Card 1 title', default: 'Accessible on any device when other systems are down' },
  { key: 'resilience.card1.body', group: 'Resilience features', label: 'Card 1 body', multiline: true, default: 'The hub runs on any phone or browser, independently of your care management system, your local network, and your building infrastructure. Staff can access your BC plan procedures even when everything else is unavailable.' },
  { key: 'resilience.card2.title', group: 'Resilience features', label: 'Card 2 title', default: 'Automatic gap detection' },
  { key: 'resilience.card2.body', group: 'Resilience features', label: 'Card 2 body', multiline: true, default: 'When staff ask questions that your current plan does not cover, CareStreamAI flags the gap in the policy gaps report. You find weaknesses before an incident exposes them.' },
  { key: 'resilience.card3.title', group: 'Resilience features', label: 'Card 3 title', default: 'Instant plan updates' },
  { key: 'resilience.card3.body', group: 'Resilience features', label: 'Card 3 body', multiline: true, default: 'When you revise your business continuity plan, the updated version is available to all staff immediately. No printing, no distribution, no waiting for the next staff meeting.' },
  { key: 'resilience.card4.title', group: 'Resilience features', label: 'Card 4 title', default: 'Accessible to every staff member' },
  { key: 'resilience.card4.body', group: 'Resilience features', label: 'Card 4 body', multiline: true, default: 'Every member of your team can query the plan, not only managers. A care worker, a kitchen assistant, or a new starter can ask what to do in a specific scenario and get the right answer.' },
  { key: 'resilience.card5.title', group: 'Resilience features', label: 'Card 5 title', default: 'Staff familiarisation testing' },
  { key: 'resilience.card5.body', group: 'Resilience features', label: 'Card 5 body', multiline: true, default: 'Use CareStreamAI to send scenario-based questions about your business continuity procedures to staff as part of their onboarding or annual refresher. Build genuine familiarity, not just a signed acknowledgement.' },
  { key: 'resilience.card6.title', group: 'Resilience features', label: 'Card 6 title', default: 'CQC-ready evidence at all times' },
  { key: 'resilience.card6.body', group: 'Resilience features', label: 'Card 6 body', multiline: true, default: 'Every staff query to the BC plan is logged. When an inspector asks how your staff access continuity procedures in a real emergency, you have a timestamped record of exactly how the plan is used.' },

  // CQC evidence
  { key: 'cqc.label', group: 'CQC evidence', label: 'Eyebrow', default: 'CQC Evidence' },
  { key: 'cqc.h2', group: 'CQC evidence', label: 'Heading', default: 'Evidence that your business continuity plan is genuinely embedded in practice.' },
  { key: 'cqc.intro', group: 'CQC evidence', label: 'Intro paragraph', rich: true, default: 'CQC inspectors assess whether your business continuity arrangements are robust and whether staff know what to do in an emergency. A written plan is necessary but not sufficient. CareStreamAI gives you the evidence that the plan is actually used.' },
  { key: 'cqc.col1', group: 'CQC evidence', label: 'Table column 1 heading', default: 'What CareStreamAI records' },
  { key: 'cqc.col2', group: 'CQC evidence', label: 'Table column 2 heading', default: 'What this shows an inspector' },
  { key: 'cqc.row1.what', group: 'CQC evidence', label: 'Row 1 – records', default: 'Staff queries to the BC plan' },
  { key: 'cqc.row1.why', group: 'CQC evidence', label: 'Row 1 – shows', multiline: true, default: 'A log of every time a staff member accessed the business continuity plan via a question, showing it is a working resource rather than a document filed away for inspection purposes.' },
  { key: 'cqc.row2.what', group: 'CQC evidence', label: 'Row 2 – records', default: 'Specific scenarios queried' },
  { key: 'cqc.row2.why', group: 'CQC evidence', label: 'Row 2 – shows', multiline: true, default: 'The exact scenarios staff have asked about, demonstrating which parts of the plan are actively known and where gaps in staff awareness exist.' },
  { key: 'cqc.row3.what', group: 'CQC evidence', label: 'Row 3 – records', default: 'Gap detection and remediation' },
  { key: 'cqc.row3.why', group: 'CQC evidence', label: 'Row 3 – shows', multiline: true, default: 'When the system identifies a scenario not covered by the current plan, and the manager updates the plan in response, that sequence is recorded as evidence of active plan management.' },
  { key: 'cqc.row4.what', group: 'CQC evidence', label: 'Row 4 – records', default: 'Staff familiarisation testing' },
  { key: 'cqc.row4.why', group: 'CQC evidence', label: 'Row 4 – shows', multiline: true, default: 'Records of scenario-based questions sent to staff about BC procedures, showing that familiarisation with the plan is a formal, tracked activity and not just a one-off briefing.' },
  { key: 'cqc.row5.what', group: 'CQC evidence', label: 'Row 5 – records', default: 'After-hours and out-of-hours access' },
  { key: 'cqc.row5.why', group: 'CQC evidence', label: 'Row 5 – shows', multiline: true, default: 'Queries made outside normal working hours demonstrate that the plan is accessible to night staff and weekend workers, not only to managers during the working day.' },
  { key: 'cqc.row6.what', group: 'CQC evidence', label: 'Row 6 – records', default: 'Plan review dates and update history' },
  { key: 'cqc.row6.why', group: 'CQC evidence', label: 'Row 6 – shows', multiline: true, default: 'The knowledge base records when each version of the plan was uploaded, providing a clear audit trail of review activity that satisfies the requirement for regular plan maintenance.' },

  // Feature summary
  { key: 'features.label', group: 'Feature summary', label: 'Eyebrow', default: 'Everything Included' },
  { key: 'features.h2', group: 'Feature summary', label: 'Heading', default: 'A business continuity plan your whole team can actually use.' },
  { key: 'features.card1.label', group: 'Feature summary', label: 'Card 1 title', default: 'Queryable BC plan' },
  { key: 'features.card1.desc', group: 'Feature summary', label: 'Card 1 body', multiline: true, default: 'Upload your business continuity plan to the knowledge base and make every procedure instantly accessible to any staff member on any channel.' },
  { key: 'features.card2.label', group: 'Feature summary', label: 'Card 2 title', default: 'Hub, email and voice access' },
  { key: 'features.card2.desc', group: 'Feature summary', label: 'Card 2 body', multiline: true, default: 'Staff query the plan on the same channels they use for policy questions. No new system and no separate login.' },
  { key: 'features.card3.label', group: 'Feature summary', label: 'Card 3 title', default: 'Offline-resilient delivery' },
  { key: 'features.card3.desc', group: 'Feature summary', label: 'Card 3 body', multiline: true, default: 'The hub runs on any internet-connected device, independently of your care management system. The plan remains accessible even when other systems are unavailable.' },
  { key: 'features.card4.label', group: 'Feature summary', label: 'Card 4 title', default: 'Automatic gap detection' },
  { key: 'features.card4.desc', group: 'Feature summary', label: 'Card 4 body', multiline: true, default: 'Questions staff ask that the plan cannot answer are surfaced in the policy gaps report, helping you identify and fix weaknesses proactively.' },
  { key: 'features.card5.label', group: 'Feature summary', label: 'Card 5 title', default: 'Staff familiarisation testing' },
  { key: 'features.card5.desc', group: 'Feature summary', label: 'Card 5 body', multiline: true, default: 'Send scenario-based questions about BC procedures to staff as part of onboarding or annual review. Build genuine familiarity.' },
  { key: 'features.card6.label', group: 'Feature summary', label: 'Card 6 title', default: 'Instant plan updates' },
  { key: 'features.card6.desc', group: 'Feature summary', label: 'Card 6 body', multiline: true, default: 'When you revise the plan, the updated version is available immediately to all staff. No printing and no distribution required.' },
  { key: 'features.card7.label', group: 'Feature summary', label: 'Card 7 title', default: 'Query analytics' },
  { key: 'features.card7.desc', group: 'Feature summary', label: 'Card 7 body', multiline: true, default: 'See which scenarios staff ask about most frequently, which sections of the plan are accessed in real incidents, and where knowledge gaps are concentrated.' },
  { key: 'features.card8.label', group: 'Feature summary', label: 'Card 8 title', default: 'CQC-ready audit log' },
  { key: 'features.card8.desc', group: 'Feature summary', label: 'Card 8 body', multiline: true, default: 'A full log of all staff interactions with the BC plan, providing timestamped evidence that the plan is a genuinely embedded operational resource.' },

  // Stats
  { key: 'stats.stat1.value', group: 'Stats', label: 'Stat 1 figure', default: '30 sec' },
  { key: 'stats.stat1.title', group: 'Stats', label: 'Stat 1 headline', multiline: true, default: 'average time for a staff member to get a specific BC procedure in the hub.' },
  { key: 'stats.stat1.body', group: 'Stats', label: 'Stat 1 body', multiline: true, default: 'The same time it takes to find the right person to call, your staff already have the answer and can act.' },
  { key: 'stats.stat2.value', group: 'Stats', label: 'Stat 2 figure', default: '24/7' },
  { key: 'stats.stat2.title', group: 'Stats', label: 'Stat 2 headline', multiline: true, default: 'your business continuity plan is accessible to every shift, including nights and weekends.' },
  { key: 'stats.stat2.body', group: 'Stats', label: 'Stat 2 body', multiline: true, default: 'Disruptions do not only happen during office hours. CareStreamAI is available at all times on all channels.' },
]
