// One-shot repricing (July 2026): new monthly + annual prices for all three plans,
// plus an Enterprise-only 20% "closing" coupon.
//
// Stripe prices are immutable, so this creates NEW price objects on the existing
// products, archives the old ones, and prints the new IDs (paste them back to wire
// into the DB + site). It does NOT touch the database. Safe to re-run.
//
// Run from apps/api:   STRIPE_SECRET_KEY=sk_live_... node scripts/repricing-2026-07.mjs
//
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Current LIVE monthly price ids (used only to find each plan's Stripe product).
const PLANS = [
  { name: 'Starter',      currentMonthly: 'price_1TggdzHRDUuy2XlaftdBwmTC', currentAnnual: 'price_1TmAoQHRDUuy2XlajyYe3pJk', monthlyPence: 8500,  annualPence: 85000  },
  { name: 'Professional', currentMonthly: 'price_1Tgg7OHRDUuy2XlaC8h2cq2n', currentAnnual: 'price_1TmAowHRDUuy2Xla8EUXFYEE', monthlyPence: 23000, annualPence: 230000 },
  { name: 'Enterprise',   currentMonthly: 'price_1TmA7kHRDUuy2XlaipIrDqUF', currentAnnual: 'price_1TmApKHRDUuy2XlaqsVJtff7', monthlyPence: 38500, annualPence: 385000 },
]

const money = (p) => `£${(p / 100).toFixed(2)}`

async function main() {
  const out = {}
  let enterpriseProduct = null

  for (const plan of PLANS) {
    const current = await stripe.prices.retrieve(plan.currentMonthly)
    const productId = typeof current.product === 'string' ? current.product : current.product.id
    if (plan.name === 'Enterprise') enterpriseProduct = productId

    const monthly = await stripe.prices.create({
      product: productId, currency: 'gbp', unit_amount: plan.monthlyPence,
      recurring: { interval: 'month' }, nickname: `${plan.name} monthly (Jul 2026)`,
    })
    const annual = await stripe.prices.create({
      product: productId, currency: 'gbp', unit_amount: plan.annualPence,
      recurring: { interval: 'year' }, nickname: `${plan.name} annual (Jul 2026)`,
    })

    out[plan.name] = { product: productId, monthly: monthly.id, annual: annual.id }
    console.log(`\n${plan.name}: ${money(plan.monthlyPence)}/mo  ${money(plan.annualPence)}/yr`)
    console.log(`  product        ${productId}`)
    console.log(`  monthly price  ${monthly.id}`)
    console.log(`  annual price   ${annual.id}`)

    // Archive the old prices so they can't be used for new checkouts.
    await stripe.prices.update(plan.currentMonthly, { active: false }).catch(() => {})
    if (plan.currentAnnual) await stripe.prices.update(plan.currentAnnual, { active: false }).catch(() => {})
  }

  // Enterprise-only closing coupon: 20% off, forever, restricted to the Enterprise product.
  const coupon = await stripe.coupons.create({
    percent_off: 20, duration: 'forever', name: 'Enterprise closing discount (20%)',
    applies_to: { products: [enterpriseProduct] },
  })
  console.log(`\nEnterprise 20% coupon id  ${coupon.id}`)

  console.log('\n----- PASTE THIS BACK -----')
  console.log(JSON.stringify({
    starter:      out['Starter'],
    professional: out['Professional'],
    enterprise:   out['Enterprise'],
    enterpriseCoupon: coupon.id,
  }, null, 2))
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
