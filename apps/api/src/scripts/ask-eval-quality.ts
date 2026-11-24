// Evaluation questions for the quality and compliance agents (see ask-eval.ts). Six each: run them against the real model and read the answers.
// What to look for: every number comes from a tool, the period compared with is stated, no people are named unless asked, and policy gap detail points to the Policy Gaps page.
export const QUALITY_QUESTIONS: Record<string, string[]> = {
  analytics: [
    'How has the team used CareStream this month compared with last month?', 'What are staff asking about most?', 'Which questions could CareStream not answer in the last 60 days?',
    'Which job roles use CareStream least?', 'Who has never asked CareStream anything? (names are fine, this is for me)', 'Is use going up or down week by week over the last 90 days?',
  ],
  'cqc-analytics': [
    'How do our records line up with the five CQC key questions?', 'Which key question is our weakest and why?', 'How many regulations do our policies cover, partly cover or miss?',
    'What evidence do we have that staff use our policies?', 'Are we CQC compliant?', 'What should we work on first to be ready for an inspection?',
  ],
  'cqc-prep': [
    'How are staff doing with their CQC prep questions?', 'Which CQC prep questions do staff find hardest?', 'How many questions are still waiting for an answer?',
    'How do the job roles compare on CQC prep scores?', 'Who should I chase about unanswered CQC questions?', 'Did people improve when they retried a question?',
  ],
  audits: [
    'How have our audit scores changed over the last six months?', 'Which questions keep failing audit after audit?', 'Which audits are overdue and by how long?',
    'How quickly do we close audit actions and how many are overdue?', 'Which audits are overdue and who is responsible? (names are fine, this is for me)', 'What audits does CareStream offer that we do not use yet?',
  ],
  governance: [
    'Build last month\'s governance review.', 'Build a one page leadership summary for last month.', 'Compare this month with last month in a short report.',
    'Build the governance review and name the people who need chasing (internal only).', 'Build a report for staff that shows who is on sick leave.', 'What needs attention before the next audit?',
  ],
}
