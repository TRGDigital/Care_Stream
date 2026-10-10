import { MarketingNav } from '@/components/marketing/nav'
import { MarketingFooter } from '@/components/marketing/footer'
import { AltMapProvider } from '@/components/alt-map-provider'
import { getSiteAltMap } from '@/lib/image-alts'
import { BreadcrumbsJsonLd } from '@/components/breadcrumbs-json-ld'
import { MarketingAgentTools } from '@/components/agent/marketing-agent-tools'
import { PopEmbed } from '@/components/marketing/pop-embed'
import { WebsiteChat } from '@/components/marketing/website-chat'
import { FunnelInsightsTracker } from '@/components/marketing/funnel-insights-tracker'
import { FunnelInsightsVisitor } from '@/components/marketing/funnel-insights-visitor'
import { OffersProvider } from '@/lib/offers'
import { getActiveOffers } from '@/lib/offers-server'
import { ShipNowRoot } from '@/components/marketing/ship-now'
import { SHIP_NOW } from '@/lib/ship-now'

// Runs while the page is still being parsed, before the header is painted, so a Google Ads visitor
// never sees the full navigation flash before ShipNowRoot strips it after hydration. Same rules as
// isPaidLanding and STRIP in ship-now; ShipNowRoot keeps it in step on client side page changes.
const PPC_STRIP_EARLY = `(function(){try{var q=new URLSearchParams(location.search),w=window;if(q.get('gclid')||q.get('gbraid')||q.get('wbraid')||((q.get('utm_source')||'').toLowerCase()==='google'&&['cpc','ppc','paid'].indexOf((q.get('utm_medium')||'').toLowerCase())>-1))w.__csPpc=true;if(w.__csPpc&&/^\\/(staff-training\\/(?!team-pricing)[a-z0-9-]+(\\/cart)?|basket)\\/?$/.test(location.pathname))document.documentElement.classList.add('ppc-strip')}catch(e){}})()`

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [altMap, offers] = await Promise.all([getSiteAltMap(), getActiveOffers()])
  return (
    <OffersProvider offers={offers}>
    <AltMapProvider map={altMap}>
      <BreadcrumbsJsonLd />
      {SHIP_NOW && <script dangerouslySetInnerHTML={{ __html: PPC_STRIP_EARLY }} />}
      <ShipNowRoot />
      <MarketingAgentTools />
      <PopEmbed />
      <div className="flex min-h-screen flex-col">
        <MarketingNav />
        <main className="flex-1">{children}</main>
        <FunnelInsightsTracker />
        <FunnelInsightsVisitor />
        <MarketingFooter />
      </div>
      <WebsiteChat />
    </AltMapProvider>
    </OffersProvider>
  )
}
