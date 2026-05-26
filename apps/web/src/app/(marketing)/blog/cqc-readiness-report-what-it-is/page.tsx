import Link from 'next/link'
import { ArticleLayout } from '@/components/marketing/article-layout'

export const metadata = {
  title: 'What is a CQC Readiness Report?',
  description: 'A CQC Readiness Report shows you where your evidence is strong and where it is thin — before the inspector arrives. What it is and why every provider should have one.',
  openGraph: {
    title: 'What is a CQC Readiness Report?',
    description: 'Know where your evidence stands before the inspector arrives.',
    url: 'https://carestreamai.co.uk/blog/cqc-readiness-report-what-it-is',
  },
}

export default function Post() {
  return (
    <ArticleLayout
      category="CQC & Compliance"
      date="7 Mar 2025"
      readTime="4 min read"
      title="What is a CQC Readiness Report and why should you have one before your next inspection?"
    >
      <p>
        CQC inspectors look for evidence that staff actively understand and apply your policies, not
        just that the policies exist. Showing an inspector your policy folder demonstrates that you have
        policies. It does not demonstrate that your team uses them.
      </p>
      <p>
        A CQC Readiness Report addresses this gap directly: it provides structured, data-driven evidence
        of how your team engages with your policy library.
      </p>

      <h2>What a CQC Readiness Report contains</h2>
      <p>
        CareStreamAI&apos;s CQC Readiness Report is generated automatically from your audit log. It includes:
      </p>
      <ul>
        <li><strong>Policy Access Summary</strong>, every policy in your library, with total queries, number of staff who accessed it, and date of most recent access</li>
        <li><strong>Policies Not Accessed</strong>, an honest self-assessment identifying policies that received zero queries in the period</li>
        <li><strong>Policy Version History</strong>, when each policy was updated and whether staff accessed it after the update</li>
        <li><strong>Staff Engagement by Role</strong>, query activity broken down by care staff, seniors, and management</li>
        <li><strong>Regulatory Framework Activity</strong>, evidence that staff engage with the regulatory framework in day-to-day work</li>
        <li><strong>Multilingual Access</strong>, languages used to access policies, as direct equality evidence</li>
        <li><strong>Knowledge Gap Log</strong>, unanswered queries grouped by topic, demonstrating proactive quality improvement</li>
      </ul>

      <h2>How it maps to CQC key questions</h2>
      <p>
        Each section of the report connects to one or more of CQC&apos;s five key questions:
      </p>
      <ul>
        <li><strong>Safe</strong>, staff acting on correct, approved procedures, with a full log of every policy query</li>
        <li><strong>Effective</strong>, staff knowledge evidenced through access frequency, version adoption, and gap resolution</li>
        <li><strong>Caring</strong>, equitable support for all staff, including those whose first language is not English</li>
        <li><strong>Responsive</strong>, multilingual access demonstrating responsiveness to workforce diversity</li>
        <li><strong>Well-Led</strong>, an inclusive culture with equal policy access, demonstrated through the audit trail</li>
      </ul>

      <h2>When to generate it</h2>
      <p>
        The report can be generated at any time, on demand or on a monthly schedule. We recommend:
      </p>
      <ul>
        <li>Monthly, to track engagement trends over time</li>
        <li>Immediately after a policy update, to confirm staff accessed the new version</li>
        <li>In advance of any known inspection window</li>
      </ul>

      <h2>What it is not</h2>
      <p>
        The CQC Readiness Report provides factual audit data, evidence of policy access and staff
        engagement. It does not make any assessment of, or claim to influence, CQC inspection ratings.
        CQC assessments involve many factors. The report provides one part of the evidence base.
      </p>

      <div className="not-prose rounded-xl bg-teal-light p-6">
        <p className="mb-4 text-sm text-neutral-mid">
          CQC Readiness Reports are available on the Professional plan.
        </p>
        <div className="flex gap-4">
          <Link href="/cqc-compliance" className="text-sm font-medium text-teal hover:underline">Full CQC & Compliance overview →</Link>
          <Link href="/pricing" className="text-sm font-medium text-teal hover:underline">Compare plans →</Link>
        </div>
      </div>
    </ArticleLayout>
  )
}
