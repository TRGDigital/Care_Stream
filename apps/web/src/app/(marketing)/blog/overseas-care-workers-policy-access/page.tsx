import Link from 'next/link'
import { ArticleLayout } from '@/components/marketing/article-layout'

export const metadata = { title: 'The hidden risk in your international workforce — CareStreamAI Blog' }

export default function Post() {
  return (
    <ArticleLayout
      category="Workforce"
      date="4 Apr 2025"
      readTime="7 min read"
      title="The hidden risk in your international workforce: policy access in a second language"
    >
      <p>
        Over 190,000 overseas workers were recruited into the UK care sector in 2023–24. Many of them
        are expected to navigate complex clinical and regulatory policies written in legal English — in
        a language they may have learned only recently.
      </p>
      <p>
        This is not a criticism of those workers. It is a structural risk that most care organisations
        have not fully addressed — and that CQC is increasingly aware of.
      </p>

      <h2>The scale of the problem</h2>
      <p>
        The most common first languages in the UK care workforce — after English — include Romanian,
        Polish, Tagalog (Filipino), Hindi, Urdu, Yoruba, Igbo, Somali, and Bengali. In many care homes,
        particularly in London and the South East, these languages are spoken by a majority of care staff.
      </p>
      <p>
        In this environment, handing a staff member a policy folder written in formal legal English and
        expecting them to absorb and apply it is — at best — optimistic. At worst, it is a patient safety
        risk and a compliance gap.
      </p>

      <h2>Why this is harder than it looks</h2>
      <p>
        The challenge is not just vocabulary. UK care policies are written in a particular register of
        English — formal, often passive, frequently referencing legislation by name without explanation.
        Native English speakers often find them challenging to parse.
      </p>
      <p>
        For a care worker who has been speaking English for two or three years, a sentence like &ldquo;In
        accordance with the requirements of Regulation 12 of the Health and Social Care Act 2008 (Regulated
        Activities) Regulations 2014...&rdquo; is essentially opaque.
      </p>

      <h2>The compliance dimension</h2>
      <p>
        This is not just an HR problem — it is a regulatory one. CQC&apos;s Equality & Diversity requirements
        (under the Well-Led and Responsive key questions) expect organisations to demonstrate that all
        staff have equitable access to the information they need to do their job safely.
      </p>
      <p>
        If your Polish-speaking care worker cannot access or understand your falls policy as easily as
        your English-speaking senior carer, that is an inequality — and a gap that a CQC inspector may
        identify.
      </p>

      <h2>What good practice looks like</h2>
      <p>
        Organisations at the leading edge of this issue are moving from translation (converting documents
        into other languages, which is expensive, slow, and hard to keep current) to <em>on-demand multilingual access</em> — enabling staff to ask questions about policies in their own language and receive accurate, real-time answers.
      </p>
      <p>
        This approach has several advantages over document translation:
      </p>
      <ul>
        <li>It scales to 50+ languages without 50 translated documents</li>
        <li>When a policy is updated, all language versions are immediately current</li>
        <li>Staff ask the question they actually have — not the question the translated document addresses</li>
        <li>Every access is logged, generating equality evidence automatically</li>
      </ul>

      <h2>Starting with new starters</h2>
      <p>
        The induction period is the highest-risk time. A new overseas care worker is trying to learn a
        job, a setting, a team, and a policy library simultaneously — in a second language. Any support
        you can give that reduces the cognitive burden of policy access will improve both safety and
        retention.
      </p>
      <p>
        Staff who feel supported — who can ask a question and get an answer they understand — are less
        likely to make procedural errors and less likely to leave in their first three months.
      </p>

      <div className="not-prose rounded-xl bg-teal-light p-6">
        <p className="mb-2 text-sm font-semibold text-teal">Related</p>
        <ul className="space-y-1">
          <li><Link href="/who-its-for" className="text-sm text-neutral-dark hover:text-teal">CareStreamAI for HR Directors →</Link></li>
          <li><Link href="/blog/cqc-equality-diversity-evidence" className="text-sm text-neutral-dark hover:text-teal">How to evidence equality and diversity for CQC →</Link></li>
        </ul>
      </div>
    </ArticleLayout>
  )
}
