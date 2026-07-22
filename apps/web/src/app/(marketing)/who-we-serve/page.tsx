import Link from 'next/link'
import {
  Home, Stethoscope, MapPin, Activity, Heart, Pill, Building2, ShieldCheck,
  ArrowRight, type LucideIcon,
} from 'lucide-react'
import { PageHero, PageCta } from '@/components/marketing/ui'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'
import { SETTINGS_LIST } from '@/lib/settings/list'
import { pageMetadata } from '@/lib/page-meta'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { WHO_WE_SERVE_SLOTS } from '@/lib/page-slots/who-we-serve'

// Overridable from the platform console (Blog → Pages / site_pages).
export const generateMetadata = () => pageMetadata('/who-we-serve', {
  title:       'Who We Serve | CareStreamAI',
  description: 'CareStream supports every kind of CQC-regulated service: residential and nursing homes, domiciliary, live-in and complex care, Shared Lives, hospices, rehabilitation, independent hospitals, GP and dental practices.',
})

const ICONS: Record<string, LucideIcon> = {
  home: Home, stethoscope: Stethoscope, mapPin: MapPin, activity: Activity,
  heart: Heart, pill: Pill, building: Building2, shield: ShieldCheck,
}

export default async function WhoWeServePage() {
  const s = makeSlot(WHO_WE_SERVE_SLOTS, await getContentSlots('/who-we-serve'))
  return (
    <>
      <PageHero
        label={s('header.label')}
        title={s('header.title')}
        subtitle={s('header.subtitle')}
      />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SETTINGS_LIST.map(({ slug, label, description, iconKey }) => {
              const Icon = ICONS[iconKey] ?? Home
              return (
                <Link
                  key={slug}
                  href={`/${slug}`}
                  className="card-lift group flex flex-col rounded-2xl border border-gray-100 bg-white p-7 shadow-card transition-colors hover:border-teal/30"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-light">
                    <Icon size={22} className="text-teal" />
                  </div>
                  <h2 className="mb-2 text-lg font-bold text-neutral-dark">{label}</h2>
                  <p className="mb-5 flex-1 text-sm leading-relaxed text-neutral-mid">{description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal">
                    Learn more <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <EditableContentBlock path="/who-we-serve" />

      <PageCta
        heading="Not sure if CareStream fits your service?"
        sub="If you are a CQC-regulated service, it almost certainly does. Book a demo and we will show you."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
