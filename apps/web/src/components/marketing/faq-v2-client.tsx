'use client'

import { useOffers, licenceOffer, endsText, offerEmoji } from '@/lib/offers'
import { CTA_KEY, CTA_LABEL, type FaqCta } from '@/lib/faq-v2'

// The two next steps an FAQ v2 answer ends with (lib/faq-v2.ts). Real links, so they work before
// the page's JavaScript has loaded: #real-lesson-inline (the "Try it" lesson on the page) and
// #team-price. With JavaScript, "Try a real lesson" opens the try before you buy preview over the
// page (TryBeforeYouBuy listens for cs-try-demo), and "See your team price" JUMPS to the team
// prices (no smooth scroll: the page sets scroll-behavior:smooth, which some phones drop part way)
// and highlights them for a moment. The server only uses "Try a real lesson" where the course has
// a demo lesson; otherwise the answer ends with the team price.

function jumpTo(el: HTMLElement) {
  // Clear of the sticky header and the course bar.
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: 'instant' as ScrollBehavior })
  el.classList.remove('fq2-flash')
  void el.offsetWidth
  el.classList.add('fq2-flash')
}

export function FaqCtaLink({ cta, qSlug }: { cta: FaqCta; qSlug: string }) {
  return (
    <a className={`fq2-cta fq2-cta-${cta}`} href={cta === 'try' ? '#real-lesson-inline' : '#team-price'}
       data-fi={`faq-cta:${CTA_KEY[cta]}:${qSlug}`}
       onClick={e => {
         if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
         if (cta === 'try') {
           if (!document.querySelector('.hg-try')) return // no preview button: follow the link
           e.preventDefault()
           window.dispatchEvent(new Event('cs-try-demo'))
           return
         }
         const el = document.getElementById('team-price')
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
