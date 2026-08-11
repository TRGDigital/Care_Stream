import Link from 'next/link'

// In-content CTAs woven evenly through a blog post. The type is chosen per post
// in the admin editor; two copy variants per type keep repeated CTAs from reading
// identically. Rendered inside the prose article, so it carries `not-prose`.

export type BlogCtaType = 'book_demo' | 'buy_training' | 'discuss_training'
export const BLOG_CTA_TYPES: BlogCtaType[] = ['book_demo', 'buy_training', 'discuss_training']
export const BLOG_CTA_LABELS: Record<BlogCtaType, string> = {
  book_demo:        'Book a demo',
  buy_training:     'Buy training module',
  discuss_training: 'Discuss training module',
}

const CTAS: Record<BlogCtaType, {
  eyebrow: string
  button: string
  href: string
  variants: { title: string; sub: string }[]
}> = {
  book_demo: {
    eyebrow: 'See it in action',
    button: 'Book a demo',
    href: '/demo',
    variants: [
      { title: 'See CareStream in action', sub: 'Book a short demo and see how CareStream keeps your policies, training and CQC evidence in one place.' },
      { title: 'Ready to see it for yourself?', sub: 'A quick demo shows exactly how CareStream would work for your service. Book a time that suits you.' },
    ],
  },
  buy_training: {
    eyebrow: 'Staff training',
    button: 'See training plans',
    href: '/pricing',
    variants: [
      { title: 'Roll out training your team will actually finish', sub: 'CareStream turns your policies into role-based training with tracking and certificates. See the plans and get started.' },
      { title: 'Training that keeps you CQC-ready', sub: 'Assign, track and evidence staff training in minutes. Explore the plans and roll it out this week.' },
    ],
  },
  discuss_training: {
    eyebrow: 'Talk to us',
    button: 'Discuss your training',
    href: '/contact',
    variants: [
      { title: 'Not sure where to start with training?', sub: 'Tell us about your service and we will show you how CareStream can cover your training and compliance.' },
      { title: 'Let us tailor training to your service', sub: 'Have a chat with our team about the training and modules that fit your setting.' },
    ],
  },
}

export function BlogCta({ type, variant = 0 }: { type: string; variant?: number }) {
  const cfg = CTAS[type as BlogCtaType]
  if (!cfg) return null
  const v = cfg.variants[variant % cfg.variants.length] ?? cfg.variants[0]!
  return (
    <div className="not-prose my-10 rounded-xl border border-teal/20 bg-teal-light p-6 text-center sm:p-8">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-teal">{cfg.eyebrow}</p>
      <p className="mb-1.5 text-lg font-extrabold text-neutral-dark sm:text-xl">{v.title}</p>
      <p className="mx-auto mb-5 max-w-md text-sm leading-relaxed text-neutral-mid">{v.sub}</p>
      <Link
        href={cfg.href}
        className="btn-amber inline-flex items-center justify-center gap-2 rounded-btn px-6 py-2.5 text-sm"
      >
        {cfg.button} →
      </Link>
    </div>
  )
}
