import Link from 'next/link'
import { pageMetadata } from '@/lib/page-meta'
import { getActiveOffers } from '@/lib/offers-server'
import { isLive, type Offer } from '@/lib/offer-rules'
import { ShopInfoPage } from '@/components/marketing/shop-info'
import { FREE_CPD_LIVE, CPD_TOPIC_SLUGS } from '@/lib/free-cpd'

// Current offers, read from the same offer calendar the shop charges from (Funnel Insights
// › Offers, synced hourly), so this page can never promise an offer the basket will not give.

export const revalidate = 60

export const generateMetadata = () => pageMetadata('/offers', {
  title: 'Free CPD Training, Free Audits and Current Offers | CareStreamAI',
  description: 'The offers running now on CareStreamAI care staff training and care policies, what each one gives you and when it ends. Applied automatically in your basket.',
})

const titleOf = (slug: string) => slug.split('-').map(w => w[0]!.toUpperCase() + w.slice(1)).join(' ')
const ends = (o: Offer) => new Date(`${o.ends_on}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

function where(o: Offer): { href: string; label: string }[] {
  if (o.range === 'policies' || o.products.includes('all-policies') || o.products.includes('all-packs')) return [{ href: '/care-policies', label: 'Browse care policies' }]
  return o.products.map(s => ({ href: `/staff-training/${s}`, label: `${titleOf(s)} training` }))
}

export default async function OffersPage() {
  // While the CPD courses are free, a licence offer on them has nothing to sell: only offers that still apply
  // to something paid are shown.
  const offers = (await getActiveOffers()).filter(o => isLive(o)).filter(o =>
    !(FREE_CPD_LIVE && o.range === 'training' && o.products.length > 0 && o.products.every(p => (CPD_TOPIC_SLUGS as readonly string[]).includes(p))))
  const trainingOffer = offers.some(o => o.range === 'training' || o.range === 'both')
  return (
    <ShopInfoPage
      path="/offers"
      eyebrow="Offers"
      title="Free training and audits first, then the offers"
      lead="Every offer here is applied automatically in your basket. There is no code to enter, and with a team discount as well you always get whichever saving is bigger."
    >
      <div className="si-card hl">
        <span className="si-tag">Free on every plan</span>
        <h3>CPD certified training, every audit and your first five policies: free</h3>
        <p>The Care Certificate and every annual refresher are free for every member of staff. Every audit in the library is free to run, and your first five policies are screened free. No card needed.</p>
        <div className="si-actions">
          <Link className="si-btn" href="/register?tier=free&source=offers">Create a free account</Link>
          <Link className="si-btn" href="/pricing">See what each plan adds</Link>
        </div>
      </div>
      {offers.length === 0 ? (
        <div className="si-card">
          <h3>No other offer is running right now</h3>
          <p>Written care policies are priced from {'\u00A3'}39 each, with the full price shown before you pay, and every order has the 14 day refund guarantee.</p>
          <Link href="/care-policies">Browse care policies</Link>
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
        <li>An offer and a team discount do not stack: you get whichever is worth more{trainingOffer ? ', plus any free licences the offer gives' : ''}.</li>
        {trainingOffer && <li>Free licences work exactly like paid ones: allocate one to each member of staff, and they last 12 months.</li>}
        <li>Every order is covered by our <Link href="/refunds">14 day refund guarantee</Link>.</li>
      </ul>
    </ShopInfoPage>
  )
}
