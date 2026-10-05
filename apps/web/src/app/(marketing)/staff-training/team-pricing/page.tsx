import Link from 'next/link'
import { pageMetadata } from '@/lib/page-meta'
import { DISCOUNT_TIERS, gbp } from '@/lib/training-commerce'
import { ShopInfoPage, getUnitPence } from '@/components/marketing/shop-info'

// Training team prices: the same volume tiers the basket and Stripe charge (training-commerce.ts),
// with the licence price read from the API, so the table is always the price paid.

export const revalidate = 300

export const generateMetadata = () => pageMetadata('/staff-training/team-pricing', {
  title: 'Team Pricing for Care Staff Training | CareStreamAI',
  description: 'One licence per member of staff, with up to 40% off for larger teams. See the price per licence for every team size, get a quote for several homes, or pay by invoice.',
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

      <h2>How team pricing works</h2>
      <ul className="si-ticks">
        <li>The discount is worked out on the total number of licences in your order, across every course, and applied automatically in your basket.</li>
        <li>If an <Link href="/offers">offer</Link> is running you get whichever saving is bigger, plus any free licences it gives.</li>
        <li>You allocate each licence to a member of staff from your dashboard. Each licence lasts 12 months.</li>
        <li>Any licence that has not been started can be refunded in full within 14 days. See <Link href="/refunds">refunds and guarantee</Link>.</li>
      </ul>

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
