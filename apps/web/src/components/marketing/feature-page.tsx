import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle2, Users, ShieldCheck, ArrowRight, FileText,
  Sparkles, Zap, Globe, Clock, Search, MessageSquare, Layers, Gauge,
  BookOpen, Star, Lock, Bell, HeartHandshake, GraduationCap, Settings2, Wand2,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { HomeFaq } from '@/components/marketing/home-faq'
import { SiteImage } from '@/components/site-image'

// ─────────────────────────────────────────────────────────────────────────────
// Shared content shape for every /features/* page. Two templates render it:
//   • FeatureShowcasePage — image-rich (hero screenshot + per-section screenshots).
//     Use for flagship features where we have real product screenshots.
//   • FeatureSimplePage — light/no-image (icon tiles, more compact). Use for the
//     many pricing features where we don't have (or don't want) lots of images.
// Both accept the SAME FeatureContent, so a page can switch template by swapping
// one component and dropping the `image` fields.
// ─────────────────────────────────────────────────────────────────────────────

export type FeatureImage = { src: string; alt: string }
export type FeatureFaq = { question: string; answer: string }
export type FeatureChip = { Icon: LucideIcon; label: string }
export type FeatureSection = { heading: string; body: string; image?: FeatureImage; Icon?: LucideIcon }
export type FeatureTile = { Icon: LucideIcon; title: string; body: string }

export type FeatureContent = {
  /** Breadcrumb eyebrow, e.g. "For your whole team". */
  eyebrow: string
  /** Hero H1. */
  title: string
  /** Hero sub-paragraph. */
  intro: string
  /** Small pill chips under the hero intro. */
  chips: FeatureChip[]
  /** Hero visual. In the showcase template an `image` renders as a screenshot;
   *  otherwise (and always in the simple template header) the `Icon` is shown. */
  hero: { Icon: LucideIcon; image?: FeatureImage }
  /** "What it is" block. */
  whatItIs: { heading: string; body: string }
  /** "The benefits" — plain outcome statements. */
  outcomes: string[]
  /** "How it works" — narrative sections (with optional per-section screenshots). */
  howItWorks: { heading: string; intro: string; sections: FeatureSection[] }
  /** "At a glance" bullet list. */
  keyPoints: string[]
  /** Sidebar cards next to the key points. */
  sidebar: FeatureTile[]
  /** "Why it works" teal band — four delivery tiles. */
  whyItWorks: { heading: string; intro: string; tiles: FeatureTile[] }
  faqs: FeatureFaq[]
  cta: { heading: string; sub: string }
}

// ─── Shared building blocks ──────────────────────────────────────────────────

