import type { SlotDef } from './types'

// Editable copy for /care-audits. Defaults are the current live copy; editing a slot
// in the platform (Main site pages → /care-audits) overrides it without touching the
// design.
export const CARE_AUDITS_SLOTS: SlotDef[] = [
  // Hero
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'Care Audits' },
  { key: 'hero.h1', group: 'Hero', label: 'Headline', default: 'Structured audits that take minutes to complete and produce a report you can actually use.' },
  { key: 'hero.intro', group: 'Hero', label: 'Intro paragraph', multiline: true, default: 'Regular audits are a CQC expectation, but completing them manually is slow, inconsistently formatted, and rarely produces findings that lead to clear action. CareStream guides your team through structured audits in the hub, scores every section, and generates a formatted report with AI recommendations the moment you finish.' },
  { key: 'hero.cta1', group: 'Hero', label: 'Primary button', default: 'Start Free Trial' },
  { key: 'hero.cta2', group: 'Hero', label: 'Secondary button', default: 'Book a Demo' },

  // Photo evidence (screenshots of the feature)
  { key: 'evidence.label', group: 'Photo evidence', label: 'Eyebrow', default: 'Photo evidence' },
  { key: 'evidence.h2', group: 'Photo evidence', label: 'Heading', default: 'Capture the evidence, right on the question.' },
  { key: 'evidence.intro', group: 'Photo evidence', label: 'Intro paragraph', rich: true, default: 'When you spot something as you walk the floor, take a photo there and then. On a phone or tablet, your team can attach one or more images to any audit question as they go. The photos are optional, compressed automatically, and stored against that exact question, so when the audit is reviewed the evidence is right there beside the answer.' },
  { key: 'evidence.cap.mobile', group: 'Photo evidence', label: 'Caption · phone', default: 'Take or upload photos on a phone or tablet, question by question.' },
  { key: 'evidence.cap.desktop', group: 'Photo evidence', label: 'Caption · hub', default: 'Attached to the exact question in the staff hub.' },
  { key: 'evidence.cap.admin', group: 'Photo evidence', label: 'Caption · review', default: 'Every photo is waiting when the audit is reviewed.' },

  // The problem with manual audits
  { key: 'problem.label', group: 'The problem', label: 'Eyebrow', default: 'The Problem With Manual Audits' },
  { key: 'problem.h2', group: 'The problem', label: 'Heading', default: 'Most care setting audits take too long, read differently every time, and rarely lead to action.' },
  { key: 'problem.p1', group: 'The problem', label: 'Paragraph 1', rich: true, default: 'A care manager filling in a paper audit form or a spreadsheet can spend two to three hours on a single audit. The questions vary from month to month depending on who does it. The resulting report is filed, a few actions are noted, and the cycle repeats with the same weaknesses.' },
  { key: 'problem.p2', group: 'The problem', label: 'Paragraph 2', rich: true, default: 'CQC inspectors want to see that internal audits are consistent, that they produce clear findings, and that those findings come with sensible actions. CareStream gives every audit the same structure, scores each section as you go, and turns your answers into a formatted report with prioritised recommendations.' },
  { key: 'problem.card1.label', group: 'The problem', label: 'Card 1 label', default: 'Traditional manual audit' },
  { key: 'problem.card1.body', group: 'The problem', label: 'Card 1 body', multiline: true, default: 'A manager spends two hours on a spreadsheet. The format changes each time. Findings are noted but inconsistently. The audit exists on paper but rarely reads the same way twice.' },
  { key: 'problem.card2.label', group: 'The problem', label: 'Card 2 label', default: 'CareStream audit' },
  { key: 'problem.card2.body', group: 'The problem', label: 'Card 2 body', multiline: true, default: 'A structured audit is completed in the hub in well under an hour. Every section is scored, findings and actions are captured against each question, and a formatted report with AI recommendations is generated the moment you finish.' },

  // How CareStream audits work
  { key: 'how.label', group: 'How it works', label: 'Eyebrow', default: 'How CareStream Audits Work' },
  { key: 'how.h2', group: 'How it works', label: 'Heading', default: 'Choose it, work through it, receive your report. No formatting, no spreadsheets.' },
  { key: 'how.intro', group: 'How it works', label: 'Intro', multiline: true, default: 'Pre-built audit templates cover the areas CQC inspects. You work through each one section by section in the hub, and the report is generated automatically the moment the audit is complete.' },
  { key: 'how.card1.title', group: 'How it works', label: 'Step 1 title', default: 'Choose the audit and start' },
  { key: 'how.card1.body', group: 'How it works', label: 'Step 1 body', multiline: true, default: 'CareStream ships with pre-built templates for medicines management, infection control, health and safety, fire safety, resident bedrooms, the kitchen, accident and incident records, and more. Choose a template, add your own, and start the audit yourself or have any manager or senior complete it.' },
  { key: 'how.card2.title', group: 'How it works', label: 'Step 2 title', default: 'Guided, structured completion in the hub' },
  { key: 'how.card2.body', group: 'How it works', label: 'Step 2 body', multiline: true, default: 'You work through the audit section by section. Each question takes a clear Yes, No or Not Applicable, with space to record what you found and the action required. Your answers save as you go, so you can pause and pick up later on any device.' },
  { key: 'how.card3.title', group: 'How it works', label: 'Step 3 title', default: 'Formatted report generated automatically' },
  { key: 'how.card3.body', group: 'How it works', label: 'Step 3 body', multiline: true, default: 'When the audit is complete, CareStream produces a formatted report showing each section score, your findings, the actions you recorded, your summary, and AI recommendations. The report is locked and ready to print, save as a PDF, or present to a CQC inspector.' },

  // Build your own audits
  { key: 'build.label', group: 'Build your own audits', label: 'Eyebrow', default: 'Build Your Own Audits' },
  { key: 'build.h2', group: 'Build your own audits', label: 'Heading', default: 'Not just our templates, your audits too.' },
  { key: 'build.intro', group: 'Build your own audits', label: 'Intro', multiline: true, default: 'Every service audits things the standard templates do not cover. With CareStream you build your own audit in minutes, name it, add your questions, choose how often it runs, and it works exactly like the built-in ones. No spreadsheets, no setup, no formatting.' },
  { key: 'build.card1.title', group: 'Build your own audits', label: 'Card 1 title', default: 'Audit anything, your way' },
  { key: 'build.card1.body', group: 'Build your own audits', label: 'Card 1 body', multiline: true, default: 'Build an audit for whatever matters to your service: kitchen hygiene, a maintenance walk-round, a supervision checklist, medication spot-checks. Add as many questions as you need, each with Yes, No, N/A and notes, or free-text findings.' },
  { key: 'build.card2.title', group: 'Build your own audits', label: 'Card 2 title', default: 'The same structured experience' },
  { key: 'build.card2.body', group: 'Build your own audits', label: 'Card 2 body', multiline: true, default: 'Custom audits behave exactly like the ready-made ones: clear response buttons and a notes field on every question, answers that save as you go, section-by-section scoring, and a formatted report on completion.' },
  { key: 'build.card3.title', group: 'Build your own audits', label: 'Card 3 title', default: 'Allocate to the right people' },
  { key: 'build.card3.body', group: 'Build your own audits', label: 'Card 3 body', multiline: true, default: 'Assign each audit to the staff who should carry it out. It appears in their hub on any device, ready to complete while they walk the home, so the right people own the right checks.' },
  { key: 'build.card4.title', group: 'Build your own audits', label: 'Card 4 title', default: 'Inspection-ready, automatically' },
  { key: 'build.card4.body', group: 'Build your own audits', label: 'Card 4 body', multiline: true, default: 'Every audit, custom or built-in, generates AI recommendations mapped to the CQC Key Questions and is stored, formatted and ready to show an inspector. One consistent process instead of scattered paper and spreadsheets.' },

  // Link audits to training
  { key: 'loop.label', group: 'Link audits to training', label: 'Eyebrow', default: 'Link Audits to Training' },
  { key: 'loop.h2', group: 'Link audits to training', label: 'Heading', default: 'Close the loop, from policy to proven impact.' },
  { key: 'loop.intro', group: 'Link audits to training', label: 'Intro', multiline: true, default: 'Build your own audit, link it to the training it measures, and CareStream shows you whether that training is actually improving practice. It joins up the whole cycle, in one place.' },
  { key: 'loop.card1.title', group: 'Link audits to training', label: 'Step 1 title', default: 'Upload your policies' },
  { key: 'loop.card1.body', group: 'Link audits to training', label: 'Step 1 body', multiline: true, default: 'Add your own policy documents. They become the single source of truth everything else is built from.' },
  { key: 'loop.card2.title', group: 'Link audits to training', label: 'Step 2 title', default: 'Training generated from them' },
  { key: 'loop.card2.body', group: 'Link audits to training', label: 'Step 2 body', multiline: true, default: 'CareStream creates training modules grounded in your policies, so staff learn your way of working, not a generic course.' },
  { key: 'loop.card3.title', group: 'Link audits to training', label: 'Step 3 title', default: 'Build an audit, linked to the training' },
  { key: 'loop.card3.body', group: 'Link audits to training', label: 'Step 3 body', multiline: true, default: 'Create an audit for the practice that training should improve, and link it to the module. The audit becomes your real-world measure of whether it worked.' },
  { key: 'loop.card4.title', group: 'Link audits to training', label: 'Step 4 title', default: 'See the training impact' },
  { key: 'loop.card4.body', group: 'Link audits to training', label: 'Step 4 body', multiline: true, default: "CareStream tracks the audit's compliance score against training completion over time, so you can see whether the training is landing in practice." },
  { key: 'loop.note', group: 'Link audits to training', label: 'Closing paragraph', rich: true, default: "It needs a few monthly audit runs to show a meaningful trend, and it shows a correlation rather than proof of cause. Even so, it is exactly the train, audit, improve and re-audit cycle that CQC's well-led question looks for." },

  // See it in action
  { key: 'action.label', group: 'See it in action', label: 'Eyebrow', default: 'See It In Action' },
  { key: 'action.h2', group: 'See it in action', label: 'Heading', default: 'Every question is consistent, and every answer is captured in the same structure.' },
  { key: 'action.h3', group: 'See it in action', label: 'Sub-heading', default: 'A clear answer and a note for every question, formatted identically every time.' },
  { key: 'action.p1', group: 'See it in action', label: 'Paragraph 1', rich: true, default: 'The guided audit walks you through every required question in the right order. Each question takes a Yes, No or Not Applicable, with space for what you found and the action to take, so every audit is formatted the same way regardless of who completes it.' },
  { key: 'action.p2', group: 'See it in action', label: 'Paragraph 2', rich: true, default: 'It can be completed on any device, at any time. Answers save as you go, so a manager finishing a medicines audit at the end of a shift takes the same structured path as one completing it at the start of the day.' },

  // The finished report
  { key: 'report.label', group: 'The finished report', label: 'Eyebrow', default: 'The Finished Report' },
  { key: 'report.h2', group: 'The finished report', label: 'Heading', default: 'A formatted report with every response, every section score, and your summary. Generated instantly.' },
  { key: 'report.intro', group: 'The finished report', label: 'Intro', multiline: true, default: 'The moment the last question is answered, the report is ready. No formatting, no copying responses into a template. The completed audit is stored in CareStream and can be printed, saved as a PDF, shared with the management team, or presented directly to a CQC inspector.' },

  // AI-generated recommendations
  { key: 'rec.label', group: 'AI recommendations', label: 'Eyebrow', default: 'AI-Generated Recommendations' },
  { key: 'rec.h2', group: 'AI recommendations', label: 'Heading', default: 'Every completed audit generates a prioritised improvement plan. Automatically.' },
  { key: 'rec.intro', group: 'AI recommendations', label: 'Intro', multiline: true, default: 'CareStream reads the responses from each completed audit and generates specific, prioritised recommendations based on what your findings actually show. Not generic advice from a template. Every recommendation is drawn from the answers you gave and the actions you recorded in that audit.' },
  { key: 'rec.h3', group: 'AI recommendations', label: 'Sub-heading', default: 'Recommendations tied directly to the findings that generated them.' },
  { key: 'rec.p1', group: 'AI recommendations', label: 'Paragraph 1', rich: true, default: 'Each recommendation references the specific finding it is based on, the risk it addresses, a suggested action, and a priority level, so managers can act immediately without having to interpret the audit data themselves.' },
  { key: 'rec.p2', group: 'AI recommendations', label: 'Paragraph 2', rich: true, default: 'Each completed audit is stored alongside its recommendations and an overall AI rating of Outstanding, Good, Requires Improvement, or Inadequate, giving you a clear, consistent picture of where the service stands at the end of every audit.' },
  { key: 'rec.item1.label', group: 'AI recommendations', label: 'Point 1 label', default: 'Specific to your findings' },
  { key: 'rec.item1.body', group: 'AI recommendations', label: 'Point 1 body', multiline: true, default: 'Recommendations reference the exact questions that returned a No, not the audit as a whole.' },
  { key: 'rec.item2.label', group: 'AI recommendations', label: 'Point 2 label', default: 'Prioritised for you' },
  { key: 'rec.item2.body', group: 'AI recommendations', label: 'Point 2 body', multiline: true, default: 'Each recommendation carries a clear priority so the management team knows what to deal with first.' },
  { key: 'rec.item3.label', group: 'AI recommendations', label: 'Point 3 label', default: 'An overall rating' },
  { key: 'rec.item3.body', group: 'AI recommendations', label: 'Point 3 body', multiline: true, default: 'Every completed audit is given an Outstanding, Good, Requires Improvement, or Inadequate rating based on the responses.' },

  // A complete audit toolkit
  { key: 'toolkit.label', group: 'Audit toolkit', label: 'Eyebrow', default: 'A Complete Audit Toolkit' },
  { key: 'toolkit.h2', group: 'Audit toolkit', label: 'Heading', default: 'From guided completion to section scoring to AI recommendations. One place for the whole audit.' },
  { key: 'toolkit.intro', group: 'Audit toolkit', label: 'Intro', multiline: true, default: 'CareStream gives every audit the same structure, scores it as you go, and turns your answers into a formatted, inspection-ready report.' },
  { key: 'toolkit.card1.title', group: 'Audit toolkit', label: 'Card 1 title', default: 'Ten pre-built templates' },
  { key: 'toolkit.card1.body', group: 'Audit toolkit', label: 'Card 1 body', multiline: true, default: 'Medicines management, infection control, health and safety, fire safety, resident bedrooms, the kitchen, accident and incident records, and data protection. All ready to use, and you can build your own.' },
  { key: 'toolkit.card2.title', group: 'Audit toolkit', label: 'Card 2 title', default: 'Section-by-section scoring' },
  { key: 'toolkit.card2.body', group: 'Audit toolkit', label: 'Card 2 body', multiline: true, default: 'Every Yes, No or Not Applicable is scored as you go, so you can see exactly which sections are strong and which need attention before you finish.' },
  { key: 'toolkit.card3.title', group: 'Audit toolkit', label: 'Card 3 title', default: 'Auto-save and resume' },
  { key: 'toolkit.card3.body', group: 'Audit toolkit', label: 'Card 3 body', multiline: true, default: 'Answers save automatically as you work. Pause an audit and pick it up later on any device, exactly where you left off.' },
  { key: 'toolkit.card4.title', group: 'Audit toolkit', label: 'Card 4 title', default: 'Shift and room-by-room audits' },
  { key: 'toolkit.card4.body', group: 'Audit toolkit', label: 'Card 4 body', multiline: true, default: 'Run audits by day or night shift, or room by room for resident bedroom checks, so the record matches how the audit is actually carried out.' },
  { key: 'toolkit.card5.title', group: 'Audit toolkit', label: 'Card 5 title', default: 'Inspection-ready reports' },
  { key: 'toolkit.card5.body', group: 'Audit toolkit', label: 'Card 5 body', multiline: true, default: 'Each completed audit is locked and formatted, ready to print, save as a PDF, or present directly to a CQC inspector.' },
  { key: 'toolkit.card6.title', group: 'Audit toolkit', label: 'Card 6 title', default: 'AI recommendations and rating' },
  { key: 'toolkit.card6.body', group: 'Audit toolkit', label: 'Card 6 body', multiline: true, default: 'Every completed audit generates prioritised recommendations from your findings, plus an overall rating of Outstanding, Good, Requires Improvement, or Inadequate.' },

  // CQC evidence
  { key: 'cqc.label', group: 'CQC evidence', label: 'Eyebrow', default: 'CQC Evidence' },
  { key: 'cqc.h2', group: 'CQC evidence', label: 'Heading', default: 'An audit record that shows inspectors a consistent, structured approach to quality.' },
  { key: 'cqc.intro', group: 'CQC evidence', label: 'Intro paragraph', rich: true, default: 'CQC inspectors assess whether internal audits are consistent, whether they produce clear findings, and whether those findings come with sensible actions. CareStream generates the evidence for all three.' },
  { key: 'cqc.th1', group: 'CQC evidence', label: 'Table heading 1', default: 'What CareStream records' },
  { key: 'cqc.th2', group: 'CQC evidence', label: 'Table heading 2', default: 'What this shows an inspector' },
  { key: 'cqc.row1.what', group: 'CQC evidence', label: 'Row 1 record', default: 'Structured report for every audit' },
  { key: 'cqc.row1.why', group: 'CQC evidence', label: 'Row 1 explanation', multiline: true, default: 'A formatted report for every completed audit, with section scores, your findings, and the actions recorded. The same format regardless of who completed it.' },
  { key: 'cqc.row2.what', group: 'CQC evidence', label: 'Row 2 record', default: 'Section scores' },
  { key: 'cqc.row2.why', group: 'CQC evidence', label: 'Row 2 explanation', multiline: true, default: 'A clear score for each section of the audit, showing which areas were met in full and which were flagged for action on the day.' },
  { key: 'cqc.row3.what', group: 'CQC evidence', label: 'Row 3 record', default: 'Findings and actions on every question' },
  { key: 'cqc.row3.why', group: 'CQC evidence', label: 'Row 3 explanation', multiline: true, default: 'Each question carries the outcome of the audit and the action to be taken, so inspectors can see findings are noted and followed with a clear next step.' },
  { key: 'cqc.row4.what', group: 'CQC evidence', label: 'Row 4 record', default: 'AI recommendations and overall rating' },
  { key: 'cqc.row4.why', group: 'CQC evidence', label: 'Row 4 explanation', multiline: true, default: 'Each completed audit is stored with prioritised recommendations and an Outstanding, Good, Requires Improvement, or Inadequate rating, showing a structured approach to quality improvement.' },
  { key: 'cqc.row5.what', group: 'CQC evidence', label: 'Row 5 record', default: 'A timestamped completion record' },
  { key: 'cqc.row5.why', group: 'CQC evidence', label: 'Row 5 explanation', multiline: true, default: 'Every audit shows who completed it and when, demonstrating that audits are carried out and recorded as part of the routine of the service.' },

  // Everything included (feature summary)
  { key: 'summary.label', group: 'Everything included', label: 'Eyebrow', default: 'Everything Included' },
  { key: 'summary.h2', group: 'Everything included', label: 'Heading', default: 'The complete care audit toolkit.' },
  { key: 'summary.card1.title', group: 'Everything included', label: 'Card 1 title', default: 'Ten pre-built templates' },
  { key: 'summary.card1.body', group: 'Everything included', label: 'Card 1 body', multiline: true, default: 'Medicines, infection control, health and safety, fire, resident bedrooms, kitchen, accident and incident, and data protection. All ready to use, and you can build your own.' },
  { key: 'summary.card2.title', group: 'Everything included', label: 'Card 2 title', default: 'Guided, structured completion' },
  { key: 'summary.card2.body', group: 'Everything included', label: 'Card 2 body', multiline: true, default: 'Work through each audit section by section with a clear Yes, No or Not Applicable and notes on every question. Consistent regardless of who completes it.' },
  { key: 'summary.card3.title', group: 'Everything included', label: 'Card 3 title', default: 'Automatic report generation' },
  { key: 'summary.card3.body', group: 'Everything included', label: 'Card 3 body', multiline: true, default: 'A formatted report with section scores, your findings, your summary, and AI recommendations is generated the moment the audit is complete.' },
  { key: 'summary.card4.title', group: 'Everything included', label: 'Card 4 title', default: 'Section-by-section scoring' },
  { key: 'summary.card4.body', group: 'Everything included', label: 'Card 4 body', multiline: true, default: 'Every answer is scored as you go, so you can see which sections are strong and which need attention before you finish.' },
  { key: 'summary.card5.title', group: 'Everything included', label: 'Card 5 title', default: 'Auto-save and resume' },
  { key: 'summary.card5.body', group: 'Everything included', label: 'Card 5 body', multiline: true, default: 'Answers save automatically as you work. Pause and pick the audit up later on any device, exactly where you left off.' },
  { key: 'summary.card6.title', group: 'Everything included', label: 'Card 6 title', default: 'Shift and room-by-room audits' },
  { key: 'summary.card6.body', group: 'Everything included', label: 'Card 6 body', multiline: true, default: 'Run audits by day or night shift, or room by room for resident bedroom checks, so the record matches how the audit was carried out.' },
  { key: 'summary.card7.title', group: 'Everything included', label: 'Card 7 title', default: 'Inspection-ready reports' },
  { key: 'summary.card7.body', group: 'Everything included', label: 'Card 7 body', multiline: true, default: 'Each completed audit is locked and formatted, ready to print, save as a PDF, or present directly to a CQC inspector.' },
  { key: 'summary.card8.title', group: 'Everything included', label: 'Card 8 title', default: 'AI recommendations and rating' },
  { key: 'summary.card8.body', group: 'Everything included', label: 'Card 8 body', multiline: true, default: 'Every completed audit generates prioritised recommendations from your findings, plus an overall Outstanding to Inadequate rating.' },

  // Stats
  { key: 'stats.stat1.figure', group: 'Stats', label: 'Stat 1 figure', default: 'Under an hour' },
  { key: 'stats.stat1.title', group: 'Stats', label: 'Stat 1 title', multiline: true, default: 'to complete a structured audit in the hub instead of an afternoon on a spreadsheet.' },
  { key: 'stats.stat1.body', group: 'Stats', label: 'Stat 1 body', multiline: true, default: 'A guided, structured audit with answers that save as you go is far quicker than a blank form, and produces a better formatted report at the end of it.' },
  { key: 'stats.stat2.figure', group: 'Stats', label: 'Stat 2 figure', default: '10' },
  { key: 'stats.stat2.title', group: 'Stats', label: 'Stat 2 title', multiline: true, default: 'pre-built audit templates covering the areas CQC inspects, ready to use out of the box.' },
  { key: 'stats.stat2.body', group: 'Stats', label: 'Stat 2 body', multiline: true, default: 'Medicines, infection control, health and safety, fire, resident bedrooms, the kitchen, accident and incident records, and data protection. Use them as they are or build your own.' },
]
