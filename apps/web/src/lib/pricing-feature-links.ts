// Where each row of the /pricing comparison table links, so a reader can find out more about a
// feature before choosing a plan. Keyed by the row label in lib/pricing-data.ts; a row missing
// here simply shows no link. Every target is a live /features/ page (the rows the theme built a
// page for), and the plan limits point at the feature they limit. Support and Free trial are not
// features and have no page.
export const PRICING_FEATURE_LINKS: Record<string, string> = {
  // Plans and limits
  'Annual training allocations': '/features/mandatory-training-by-role',
  'Policies stored': '/features/document-versioning',
  'Staff handbooks': '/features/staff-hub',
  'Staff users': '/features/staff-hub',
  'Questions answered': '/features/staff-hub',
  'Languages in the staff hub': '/features/multi-language-support',
  // Access and knowledge
  'Web chat interface': '/features/web-chat-interface',
  'Email interface': '/features/email-interface',
  'Voice input': '/features/voice-input',
  'Your own knowledge base, built automatically': '/features/home-knowledge-base-auto',
  'Your own knowledge base, manual entries': '/features/home-knowledge-base-manual',
  'External regulatory knowledge base': '/features/external-regulatory-knowledge-base',
  // Policies and approvals
  'Document version history': '/features/document-versioning',
  'Adopt a gap fix with tracked changes': '/features/adopt-a-gap-fix-into-your-policy-tracked-changes',
  'Role holder names merged into policies': '/features/role-holder-names-merged-into-policies',
  'Print ready policy with letterhead and sign off': '/features/download-a-print-ready-policy-letterhead-sign-off',
  'Admin approval with full version history': '/features/admin-approval-with-full-version-history',
  'Care manager approval step, optional': '/features/care-manager-approval-step-optional',
  'Care manager policies hub': '/features/care-manager-policies-hub-approve-see-what-changed',
  'External approval by one off link': '/features/external-approval-by-one-off-link-consultant-trustee',
  'Approval trail and automatic republish to staff': '/features/approval-trail-auto-re-publish-to-staff-qanda',
  // Policy gap detection
  'Regulation coverage analysis': '/features/regulation-coverage-analysis-reads-inside-your-policies',
  'What to add, with example wording': '/features/what-to-add-remediation-with-example-wording',
  'Where to add it, by target policy': '/features/where-to-add-target-policy-guidance',
  'Legal basis and source on each recommendation': '/features/legal-basis-source-citation-on-each-recommendation',
  'Applicability by care setting and service profile': '/features/applicability-by-care-setting-service-profile',
  'Out of date content detection': '/features/out-of-date-content-detection-superseded-law-placeholders',
  'Cross policy consistency checking': '/features/cross-policy-consistency-contradictions-between-policies',
  'Regulation change tracking and alerts': '/features/regulation-change-tracking-update-alerts',
  // CQC wording alignment
  'Wording aligned to the CQC quality statements': '/features/wording-alignment-to-the-cqc-quality-statements',
  'Person centred rewording, in your policy voice': '/features/person-centred-rewording-suggestions-in-your-policy-voice',
  'Suggestions numbered and highlighted in the policy': '/features/suggestions-numbered-and-highlighted-in-the-policy',
  'Adopt into your policy through review and approval': '/features/adopt-into-your-policy-through-review-and-approval',
  // Training
  'Mandatory training by role': '/features/mandatory-training-by-role',
  'Face to face training and matrix': '/features/face-to-face-training-and-matrix',
  'Training matrix with renewals and gaps': '/features/training-compliance-matrix-renewals-gaps',
  'Training generated from a policy update': '/features/generate-onboarding-from-a-policy-update',
  'CQC evidence pack, sign in sheets and certificates': '/features/cqc-evidence-pack-sign-in-sheets-certificates-files',
  'Training payroll report, PDF and CSV with costs': '/features/training-payroll-report-pdf-csv-costing',
  'Effectiveness of training': '/features/effectiveness-of-training',
  'Training impact': '/features/training-impact',
  // Audits
  'Build your own audits': '/features/build-your-own-audits',
  'Audits linked to training': '/features/audits-linked-to-training',
  // Analytics
  'Basic analytics': '/features/basic-analytics',
  'Advanced analytics': '/features/advanced-analytics',
  'CQC readiness report': '/features/cqc-readiness-report',
  // Workforce
  'Supervisions and appraisals tracking': '/features/supervisions-and-appraisals-tracking',
  'Workforce compliance register, DBS, right to work, registration, references': '/features/workforce-compliance-register-dbs-right-to-work-registration-references',
  'Credential uploads and expiry alerts': '/features/credential-document-uploads-expiry-alerts',
  'Multi site group console and benchmarking': '/features/multi-site-group-console-and-benchmarking',
}
