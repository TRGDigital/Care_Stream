// Single source of truth for the Help Centre article taxonomy. Consumed by the
// Help index page (for rendering) and the sitemap (so every published article is
// discoverable) — keeping the two in lockstep so no article is ever left out of
// the sitemap when one is added or removed.
export const HELP_CATEGORIES = [
  {
    icon: '▶',
    title: 'Getting Started',
    articles: [
      { title: 'Setting up your account', href: '/help/getting-started/account-setup' },
      { title: 'Uploading your first policy', href: '/help/getting-started/upload-policy' },
      { title: 'Inviting staff to use CareStreamAI', href: '/help/getting-started/invite-staff' },
      { title: 'Setting up email access', href: '/help/getting-started/email-setup' },
      { title: 'Your 14-day trial, what is included', href: '/help/getting-started/trial' },
    ],
  },
  {
    icon: '📄',
    title: 'Policy Management',
    articles: [
      { title: 'Supported document formats', href: '/help/policies/formats' },
      { title: 'How to update a policy', href: '/help/policies/update-policy' },
      { title: 'Policy version history and archiving', href: '/help/policies/versioning' },
      { title: 'Setting policy review reminders', href: '/help/policies/review-reminders' },
      { title: 'Organising your policy library', href: '/help/policies/organising' },
    ],
  },
  {
    icon: '🌍',
    title: 'Staff Access & Languages',
    articles: [
      { title: 'How multilingual support works', href: '/help/languages/how-it-works' },
      { title: 'Which languages are supported?', href: '/help/languages/supported-languages' },
      { title: 'Email vs web chat, which to use?', href: '/help/languages/channels' },
      { title: 'Asking questions by email', href: '/help/languages/email' },
      { title: 'How staff access CareStreamAI', href: '/help/languages/staff-access' },
    ],
  },
  {
    icon: '📊',
    title: 'Analytics & Reporting',
    articles: [
      { title: 'Understanding your analytics dashboard', href: '/help/analytics/dashboard' },
      { title: 'Generating a CQC Readiness Report', href: '/help/analytics/cqc-report' },
      { title: 'Policy gap detection, how it works', href: '/help/analytics/gap-detection' },
      { title: 'Exporting your audit log', href: '/help/analytics/export-audit' },
      { title: 'Understanding language analytics', href: '/help/analytics/language-analytics' },
    ],
  },
  {
    icon: '✅',
    title: 'Monthly Audits',
    articles: [
      { title: 'How AI audit recommendations work', href: '/help/audits/ai-recommendations' },
      { title: 'Your CQC Readiness Score', href: '/help/audits/readiness-score' },
      { title: 'Turning audits into an action plan', href: '/help/audits/action-plan' },
    ],
  },
  {
    icon: '🔒',
    title: 'Data & Security',
    articles: [
      { title: 'Where is our data stored?', href: '/help/security/data-storage' },
      { title: 'How data isolation works', href: '/help/security/data-isolation' },
      { title: 'Requesting your Data Processing Agreement', href: '/help/security/dpa' },
      { title: 'Data retention and deletion', href: '/help/security/retention' },
    ],
  },
  {
    icon: '💳',
    title: 'Account & Billing',
    articles: [
      { title: 'Changing your plan', href: '/help/billing/change-plan' },
      { title: 'Cancelling your subscription', href: '/help/billing/cancel' },
      { title: 'Updating payment details', href: '/help/billing/payment-details' },
      { title: 'Group pricing, multiple homes', href: '/help/billing/group-pricing' },
    ],
  },
] as const

// Flat list of every Help Centre article path — used to add them to the sitemap.
export const HELP_ARTICLE_PATHS: string[] = HELP_CATEGORIES.flatMap((c) => c.articles.map((a) => a.href))
