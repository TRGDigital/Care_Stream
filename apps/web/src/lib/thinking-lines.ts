// The little lines shown while an agent is working, so the wait is never the same sentence every time. A general set for every agent, plus a set for the kind of work each agent does.
// Rules: British English, no dashes, short, never claims something that is not happening (a line about "your records" is only in the general set and the data agents' sets, never for a draft being written).

export const GENERAL_LINES = [
  'Working it out from your records', 'Pulling the figures together', 'Checking the details', 'Putting that together for you', 'Looking through what we hold',
  'Cross checking the numbers', 'Reading it through carefully', 'Lining things up', 'Having a good look', 'Gathering what you need', 'Making sense of it',
  'Double checking the details', 'Taking a careful look', 'Putting the pieces together', 'Checking dates and names', 'Making sure it adds up',
  'One moment while I check', 'Digging out the detail', 'Getting it ready', 'Nearly there', 'Weighing it up', 'Tidying it up',
] as const

const BY_KIND: Array<{ match: RegExp; lines: readonly string[] }> = [
  { match: /news/i, lines: ['Choosing the right words', 'Laying out the page', 'Fitting it on one page', 'Finding the right tone', 'Setting out the sections', 'Polishing the headings', 'Checking it reads well'] },
  { match: /letter/i, lines: ['Drafting your letter', 'Setting out the letter', 'Choosing careful wording', 'Checking the letter reads well', 'Lining up the details', 'Keeping it formal and kind'] },
  { match: /notif|remind/i, lines: ['Writing the message', 'Keeping it short and clear', 'Checking who it is going to', 'Finding the right words'] },
  { match: /pay|finance|inflation|cost/i, lines: ['Crunching the numbers', 'Checking the rates', 'Adding up the costs', 'Working out the totals', 'Comparing the figures', 'Checking the sums twice'] },
  { match: /holiday/i, lines: ['Counting up the days', 'Checking the balances', 'Looking at the calendar', 'Working out who is off', 'Checking the allowances'] },
  { match: /train|learn|compet/i, lines: ['Checking who is up to date', 'Looking at the training matrix', 'Checking course dates', 'Seeing what is due soon'] },
  { match: /quality|audit|cqc|govern|inspect|complaint|incident/i, lines: ['Reading through the evidence', 'Checking against the standards', 'Looking at the audit results', 'Spotting what needs attention'] },
  { match: /know|polic|guid|regul/i, lines: ['Reading the guidance', 'Finding the right guidance', 'Checking the source', 'Looking up the standard'] },
  { match: /staff|people|rota|team|incent/i, lines: ['Looking at the team', 'Checking the rota', 'Working out the hours', 'Lining up the staff details'] },
  { match: /resident/i, lines: ['Looking at the service picture', 'Checking the numbers for the service', 'Pulling the totals together'] },
]

/** The lines for an agent: its own kind of work first, then the general set. */
export function linesFor(agentId: string | null | undefined): string[] {
  const id = String(agentId ?? '')
  const own = BY_KIND.filter(k => k.match.test(id)).flatMap(k => [...k.lines])
  return [...own, ...GENERAL_LINES]
}

/** The next line: never the one just shown, and the first line of a new wait is chosen at random so two waits in a row do not start the same. */
export function nextLine(pool: readonly string[], last: string | null, rand: () => number = Math.random): string {
  const options = pool.filter(l => l !== last)
  const from = options.length ? options : pool
  return from[Math.min(from.length - 1, Math.floor(rand() * from.length))]
}

export const ROTATE_MS = 3800
