import Link from 'next/link'
import { PageHero } from '@/components/marketing/ui'
import { POSTS } from '@/lib/blog-data'

export const metadata = {
  title: 'Blog',
  description: 'Insights, regulatory guidance, and practical resources for UK care professionals. Covering CQC compliance, workforce management, AI in care, and more.',
  openGraph: {
    title: 'CareStreamAI Blog',
    description: 'Regulatory guidance and practical resources for everyone working in UK health and social care.',
    url: 'https://carestreamai.co.uk/blog',
  },
}

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
