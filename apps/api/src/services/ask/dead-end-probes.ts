// Answers that dead end (a choice written in words with nothing to click), used by the tests and by the manual eval (`npx tsx src/scripts/ask-eval.ts deadend`). Plain wording, no dashes.
export const DEAD_ENDS: string[] = [
  // the answer from the chat that started this: after the Change colours button
  'I can help you change the colours of your newsletter draft.\n\nWould you like to:\n\n1. Change the overall accent colour of the whole newsletter (teal, ocean, forest, plum, berry, terracotta, bronze or slate, or a hex colour like #1D4E89)\n2. Change individual block styles (soft, bold, outline or plain)\n3. Reset all block styles back to default\n\nWhat would you like to do with the colours?',
  'Here is the draft. Would you like me to save it to your library?',
  'I found three templates that could work.\n\n- Short\n- Standard\n- Detailed\n\nWhich would you prefer?',
  'The letter is ready. Do you want me to add a line about the notice period?',
  'I can do this two ways:\n\n1. A short note\n2. A full letter\n\nWhich one?',
  'Shall I go ahead and change the block to bold?',
  'What would you like to do next?',
  'That is the pay comparison. Would you like me to turn it into a letter for the team?',
  'There are two options here. Let me know which you want.\n\n* Keep it as it is\n* Make it shorter\n\nWhich do you want?',
  'Should I include the gift in the newsletter?',
  'I have the list of staff due training. Want me to propose a reminder to them?',
  'Choose from these:\n1) Ocean blue\n2) Forest green\n3) Berry\nWhich colour would you like?',
]
/** Endings that are fine: they carry a block, or they are plain statements, or a question that is not a choice. */
export const NOT_DEAD_ENDS: string[] = [
  'Here is the draft.\n\n```next_steps\n{"steps":[{"id":"edit","label":"Edit the content","kind":"action","payload":"edit"}]}\n```',
  'I need a few details.\n\n```questions\n{"questions":[{"id":"a","label":"Who is it?","kind":"text"}]}\n```\n\nWould you like to?',
  'Choose a colour.\n\n```options\n{"options":[{"id":"teal","title":"Teal","preview":{"kind":"newsletter_palette","template_id":"teal","document_id":"d1"}}]}\n```',
  'The holiday balance for Helen is 112 hours, with 8 days booked.',
  'The figures are as of 25 November. Is that right? (It matches your records.)',
  'Staff newsletter saved. The colours are now ocean blue.',
]
/** What an administrator says to the Newsletters agent, to see the colours flow end to end against the real model. */
export const COLOUR_SAYS: string[] = ['Change colours', 'Can we change the colours of the newsletter?', 'I do not like the colours, can you change them', 'Make it a different colour', 'Change the colour of one block']
