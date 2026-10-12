import { faqSlug, type FaqV2Item } from '@/lib/faq-v2'
import { FaqCtaLink, FaqOfferNote } from './faq-v2-client'
import { lf } from '@/lib/landing-fixes'
import './faq-v2.css'

// FAQ v2 (lib/faq-v2.ts): one question set under the buy box. The first three answers are open
// as short answer-first blocks, the rest are an accordion. Every item is a <details> inside
// .pxfaq, so the Funnel Insights tracker records faq-q:side:<question slug> when one is opened,
// and each answer ends with one next step carrying data-fi="faq-cta:<step>:<question slug>".
export function FaqV2({ items, slug, open = 3 }: { items: FaqV2Item[]; slug: string; open?: number }) {
  const top = items.slice(0, open)
  const rest = items.slice(open)
  const item = (x: FaqV2Item, isOpen: boolean) => {
    const s = faqSlug(x.q)
    return (
      <details key={x.id} open={isOpen} className={isOpen ? 'fq2-open' : undefined} data-faq={x.id}
               {...(x.added ? lf(`faq-${x.id}`, 'new question') : {})}>
        <summary>{x.q}</summary>
        <div className="fq2-a">
          <p><b>{x.lead}</b> {x.body}</p>
          {x.offer && <FaqOfferNote slug={slug} />}
          <FaqCtaLink cta={x.cta} qSlug={s} />
        </div>
      </details>
    )
  }
  return (
    <div className="pxfaq fq2" id="faq">
      <h3>Questions before you buy</h3>
      <div className="fq2-top">{top.map(x => item(x, true))}</div>
      {rest.length > 0 && (
        <div className="fq2-more">
          <p className="fq2-more-h">Other questions</p>
          {rest.map(x => item(x, false))}
        </div>
      )}
    </div>
  )
}

const Plus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
)

/** "More questions" at the bottom of every course page (faqV2BottomItems): the page's own .mfaq
 *  accordion, so the tracker records faq-q:bottom:<question slug>. */
export function FaqV2Bottom({ items }: { items: FaqV2Item[] }) {
  return (
    <section className="msec tint">
      <div className="mwrap msec-in mnarrow mfaq fq2-bottom">
        <span className="mlabel">Questions</span>
        <h2>More questions.</h2>
        {items.map(x => (
          <details key={x.id} data-faq={x.id}>
            <summary>{x.q}<Plus /></summary>
            <div className="ans">
              <p><b>{x.lead}</b> {x.body}</p>
              <FaqCtaLink cta={x.cta} qSlug={faqSlug(x.q)} />
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
