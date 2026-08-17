'use client'

// Sticky course bar for the course pages (/staff-training/[slug] and /go/[slug]).
// Slides in under the top navigation once the visitor has scrolled past the hero,
// keeping the course identity and the primary CTA on screen while they read:
// thumbnail · course title · time to complete · Save · Start course now.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Clock, GraduationCap } from 'lucide-react'
import { SaveCourseButton } from './save-course-button'

export function CourseStickyBar({
  slug,
  title,
  href,
  durationLabel,
  priceLabel,
  imageUrl,
  ctaLabel = 'Start course now',
  // The marketing nav is sticky and 72px tall; the /go pages have no sticky nav.
  topClassName = 'top-[72px]',
  className = '',
}: {
  slug: string
  title: string
  href: string
  durationLabel: string
  priceLabel?: string
  imageUrl?: string | null
  ctaLabel?: string
  topClassName?: string
  className?: string
}) {
  const sentinel = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  // Reveal the bar only once the sentinel (sitting just below the hero) has
  // scrolled off the TOP of the viewport — never on first paint, and never
  // when the visitor scrolls back up into the hero.
  useEffect(() => {
    const el = sentinel.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px w-full" />
      <div
        className={`fixed inset-x-0 ${topClassName} z-40 transition-all duration-300 ease-out ${
          show ? 'translate-y-0 opacity-100' : 'invisible -translate-y-full opacity-0'
        } ${className}`}
      >
        <div className="bg-neutral-dark shadow-elevated">
          <div className="mx-auto flex max-w-content items-center gap-3 px-4 py-2.5 md:gap-5 md:px-6">
            {/* Course thumbnail */}
            <div className="hidden h-12 w-[4.5rem] flex-shrink-0 overflow-hidden rounded-md bg-white/10 sm:block">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <GraduationCap size={22} className="text-white/60" />
                </div>
              )}
            </div>

            {/* Title + meta */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight text-white md:text-base">{title}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/70">
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={12} className="flex-shrink-0" /> {durationLabel} to complete
                </span>
                {priceLabel && (
                  <>
                    <span aria-hidden className="text-white/30">•</span>
                    <span className="hidden sm:inline">{priceLabel}</span>
                  </>
                )}
              </p>
            </div>

            <SaveCourseButton slug={slug} title={title} variant="dark" />

            <Link
              href={href}
              className="flex-shrink-0 rounded-btn bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700 md:px-7"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
