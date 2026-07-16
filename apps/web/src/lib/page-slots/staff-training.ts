import type { SlotDef } from './types'

// Editable copy for /staff-training. Defaults are the current live copy; editing a
// slot in the platform (Main site pages → /staff-training) overrides it without
// touching the design. The dynamic training-module catalogue (fetched from the API
// and rendered via TrainingLibraryTabs) is NOT slotted — only the static marketing
// copy around it is editable here.
export const STAFF_TRAINING_SLOTS: SlotDef[] = [
  // Hero
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'Staff Training and Compliance' },
  { key: 'hero.h1', group: 'Hero', label: 'Headline', default: 'Once a year is not enough. CareStream keeps training front of mind all year round.' },
  { key: 'hero.intro', group: 'Hero', label: 'Intro paragraph', multiline: true, default: 'Annual compliance training is a legal obligation, but a single renewal date does nothing for day-to-day knowledge retention. CareStream builds training modules from your own policies and keeps your whole team engaged with them in the hub throughout the year.' },

  // The problem with annual training
  { key: 'problem.label', group: 'The problem', label: 'Eyebrow', default: 'The Problem With Annual Training' },
  { key: 'problem.h2', group: 'The problem', label: 'Heading', default: 'Staff forget most of what they learn within days.' },
  { key: 'problem.p1', group: 'The problem', label: 'Paragraph 1', rich: true, default: 'Research consistently shows that people forget up to 70% of new information within 24 hours without reinforcement. Yet the care sector still treats annual compliance training as the gold standard. One renewal date. One completion record. Job done.' },
  { key: 'problem.p2', group: 'The problem', label: 'Paragraph 2', rich: true, default: 'CQC expects your staff to actually apply their training in daily care delivery, not just complete it once a year. The gap between a completion certificate and genuine working knowledge is where risk lives.' },
  { key: 'problem.card1.label', group: 'The problem', label: 'Card 1 label', default: 'Traditional annual training' },
  { key: 'problem.card1.text', group: 'The problem', label: 'Card 1 text', multiline: true, default: 'Staff complete a module once per year. A record is made. The knowledge fades within weeks and no one knows.' },
  { key: 'problem.card2.label', group: 'The problem', label: 'Card 2 label', default: 'CareStream training' },
  { key: 'problem.card2.text', group: 'The problem', label: 'Card 2 text', multiline: true, default: 'Modules built from your own policies, knowledge checks, and renewal reminders are delivered in the hub throughout the year, so knowledge is reinforced rather than left to fade.' },

  // How CareStream training works
  { key: 'how.label', group: 'How it works', label: 'Eyebrow', default: 'How CareStream Training Works' },
  { key: 'how.h2', group: 'How it works', label: 'Heading', default: 'Choose or build a module, assign it, and track every answer.' },
  { key: 'how.intro', group: 'How it works', label: 'Intro', multiline: true, default: 'Use the ready-made standard library for common mandatory topics, or have CareStream generate a module from your own policies. Either way, staff complete it in the hub and you see exactly where everyone stands.' },
  { key: 'how.step1.title', group: 'How it works', label: 'Step 1 title', default: 'Choose or generate a module' },
  { key: 'how.step1.body', group: 'How it works', label: 'Step 1 body', multiline: true, default: 'Assign a ready-made module from the standard library covering safeguarding, fire safety, manual handling, infection control, and more, or have CareStream generate a tailored module from your own policy documents. Assign to individuals or whole teams from the dashboard.' },
  { key: 'how.step2.title', group: 'How it works', label: 'Step 2 title', default: 'Questions delivered in the hub' },
  { key: 'how.step2.body', group: 'How it works', label: 'Step 2 body', multiline: true, default: 'Each module contains multiple-choice questions with four options. CareStream nudges staff in the hub the moment a module is assigned, or waits for the staff member to start when it suits them. You choose which mode suits your team.' },
  { key: 'how.step3.title', group: 'How it works', label: 'Step 3 title', default: 'Progress tracked in real time' },
  { key: 'how.step3.body', group: 'How it works', label: 'Step 3 body', multiline: true, default: 'Every answer is recorded. The compliance dashboard shows exactly who has completed what, who is in progress, and whose renewal is coming up, giving you a live picture of training compliance across your whole team.' },

  // Two kinds of training
  { key: 'two.label', group: 'Two kinds of training', label: 'Eyebrow', default: 'Two Kinds of Training' },
  { key: 'two.h2', group: 'Two kinds of training', label: 'Heading', default: 'Ask anything any time, and cover every mandatory subject.' },
  { key: 'two.intro', group: 'Two kinds of training', label: 'Intro', multiline: true, default: 'CareStream covers both sides of training in one hub: quick, ad-hoc questions you send whenever you need them, and full annual modules for every mandatory subject.' },
  { key: 'two.card1.title', group: 'Two kinds of training', label: 'Card 1 title', default: 'Ad-hoc questions and knowledge checks' },
  { key: 'two.card1.body', group: 'Two kinds of training', label: 'Card 1 body', multiline: true, default: 'Raise a question or a knowledge check and send it to any staff member whenever you want. They answer in their own words in the hub, the AI marks it with feedback, and you see exactly who knows what. Ideal for a quick refresher after an incident, an audit finding, or a policy change.' },
  { key: 'two.card1.li1', group: 'Two kinds of training', label: 'Card 1 list item 1', default: 'Sent and answered in the hub' },
  { key: 'two.card1.li2', group: 'Two kinds of training', label: 'Card 1 list item 2', default: 'Marked instantly with feedback' },
  { key: 'two.card1.li3', group: 'Two kinds of training', label: 'Card 1 list item 3', default: 'Perfect for spot-checks and refreshers' },
  { key: 'two.card2.title', group: 'Two kinds of training', label: 'Card 2 title', default: 'Annual mandatory training modules' },
  { key: 'two.card2.body', group: 'Two kinds of training', label: 'Card 2 body', multiline: true, default: 'A full library of teach-then-assess modules covering every mandatory subject, ready to assign and included as standard. Each module teaches the topic, applies it to a real care scenario, and finishes with an assessment, with automatic renewal reminders so nobody falls out of date.' },
  { key: 'two.card2.li1', group: 'Two kinds of training', label: 'Card 2 list item 1', default: 'Every mandatory subject, ready to assign' },
  { key: 'two.card2.li2', group: 'Two kinds of training', label: 'Card 2 list item 2', default: 'Teach, scenario and assessment in each module' },
  { key: 'two.card2.li3', group: 'Two kinds of training', label: 'Card 2 list item 3', default: 'Renewal reminders at 90, 30 and 7 days' },

  // Annual mandatory training library (static copy around the dynamic module tabs)
  { key: 'library.label', group: 'Training library', label: 'Eyebrow', default: 'Annual Mandatory Training Library' },
  { key: 'library.h2', group: 'Training library', label: 'Heading', default: 'Every mandatory subject, ready to assign.' },
  { key: 'library.intro', group: 'Training library', label: 'Intro', multiline: true, default: 'The standard library covers the mandatory training every care service needs, grounded in best practice for UK adult social care. Each one becomes a complete teach-then-assess module with its own cover, learning sections, a real care scenario, and an assessment.' },
  { key: 'library.footnote', group: 'Training library', label: 'Footnote', multiline: true, default: 'Every subject is part of your standard library. You can also generate tailored modules from your own policies.' },

  // Built from your own policies
  { key: 'policies.label', group: 'Built from your policies', label: 'Eyebrow', default: 'Built From Your Own Policies' },
  { key: 'policies.h2', group: 'Built from your policies', label: 'Heading', default: 'Training modules generated from your policies, not generic content.' },
  { key: 'policies.h3', group: 'Built from your policies', label: 'Sub-heading', default: 'A complete module that teaches, applies, and assesses.' },
  { key: 'policies.p1', group: 'Built from your policies', label: 'Paragraph 1', rich: true, default: 'CareStream can generate a full training module from your own policy documents. It reads the relevant policies, then writes a module that teaches the topic in short sections, walks staff through a real care setting scenario, and checks understanding as it goes, finishing with a full assessment.' },
  { key: 'policies.p2', group: 'Built from your policies', label: 'Paragraph 2', rich: true, default: 'Every generated module is a draft until you approve it. You review it, edit anything you want, and only then does it reach your staff. The standard library of ready-made modules is included, and tailored modules generated from your own policies use one AI credit each.' },
  { key: 'policies.item1.label', group: 'Built from your policies', label: 'Feature 1 label', default: 'Teach then assess' },
  { key: 'policies.item1.text', group: 'Built from your policies', label: 'Feature 1 text', multiline: true, default: 'Each module teaches a topic in short sections, applies it to a real scenario, and finishes with a full assessment of four-option questions.' },
  { key: 'policies.item2.label', group: 'Built from your policies', label: 'Feature 2 label', default: 'Learn and retry' },
  { key: 'policies.item2.text', group: 'Built from your policies', label: 'Feature 2 text', multiline: true, default: 'A staff member who gets a question wrong gets a short re-teach on that point and tries again, so the gap is closed, not just recorded.' },
  { key: 'policies.item3.label', group: 'Built from your policies', label: 'Feature 3 label', default: 'External sign-off' },
  { key: 'policies.item3.text', group: 'Built from your policies', label: 'Feature 3 text', multiline: true, default: 'Send a module to an external specialist through a secure link so they can review and sign it off, giving you independent assurance for inspectors.' },

  // See it in action
  { key: 'action.label', group: 'See it in action', label: 'Eyebrow', default: 'See It In Action' },
  { key: 'action.h2', group: 'See it in action', label: 'Heading', default: 'Training answered in the hub, in seconds, in any language.' },
  { key: 'action.hub.label', group: 'See it in action', label: 'Hub label', default: 'The hub' },
  { key: 'action.hub.h3', group: 'See it in action', label: 'Hub heading', default: 'Policy questions and training questions, together in one place.' },
  { key: 'action.hub.p1', group: 'See it in action', label: 'Hub paragraph 1', rich: true, default: 'The hub is where your staff already ask policy questions. Training questions appear in the same place. A staff member opens the hub on their phone, answers the question waiting for them, and the record updates the moment they reply.' },
  { key: 'action.hub.p2', group: 'See it in action', label: 'Hub paragraph 2', rich: true, default: 'Staff can also ask about any training topic at any time, by typing or speaking, and get an accurate answer drawn from the module and your source materials.' },
  { key: 'action.hub.lang', group: 'See it in action', label: 'Hub languages line', default: 'Answered in over 60 languages.' },
  { key: 'action.email.label', group: 'See it in action', label: 'Email label', default: 'Email' },
  { key: 'action.email.h3', group: 'See it in action', label: 'Email heading', default: 'Prefer email? Training arrives in the inbox. The reply takes one keystroke.' },
  { key: 'action.email.p1', group: 'See it in action', label: 'Email paragraph 1', rich: true, default: 'Staff who would rather use email get their training questions there automatically, and the thread is preserved so replies are handled in the same conversation with no separate system needed.' },
  { key: 'action.email.p2', group: 'See it in action', label: 'Email paragraph 2', rich: true, default: 'The correct answer is highlighted in the feedback reply, and the compliance record is updated the moment the response lands.' },
  { key: 'action.email.lang', group: 'See it in action', label: 'Email languages line', default: 'Answered in over 60 languages.' },

  // Close the loop
  { key: 'loop.label', group: 'Close the loop', label: 'Eyebrow', default: 'Close the Loop' },
  { key: 'loop.h2', group: 'Close the loop', label: 'Heading', default: 'A wrong answer becomes a lesson, not just a mark.' },
  { key: 'loop.h3', group: 'Close the loop', label: 'Sub-heading', default: 'When a staff member gets it wrong, CareStream teaches the point and checks it again.' },
  { key: 'loop.p1', group: 'Close the loop', label: 'Paragraph 1', rich: true, default: 'The moment a question is answered incorrectly, CareStream turns it into a short, policy-grounded micro-lesson: a warm explanation of the right answer and why it matters, the key points to remember, and a real care scenario.' },
  { key: 'loop.p2', group: 'Close the loop', label: 'Paragraph 2', rich: true, default: 'Then it asks a brand new question on the same point, never a repeat of the one they missed, to make sure it has landed. The whole loop takes a couple of minutes, in the staff member’s own language.' },
  { key: 'loop.item1.label', group: 'Close the loop', label: 'Feature 1 label', default: 'Taught from your own policy' },
  { key: 'loop.item1.text', group: 'Close the loop', label: 'Feature 1 text', multiline: true, default: 'The micro-lesson is grounded in your policy, so the correction matches your home and not generic advice.' },
  { key: 'loop.item2.label', group: 'Close the loop', label: 'Feature 2 label', default: 'A fresh question, not a repeat' },
  { key: 'loop.item2.text', group: 'Close the loop', label: 'Feature 2 text', multiline: true, default: 'Understanding is checked with a new, scenario-based question, so staff cannot simply remember the answer.' },
  { key: 'loop.item3.label', group: 'Close the loop', label: 'Feature 3 label', default: 'Logged as closed, for CQC' },
  { key: 'loop.item3.text', group: 'Close the loop', label: 'Feature 3 text', multiline: true, default: 'Every learn-and-retry is recorded, giving you evidence that the gap was closed, not just flagged.' },

  // Beyond the renewal date
  { key: 'beyond.label', group: 'Beyond the renewal date', label: 'Eyebrow', default: 'Beyond the Renewal Date' },
  { key: 'beyond.h2', group: 'Beyond the renewal date', label: 'Heading', default: 'Training that works throughout the year, not only when it is due.' },
  { key: 'beyond.intro', group: 'Beyond the renewal date', label: 'Intro', multiline: true, default: 'The most powerful part of CareStream training is not the renewal certificate. It is what happens between renewals.' },
  { key: 'beyond.card1.title', group: 'Beyond the renewal date', label: 'Card 1 title', default: 'Ad-hoc knowledge checks' },
  { key: 'beyond.card1.body', group: 'Beyond the renewal date', label: 'Card 1 body', multiline: true, default: 'CareStream can send training module questions to staff at any point in the year, not only at renewal. Spaced repetition keeps critical knowledge like safeguarding, medication management, and infection control fresh.' },
  { key: 'beyond.card2.title', group: 'Beyond the renewal date', label: 'Card 2 title', default: 'Staff can ask training questions any time' },
  { key: 'beyond.card2.body', group: 'Beyond the renewal date', label: 'Card 2 body', multiline: true, default: 'A staff member who wants to refresh their knowledge on a training topic can ask CareStream directly in the hub or by email. They get an accurate answer drawn from the training module and source materials, instantly.' },
  { key: 'beyond.card3.title', group: 'Beyond the renewal date', label: 'Card 3 title', default: 'Learn and retry' },
  { key: 'beyond.card3.body', group: 'Beyond the renewal date', label: 'Card 3 body', multiline: true, default: 'When a staff member gets a question wrong, they get a short re-teach on that exact point and try again. The gap in knowledge is closed at the moment it shows up, not just logged.' },
  { key: 'beyond.card4.title', group: 'Beyond the renewal date', label: 'Card 4 title', default: 'Renewal reminders at 90, 30, and 7 days' },
  { key: 'beyond.card4.body', group: 'Beyond the renewal date', label: 'Card 4 body', multiline: true, default: 'Automatic reminders go to each staff member as their renewal date approaches, and managers receive a renewal digest listing what is coming up. No spreadsheets and no manual chasing.' },
  { key: 'beyond.card5.title', group: 'Beyond the renewal date', label: 'Card 5 title', default: 'Immediate delivery on assignment' },
  { key: 'beyond.card5.body', group: 'Beyond the renewal date', label: 'Card 5 body', multiline: true, default: 'With auto-send mode enabled, the moment a manager assigns a module the first question is delivered to the hub. Staff can make a start on their phone during a break.' },
  { key: 'beyond.card6.title', group: 'Beyond the renewal date', label: 'Card 6 title', default: 'Individual tracking at scale' },
  { key: 'beyond.card6.body', group: 'Beyond the renewal date', label: 'Card 6 body', multiline: true, default: 'Whether you have 10 staff or 200, the compliance dashboard shows every individual status across every module. See who is current, in progress, and overdue at a glance.' },

  // Face-to-face training
  { key: 'f2f.label', group: 'Face-to-face training', label: 'Eyebrow', default: 'Face-to-face Training' },
  { key: 'f2f.h2', group: 'Face-to-face training', label: 'Heading', default: 'Track your in-person training too, in the same place.' },
  { key: 'f2f.intro', group: 'Face-to-face training', label: 'Intro', multiline: true, default: 'Most homes still run group sessions in the room every month. CareStream gives you a simple calendar to log those sessions, mark who attended, and keep the evidence, so your digital and face-to-face training live in one record.' },
  { key: 'f2f.step1.title', group: 'Face-to-face training', label: 'Step 1 title', default: 'Log the session on a calendar' },
  { key: 'f2f.step1.body', group: 'Face-to-face training', label: 'Step 1 body', multiline: true, default: 'Record each in-person session: the topic, the date, and who delivered it (a staff member or an external trainer). Allocate who should attend, and backfill the last twelve months so your history is complete.' },
  { key: 'f2f.step2.title', group: 'Face-to-face training', label: 'Step 2 title', default: 'Mark who attended' },
  { key: 'f2f.step2.body', group: 'Face-to-face training', label: 'Step 2 body', multiline: true, default: 'After the session, mark who came and who missed it in a couple of taps. That gives you clear evidence of attendance at every formal training session you run.' },
  { key: 'f2f.step3.title', group: 'Face-to-face training', label: 'Step 3 title', default: 'Send a digital catch-up' },
  { key: 'f2f.step3.body', group: 'Face-to-face training', label: 'Step 3 body', multiline: true, default: 'Anyone who missed can be sent the matching digital module to complete in the hub, so a missed session never becomes a training gap. You choose exactly who receives it.' },
  { key: 'f2f.footnote', group: 'Face-to-face training', label: 'Footnote', multiline: true, default: 'Managers see it all in the analytics and in the hub: who missed which sessions, who was sent the catch-up module, and whether they have completed it. From October each year, CareStream nudges you to start planning the following year’s sessions.' },

  // Training matrix
  { key: 'matrix.label', group: 'Training matrix', label: 'Eyebrow', default: 'Training Matrix' },
  { key: 'matrix.h2', group: 'Training matrix', label: 'Heading', default: 'A complete training matrix that builds itself.' },
  { key: 'matrix.p1', group: 'Training matrix', label: 'Paragraph 1', rich: true, default: 'A training matrix, the grid of who has done what and when it is next due, is one of the first things an inspector or commissioner asks to see. Most services keep it in a spreadsheet that is out of date the moment it is printed.' },
  { key: 'matrix.p2', group: 'Training matrix', label: 'Paragraph 2', rich: true, default: 'CareStream builds it for you, live. Every <strong class="text-neutral-dark">digital module</strong> a staff member completes and every <strong class="text-neutral-dark">face-to-face session</strong> you log flow into one record, so the matrix is always current and always complete, in person and online, with nothing to keep updated by hand.' },
  { key: 'matrix.listLabel', group: 'Training matrix', label: 'List label', default: 'What the matrix captures' },
  { key: 'matrix.li1', group: 'Training matrix', label: 'List item 1', multiline: true, default: 'Digital training completed, with scores and renewal dates' },
  { key: 'matrix.li2', group: 'Training matrix', label: 'List item 2', multiline: true, default: 'Face-to-face sessions, who attended and who missed, with the trainer and the date' },
  { key: 'matrix.li3', group: 'Training matrix', label: 'List item 3', multiline: true, default: 'Up to twelve months of history backfilled, so it is complete from day one' },
  { key: 'matrix.li4', group: 'Training matrix', label: 'List item 4', multiline: true, default: 'Gaps at a glance: who is overdue, and who was sent a catch-up after missing a session' },
  { key: 'matrix.li5', group: 'Training matrix', label: 'List item 5', multiline: true, default: 'CQC-ready evidence for every staff member, ready to show at inspection' },

  // CQC evidence
  { key: 'cqc.label', group: 'CQC evidence', label: 'Eyebrow', default: 'CQC Evidence' },
  { key: 'cqc.h2', group: 'CQC evidence', label: 'Heading', default: 'An audit trail that goes far beyond a completion date.' },
  { key: 'cqc.intro', group: 'CQC evidence', label: 'Intro paragraph', rich: true, default: 'When a CQC inspector asks how you ensure staff knowledge is current, a completion date from 11 months ago is a weak answer. CareStream gives you something far stronger.' },
  { key: 'cqc.col1', group: 'CQC evidence', label: 'Table column 1 heading', default: 'What CareStream records' },
  { key: 'cqc.col2', group: 'CQC evidence', label: 'Table column 2 heading', default: 'What this shows an inspector' },
  { key: 'cqc.row1.what', group: 'CQC evidence', label: 'Row 1 records', default: 'Training completion per staff member' },
  { key: 'cqc.row1.why', group: 'CQC evidence', label: 'Row 1 shows', multiline: true, default: 'Every module completed, with the exact date and the result on each question. Not a bulk export from a third-party LMS.' },
  { key: 'cqc.row2.what', group: 'CQC evidence', label: 'Row 2 records', default: 'Individual question answers' },
  { key: 'cqc.row2.why', group: 'CQC evidence', label: 'Row 2 shows', multiline: true, default: 'The specific question asked, the answer given, and whether it was correct. Evidence that knowledge was tested, not just time was logged.' },
  { key: 'cqc.row3.what', group: 'CQC evidence', label: 'Row 3 records', default: 'Ongoing knowledge checks between renewals' },
  { key: 'cqc.row3.why', group: 'CQC evidence', label: 'Row 3 shows', multiline: true, default: 'Proof that training knowledge is actively reinforced throughout the year, directly addressing the question of how you maintain competence.' },
  { key: 'cqc.row4.what', group: 'CQC evidence', label: 'Row 4 records', default: 'External specialist sign-off' },
  { key: 'cqc.row4.why', group: 'CQC evidence', label: 'Row 4 shows', multiline: true, default: 'Where a module was reviewed and signed off by an external specialist through a secure link, that approval is on record as independent assurance.' },
  { key: 'cqc.row5.what', group: 'CQC evidence', label: 'Row 5 records', default: 'Renewal reminder delivery' },
  { key: 'cqc.row5.why', group: 'CQC evidence', label: 'Row 5 shows', multiline: true, default: 'Evidence that reminders were sent 90, 30, and 7 days before each renewal, showing a structured, proactive renewal management process.' },
  { key: 'cqc.row6.what', group: 'CQC evidence', label: 'Row 6 records', default: 'Manager compliance overview' },
  { key: 'cqc.row6.why', group: 'CQC evidence', label: 'Row 6 shows', multiline: true, default: 'The compliance dashboard shows the state of training across the whole team at any point in time. The evidence an inspector wants, of a manager actively monitoring.' },

  // Everything included
  { key: 'everything.label', group: 'Everything included', label: 'Eyebrow', default: 'Everything Included' },
  { key: 'everything.h2', group: 'Everything included', label: 'Heading', default: 'The complete training compliance toolkit.' },
  { key: 'everything.card1.label', group: 'Everything included', label: 'Card 1 label', default: 'Standard module library' },
  { key: 'everything.card1.desc', group: 'Everything included', label: 'Card 1 description', multiline: true, default: 'Ready-made modules for safeguarding, fire safety, manual handling, infection control, and more. Assign immediately, included as standard.' },
  { key: 'everything.card2.label', group: 'Everything included', label: 'Card 2 label', default: 'Built from your policies' },
  { key: 'everything.card2.desc', group: 'Everything included', label: 'Card 2 description', multiline: true, default: 'Generate a tailored module from your own policy documents. Teach, scenario, knowledge check, and a full assessment. Uses one AI credit.' },
  { key: 'everything.card3.label', group: 'Everything included', label: 'Card 3 label', default: 'Teach then assess' },
  { key: 'everything.card3.desc', group: 'Everything included', label: 'Card 3 description', multiline: true, default: 'Short teaching sections and a real scenario, then four-option multiple-choice questions. Every answer tracked and logged.' },
  { key: 'everything.card4.label', group: 'Everything included', label: 'Card 4 label', default: 'Learn and retry' },
  { key: 'everything.card4.desc', group: 'Everything included', label: 'Card 4 description', multiline: true, default: 'A wrong answer triggers a short re-teach and another go, so knowledge gaps are closed at the moment they appear.' },
  { key: 'everything.card5.label', group: 'Everything included', label: 'Card 5 label', default: 'External specialist sign-off' },
  { key: 'everything.card5.desc', group: 'Everything included', label: 'Card 5 description', multiline: true, default: 'Send a module to an external specialist through a secure link for independent review and sign-off.' },
  { key: 'everything.card6.label', group: 'Everything included', label: 'Card 6 label', default: 'Renewal reminders' },
  { key: 'everything.card6.desc', group: 'Everything included', label: 'Card 6 description', multiline: true, default: 'Automatic reminders to staff at 90, 30, and 7 days before renewal, plus a renewal digest for managers.' },
  { key: 'everything.card7.label', group: 'Everything included', label: 'Card 7 label', default: 'Live compliance dashboard' },
  { key: 'everything.card7.desc', group: 'Everything included', label: 'Card 7 description', multiline: true, default: 'Real-time view of every staff member status across every module, with who is current, in progress, and overdue.' },
  { key: 'everything.card8.label', group: 'Everything included', label: 'Card 8 label', default: 'Delivered in the hub' },
  { key: 'everything.card8.desc', group: 'Everything included', label: 'Card 8 description', multiline: true, default: 'Staff answer in the hub on their phone, in over 60 languages, by typing or speaking. Email is there for anyone who prefers it.' },

  // Pull stats
  { key: 'stats.col1.figure', group: 'Pull stats', label: 'Stat 1 figure', default: '70%' },
  { key: 'stats.col1.title', group: 'Pull stats', label: 'Stat 1 headline', default: 'of information is forgotten within 24 hours without reinforcement.' },
  { key: 'stats.col1.body', group: 'Pull stats', label: 'Stat 1 body', multiline: true, default: 'Research consistently shows that a single annual session cannot sustain working knowledge through the year.' },
  { key: 'stats.col2.figure', group: 'Pull stats', label: 'Stat 2 figure', default: 'All year' },
  { key: 'stats.col2.title', group: 'Pull stats', label: 'Stat 2 headline', default: 'knowledge checks and reminders, not a single date in the calendar.' },
  { key: 'stats.col2.body', group: 'Pull stats', label: 'Stat 2 body', multiline: true, default: 'One question at a time, in the hub, whenever it suits. No session to attend and no rigid structure.' },
]
