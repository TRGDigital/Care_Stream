import type { Metadata } from 'next'
import CoursePage, { generateMetadata as courseMetadata } from '../page'

// /staff-training/<slug>/cart: the course page with its buy drawer open. The address exists so
// Google Ads audiences can be built on "URL contains /cart"; opening the drawer from the page moves
// here without a reload. Never indexed: it is the course page, and says so in its canonical.
export const revalidate = 60

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const meta = await courseMetadata(props)
  return { ...meta, robots: { index: false, follow: true } }
}

export default CoursePage
