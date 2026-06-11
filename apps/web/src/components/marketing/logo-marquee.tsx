import { SiteImage } from '@/components/site-image'
import { CUSTOMER_LOGOS } from '@/lib/customer-logos'

// Auto-scrolling customer logo strip. Greyscale by default; colour pops on hover.
// Pauses on hover. Pure CSS animation (keyframe `marquee` in globals.css).
export function LogoMarquee() {
  const logos = CUSTOMER_LOGOS
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-content px-6">
        <p className="mb-8 text-center text-xs font-bold uppercase tracking-widest text-neutral-mid/70">
          Trusted by care providers across the UK
        </p>
        <div className="group relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent sm:w-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent sm:w-20" />
          <div className="flex w-max animate-[marquee_45s_linear_infinite] items-center group-hover:[animation-play-state:paused]">
            {[...logos, ...logos].map((logo, i) => (
              <div key={i} className="relative mx-6 h-14 w-[160px] flex-shrink-0 sm:mx-9 sm:h-16 sm:w-[190px]">
                <SiteImage
                  src={logo.src}
                  alt={logo.name}
                  fill
                  sizes="190px"
                  className="object-contain opacity-70 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