function Hero({ content, showImage }: { content: FeatureContent; showImage: boolean }) {
  const { hero } = content
  const HeroIcon = hero.Icon
  return (
    <section className="relative overflow-hidden bg-hero-gradient">
      <div className="absolute inset-0 dot-mesh" />
      <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/5" />
      <div className="absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full bg-teal/30" />
      <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: 'linear-gradient(to bottom right, transparent 49.5%, #fff 50%)' }} />
      <div className="relative mx-auto max-w-content px-6 pb-24 pt-20 md:pb-28 md:pt-24">
        <div className={showImage ? 'grid items-center gap-10 lg:grid-cols-[1fr_1.15fr]' : 'mx-auto max-w-content text-center'}>
          <div>
            <div className={`mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/60 ${showImage ? '' : 'justify-center'}`}>
              <Link href="/pricing" className="hover:text-white">Features</Link>
              <span>/</span>
              <span className="text-white/80">{content.eyebrow}</span>
            </div>
            <h1 className={`mb-5 text-4xl font-extrabold leading-tight text-white md:text-5xl ${showImage ? 'max-w-xl' : ''}`}>
              {content.title}
            </h1>
            <p className={`mb-8 text-lg leading-relaxed text-white/75 ${showImage ? 'max-w-xl' : ''}`}>
              {content.intro}
            </p>
            <div className={`mb-8 flex flex-wrap gap-2 ${showImage ? '' : 'justify-center'}`}>
              {content.chips.map(({ Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white">
                  <Icon size={13} /> {label}
                </span>
              ))}
            </div>
            <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap ${showImage ? '' : 'justify-center'}`}>
              <Link href="/demo" className="btn-amber rounded-btn px-8 py-4 text-sm">Book a Demo</Link>
              <Link href="/register" className="btn-ghost-white rounded-btn px-8 py-4 text-sm">Start Free Trial</Link>
            </div>
          </div>
          {showImage && (
            <div className="overflow-hidden rounded-2xl shadow-elevated ring-1 ring-white/10">
              {hero.image ? (
                <SiteImage
                  src={hero.image.src}
                  alt={hero.image.alt}
                  width={1200}
                  height={760}
                  priority
                  sizes="(max-width:1024px) 100vw, 55vw"
                  className="h-auto w-full"
                />
              ) : (
                <div className="flex aspect-[16/10] w-full items-center justify-center bg-teal-gradient">
                  <HeroIcon size={72} className="text-white/80" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function WhatItIs({ content }: { content: FeatureContent }) {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-content px-6">
        <SectionLabel>What It Is</SectionLabel>
        <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">{content.whatItIs.heading}</h2>
        <p className="text-lg leading-relaxed text-neutral-mid">{content.whatItIs.body}</p>
      </div>
    </section>
  )
}

function Benefits({ content }: { content: FeatureContent }) {
  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <SectionLabel>The Benefits</SectionLabel>
        <h2 className="mb-12 text-4xl font-extrabold leading-tight text-neutral-dark">What it means for your service:</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {content.outcomes.map((o) => (
            <div key={o} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
              <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-teal" />
              <span className="leading-relaxed text-neutral-dark">{o}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function KeyPointsAndSidebar({ content }: { content: FeatureContent }) {
  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionLabel>At A Glance</SectionLabel>
            <h2 className="mb-6 text-3xl font-extrabold leading-tight text-neutral-dark">The essentials, in one place.</h2>
            <ul className="space-y-3">
              {content.keyPoints.map((k) => (
                <li key={k} className="flex items-start gap-3 text-lg leading-relaxed text-neutral-mid">
                  <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-teal" />
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            {content.sidebar.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className="mb-3 flex items-center gap-2"><Icon size={18} className="text-teal" /><p className="font-bold text-neutral-dark">{title}</p></div>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function WhyItWorks({ content }: { content: FeatureContent }) {
  return (
    <section className="bg-teal-gradient py-24">
      <div className="mx-auto max-w-content px-6">
        <SectionLabel light>Why It Works</SectionLabel>
        <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white">{content.whyItWorks.heading}</h2>
        <p className="mb-14 max-w-2xl text-lg leading-relaxed text-white/80">{content.whyItWorks.intro}</p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {content.whyItWorks.tiles.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20"><Icon size={18} className="text-white" /></div>
              <h3 className="mb-2 font-bold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-white/75">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/how-it-works" className="inline-flex items-center gap-2 font-semibold text-white hover:underline">
            See how CareStream works <ArrowRight size={16} />
          </Link>
          <Link href="/care-policies" className="inline-flex items-center gap-2 font-semibold text-white/80 hover:underline">
            <FileText size={16} /> Built from your own policies
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Template 1: image-rich showcase ─────────────────────────────────────────

export function FeatureShowcasePage({ content }: { content: FeatureContent }) {
  return (
    <>
      <Hero content={content} showImage />
      <WhatItIs content={content} />
      <Benefits content={content} />

      {/* How it works — alternating text / screenshot rows */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">{content.howItWorks.heading}</h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">{content.howItWorks.intro}</p>
          <div className="space-y-14 lg:space-y-20">
            {content.howItWorks.sections.map((s, i) => {
              const flip = i % 2 === 1
              const HeroIcon = content.hero.Icon
              return (
                <div key={s.heading} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                  <div className={flip ? 'lg:order-2' : ''}>
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-2xl font-bold text-neutral-dark">{s.heading}</h3>
                    </div>
                    <p className="text-lg leading-relaxed text-neutral-mid">{s.body}</p>
                  </div>
                  <div className={flip ? 'lg:order-1' : ''}>
                    {s.image ? (
                      <div className="overflow-hidden rounded-2xl shadow-elevated ring-1 ring-gray-100">
                        <SiteImage
                          src={s.image.src}
                          alt={s.image.alt}
                          width={1200}
                          height={760}
                          sizes="(max-width:1024px) 100vw, 50vw"
                          className="h-auto w-full"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-neutral-light ring-1 ring-gray-100">
                        <HeroIcon size={56} className="text-teal/30" />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <KeyPointsAndSidebar content={content} />
      <WhyItWorks content={content} />
      <HomeFaq faqs={content.faqs} />
      <PageCta
        heading={content.cta.heading}
        sub={content.cta.sub}
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}

// ─── Template 2: light / no-image ────────────────────────────────────────────

export function FeatureSimplePage({ content }: { content: FeatureContent }) {
  return (
    <>
      <Hero content={content} showImage={false} />
      <WhatItIs content={content} />
      <Benefits content={content} />

      {/* How it works — compact numbered grid, no screenshots */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">{content.howItWorks.heading}</h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">{content.howItWorks.intro}</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {content.howItWorks.sections.map((s, i) => {
              const SectionIcon = s.Icon
              return (
                <div key={s.heading} className="rounded-2xl border border-gray-100 bg-neutral-light p-7">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {SectionIcon && <SectionIcon size={20} className="text-teal" />}
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-neutral-dark">{s.heading}</h3>
                  <p className="leading-relaxed text-neutral-mid">{s.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <KeyPointsAndSidebar content={content} />
      <WhyItWorks content={content} />
      <HomeFaq faqs={content.faqs} />
      <PageCta
        heading={content.cta.heading}
        sub={content.cta.sub}
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DB-driven feature pages
//
// The platform "Features pages" tab stores a serializable copy object (no icon
// components — those aren't JSON). featureContentFromData() rehydrates it into a
// FeatureContent, assigning icons deterministically from curated sets so the page
// looks varied without anyone having to pick icons. Editors only edit words + FAQs.
// ─────────────────────────────────────────────────────────────────────────────

export type FeaturePageContent = {
  eyebrow: string
  intro: string
  chips: string[]
  whatItIs: { heading: string; body: string }
  outcomes: string[]
  howItWorks: { heading: string; intro: string; sections: Array<{ heading: string; body: string }> }
  keyPoints: string[]
  sidebar: Array<{ title: string; body: string }>
  whyItWorks: { heading: string; intro: string; tiles: Array<{ title: string; body: string }> }
  cta: { heading: string; sub: string }
}

// A blank content object — the shape the platform editor starts from.
export const EMPTY_FEATURE_CONTENT: FeaturePageContent = {
  eyebrow: '', intro: '', chips: [],
  whatItIs: { heading: '', body: '' },
  outcomes: [],
  howItWorks: { heading: '', intro: '', sections: [] },
  keyPoints: [],
  sidebar: [],
  whyItWorks: { heading: '', intro: '', tiles: [] },
  cta: { heading: '', sub: '' },
}

const CHIP_ICONS: LucideIcon[] = [Sparkles, Globe, Clock, Users, ShieldCheck]
const SECTION_ICONS: LucideIcon[] = [Zap, MessageSquare, GraduationCap, FileText, HeartHandshake, Settings2, BookOpen, Search]
const SIDEBAR_ICONS: LucideIcon[] = [Users, ShieldCheck, Lock, Bell]
const TILE_ICONS: LucideIcon[] = [Sparkles, Gauge, Globe, Star, Wand2, Zap]
const at = <T,>(arr: T[], i: number): T => arr[i % arr.length]

// Rehydrate stored content (+ title + faqs) into a render-ready FeatureContent.
export function featureContentFromData(
  title: string,
  raw: Partial<FeaturePageContent> | null | undefined,
  faqs: Array<{ question: string; answer: string }>,
): FeatureContent {
  const c = { ...EMPTY_FEATURE_CONTENT, ...(raw ?? {}) }
  return {
    eyebrow: c.eyebrow || 'Feature',
    title,
    intro: c.intro,
    chips: (c.chips ?? []).slice(0, 4).map((label, i) => ({ Icon: at(CHIP_ICONS, i), label })),
    hero: { Icon: Layers },
    whatItIs: c.whatItIs ?? { heading: '', body: '' },
    outcomes: c.outcomes ?? [],
    howItWorks: {
      heading: c.howItWorks?.heading ?? '',
      intro: c.howItWorks?.intro ?? '',
      sections: (c.howItWorks?.sections ?? []).map((s, i) => ({ heading: s.heading, body: s.body, Icon: at(SECTION_ICONS, i) })),
    },
    keyPoints: c.keyPoints ?? [],
    sidebar: (c.sidebar ?? []).map((s, i) => ({ Icon: at(SIDEBAR_ICONS, i), title: s.title, body: s.body })),
    whyItWorks: {
      heading: c.whyItWorks?.heading ?? '',
      intro: c.whyItWorks?.intro ?? '',
      tiles: (c.whyItWorks?.tiles ?? []).map((t, i) => ({ Icon: at(TILE_ICONS, i), title: t.title, body: t.body })),
    },
    faqs: faqs ?? [],
    cta: c.cta ?? { heading: '', sub: '' },
  }
}
