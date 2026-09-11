import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, ArrowRight, PlayCircle, MessageSquare, Sparkles } from 'lucide-react'
import { JsonLd } from '@/components/json-ld'
import { USE_CASE_PAGES, useCasePage, type UseCasePage } from '@/lib/use-case-pages'
import { UseCaseFaq } from '@/components/marketing/use-case-faq'

// The /uses/<slug> user case template: a conversion page stacked on a long-form
// guide, driven entirely by lib/use-case-pages.ts. Adding a case is adding data,
// not building a page.

export function generateStaticParams() {
  return USE_CASE_PAGES.map(u => ({ slug: u.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const uc = useCasePage(slug)
  if (!uc) return {}
  return { title: uc.meta.title, description: uc.meta.description }
}

// Artwork arrives after the copy. Until a file exists at the slot path the block
// renders a labelled placeholder, so the page can ship on words alone.
function Shot({ slug, slot, alt, className = '' }: { slug: string; slot: string; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-teal-gradient shadow-elevated ring-1 ring-gray-100 ${className}`}>
      <div className="flex aspect-[16/10] w-full items-center justify-center px-6 text-center">
        <div className="text-white/90">
          <Sparkles size={30} className="mx-auto mb-2" />
          <p className="text-xs font-semibold">[ Image slot: /images/uses/{slug}/{slot}.webp ]</p>
          <p className="mt-1 text-[11px] text-white/70">{alt}</p>
        </div>
      </div>
    </div>
  )
}

export default async function UseCasePageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const uc: UseCasePage | undefined = useCasePage(slug)
  if (!uc) notFound()

  const faqJson = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: uc.faq.groups.flatMap(g => g.items).map(i => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  }

  return (
    <>
      <JsonLd data={faqJson} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-content px-6 py-14 md:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-teal-light px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal">
                User case
              </span>
              <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-neutral-dark md:text-5xl">
                {uc.hero.h1}
              </h1>
              <p className="mt-6 max-w-xl leading-relaxed text-neutral-mid">{uc.hero.intro}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="rounded-btn bg-blue-600 px-8 py-4 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700">
                  Start free trial
                </Link>
                <Link href="/demo" className="rounded-btn border-2 border-gray-200 px-8 py-4 text-center text-sm font-semibold text-neutral-dark transition-colors hover:border-teal hover:text-teal">
                  Book a demo
                </Link>
              </div>
              <p className="mt-3 text-sm text-neutral-mid">{uc.hero.trustLine}</p>
            </div>
            <Shot slug={uc.slug} slot={uc.hero.image.slot} alt={uc.hero.image.alt} />
          </div>
        </div>
      </section>

      {/* ── The problem, in three ── */}
      <section className="bg-neutral-light/40 py-16">
        <div className="mx-auto max-w-content px-6">
          <h2 className="max-w-3xl text-3xl font-extrabold tracking-tight text-neutral-dark">{uc.problem.heading}</h2>
          {uc.problem.standfirst && <p className="mt-3 max-w-2xl text-neutral-mid">{uc.problem.standfirst}</p>}
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {uc.problem.cards.map(c => (
              <div key={c.title} className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
                <h3 className="text-base font-bold text-neutral-dark">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-mid">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What it actually does, alternating ── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-content px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-dark">{uc.capability.heading}</h2>
          <div className="mt-10 space-y-14">
            {uc.capability.blocks.map((b, i) => (
              <div key={b.title} className={`grid items-center gap-8 lg:grid-cols-2 ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                <div>
                  <h3 className="text-xl font-extrabold text-neutral-dark">{b.title}</h3>
                  <p className="mt-3 leading-relaxed text-neutral-mid">{b.body}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {b.tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-teal-light/50 px-3 py-1 text-xs font-semibold text-teal">
                        <CheckCircle2 size={12} /> {t}
                      </span>
                    ))}
                  </div>
                </div>
                <Shot slug={uc.slug} slot={b.image.slot} alt={b.image.alt} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-neutral-light/40 py-16">
        <div className="mx-auto max-w-content px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-dark">{uc.faq.heading}</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {uc.faq.groups.map(g => (
              <div key={g.title}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">{g.title}</h3>
                <div className="space-y-2">
                  {g.items.map(item => <UseCaseFaq key={item.q} q={item.q} a={item.a} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Three-card CTA ── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { Icon: ArrowRight,    title: 'Start a free trial', body: 'Set your home up in a day. No card required.', href: '/register', cta: 'Start free trial' },
              { Icon: PlayCircle,    title: 'Watch the walkthrough', body: 'See the hub, the knowledge base and the answers staff get.', href: '/demo', cta: 'Book a demo' },
              { Icon: MessageSquare, title: 'Talk to us', body: 'Tell us how your home runs and we will tell you honestly if this helps.', href: '/contact', cta: 'Contact us' },
            ].map(c => (
              <div key={c.title} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <c.Icon size={20} className="mb-3 text-teal" />
                <h3 className="text-base font-bold text-neutral-dark">{c.title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-neutral-mid">{c.body}</p>
                <Link href={c.href} className="mt-4 text-sm font-semibold text-teal hover:underline">{c.cta} →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The long-form guide ── */}
      <section className="border-t border-gray-100 bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-dark">{uc.guide.heading}</h2>
          <div className="mt-8 space-y-10">
            {uc.guide.sections.map(s => (
              <div key={s.heading}>
                <h3 className="text-xl font-bold text-neutral-dark">{s.heading}</h3>
                {s.paras.map((p, i) => (
                  <p key={i} className="mt-3 leading-relaxed text-neutral-mid">{p}</p>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-teal-gradient px-8 py-7 text-white">
            <div>
              <p className="text-lg font-bold">See it with your own residents</p>
              <p className="text-sm text-white/85">A short walkthrough, using your home as the example.</p>
            </div>
            <Link href="/demo" className="rounded-btn bg-white px-6 py-3 text-sm font-semibold text-teal hover:bg-white/90">
              Book a demo
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
