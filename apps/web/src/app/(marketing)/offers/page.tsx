import Link from 'next/link'
import { pageMetadata } from '@/lib/page-meta'
import { getActiveOffers } from '@/lib/offers-server'
import { isLive, type Offer } from '@/lib/offer-rules'
import { ShopInfoPage } from '@/components/marketing/shop-info'

// Current offers, read from the same offer calendar the shop charges from (Funnel Insights
// › Offers, synced hourly), so this page can never promise an offer the basket will not give.

export const revalidate = 60

export const generateMetadata = () => pageMetadata('/offers', {
  title: 'Current Offers on Care Training and Policies | CareStreamAI',
  description: 'The offers running now on CareStreamAI care staff training and care policies, what each one gives you and when it ends. Applied automatically in your basket.',
})

const titleOf = (slug: string) => slug.split('-').map(w => w[0]!.toUpperCase() + w.slice(1)).join(' ')
const ends = (o: Offer) => new Date(`${o.ends_on}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

function where(o: Offer): { href: string; label: string }[] {
  if (o.range === 'policies' || o.products.includes('all-policies') || o.products.includes('all-packs')) return [{ href: '/care-policies', label: 'Browse care policies' }]
  return o.products.map(s => ({ href: `/staff-training/${s}`, label: `${titleOf(s)} training` }))
}

export default async function OffersPage() {
  const offers = (await getActiveOffers()).filter(o => isLive(o))
  return (
    <ShopInfoPage
      path="/offers"
      eyebrow="Offers"
      title="Current offers on training and policies"
      lead="Every offer here is applied automatically in your basket. There is no code to enter, and with a team discount as well you always get whichever saving is bigger."
    >
      {offers.length === 0 ? (
        <div className="si-card">
          <h3>No offer is running right now</h3>
          <p>Team prices still apply on every course, from 10% off for 10 licences up to 40% off for 100 or more.</p>
          <Link href="/staff-training/team-pricing">See team pricing</Link>
        </div>
      ) : offers.map(o => (
        <div className="si-card hl" key={o.key}>
          {o.label && <span className="si-tag">{o.label}</span>}
          <h3>{o.headline || o.name}</h3>
          {o.multi_text && <p>{o.multi_text}</p>}
          <p className="si-ends">Ends {ends(o)}. {o.range === 'training' ? 'Training licences' : o.range === 'policies' ? 'Care policies' : 'Training and policies'}.</p>
          <div className="si-actions">
            {where(o).map(w => <Link className="si-btn" key={w.href} href={w.href}>{w.label}</Link>)}
          </div>
        </div>
      ))}
      <h2>How offers work</h2>
      <ul className="si-ticks">
        <li>The offer is added in your basket before you pay. You see the saving, or the free licences, on the order summary.</li>
        <li>An offer and a team discount do not stack: you get whichever is worth more, plus any free licences the offer gives.</li>
        <li>Free licences work exactly like paid ones: allocate one to each member of staff, and they last 12 months.</li>
        <li>Every order is covered by our <Link href="/refunds">14 day refund guarantee</Link>.</li>
      </ul>
    </ShopInfoPage>
  )
}
