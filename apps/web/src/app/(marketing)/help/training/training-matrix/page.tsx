import { HelpArticle } from '@/components/marketing/help'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

export async function generateMetadata() {
  return pageMetadata('/help/training/training-matrix', {
    title: 'The Training Matrix and required training by role | CareStream',
    description: 'Set the training each job role needs and see every staff member against it, with face-to-face training, safe to work checks and an export for inspection.',
  })
}

export default function Page() {
  return (
    <HelpArticle
      category="Staff Training"
      title="The Training Matrix and required training by role"
      intro="The Training Matrix shows every staff member against the training their job role requires, in one grid you can filter and export. It answers the first question an inspector asks: is everyone trained for the job they do?"
      blocks={[
        { type: 'subheading', text: 'Set the training each role needs' },
        { type: 'p', text: 'Go to Training and open the Training Matrix tab, then click Required training by role.' },
        { type: 'bullets', items: [
          'Pick All staff and tick the courses everyone must hold, such as safeguarding or fire safety.',
          'Pick each job role in turn and tick the extra courses that role needs.',
          'Courses are grouped into adhoc training, pre-built training and CPD approved courses, with a search box.',
          'Click Save requirements. The matrix updates straight away.',
        ] },
        { type: 'note', text: 'Staff are matched by the job role on their staff profile. Anyone without a job role is only measured against All staff training, so set a role for everyone on the Staff page.' },

        { type: 'subheading', text: 'Face-to-face training and safe to work checks' },
        { type: 'bullets', items: [
          'Face-to-face topics marked mandatory for a role on the Face-to-face Training tab appear in the matrix automatically, using attendance and renewal dates. You still set them on that tab.',
          'On Enterprise, DBS, right to work, passport, professional registration and references recorded on the Workforce page show as one Safe to work column. Upload and update them on the Workforce page.',
          'Agency workers are shown separately for safe to work checks, because their agency holds those records.',
        ] },

        { type: 'subheading', text: 'Reading the matrix' },
        { type: 'bullets', items: [
          'Each name shows a compliance percentage: how much of their required training is in date.',
          'A tick means in date, an hourglass means renewal is due soon, and a cross means expired or overdue.',
          'A red exclamation mark means the training is required for their role but has not been assigned yet.',
          'P means a practical assessment is still to be signed off, and an outline circle means assigned but not started.',
          'Faded cells are training the person holds that their role does not require.',
          'Summary cards show fully compliant staff, required training not assigned, expired or overdue training, and renewals due in the next 60 days.',
        ] },

        { type: 'subheading', text: 'Filter and export' },
        { type: 'bullets', items: [
          'Search by name, filter by job role, or tick Gaps only to list just the people with something outstanding.',
          'Download a CSV, or use Print / PDF for a landscape page to hand to an inspector or commissioner. Both follow your filters.',
        ] },

        { type: 'subheading', text: 'On each staff record' },
        { type: 'p', text: 'Every staff record has a Required training for their role section using the same rules, with the status and dates of each course, their percentage in date and their safe to work checks. It is included when you download the record as CQC evidence.' },

        { type: 'note', text: 'The Compliance tab still shows every course that has been assigned, grouped by type. The Training Matrix is the view by role requirement, so the two work together.' },
      ]}
      related={[
        { title: 'Your CQC Readiness Score', href: '/help/audits/readiness-score' },
        { title: 'How staff access CareStreamAI', href: '/help/languages/staff-access' },
      ]}
    />
  )
}
