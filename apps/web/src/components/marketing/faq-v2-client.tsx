'use client'

import { useOffers, licenceOffer, endsText, offerEmoji } from '@/lib/offers'
import { CTA_KEY, CTA_LABEL, type FaqCta } from '@/lib/faq-v2'

// The two next steps an FAQ v2 answer ends with (lib/faq-v2.ts). Real links, so they work before
// the page's JavaScript has loaded: #real-lesson and #team-price. With JavaScript, each JUMPS to
// its block (no overlay, no smooth scroll: the page sets scroll-behavior:smooth, which some phones
// drop part way) and highlights it for a moment. "Try a real lesson" first switches the hero
// gallery to its real lesson view (HeroGallery listens for cs-show-lesson). The server only uses
// "Try a real lesson" where that view exists; otherwise the answer ends with the team price.

function jumpTo(el: HTMLElement) {
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: 'instant' as ScrollBehavior })
  el.classList.remove('fq2-flash')
  void el.offsetWidth
  el.classList.add('fq2-flash')
}

const shown = (el: HTMLElement | null): el is HTMLElement => !!el && el.offsetHeight > 0

export function FaqCtaLink({ cta, qSlug }: { cta: FaqCta; qSlug: string }) {
  const id = cta === 'try' ? 'real-lesson' : 'team-price'
  return (
    <a className={`fq2-cta fq2-cta-${cta}`} href={`#${id}`}
       data-fi={`faq-cta:${CTA_KEY[cta]}:${qSlug}`}
       onClick={e => {
         if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
         if (cta === 'try') {
           // Desktop: the hero gallery, switched to its real lesson view. Phones hide the hero
           // gallery, so there it is the real lesson shown further down the page.
           const gallery = document.getElementById('real-lesson')
           const target = shown(gallery) ? gallery : document.getElementById('real-lesson-inline')
           if (!shown(target)) return
           e.preventDefault()
           if (target === gallery) {
             window.dispatchEvent(new Event('cs-show-lesson'))
             // after the gallery has switched view, so the jump lands on the lesson's real height
             setTimeout(() => jumpTo(target), 30)
           } else jumpTo(target)
           return
         }
         const el = document.getElementById(id)
         if (!el) return
         e.preventDefault()
         jumpTo(el)
       }}>
      {CTA_LABEL[cta]} <span aria-hidden="true">→</span>
    </a>
  )
}

/** The live offer in one line under the team price answer, from the offer engine. Nothing when no
 *  offer is running, so the answer can never outlive the offer. */
export function FaqOfferNote({ slug }: { slug: string }) {
  const offers = useOffers()
  const o = licenceOffer(offers, slug)
  if (!o) return null
  return (
    <p className="fq2-offer">
      <span aria-hidden="true">{offerEmoji(o)}</span> <b>{o.label ?? o.name}:</b> {o.headline ?? ''} <small>{endsText(o)}</small>
    </p>
  )
}
