// The map of what an admin can do in CareStream and where it lives. Each entry is a page or a feature inside a page, with the
// words people actually use for it. Guide text is searched separately (guides-index.json, built from the Help & Guides page).
// requires: the plan feature (PlanFeatures key) and the plan name that first includes it, for the upgrade message.
// Plans (checked in the plans table 19 Nov 2026): Starter has none of these; Professional adds analytics, CQC report, face to face,
// gap detection; Enterprise adds custom audits, effectiveness, training impact and workforce compliance. Free has gap detection.
export type Plan = 'Professional' | 'Enterprise'
export type FeatureKey = 'has_advanced_analytics' | 'has_cqc_report' | 'has_gap_detection' | 'has_face_to_face' | 'has_custom_audits' | 'has_effectiveness' | 'has_training_impact' | 'has_workforce_compliance'

export type FeatureEntry = {
  id: string
  title: string
  group: string                 // heading in the results
  href: string                  // where it takes you. The first path segment decides which accounts can open it.
  about: string                 // one plain sentence
  words: string[]               // what people type for it
  requires?: { feature: FeatureKey; plan: Plan }
  guide?: string                // id of the guide that explains it (links to /guides#id)
  only?: 'multisite' | 'training_only'   // shown only to multi site accounts / training only accounts (as in the sidebar)
  action?: boolean              // opens a form to do something (shown first, under Actions and specifics), via ?do= on its page
  cta?: string                  // the button label for an action, a few words
}

const f = (id: string, group: string, title: string, href: string, about: string, words: string[], extra: Partial<FeatureEntry> = {}): FeatureEntry => ({ id, group, title, href, about, words, ...extra })

