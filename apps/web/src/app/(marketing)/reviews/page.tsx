import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-meta'
import { REVIEWS } from '@/lib/reviews'
import { ShopInfoPage } from '@/components/marketing/shop-info'

// Customer reviews, word for word (lib/reviews.ts). Hidden until there are enough to stand on
// their own: not in the footer or sitemap, and noindex. To launch: add it to SHOP_INFO_LINKS
// (lib/shop-info-links.ts, which feeds the footer), add it to sitemap.ts, and remove `robots` below.

export async function generateMetadata(): Promise<Metadata> {
  const meta = await pageMetadata('/reviews', {
    title: 'Customer Reviews | CareStreamAI',
    description: 'What care managers say about CareStreamAI training, policies and the staff hub, in their own words.',
  })
  return { ...meta, robots: { index: false, follow: true } }
}

export default function ReviewsPage() {
  return (
    <ShopInfoPage
      path="/reviews"
      eyebrow="Reviews"
      title="What care teams say"
      lead="Every review here is from a real customer, in their own words."
    >
      {REVIEWS.map(r => (
        <figure className="si-card" key={r.name + r.setting} style={{ margin: '0 0 16px' }}>
          <blockquote className="si-quote">&ldquo;{r.quote}&rdquo;</blockquote>
          <figcaption className="si-note"><b>{r.name}</b>, {r.setting}</figcaption>
        </figure>
      ))}
    </ShopInfoPage>
  )
}
