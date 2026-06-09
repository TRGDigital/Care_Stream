'use client'

import { useRef } from 'react'
import { SiteImage } from '@/components/site-image'
import {
  ArrowRight, ChevronLeft, ChevronRight,
  Home, Stethoscope, MapPin, Activity, Heart, Pill, Building2, ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { SETTINGS_LIST } from '@/lib/settings/list'

const ICONS: Record<string, LucideIcon> = {
  home: Home, stethoscope: Stethoscope, mapPin: MapPin, activity: Activity,
  heart: Heart, pill: Pill, building: Building2, shield: ShieldCheck,
}

// The three original settings have photography; the rest use a gradient + icon.
const IMAGES: Record<string, string> = {
  'residential-care': '/images/residential-care.jpg',
  'nursing-homes':    '/images/nursing-home.jpg',
  'domiciliary-care': '/images/domiciliary-care.jpg',
}

const GRADIENTS = [
  'from-teal to-teal-dark',
  'from-[#0A5F5F] to-[#0D4A6E]',
  'from-[#1A6B6B] to-[#0E5550]',
  'from-[#0E5550] to-[#0A3D4A]',
  'from-teal-dark to-[#0A5F5F]',
]

export function SettingsCarousel() {
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: number) => {
    const el = ref.current
    if (el) el.scrollBy({ left: dir * Math.min(900, el.clientWidth * 0.85), behavior: 'smooth' })
  }
  return (
    <div>
      {/* Scroll arrows */}
      <div className="mb-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-neutral-mid shadow-card transition-colors hover:border-teal hover:text-teal"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Scroll right"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-neutral-mid shadow-card transition-colors hover:border-teal hover:text-teal"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Scrollable track */}
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {SETTINGS_LIST.map(({ slug, label, description, iconKey }, i) => {
          const Icon = ICONS[iconKey] ?? Home
          const image = IMAGES[slug]
          const gradient = GRADIENTS[i % GRADIENTS.length]
          return (
            <a key={slug} href={`/${slug}`} className="group block w-[300px] flex-shrink-0 snap-start">
              {/* Image / gradient card */}
              <div className={`relative mb-5 aspect-[4/3] overflow-hidden rounded-2xl ${image ? '' : `bg-gradient-to-br ${gradient}`}`}>
                {image ? (
                  <SiteImage
                    src={image}
                    alt={label}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <>
                    <div className="dot-mesh absolute inset-0 opacity-40" />
                    <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
                    <div className="pointer-events-none absolute -bottom-10 -left-10 h-52 w-52 rounded-full bg-black/10" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon size={56} strokeWidth={1.5} className="text-white/90" />
                    </div>
                  </>
                )}
                <div className="absolute right-4 top-4 rounded-full bg-amber-brand px-4 py-1.5 text-xs font-bold text-white shadow-amber-glow transition-transform duration-200 group-hover:scale-105">
                  Explore
                </div>
              </div>

              {/* Text */}
              <h3 className="mb-2 text-lg font-bold text-neutral-dark transition-colors group-hover:text-teal">{label}</h3>
              <p className="mb-4 text-sm leading-relaxed text-neutral-mid">{description}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal transition-colors group-hover:text-teal-dark">
                Read more <ArrowRight size={14} />
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
