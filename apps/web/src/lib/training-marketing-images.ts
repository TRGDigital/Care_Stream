// Product screenshots added for the Training / CPD Annual Training marketing pages
// (August 2026). Listed here so they appear at the TOP of the platform Alt Tags
// manager (Blog → Alt Tags) as editable rows, and so the pages and the manager
// share the same default alt text. The pages render these via <SiteImage>, so an
// alt saved in the console overrides the default on the live site within a minute.
export const TRAINING_MARKETING_IMAGES: { src: string; alt: string }[] = [
  {
    src: '/cpd-training-hub.jpg',
    alt: 'The staff training hub showing assigned courses, progress and follow up questions',
  },
  {
    src: '/cpd-module-complete.jpg',
    alt: 'The end of module screen with the reflective practice prompt, mapped standards and the printable course summary and competency checklist',
  },
  {
    src: '/cpd-course-summary.jpg',
    alt: 'The printable one page course summary with learning outcomes, key points, key terms and references',
  },
  {
    src: '/cpd-observation-checklist.jpg',
    alt: 'The printable observed competency checklist with tick boxes and a manager sign off section',
  },
  {
    src: '/follow-up-hub.jpg',
    alt: 'The Follow-up section of the staff hub listing the questions a staff member got wrong, each with Learn and retry options',
  },
  {
    src: '/reporting-staff-record.jpg',
    alt: "A staff member's training record: completion, comparison to the team, statutory training record and annual training with scores, renewals and certificates",
  },
  {
    src: '/reporting-completion-email.jpg',
    alt: 'The completion email sent to admins the moment a staff member passes, showing score, CPD time, learning gain and a link to the certificate',
  },
  {
    src: '/reporting-training-matrix.jpg',
    alt: 'The whole team training matrix showing every staff member against every module with completion status at a glance',
  },
  {
    src: '/matrix-training-calendar.jpg',
    alt: 'The training calendar showing face to face sessions, adhoc training and annual training allocations and completions across the month',
  },
  {
    src: '/matrix-f2f-matrix.jpg',
    alt: "The face to face training matrix showing each staff member's latest attended session per topic with renewal status",
  },
  {
    src: '/platform-adhoc-modules.jpg',
    alt: 'The adhoc training library in the admin console, with statutory modules and generated question sets',
  },
  {
    src: '/platform-policy-preview.jpg',
    alt: 'A policy preview in the admin console, the source document a training module is generated from',
  },
  {
    src: '/platform-f2f-new-session.jpg',
    alt: 'Creating a new face to face session: topic, date, length, capacity, renewal period and allocated staff',
  },
  {
    src: '/platform-f2f-session-detail.jpg',
    alt: 'A face to face session with attendance, competency, sign in sheet evidence and the option to send the digital module to those who missed',
  },
]
