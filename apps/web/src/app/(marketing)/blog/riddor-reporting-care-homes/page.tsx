import Link from 'next/link'
import { ArticleLayout } from '@/components/marketing/article-layout'

export const metadata = {
  title: 'RIDDOR in Care Homes: Which Incidents Must You Report?',
  description: 'A plain-language guide to RIDDOR for care home managers. Which incidents must be reported, to whom, by when, and what counts as a reportable dangerous occurrence.',
  openGraph: {
    title: 'RIDDOR in Care Homes: Which Incidents Must You Report?',
    description: 'Plain-language RIDDOR guidance for care home managers — what to report, to whom, and by when.',
    url: 'https://carestreamai.co.uk/blog/riddor-reporting-care-homes',
  },
}

export default function Post() {
  return (
    <ArticleLayout
      category="Regulatory Knowledge"
      date="18 Apr 2025"
      readTime="6 min read"
      title="RIDDOR in care homes: which incidents must you report and when"
    >
      <p>
        RIDDOR, the Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013, applies
        to all workplaces, including residential and domiciliary care settings. But the specific triggers
        are frequently misunderstood, and non-compliance is a common finding at CQC inspection.
      </p>

      <h2>What is RIDDOR?</h2>
      <p>
        RIDDOR places a legal duty on employers (and the self-employed) to report certain workplace
        incidents to the Health and Safety Executive (HSE). In a care setting, this includes incidents
        involving both employees and residents (when they occur in the course of care delivery).
      </p>

      <h2>What must be reported?</h2>

      <h3>Deaths</h3>
      <p>
        Any death of a worker or non-worker (e.g. resident) that results from a work-related accident
        must be reported to the HSE without delay.
      </p>

      <h3>Specified injuries to workers</h3>
      <p>
        The following injuries to employees must be reported:
      </p>
      <ul>
        <li>Fractures (other than to fingers, thumbs, or toes)</li>
        <li>Amputations</li>
        <li>Injuries resulting in loss of sight</li>
        <li>Crush injuries to the head or torso causing damage to brain or internal organs</li>
        <li>Burns covering more than 10% of the body, or causing significant damage to eyes, respiratory system or other vital organs</li>
        <li>Any degree of scalping requiring hospital treatment</li>
        <li>Loss of consciousness caused by head injury or asphyxia</li>
        <li>Injuries arising from working in an enclosed space leading to hypothermia, heat-induced illness, or requiring resuscitation</li>
      </ul>

      <h3>Over-7-day incapacitation</h3>
      <p>
        If a worker is unable to carry out their normal range of duties for more than seven consecutive
        days (not counting the day of the accident), this must be reported within 15 days.
      </p>

      <h3>Falls by residents, a specific care context</h3>
      <p>
        This is where many care homes have uncertainty. A resident fall that results in a <em>specified injury</em> (see above) may trigger RIDDOR, but only where the fall arose from a work-related activity or workplace hazard. Falls in care homes are complex: CQC guidance and HSE guidance should be read together to determine whether RIDDOR applies in a specific case.
      </p>
      <p>
        Your falls policy should reference RIDDOR and set out how to assess each fall against the
        RIDDOR criteria. If it does not, this is a gap worth addressing before your next inspection.
      </p>

      <h2>Reporting timeframes</h2>
      <ul>
        <li><strong>Deaths and specified injuries:</strong> Notify HSE as soon as practicable (online or by phone). Written report within 10 days.</li>
        <li><strong>Over-7-day incapacitation:</strong> Written report within 15 days of the accident.</li>
        <li><strong>Dangerous occurrences:</strong> Notify immediately.</li>
      </ul>

      <h2>How to report</h2>
      <p>
        Reports are made to the HSE online via the RIDDOR reporting portal or by phone on the Incident
        Contact Centre number. Keep a copy of all RIDDOR reports, CQC may ask to see them.
      </p>

      <h2>What happens at CQC inspection</h2>
      <p>
        CQC inspectors may ask to see your RIDDOR reports and cross-reference them against your incident
        log. Incidents that should have been reported to the HSE but were not are a red flag for Regulation
        12 (safe care and treatment) and Regulation 17 (good governance).
      </p>

      <div className="not-prose rounded-xl bg-teal-light p-6">
        <p className="mb-2 text-sm font-semibold text-teal">Need to explain RIDDOR to your team?</p>
        <p className="mb-4 text-sm text-neutral-mid">
          CareStreamAI explains RIDDOR, and how it connects to your falls policy, in plain English, in
          your staff&apos;s language.
        </p>
        <Link href="/regulatory-knowledge" className="text-sm font-medium text-teal hover:underline">See how regulatory knowledge works →</Link>
      </div>
    </ArticleLayout>
  )
}
