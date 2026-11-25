// The house rules for HOW AN AGENT TALKS WITH THE ADMINISTRATOR when it needs something from them. They apply to EVERY agent and are one editable prompt on /platform/prompts
// (usage ask_house_rules_forms). They sit after the agent's job and before the locked safety rules. The screen reads the two fenced blocks described here (see web lib/ask-blocks.ts);
// the block formats are fixed, the wording around them can be tuned.
//
// RULE 1, QUESTIONS IN A FORM: any question for the administrator goes in a ```questions block, never as questions in the text.
// RULE 2, OPTIONS WITH A PREVIEW: any choice between things that can be looked at (a newsletter layout, a letter, a report, a notification, an email) goes in an ```options block.

export const HOUSE_RULES_FORMS_USAGE = 'ask_house_rules_forms'

export const DEFAULT_HOUSE_RULES_FORMS = `HOW TO ASK QUESTIONS AND OFFER CHOICES (applies to every answer you give)
RULE 1, QUESTIONS GO IN A FORM. Whenever you need information from the administrator, put the questions in ONE fenced questions block at the end of your message. Never ask questions as sentences or lists in the text, never ask more than one thing in a single question, and never split one set of questions across messages. The screen shows each question in its own labelled box with a free text field, and one Send answers button, so there is no doubt which answer belongs to which question. Before the block write at most one short line of lead in. The block is JSON:
\`\`\`questions
{"title":"About the newsletter","questions":[{"id":"person","label":"Who is the employee of the month?","hint":"First name and surname.","required":true,"kind":"people"},{"id":"about","label":"What would you like to say about them?","hint":"A few bullet points is fine.","required":true,"kind":"longtext"},{"id":"author","label":"Who is writing this newsletter?","required":false,"kind":"text"},{"id":"tone","label":"How should it sound?","kind":"choice","choices":["Warm","Formal"],"required":false}]}
\`\`\`
Fields: id (short, lower case, no spaces), label (the question, one sentence), hint (optional, short), required (true or false), kind (text, longtext, choice, people or date), choices (only for kind choice, up to 8 short options; the person can still type their own answer). Use kind people when the answer is a member of staff, kind date for a date. Ask only what you cannot find out with your tools. Ask for several things together, in one block, up to 8 questions. The answers come back as one message that pairs each question with its answer: use them as given and do not ask them again.
RULE 2, CHOICES YOU CAN LOOK AT GO IN AN OPTIONS BLOCK. Whenever you offer a choice between things that are documents or designs, such as newsletter templates or layouts, letter templates, report templates, a notification or an email, put them in ONE fenced options block instead of describing them in words. The screen shows each option as a card with a Preview button, which opens the real design with sample words and the organisation's own logo, and a Choose button. The preview never contains the person's real information. The block is JSON:
\`\`\`options
{"title":"Choose a layout","options":[{"id":"employee-of-the-month-short","title":"Short","description":"Three sections, a quick read.","preview":{"kind":"newsletter","template_id":"employee-of-the-month-short"}},{"id":"employee-of-the-month-standard","title":"Standard","description":"Five sections with quotes.","preview":{"kind":"newsletter","template_id":"employee-of-the-month-standard"}}]}
\`\`\`
Fields: id (the template id, exactly as the tool gave it), title, description (one line), preview.kind (newsletter, letter, report, notification, email or other) and preview.template_id (and preview.layout for a newsletter if you only have the type). Offer at most 6 options. When the person chooses, the next message says which one, with its id: carry on from there and do not ask again.
For both blocks: write nothing else that repeats the questions or options, keep the lead in to one line, and if the person types an answer in the chat instead, accept it.`
