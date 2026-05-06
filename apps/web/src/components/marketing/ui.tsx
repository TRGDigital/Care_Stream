import Link from 'next/link'

// ─── Section label ────────────────────────────────────────────────────────────

export function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`section-label mb-3 ${light ? 'text-white/50' : 'text-teal'}`}>{children}</p>
  )
}

// ─── Inner page hero ──────────────────────────────────────────────────────────

export function PageHero({
  label,
  title,
  subtitle,
  centered = false,
}: {
  label?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  centered?: boolean
}) {
  return (
    <section className="relative overflow-hidden bg-hero-gradient">
      <div className="absolute inset-0 dot-mesh" />
      <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/5" />
      <div className="absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full bg-teal/30" />
      {/* Wave */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16"
        style={{ background: 'linear-gradient(to bottom right, transparent 49.5%, #fff 50%)' }}
      />
      <div className={`relative mx-auto max-w-content px-6 pb-14 pt-20 md:pt-24 ${centered ? 'text-center' : ''}`}>
        {label && <SectionLabel light>{label}</SectionLabel>}
        <h1 className={`mb-4 text-4xl font-extrabold leading-tight text-white md:text-5xl ${centered ? '' : 'max-w-3xl'}`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`text-lg leading-relaxed text-white/75 ${centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>
            {subtitle}
          </p>
        )}
      </div>
    </section>
  )
}

// ─── Dark hero (for pages that suit a dark/neutral-dark bg) ──────────────────

export function PageHeroDark({
  label,
  title,
  subtitle,
}: {
  label?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
}) {
  return (
    <section className="relative overflow-hidden bg-neutral-dark py-20 md:py-24">
      <div className="pointer-events-none absolute -right-32 -top-20 h-[400px] w-[400px] rounded-full border border-white/5" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-[240px] w-[240px] rounded-full bg-teal/10" />
      <div className="relative mx-auto max-w-content px-6">
        {label && <SectionLabel light>{label}</SectionLabel>}
        <h1 className="mb-4 max-w-3xl text-4xl font-extrabold leading-tight text-white md:text-5xl">{title}</h1>
        {subtitle && <p className="max-w-2xl text-lg leading-relaxed text-white/70">{subtitle}</p>}
      </div>
    </section>
  )
}

// ─── Bottom CTA ───────────────────────────────────────────────────────────────

export function PageCta({
  heading,
  sub,
  primary = { href: '/demo', label: 'Book a Free Demo' },
  secondary,
}: {
  heading: string
  sub?: string
  primary?: { href: string; label: string }
  secondary?: { href: string; label: string }
}) {
  return (
    <section className="relative overflow-hidden bg-hero-gradient py-24 text-center">
      <div className="absolute inset-0 dot-mesh" />
      <div className="absolute -left-24 top-0 h-[350px] w-[350px] rounded-full bg-white/5" />
      <div className="absolute -right-16 bottom-0 h-[280px] w-[280px] rounded-full bg-teal/30" />
      <div className="relative mx-auto max-w-3xl px-6">
        <h2 className="mb-5 text-3xl font-extrabold text-white md:text-4xl">{heading}</h2>
        {sub && <p className="mb-10 text-lg text-white/70">{sub}</p>}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          {primary && (
            <Link href={primary.href} className="btn-amber rounded-btn px-9 py-4 text-sm">
              {primary.label}
            </Link>
          )}
          {secondary && (
            <Link href={secondary.href} className="btn-ghost-white rounded-btn px-9 py-4 text-sm">
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Mockup placeholder ───────────────────────────────────────────────────────

export function MockupPlaceholder({ label, aspect = 'aspect-video' }: { label: string; aspect?: string }) {
  return (
    <div className={`${aspect} w-full overflow-hidden rounded-2xl border border-teal/15 bg-gradient-to-br from-teal-light to-white shadow-elevated flex items-center justify-center`}>
      <div className="text-center p-6">
        <div className="mb-2 text-3xl opacity-30">🖼</div>
        <p className="text-xs font-medium text-teal/50">{label}</p>
      </div>
    </div>
  )
}
