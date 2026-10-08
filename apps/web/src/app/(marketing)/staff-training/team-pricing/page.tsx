import Link from 'next/link'
import { pageMetadata } from '@/lib/page-meta'
import { DISCOUNT_TIERS, gbp } from '@/lib/training-commerce'
import { ShopInfoPage, getUnitPence } from '@/components/marketing/shop-info'
import { BUNDLES } from '@/lib/bundle-rules'

// Training team prices: the same volume tiers the basket and Stripe charge (training-commerce.ts),
// with the licence price read from the API, so the table is always the price paid.

export const revalidate = 300

export const generateMetadata = () => pageMetadata('/staff-training/team-pricing', {
  title: 'Team Pricing for Care Staff Training | CareStreamAI',
  description: 'Care staff training from £25.99 per licence, up to 40% off for larger teams, or CPD course bundles from £139 per learner. See every price, get a quote or pay by invoice.',
})

export default async function TeamPricingPage() {
  const unit = await getUnitPence()
  const tiers = [{ min: 1, pct: 0 }, ...[...DISCOUNT_TIERS].reverse()]
  const each = (pct: number) => Math.round(unit * (1 - pct / 100))
  const examples = [10, 25, 50, 100].map(q => {
    const pct = [...DISCOUNT_TIERS].find(t => q >= t.min)?.pct ?? 0
    return { q, pct, total: each(pct) * q }
  })
  return (
    <ShopInfoPage
      path="/staff-training/team-pricing"
      eyebrow="Team pricing"
      title="Team pricing for care staff training"
      lead={<>One licence per member of staff, {gbp(unit)} each, and the more you buy the less each one costs. No subscription and no minimum order.</>}
    >
      <div className="si-card">
        <table>
          <thead><tr><th>Licences in your order</th><th>Discount</th><th className="r">Price per licence</th></tr></thead>
          <tbody>
            {tiers.map((t, i) => {
              const next = tiers[i + 1]
              return (
                <tr key={t.min}>
                  <td>{next ? `${t.min} to ${next.min - 1}` : `${t.min} or more`}</td>
                  <td>{t.pct ? <span className="si-off">{t.pct}% off</span> : 'Standard price'}</td>
                  <td className="r"><b>{gbp(each(t.pct))}</b></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="si-note">Prices include everything: the course, the knowledge assessment, a certificate for each learner who passes, and your manager dashboard.</p>
      </div>

      <h2>What a team costs</h2>
      <div className="si-grid">
        {examples.map(x => (
          <div className="si-card" key={x.q}>
            <h3>{x.q} staff</h3>
            <p style={{ margin: 0 }}><b>{gbp(x.total)}</b> in total{x.pct ? <>, <span className="si-off">{x.pct}% off</span></> : ''}</p>
          </div>
        ))}
      </div>

      <h2>CPD course bundles</h2>
      <p>For a whole year of mandatory training, a bundle is one price per learner for a set of CPD Certified courses.</p>
      <div className="si-grid">
        {Object.values(BUNDLES).map(b => (
          <div className="si-card" key={b.key}>
            <h3>{b.name}</h3>
            <p style={{ margin: '0 0 6px' }}><b>{gbp(b.pence)}</b> per learner <span className="si-off">save {Math.round((1 - b.pence / (unit * b.slugs.length)) * 100)}%</span></p>
            <p style={{ margin: 0 }}>{b.key === 'complete'
              ? `For new starters: the Care Certificate and all ${b.slugs.length - 1} annual refreshers, ${b.slugs.length} courses in all, instead of ${gbp(unit * b.slugs.length)} as single courses.`
              : `For existing staff: all ${b.slugs.length} annual refreshers, instead of ${gbp(unit * b.slugs.length)} as single courses.`}</p>
          </div>
        ))}
      </div>
      <p className="si-note">You always get the best price. If an offer or the team discount on single courses works out cheaper for your team than a bundle, that is what you pay. <Link href="/staff-training/cpd-courses?intent=bundles">See the bundles and the ten CPD courses</Link>.</p>

      <h2>Which works out cheaper?</h2>
      <ul className="si-ticks">
        <li><b>One or two courses for a few people:</b> single licences at {gbp(unit)} each.</li>
        <li><b>The same course for a large team:</b> single licences, with the team discount on 10 or more.</li>
        <li><b>Every annual refresher for each member of staff:</b> the Annual refresher bundle, {gbp(BUNDLES.refresher.pence)} per learner.</li>
        <li><b>New starters:</b> the Complete CPD bundle, {gbp(BUNDLES.complete.pence)} per learner, which includes the Care Certificate.</li>
      </ul>

      <h2>How team pricing works</h2>
      <ul className="si-ticks">
        <li>The discount is worked out on the total number of licences in your order, across every course, and applied automatically in your basket.</li>
        <li>If an <Link href="/offers">offer</Link> is running you get whichever saving is bigger, plus any free licences it gives.</li>
        <li>You allocate each licence to a member of staff from your dashboard. Each licence lasts 12 months.</li>
        <li>Any licence that has not been started can be refunded in full within 14 days. See <Link href="/refunds">refunds and guarantee</Link>.</li>
      </ul>

      <h2>Questions about pricing</h2>
      {[
        ['Is there a subscription?', `No. You pay once for each licence, ${gbp(unit)} each before any discount, or once per learner for a bundle. Nothing renews automatically.`],
        ['How long does a licence last?', 'Twelve months from purchase. Most care training is refreshed every year, and we email you before your licences are due for renewal.'],
        ['Can I buy training just for myself?', 'Yes. Leave the organisation name blank at checkout, then allocate the licence to yourself from your dashboard.'],
        ['Do the team discount and an offer add together?', 'No. You get whichever saving is bigger, plus any free licences an offer gives. Bundles are a fixed price and do not take further discounts, but if single courses would cost less, you pay the lower price.'],
        ['Can we pay by invoice or purchase order?', 'Yes. Ask for an invoice at checkout, or get a quote below and pay by bank transfer.'],
        ['What is included in the price?', 'The full course on any phone or computer in over 60 languages, the knowledge assessment, a certificate for everyone who passes (with the CPD mark on our CPD Certified courses), and the manager dashboard to track it all.'],
      ].map(([q, a]) => (
        <details key={q} className="si-card" style={{ marginBottom: 8 }}><summary style={{ fontWeight: 700, cursor: 'pointer' }}>{q}</summary><p style={{ margin: '8px 0 0' }}>{a}</p></details>
      ))}

      <h2>Several homes, or paying by invoice</h2>
      <div className="si-card hl">
        <p>Training a large team, a group of homes, or need to pay by invoice or purchase order? Tell us how many staff and which courses, and we will send a quote.</p>
        <div className="si-actions">
          <Link className="si-btn" href={`/contact?about=${encodeURIComponent('Training quote for a team')}`}>Get a quote</Link>
          <Link className="si-btn ghost" href="/staff-training">Browse courses</Link>
        </div>
      </div>
    </ShopInfoPage>
  )
}
