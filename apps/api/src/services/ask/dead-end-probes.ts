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
  // the chat that started the tightening: a draft pasted as text, then an open prose question that ends with a full stop
  'Would you like me to make any changes, or shall I save this as a draft for you?',
  'What would you like me to change? I can adjust the wording, add or remove sections, change the tone, or make any other edits you need.',
  'The newsletter is ready. Let me know if you would like any changes.',
  'I have drafted the letter. Feel free to tell me what to adjust.',
  'That is the comparison. I can adjust the wording or add more detail if that would help.',
  'Anything else you need me to change?',
  'Here is the note for the team. Tell me what you think and I will refine it.',
  'The figures are as of 25 November. Is that right? (It matches your records.)',
  'All saved. If you want, I can also write a version for the night team.',
  'Those are the staff due training. How would you like to handle the reminders',
  'Done. Any other edits?',
  'I can help with that in a few ways, depending on what you need.',
  'Is there anything you would like me to change before it goes out?',
  'You can use either. Which would you prefer',
  'The draft follows the template. Feel free to ask for a different tone.',
  'Happy to adjust it. What changes do you have in mind',
]
/** Endings that are fine: they carry a block, or they are plain statements, or a question that is not a choice. */
export const NOT_DEAD_ENDS: string[] = [
  'Here is the draft.\n\n```next_steps\n{"steps":[{"id":"edit","label":"Edit the content","kind":"action","payload":"edit"}]}\n```',
  'I need a few details.\n\n```questions\n{"questions":[{"id":"a","label":"Who is it?","kind":"text"}]}\n```\n\nWould you like to?',
  'Choose a colour.\n\n```options\n{"options":[{"id":"teal","title":"Teal","preview":{"kind":"newsletter_palette","template_id":"teal","document_id":"d1"}}]}\n```',
  'The holiday balance for Helen is 112 hours, with 8 days booked.',
  'Staff newsletter saved. The colours are now ocean blue.',
  // normal statements that happen to use the same words in the middle, and end plainly
  'I can see that the holiday balance is 112 hours for Helen Thomas, with 8 days already booked and 3 days waiting for approval, and the rest of the team is in line with this.',
  'The pay figures use the current National Living Wage and the on cost rate you gave. I can only use rates held in the register, so no other rate has been used anywhere in this answer.',
  'Training is complete for 29 of 31 staff. The two who are outstanding are listed above, both are new starters, and their dates fall inside the first month of their induction period.',
]
/** What an administrator says to the Newsletters agent, to see the colours flow end to end against the real model. */
export const COLOUR_SAYS: string[] = ['Change colours', 'Can we change the colours of the newsletter?', 'I do not like the colours, can you change them', 'Make it a different colour', 'Change the colour of one block']
/** The chat that started the follow up tightening: a request that should end in a SAVED draft (no pasted text), then the 'change' clicks and words. Run with `ask-eval.ts deadend`. */
export const FOLLOW_UP_SAYS: Array<{ agent: string; say: string }> = [
  { agent: 'newsletter', say: 'I need an employee of the month newsletter for Callum, Chloe and David. They each get a 25 pound M&S voucher. It is from Team Management.' },
  { agent: 'newsletter', say: 'Change something' },
  { agent: 'newsletter', say: 'I want to change it' },
  { agent: 'letters', say: 'Change something' },
  { agent: 'staff', say: 'Who is due training this month?' },
]
