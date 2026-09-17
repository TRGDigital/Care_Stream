// The nine /who-its-for/<role> pages behind the Who it's for menu.
//
// Their copy is stored with the service pages (slug `who-its-for-<role>`) and edited in the
// console under Blog -> Services, so a wording change is a save, not a deploy.
//
// `fallback` is where the menu item pointed before the page existed. Until a page is imported
// and published, its URL redirects there rather than showing a 404, so merging the code before
// the copy is published never sends a reader to a dead end.
export const ROLE_PAGES = [
  { role: 'care-workers',        title: 'Care Workers',        fallback: '/staff-training' },
  { role: 'training-managers',   title: 'Training Managers',   fallback: '/who-its-for#training-managers' },
  { role: 'registered-managers', title: 'Registered Managers', fallback: '/care-audits' },
  { role: 'hr-and-admin-teams',  title: 'HR and Admin Teams',  fallback: '/hr-policies' },
  { role: 'compliance-leads',    title: 'Compliance Leads',    fallback: '/cqc-compliance' },
  { role: 'preparing-for-cqc',   title: 'Preparing for CQC',   fallback: '/cqc-staff-questions' },
  { role: 'operations-teams',    title: 'Operations Teams',    fallback: '/business-continuity' },
  { role: 'quality-managers',    title: 'Quality Managers',    fallback: '/cqc-report-chat' },
  { role: 'policy-managers',     title: 'Policy Managers',     fallback: '/care-policies' },
] as const

export const rolePageSlug = (role: string) => `who-its-for-${role}`
