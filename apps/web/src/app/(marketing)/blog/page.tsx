import Link from 'next/link'
import { PageHero } from '@/components/marketing/ui'

export const metadata = { title: 'Blog — CareStreamAI' }

const POSTS = [
  {
    slug: 'cqc-equality-diversity-evidence',
    date: '2 May 2025',
    category: 'CQC & Compliance',
    categoryColor: 'bg-teal-light text-teal',
    title: 'How to evidence equality and diversity for CQC — what inspectors actually look for',
    summary: "CQC's Equality & Diversity requirements go beyond a signed policy. Inspectors want to see evidence that your workforce — particularly staff whose first language is not English — has equitable access to guidance, training, and support.",
    readTime: '5 min read',
  },
  {
    slug: 'riddor-reporting-care-homes',
    date: '18 Apr 2025',
    category: 'Regulatory Knowledge',
    categoryColor: 'bg-amber-50 text-amber-brand',
    title: 'RIDDOR in care homes: which incidents must you report and when',
    summary: 'RIDDOR applies to care settings, but the specific triggers are often misunderstood. A clear breakdown of what must be reported, to whom, and within what timeframe.',
    readTime: '6 min read',
  },
  {
    slug: 'overseas-care-workers-policy-access',
    date: '4 Apr 2025',
    category: 'Workforce',
    categoryColor: 'bg-green-50 text-green-700',
    title: 'The hidden risk in your international workforce: policy access in a second language',
    summary: "Over 190,000 overseas workers were recruited into the UK care sector in 2023–24. Many are expected to navigate complex policies written in legal English — in a language they may have learned only recently.",
    readTime: '7 min read',
  },
  {
    slug: 'rag-ai-care-compliance',
    date: '21 Mar 2025',
    category: 'Technology',
    categoryColor: 'bg-purple-50 text-purple-700',
    title: 'Why Retrieval Augmented Generation (RAG) is the right AI approach for care compliance',
    summary: 'Not all AI systems are the same — and in a compliance setting, the architecture matters. Here is why RAG-based AI is the only responsible approach for answering questions from approved policy documents.',
    readTime: '8 min read',
  },
  {
    slug: 'cqc-readiness-report-what-it-is',
    date: '7 Mar 2025',
    category: 'CQC & Compliance',
    categoryColor: 'bg-teal-light text-teal',
    title: 'What is a CQC Readiness Report and why should you have one before your next inspection?',
    summary: 'CQC inspectors look for evidence that staff actively understand and apply your policies — not just that the policies exist. A CQC Readiness Report provides that evidence in a structured, presentable format.',
    readTime: '4 min read',
  },
  {
    slug: 'night-shift-policy-access',
    date: '20 Feb 2025',
    category: 'Registered Manager',
    categoryColor: 'bg-neutral-light text-neutral-mid',
    title: 'Night shifts and policy access: the gap most managers do not know they have',
    summary: 'Most policy access in care homes happens during office hours, when managers are present. But clinical uncertainty does not keep office hours — and staff working at 3am often have fewer resources than they need.',
    readTime: '5 min read',
  },
]

export default function BlogPage() {
  return (
    <>
      <PageHero
        label="Blog"
        title="Insight for UK care professionals."
        subtitle="Regulatory guidance, workforce insight, and practical resources for everyone working in UK health and social care."
      />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {POSTS.map(({ slug, date, category, categoryColor, title, summary, readTime }) => (
              <Link
                key={slug}
                href={`/blog/${slug}`}
                className="card-lift group flex flex-col rounded-2xl border border-gray-100 bg-white p-7 shadow-card"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className={`rounded-pill px-3 py-1 text-xs font-bold ${categoryColor}`}>{category}</span>
                  <span className="text-xs text-gray-400">{readTime}</span>
                </div>
                <h2 className="mb-4 flex-1 font-extrabold leading-snug text-neutral-dark group-hover:text-teal transition-colors">
                  {title}
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-neutral-mid">{summary}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{date}</span>
                  <span className="font-semibold text-teal group-hover:underline">Read →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
