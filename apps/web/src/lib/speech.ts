// Builders for the text the hub "Listen" option reads aloud.
//
// Spoken content needs the labels that are purely visual on screen. A learner
// looking at the page can see that a set of bullets sits under "What you'll be
// able to do", or that four lines are the answer options for the question above
// them; a learner listening cannot. These helpers put those headings back in and
// number the options, so the audio is followable on its own.

// Give every fragment its own full stop and line so the voice pauses between
// them instead of running two sentences together.
function asSentence(text?: string | null): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return /[.!?:;]$/.test(t) ? t : `${t}.`
}

export function joinSpoken(parts: Array<string | null | undefined>): string {
  return parts.map(asSentence).filter(Boolean).join('\n')
}

// A question with its answer options, spoken so the listener can tell the two
// apart: an optional lead-in, the question (numbered where the screen numbers
// it), then each option announced as "Option 1", "Option 2"…
export function speakQuestion(
  question: string,
  options: string[] = [],
  opts: { lead?: string; questionLabel?: string } = {},
): string {
  const { lead, questionLabel } = opts
  return joinSpoken([
    lead,
    questionLabel ? `${questionLabel}. ${question}` : question,
    options.length ? 'The answer options are' : null,
    ...options.map((o, i) => `Option ${i + 1}. ${o}`),
  ])
}

// The lesson overview: summary, then the learning outcomes under their heading,
// then the key points where the module has no sections of its own.
export function speakOverview(args: {
  summary?: string | null
  outcomes?: string[]
  keyPoints?: string[]
}): string {
  const outcomes  = args.outcomes  ?? []
  const keyPoints = args.keyPoints ?? []
  return joinSpoken([
    args.summary,
    outcomes.length ? "What you'll be able to do" : null,
    ...outcomes,
    keyPoints.length ? 'Key points' : null,
    ...keyPoints,
  ])
}
