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

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [altMap, offers] = await Promise.all([getSiteAltMap(), getActiveOffers()])
  return (
    <OffersProvider offers={offers}>
    <AltMapProvider map={altMap}>
      <BreadcrumbsJsonLd />
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
