import Link from 'next/link'
import { pageMetadata } from '@/lib/page-meta'
import { ShopInfoPage } from '@/components/marketing/shop-info'

// Refunds and guarantee: the same 14 day promises the course and policy pages make (the
// "Our guarantee" cards in module-page-v2 and policy-page-v2) and the checkout states. Change
// them together.

export const generateMetadata = () => pageMetadata('/refunds', {
  title: 'Refunds and Our 14 Day Guarantee | CareStreamAI',
  description: 'Any training licence not yet started, and any care policy that is not right for your service, refunded in full within 14 days. How to ask, and how long it takes.',
})

export default function RefundsPage() {
  return (
    <ShopInfoPage
      path="/refunds"
      eyebrow="Refunds and guarantee"
      title="Our 14 day guarantee"
      lead="Buying training or policies for your service should not be a risk. If something is not right, tell us within 14 days and we will put it right or refund you in full."
    >
      <div className="si-grid">
        <div className="si-card hl">
          <span className="si-tag">Staff training</span>
          <h3>Any licence not yet started</h3>
          <p style={{ margin: 0 }}>If a licence has not been started by a learner, tell us within 14 days of buying it and we refund that licence in full. You can refund one licence or the whole order.</p>
        </div>
        <div className="si-card hl">
          <span className="si-tag">Care policies</span>
          <h3>Any policy that is not right</h3>
          <p style={{ margin: 0 }}>If a policy is not right for your service, tell us within 14 days and we refund it in full. Every policy is read by a person before it carries your name.</p>
        </div>
      </div>

      <h2>How to ask for a refund</h2>
      <ul className="si-ticks">
        <li>Email <a href="mailto:hello@carestreamai.com">hello@carestreamai.com</a> or use our <Link href="/contact">contact form</Link>, from the email address you ordered with.</li>
        <li>Tell us which order, and which licences or policies you would like refunded. You do not need to give a reason.</li>
        <li>We refund to the card you paid with. Your bank usually shows it within 5 to 10 working days.</li>
      </ul>

      <h2>Good to know</h2>
      <ul className="si-ticks">
        <li>A training licence a learner has already started has been used, so it is not refundable. Licences you have not allocated, or that have not been opened, are.</li>
        <li>Free licences from an <Link href="/offers">offer</Link> come with the order they were given with, so refunding that order removes them too.</li>
        <li>Training licences last 12 months. There is no subscription to cancel.</li>
        <li>This guarantee is in addition to your rights in our <Link href="/terms">terms of service</Link>.</li>
      </ul>
    </ShopInfoPage>
  )
}
