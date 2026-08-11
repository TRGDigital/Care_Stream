import Link from 'next/link'

export function ArticleLayout({
  category,
  date,
  readTime,
  title,
  children,
}: {
  category: string
  date: string
  readTime: string
  title: string
  children: React.ReactNode
}) {
  return (
    <>
      <section className="relative overflow-hidden bg-hero-gradient py-20">
        <div className="absolute inset-0 dot-mesh" />
        <div className="absolute -right-24 -top-24 h-[350px] w-[350px] rounded-full bg-white/5" />
        <div
          className="absolute bottom-0 left-0 right-0 h-14"
          style={{ background: 'linear-gradient(to bottom right, transparent 49.5%, #fff 50%)' }}
        />
        <div className="relative mx-auto max-w-5xl px-6 pb-8">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="rounded-pill bg-white/20 px-3 py-1.5 text-xs font-bold text-white">{category}</span>
            <span className="text-xs text-white/50">{date} · {readTime}</span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight text-white md:text-4xl">{title}</h1>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <article className="prose prose-neutral max-w-none prose-headings:font-extrabold prose-headings:text-neutral-dark prose-p:text-neutral-mid prose-li:text-neutral-mid prose-a:text-teal prose-a:no-underline hover:prose-a:underline prose-strong:text-neutral-dark">
            {children}
          </article>
          <div className="mt-14 border-t border-gray-100 pt-8">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-teal hover:text-teal-dark">
              ← Back to Blog
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
