import type { Metadata } from 'next'
import PolicyPage, { generateMetadata as policyMetadata } from '../page'

// /care-policies/<slug>/cart: the policy page with its cart drawer open. The address exists so
// Google Ads audiences can be built on "URL contains /cart"; opening the drawer from the page moves
// here without a reload. Never indexed: it is the policy page, and says so in its canonical.
export const revalidate = 300

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const meta = await policyMetadata(props)
  return { ...meta, robots: { index: false, follow: true } }
}

export default PolicyPage
