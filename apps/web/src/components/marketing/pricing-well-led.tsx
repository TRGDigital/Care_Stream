import { wellLedByPlan } from '@/lib/well-led-pricing'
import type { PricingView } from '@/lib/pricing-source'
import './pricing-well-led.css'

// The Well-led banner at the top of /pricing: the buyer's real question, and a strip per plan showing which Well-led evidence each plan includes.
// Plain server rendered markup. Wording rule: evidence FOR Well-led, never a rating, never "CQC compliant". No dashes in the copy.

const Tick = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7" /></svg>)

export function PricingWellLed({ view }: { view: Pick<PricingView, 'plans' | 'groups' | 'free'> }) {
  const strips = wellLedByPlan(view)
  return (
    <section className="pwl" aria-labelledby="pwl-h">
      <div className="pwrap pwl-in">
        <div className="pwl-head">
          <span className="pwl-tag"><i />CQC Well-led</span>
          <h2 id="pwl-h">What does it cost to show CQC you are well led?</h2>
          <p>Every plan builds evidence for CQC Well-led. Here is what each plan includes, so you can see which one gives you the evidence you need.</p>
        </div>
        <div className="pwl-plans">
          {strips.map(p => (
            <div key={p.name} className={`pwl-plan${p.highlight ? ' hi' : ''}`}>
              <div className="pwl-plan-h">
                <b>{p.name}</b>
                <span className="pwl-price">{p.price}</span>
                <span className="pwl-count">{p.included} of {p.total} Well-led products{p.items.some(x => x.limited) ? ` (plus ${p.items.filter(x => x.limited).length} in part)` : ''}</span>
              </div>
              <ul className="pwl-chips">
                {p.items.map(x => (
                  <li key={x.id} className={x.limited ? 'part' : x.included ? 'on' : 'off'}>
                    {x.limited ? <span className="pwl-half" aria-hidden="true" /> : x.included ? <span className="pwl-tick"><Tick /></span> : <span className="pwl-no" aria-hidden="true" />}
                    <span>{x.name}{x.limited && <em className="pwl-lim">{x.limited}</em>}</span>
                    {!x.included && <span className="pwl-sr"> (not included)</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pwl-foot">
          <a className="pcta solid" href="#plans">Compare the plans</a>
          <p>Evidence for Well-led, not a rating. Only CQC rates a service, and the judgement is always the inspector&apos;s.</p>
        </div>
      </div>
    </section>
  )
}
