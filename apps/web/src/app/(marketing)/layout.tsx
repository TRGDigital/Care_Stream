import { MarketingNav } from '@/components/marketing/nav'
import { MarketingFooter } from '@/components/marketing/footer'
import { AltMapProvider } from '@/components/alt-map-provider'
import { getSiteAltMap } from '@/lib/image-alts'
import { BreadcrumbsJsonLd } from '@/components/breadcrumbs-json-ld'
import { MarketingAgentTools } from '@/components/agent/marketing-agent-tools'
import { PopEmbed } from '@/components/marketing/pop-embed'
import { WebsiteChat } from '@/components/marketing/website-chat'
import { FunnelInsightsTracker } from '@/components/marketing/funnel-insights-tracker'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const altMap = await getSiteAltMap()
  return (
    <AltMapProvider map={altMap}>
      <BreadcrumbsJsonLd />
      <MarketingAgentTools />
      <PopEmbed />
      <div className="flex min-h-screen flex-col">
        <MarketingNav />
        <main className="flex-1">{children}</main>
        <FunnelInsightsTracker />
        <MarketingFooter />
      </div>
      <WebsiteChat />
    </AltMapProvider>
  )
}