export const FEATURES: FeatureEntry[] = [
  // Overview
  f('dashboard', 'Overview', 'Dashboard', '/dashboard', 'Your plan, usage, setup checklist and what needs attention.', ['home', 'overview', 'summary', 'checklist', 'usage', 'allowance', 'start']),
  f('queries', 'Overview', 'Query history', '/queries', 'Every question staff asked, who asked it and the answer given.', ['questions', 'chat history', 'what did staff ask', 'conversations', 'chats', 'answers', 'logs']),
  f('benchmarking', 'Overview', 'Benchmarking (group)', '/group', 'Compare your homes side by side.', ['group', 'multiple homes', 'compare homes', 'sites', 'benchmark'], { only: 'multisite', guide: 'group' }),
  // Content
  f('policies', 'Content', 'Policies', '/policies', 'Upload, version, review and archive your policies.', ['policy', 'upload', 'documents', 'pdf', 'word', 'version', 'review date', 'archive', 'procedures'], { guide: 'policies' }),
  f('policies-buy', 'Content', 'Policies we write for you', '/policies', 'Buy a ready written policy for your service, adapted to your home.', ['buy policy', 'new policy', 'policy shop', 'write a policy', 'missing policies', 'templates', 'purchase'], { guide: 'policies-written-for-you' }),
  f('policies-check', 'Content', 'Check your policies against guidance', '/policies', 'Upload a policy and see what is missing against current guidance.', ['policy check', 'policy review', 'compliance check', 'lint', 'out of date', 'free policy review']),
  f('policies-duplicates', 'Content', 'Duplicate policies', '/policies', 'Find policies that repeat each other and keep one.', ['duplicate', 'same policy', 'merge', 'repeat']),
  f('policy-print', 'Content', 'Download or print a policy', '/policies', 'Open a policy and download it as a PDF or print it with your logo.', ['print', 'download', 'pdf', 'logo', 'export policy']),
  f('knowledge', 'Content', 'Knowledge base', '/knowledge', 'Information about your home that staff can ask about: contacts, rules, routines.', ['faq', 'home information', 'handbook', 'staff handbook', 'entries', 'add information', 'answers'], { guide: 'knowledge-base' }),
  f('residents', 'Content', 'Residents (life story and family)', '/knowledge', 'Resident profiles with life stories. Invite family to add memories and copy a private link for them.', ['resident', 'family', 'invite family', 'family link', 'copy link', 'life story', 'memories', 'memory book', 'relatives', 'this is me'], { requires: { feature: 'has_cqc_report', plan: 'Professional' } }),
  f('business-continuity', 'Content', 'Business continuity', '/guides#business-continuity', 'Your continuity plan: what happens if something goes wrong.', ['continuity', 'emergency plan', 'contingency', 'incident plan', 'power cut'], { guide: 'business-continuity' }),
  // Team
  f('staff', 'Team', 'Staff', '/staff', 'Add staff, change roles, send logins, archive leavers.', ['team', 'employees', 'carers', 'add staff', 'invite', 'login', 'password', 'archive', 'leavers', 'roles', 'import'], { guide: 'staff' }),
  f('staff-records', 'Team', 'Staff records and analytics', '/staff', 'See what each member of staff has done and asked.', ['staff record', 'activity', 'who has signed in', 'last login', 'engagement'], { guide: 'staff-records' }),
  f('agency', 'Team', 'Agency workers', '/staff', 'Add agency staff with an end date and see agency spend.', ['agency', 'temporary staff', 'bank staff', 'locum', 'spend'], { guide: 'agency-workers' }),
  f('role-holders', 'Team', 'Named role holders', '/settings', 'Registered manager, safeguarding lead and other named roles.', ['registered manager', 'safeguarding lead', 'named person', 'nominated individual', 'change a name', 'roles'], { guide: 'role-holders' }),
  f('incentives', 'Team', 'Staff incentives', '/incentives', 'Rewards and recognition for staff who complete training and meet goals.', ['rewards', 'recognition', 'bonus', 'vouchers', 'points', 'gift', 'motivate'], { requires: { feature: 'has_cqc_report', plan: 'Professional' }, guide: 'staff-incentives' }),
  f('workforce', 'Team', 'Workforce compliance register', '/workforce', 'DBS, right to work, registration and references in one register.', ['hr', 'human resources', 'personnel', 'dbs', 'right to work', 'registration', 'nmc', 'references', 'credentials', 'expiry', 'compliance register'], { requires: { feature: 'has_workforce_compliance', plan: 'Enterprise' }, guide: 'workforce' }),
  f('supervisions', 'Team', 'Supervisions and appraisals', '/workforce?tab=supervisions', 'Record supervisions and appraisals, set actions and see what is overdue.', ['supervision', 'appraisal', '1 to 1', 'one to one', 'performance review', 'probation', 'overdue'], { requires: { feature: 'has_workforce_compliance', plan: 'Enterprise' }, guide: 'supervisions' }),
  f('translation-review', 'Team', 'Translation review', '/translation-review', 'Check and approve translations of training and policies.', ['translate', 'language', 'translation', 'welsh', 'polish', 'romanian', 'languages']),
  // Reporting
  f('analytics', 'Reporting', 'Analytics', '/analytics', 'Usage, questions, topics and trends across your team.', ['reports', 'charts', 'statistics', 'usage', 'trends', 'insights'], { requires: { feature: 'has_advanced_analytics', plan: 'Professional' }, guide: 'analytics' }),
  f('cqc-report', 'Reporting', 'CQC reports', '/analytics/cqc-report', 'Evidence for each CQC key question, ready for an inspection.', ['cqc', 'inspection', 'evidence', 'safe effective caring responsive well led', 'quality statements', 'report'], { requires: { feature: 'has_cqc_report', plan: 'Professional' }, guide: 'cqc-report' }),
  f('gaps', 'Reporting', 'Policy gap analysis', '/gaps', 'Finds policies you are missing or that do not cover what regulation expects.', ['gap', 'missing policies', 'legislation', 'regulations', 'what am i missing', 'compliance gaps'], { requires: { feature: 'has_gap_detection', plan: 'Professional' }, guide: 'policy-gaps' }),
  f('knowledge-gaps', 'Reporting', 'Knowledge gaps and follow up', '/gaps', 'Questions staff asked that your policies could not answer.', ['no answer', 'unanswered', 'could not answer', 'knowledge gap', 'follow up'], { guide: 'knowledge-gaps' }),
  // Tools
  f('training', 'Tools', 'Training', '/training', 'Assign training, track completion and see who is overdue.', ['courses', 'modules', 'assign', 'mandatory training', 'overdue', 'completion', 'certificates'], { guide: 'training' }),
  f('training-history', 'Tools', 'Training history and certificates', '/training?tab=history', 'Every completed course and certificate.', ['completed', 'certificate', 'history', 'proof', 'evidence of training']),
  f('training-matrix', 'Tools', 'Training matrix', '/training?tab=matrix', 'Who needs which training, at a glance.', ['matrix', 'who needs what', 'role training', 'required training', 'grid'], { guide: 'training-matrix' }),
  f('face-to-face', 'Tools', 'Face to face training', '/training?tab=face_to_face', 'Book and record classroom or practical sessions, with attendance and certificates.', ['face to face', 'classroom', 'practical', 'moving and handling', 'first aid', 'attendance', 'trainer', 'session', 'payroll'], { requires: { feature: 'has_face_to_face', plan: 'Professional' }, guide: 'face-to-face' }),
  f('cpd', 'Tools', 'CPD training', '/training/annual', 'CPD certified training for every member of staff, including the Care Certificate and annual refreshers.', ['cpd', 'care certificate', 'refresher', 'annual training', 'certified', 'accredited', 'free training'], { guide: 'annual-training' }),
  f('diplomas', 'Tools', 'Diplomas', '/training/diplomas', 'Groups of courses that make up a diploma.', ['diploma', 'programme', 'qualification', 'pathway']),
  f('training-impact', 'Tools', 'Training impact and effectiveness', '/training', 'See whether training changed what staff know and do.', ['impact', 'effectiveness', 'did training work', 'knowledge check', 'before and after'], { requires: { feature: 'has_training_impact', plan: 'Enterprise' } }),
  f('training-reminders', 'Tools', 'Training reminders', '/settings', 'Weekly reminders to staff and a weekly summary to admins.', ['reminder', 'weekly email', 'nudge', 'notifications', 'overdue email', 'digest']),
  f('cqc-prep', 'Tools', 'CQC staff prep', '/cqc-questions', 'Questions inspectors ask staff, with practice and scores.', ['cqc questions', 'mock inspection', 'inspector', 'prepare staff', 'quiz', 'practice'], { guide: 'cqc-staff-prep' }),
  f('audits', 'Tools', 'Monthly audits', '/audits', 'Run audits from 100+ ready made templates, with reports and action tracking.', ['audit', 'checklist', 'infection control', 'medication audit', 'care plan audit', 'schedule', 'report', 'actions'], { guide: 'monthly-audits' }),
  f('audit-actions', 'Tools', 'Audit actions', '/audits', 'Actions that came from audits, who owns them and when they are due.', ['actions', 'action plan', 'owner', 'due date', 'tracking', 'close action']),
  f('custom-audits', 'Tools', 'Build your own audit', '/audits', 'Create your own audit template and allocate it to staff.', ['custom audit', 'own audit', 'builder', 'template', 'questions', 'allocate'], { requires: { feature: 'has_custom_audits', plan: 'Enterprise' } }),
  f('onboarding', 'Tools', 'Staff onboarding', '/onboarding', 'Induction flows for new starters, with checks and sign off.', ['induction', 'new starter', 'new staff', 'onboarding flow', 'welcome', 'probation'], { guide: 'onboarding' }),
  // Admin
  f('billing', 'Admin', 'Billing and plan', '/billing', 'Your plan, invoices, payment method and upgrades.', ['plan', 'change plan', 'my plan', 'invoice', 'payment', 'card', 'upgrade', 'downgrade', 'subscription', 'cancel', 'price', 'vat', 'receipt'], { guide: 'billing-account' }),
  f('tokens', 'Admin', 'AI allowance', '/billing', 'How much AI use your plan includes each month.', ['tokens', 'credits', 'allowance', 'ai credit', 'limit', 'usage'], { guide: 'ai-tokens' }),
  f('settings', 'Admin', 'Settings', '/settings', 'Your organisation details, logo, languages and email preferences.', ['organisation', 'logo', 'details', 'languages', 'email settings', 'notifications', 'preferences', 'profile'], { guide: 'settings' }),
  f('settings-email', 'Admin', 'Dedicated email address', '/settings', 'The address staff can email questions to.', ['inbound email', 'email address', 'allowlist', 'who can email']),
  f('guides', 'Admin', 'Help and guides', '/guides', 'Step by step guides for every part of CareStream.', ['help', 'how to', 'guide', 'tutorial', 'support', 'raise support request']),
  f('request-feature', 'Admin', 'Request a new feature', '/guides', 'Tell us what you would like CareStream to do.', ['suggest', 'feature request', 'idea', 'wish']),
  f('support', 'Admin', 'Raise a support request', '/guides', 'Report a problem and send us a screenshot.', ['problem', 'bug', 'error', 'contact', 'support', 'help me', 'broken']),
  f('licences', 'Admin', 'Training licences', '/licences', 'Allocate the training licences you bought.', ['licence', 'license', 'allocate', 'seats'], { only: 'training_only' }),
]


