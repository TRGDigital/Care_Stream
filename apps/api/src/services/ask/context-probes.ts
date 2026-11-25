// Rule 8 (READ WHAT THE ADMINISTRATOR HAS ALREADY SAID): ways an administrator gives details up front, and what a good answer does with them. Used by the tests and by the manual eval against the
// real model (`npx tsx src/scripts/ask-eval.ts context`), which prints each answer so a person can check it used the details and did not re-ask them. Plain wording, no dashes.
export interface ContextProbe { agent: string; say: string; expect: string }
export const CONTEXT_PROBES: ContextProbe[] = [
  { agent: 'newsletter', say: 'We have two employees of the month for November. Can you do the newsletter?', expect: 'Plans for TWO people: a people question for two, plural wording, consent for each, nothing about "the" employee.' },
  { agent: 'newsletter', say: 'Employee of the month newsletter for the night team only.', expect: 'Treats the audience as the night team: does not offer all staff, and does not ask who it is for.' },
  { agent: 'newsletter', say: 'Make it short. Employee of the month, Helen and Sam.', expect: 'Chooses the short layout without asking, matches Helen and Sam to the staff list and confirms the match in the form.' },
  { agent: 'newsletter', say: 'Staff newsletter for all staff about the Christmas rota.', expect: 'Uses the Christmas rota template and the all staff audience, and asks only what is missing.' },
  { agent: 'newsletter', say: 'A farewell newsletter for a leaver, Sam Reed, last day Friday.', expect: 'Uses the leavers template, takes the name and the day as given, and does not ask who is leaving.' },
  { agent: 'newsletter', say: 'This month is a promotion: Helen is now senior carer. Newsletter please.', expect: 'Adapts the template for a promotion and does not treat it as a normal monthly update.' },
  { agent: 'newsletter', say: 'It is a bank holiday week, keep it very short and friendly.', expect: 'Picks the bank holiday cover content, a short layout and a friendly tone, and asks only what is missing.' },
  { agent: 'letters', say: 'A formal warning letter for Sam Reed about lateness, keep it formal.', expect: 'Uses the right template and the formal tone, takes Sam from the staff list, and asks only for the missing facts.' },
  { agent: 'letters', say: 'Pay review letter for Helen, 25 pence an hour rise from 1 January.', expect: 'Uses the figures given and does not ask for the rise or the date again.' },
  { agent: 'notifications', say: 'Tell all staff that the car park is closed on Friday.', expect: 'Treats the audience as all staff and the message as given; proposes the notification and does not ask who or what.' },
  { agent: 'staff', say: 'Compare the hours in the file with our staff for the night team only.', expect: 'Limits the comparison to the night team as said and does not ask which team.' },
  { agent: 'newsletter', say: 'Three of our carers are employees of the month this time.', expect: 'Plans for THREE people (expected 3 in the people question) with plural wording.' },
]
