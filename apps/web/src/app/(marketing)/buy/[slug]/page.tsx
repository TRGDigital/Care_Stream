import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, GraduationCap, Globe, RefreshCw, CheckCircle2 } from 'lucide-react'
import { BuyForm } from '@/components/marketing/buy-form'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function getModule(slug: string): Promise<{ title: string } | null> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } })
    if (res.ok) return (await res.json())?.data?.module ?? null
  } catch { /* fall through */ }
  return null
}

async function getUnitPence(): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/public/training/licence-price`, { next: { revalidate: 300 } })
    if (res.ok) return Number((await res.json())?.data?.unit_pence) || 2599
  } catch { /* fall through */ }
  return 2599
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const m = await getModule(slug)
  if (!m) return { title: 'Buy training | CareStreamAI' }
  // Indexable transactional page: buy training licences for one module without a
  // full subscription. pageMetadata adds the self-canonical on the www host and
  // og tags, and defaults to indexable (site_pages can override the copy).
  const title = `Buy ${m.title} Training for Your Team | CareStreamAI`
  const description = `Buy CareStream ${m.title} training licences for just your team — no full subscription needed. One licence per staff member, delivered in our hub in any language.`
  return pageMetadata(`/buy/${slug}`, { title, description })
}

export default async function BuyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [m, unitPence] = await Promise.all([getModule(slug), getUnitPence()])
  if (!m) notFound()

  return (
    <section className="bg-neutral-light py-16 md:py-24">
      <div className="mx-auto max-w-content px-6">
        <Link href={`/staff-training/${slug}`} className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:text-teal-dark">
          <ArrowLeft size={15} /> Back to {m.title}
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          {/* Left — what you get */}
          <div>
            <span className="mb-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-700">Buy training</span>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
              {m.title} training for your team
            </h1>
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-neutral-mid">
              Buy training licences for just your team, no full CareStream subscription needed. Each licence gives one
              staff member the complete <strong>{m.title}</strong> module, delivered in our hub in any language.
            </p>
            <ul className="space-y-3">
              {[
                { Icon: GraduationCap, text: 'A full teach-then-assess module with a real scenario and an assessment' },
                { Icon: Globe,         text: 'Completed in the hub in over 60 languages' },
                { Icon: RefreshCw,     text: 'Wrong answers trigger a short follow-up lesson, so the gap is closed' },
                { Icon: CheckCircle2,  text: 'A completion record and certificate for your CQC evidence' },
              ].map(({ Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-neutral-dark">
                  <Icon size={18} className="mt-0.5 flex-shrink-0 text-teal" />
                  <span className="leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — the form */}
          <div>
            <BuyForm slug={slug} moduleName={m.title} unitPence={unitPence} />
          </div>
        </div>
      </div>
    </section>
  )
}