// Things to DO. Each opens the right form on the right page (see lib/admin-search/intents.ts); nothing is saved or sent by the search.
const CTA: Record<string, string> = { 'do-add-staff': 'Add staff', 'do-import-staff': 'Import', 'do-hub-invites': 'Send invites', 'do-upload-policy': 'Upload', 'do-add-entry': 'Add entry', 'do-new-incentive': 'Start', 'do-new-f2f': 'Create session', 'do-new-flow': 'Create flow', 'do-build-audit': 'Build audit' }
const a = (id: string, title: string, path: string, name: string, about: string, words: string[], extra: Partial<FeatureEntry> = {}): FeatureEntry =>
  ({ id, group: 'Do something', title, href: `${path}${path.includes('?') ? '&' : '?'}do=${name}`, about, words, action: true, cta: CTA[id], ...extra })
FEATURES.push(
  a('do-add-staff', 'Add a staff member', '/staff', 'add-staff', 'Add someone to your team and send their login.', ['new staff', 'new starter', 'add carer', 'add employee', 'invite staff', 'create staff'], { guide: 'staff' }),
  a('do-import-staff', 'Import staff from a spreadsheet', '/staff', 'import-staff', 'Add many staff at once from a CSV file.', ['csv', 'bulk add', 'import staff', 'upload staff', 'spreadsheet']),
  a('do-hub-invites', 'Send hub invites to staff', '/staff', 'hub-invites', 'Invite staff to install the CareStream hub on their phone.', ['hub', 'install app', 'download app', 'phone app', 'invite to hub']),
  a('do-upload-policy', 'Upload a policy', '/policies', 'upload-policy', 'Add a policy document (PDF or Word).', ['add policy', 'new policy', 'upload document', 'upload pdf'], { guide: 'policies' }),
  a('do-add-entry', 'Add a knowledge base entry', '/knowledge', 'add-entry', 'Add a question and answer that staff can ask about.', ['new entry', 'add faq', 'new faq', 'add information', 'add answer', 'knowledge entry'], { guide: 'knowledge-base' }),
  a('do-new-incentive', 'Start a new incentive', '/incentives', 'new-incentive', 'Create a reward campaign for staff.', ['new reward', 'create incentive', 'start incentive', 'new campaign', 'recognition'], { requires: { feature: 'has_cqc_report', plan: 'Professional' }, guide: 'staff-incentives' }),
  a('do-new-f2f', 'Create a face to face training session', '/training?tab=face_to_face', 'new-f2f', 'Book a classroom or practical session and invite staff.', ['new session', 'book training', 'schedule training', 'add session', 'create face to face', 'book trainer'], { requires: { feature: 'has_face_to_face', plan: 'Professional' }, guide: 'face-to-face' }),
  a('do-new-flow', 'Create an onboarding flow', '/onboarding', 'new-flow', 'Build an induction flow for new starters.', ['new flow', 'new induction', 'create induction', 'build onboarding'], { guide: 'onboarding' }),
  a('do-build-audit', 'Build your own audit', '/audits', 'build-audit', 'Create an audit template of your own.', ['create audit', 'new audit template', 'own audit', 'design audit'], { requires: { feature: 'has_custom_audits', plan: 'Enterprise' } }),
)

// Plans in order, for the upgrade message.
export const PLAN_NOTE: Record<Plan, string> = {
  Professional: 'Included in the Professional plan and above.',
  Enterprise: 'Included in the Enterprise plan.',
}
