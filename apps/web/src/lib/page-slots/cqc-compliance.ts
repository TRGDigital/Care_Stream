import type { SlotDef } from './types'

// Editable copy for /cqc-compliance. Defaults are the current live copy; editing a
// slot in the platform (Main site pages → /cqc-compliance) overrides it without
// touching the design.
export const CQC_COMPLIANCE_SLOTS: SlotDef[] = [
  // Hero
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'CQC & Compliance' },
  { key: 'hero.h1', group: 'Hero', label: 'Headline', default: 'Stop preparing for CQC. Start being ready for CQC.' },
  { key: 'hero.intro', group: 'Hero', label: 'Intro paragraph', multiline: true, default: 'CareStream builds your compliance evidence in real time, one policy interaction at a time, and checks which regulations your policies actually cover. When the inspector arrives, your evidence is already prepared.' },

  // The gap
  { key: 'gap.label', group: 'The gap', label: 'Eyebrow', default: 'The Gap Most Care Settings Have' },
  { key: 'gap.h2', group: 'The gap', label: 'Heading', default: 'Policies exist. Evidence of use does not.' },
  { key: 'gap.p1', group: 'The gap', label: 'Paragraph 1', rich: true, default: 'CQC inspectors look for evidence that staff actively use and understand your policies, not just that the policies exist. Most care organisations can show the policy folder. Very few can show the inspector that their team actually reads and applies it.' },
  { key: 'gap.p2', group: 'The gap', label: 'Paragraph 2', rich: true, default: 'CareStream closes that gap by logging every policy interaction in a structured, auditable format, and generating a CQC Readiness Report that makes that evidence immediately presentable.' },
  { key: 'gap.card1.label', group: 'The gap', label: 'Card 1 label', default: 'What most homes can show' },
  { key: 'gap.card1.text', group: 'The gap', label: 'Card 1 text', multiline: true, default: 'A policy folder. Documents in place. Dated and versioned.' },
  { key: 'gap.card2.label', group: 'The gap', label: 'Card 2 label', default: 'What CQC wants to see' },
  { key: 'gap.card2.text', group: 'The gap', label: 'Card 2 text', multiline: true, default: 'Evidence that staff read, query, and act on your policies, by role, over time, across languages.' },

  // How it works
  { key: 'how.label', group: 'How it works', label: 'Eyebrow', default: 'How It Works' },
  { key: 'how.h2', group: 'How it works', label: 'Heading', default: 'Evidence that builds itself, every day.' },
  { key: 'how.step1.title', group: 'How it works', label: 'Step 1 title', default: 'Staff ask policy questions' },
  { key: 'how.step1.body', group: 'How it works', label: 'Step 1 body', multiline: true, default: 'Every time a staff member queries a policy in the hub or by email, CareStream logs the interaction, the policy accessed, the role, the language, and the date.' },
  { key: 'how.step2.title', group: 'How it works', label: 'Step 2 title', default: 'Every interaction is recorded' },
  { key: 'how.step2.body', group: 'How it works', label: 'Step 2 body', multiline: true, default: 'CareStream structures each interaction into an auditable record, who accessed which policy, when, in what language, building a live evidence base that grows automatically with every query.' },
  { key: 'how.step3.title', group: 'How it works', label: 'Step 3 title', default: 'Generate your Readiness Report' },
  { key: 'how.step3.body', group: 'How it works', label: 'Step 3 body', multiline: true, default: 'With one click, generate a CQC Readiness Report that presents your evidence clearly, policy access summaries, staff engagement data, knowledge gap logs, and more, ready to download as a PDF.' },

  // Regulation coverage
  { key: 'coverage.label', group: 'Regulation coverage', label: 'Eyebrow', default: 'Regulation Coverage' },
  { key: 'coverage.h2', group: 'Regulation coverage', label: 'Heading', default: 'See which regulations your policies cover, and where the gaps are.' },
  { key: 'coverage.h3', group: 'Regulation coverage', label: 'Sub-heading', default: 'Your policies, checked against the regulations that apply to a care service.' },
  { key: 'coverage.p1', group: 'Regulation coverage', label: 'Paragraph 1', rich: true, default: 'CareStream reads the actual content of your policies, not just the titles, and checks them against each regulation that applies to a care service. For every regulation it decides whether your policies cover it, partly cover it, or leave a gap, and points to the policy that best evidences the decision.' },
  { key: 'coverage.p2', group: 'Regulation coverage', label: 'Paragraph 2', rich: true, default: 'Gaps are listed first, so you know what to write or update before an inspector finds it. Every judgement comes with a short reason and a confidence level, and the picture refreshes as your policies change.' },
  { key: 'coverage.item1.label', group: 'Regulation coverage', label: 'Legend 1 label', default: 'Covered' },
  { key: 'coverage.item1.text', group: 'Regulation coverage', label: 'Legend 1 text', multiline: true, default: 'A policy clearly and substantively addresses the regulation.' },
  { key: 'coverage.item2.label', group: 'Regulation coverage', label: 'Legend 2 label', default: 'Partial' },
  { key: 'coverage.item2.text', group: 'Regulation coverage', label: 'Legend 2 text', multiline: true, default: 'The topic is touched on, but is incomplete for what the regulation requires.' },
  { key: 'coverage.item3.label', group: 'Regulation coverage', label: 'Legend 3 label', default: 'Gap' },
  { key: 'coverage.item3.text', group: 'Regulation coverage', label: 'Legend 3 text', multiline: true, default: 'The regulation is not addressed in your current policies.' },

  // Report sections
  { key: 'report.label', group: 'Report sections', label: 'Eyebrow', default: 'What the Report Covers' },
  { key: 'report.badge', group: 'Report sections', label: 'Plan badge', default: 'Professional plan' },
  { key: 'report.h2', group: 'Report sections', label: 'Heading', default: 'The CQC Readiness Report.' },
  { key: 'report.col1', group: 'Report sections', label: 'Table column 1', default: 'Report section' },
  { key: 'report.col2', group: 'Report sections', label: 'Table column 2', default: 'Why it matters at inspection' },
  { key: 'report.row1.section', group: 'Report sections', label: 'Row 1 section', default: 'Policy Access Summary' },
  { key: 'report.row1.why', group: 'Report sections', label: 'Row 1 why', multiline: true, default: 'Every active policy with total queries, number of staff who accessed it, and date of most recent access. Proof that policies are live and in use.' },
  { key: 'report.row2.section', group: 'Report sections', label: 'Row 2 section', default: 'Policies Not Accessed' },
  { key: 'report.row2.why', group: 'Report sections', label: 'Row 2 why', multiline: true, default: 'Policies that received zero queries in the period, an honest self-assessment that shows CQC you identify and address gaps proactively.' },
  { key: 'report.row3.section', group: 'Report sections', label: 'Row 3 section', default: 'Policy Version History' },
  { key: 'report.row3.why', group: 'Report sections', label: 'Row 3 why', multiline: true, default: 'When each policy was updated and whether staff accessed it after the update, evidence that new guidance reached the team.' },
  { key: 'report.row4.section', group: 'Report sections', label: 'Row 4 section', default: 'Staff Engagement by Role' },
  { key: 'report.row4.why', group: 'Report sections', label: 'Row 4 why', multiline: true, default: 'Query activity by care staff, seniors, and management, showing policies are accessed at the point of care delivery, not just by management.' },
  { key: 'report.row5.section', group: 'Report sections', label: 'Row 5 section', default: 'Regulatory Framework Activity' },
  { key: 'report.row5.why', group: 'Report sections', label: 'Row 5 why', multiline: true, default: 'Queries referencing RIDDOR, safeguarding, CQC Fundamental Standards, showing staff engage with the regulatory framework.' },
  { key: 'report.row6.section', group: 'Report sections', label: 'Row 6 section', default: 'Multilingual Access' },
  { key: 'report.row6.why', group: 'Report sections', label: 'Row 6 why', multiline: true, default: 'Languages used to access policies, direct evidence supporting CQC Equality and Diversity considerations for a multilingual workforce.' },
  { key: 'report.row7.section', group: 'Report sections', label: 'Row 7 section', default: 'Knowledge Gap Log' },
  { key: 'report.row7.why', group: 'Report sections', label: 'Row 7 why', multiline: true, default: 'Unanswered queries captured as they happen, evidence of ongoing quality improvement and proactive gap identification.' },

  // CQC key questions
  { key: 'keyq.label', group: 'CQC key questions', label: 'Eyebrow', default: 'CQC Key Questions' },
  { key: 'keyq.h2', group: 'CQC key questions', label: 'Heading', default: 'How CareStream contributes to each key question.' },
  { key: 'keyq.q1.title', group: 'CQC key questions', label: 'Question 1 title', default: 'Well-Led' },
  { key: 'keyq.q1.evidence', group: 'CQC key questions', label: 'Question 1 evidence', multiline: true, default: 'An inclusive culture where all staff, regardless of language, have equal access to policy guidance. Leadership demonstrated through the audit trail.' },
  { key: 'keyq.q2.title', group: 'CQC key questions', label: 'Question 2 title', default: 'Responsive' },
  { key: 'keyq.q2.evidence', group: 'CQC key questions', label: 'Question 2 evidence', multiline: true, default: 'Services organised to meet the diverse needs of the workforce delivering them. Multilingual access and language analytics demonstrate responsiveness.' },
  { key: 'keyq.q3.title', group: 'CQC key questions', label: 'Question 3 title', default: 'Safe' },
  { key: 'keyq.q3.evidence', group: 'CQC key questions', label: 'Question 3 evidence', multiline: true, default: 'Staff acting on correct, approved procedures, with a full log of every policy query and the guidance given.' },
  { key: 'keyq.q4.title', group: 'CQC key questions', label: 'Question 4 title', default: 'Effective' },
  { key: 'keyq.q4.evidence', group: 'CQC key questions', label: 'Question 4 evidence', multiline: true, default: 'Staff knowledge and competence evidenced through policy access frequency, version adoption, and knowledge gap resolution.' },
  { key: 'keyq.q5.title', group: 'CQC key questions', label: 'Question 5 title', default: 'Caring' },
  { key: 'keyq.q5.evidence', group: 'CQC key questions', label: 'Question 5 evidence', multiline: true, default: 'Equitable support for all staff, including those whose first language is not English, enabling confident, informed care delivery.' },

  // Works alongside
  { key: 'toolkit.label', group: 'Works alongside', label: 'Eyebrow', default: 'Part of Your CQC Toolkit' },
  { key: 'toolkit.h2', group: 'Works alongside', label: 'Heading', default: 'Readiness is more than a report.' },
  { key: 'toolkit.card1.title', group: 'Works alongside', label: 'Card 1 title', default: 'CQC Report Chat' },
  { key: 'toolkit.card1.body', group: 'Works alongside', label: 'Card 1 body', multiline: true, default: 'Upload your inspection report and chat with it. CareStream cross-references it against your policies and the CQC framework to help you understand findings and draft a factual-accuracy challenge.' },
  { key: 'toolkit.card1.cta', group: 'Works alongside', label: 'Card 1 CTA', default: 'Explore CQC Report Chat' },
  { key: 'toolkit.card2.title', group: 'Works alongside', label: 'Card 2 title', default: 'CQC Staff Questions' },
  { key: 'toolkit.card2.body', group: 'Works alongside', label: 'Card 2 body', multiline: true, default: 'Prepare your team for the conversations inspectors have on the floor. Open-ended, inspector-style questions across the five key questions, scored by AI, with review and retry.' },
  { key: 'toolkit.card2.cta', group: 'Works alongside', label: 'Card 2 CTA', default: 'Explore CQC Staff Questions' },

  // Legal note
  { key: 'legal.title', group: 'Legal note', label: 'Heading', default: 'Inspection evidence, not a rating guarantee' },
  { key: 'legal.body', group: 'Legal note', label: 'Paragraph', rich: true, default: 'The CareStream CQC Readiness Report provides factual audit data, evidence of policy access and staff engagement. It does not make any assessment of, or claim to influence, CQC inspection ratings. CQC assessments involve many factors. CareStream provides one part of the evidence base.' },
]
