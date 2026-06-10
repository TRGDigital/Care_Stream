import { MarketingNav } from '@/components/marketing/nav'
import { MarketingFooter } from '@/components/marketing/footer'
import { AltMapProvider } from '@/components/alt-map-provider'
import { getSiteAltMap } from '@/lib/image-alts'
import { BreadcrumbsJsonLd } from '@/components/breadcrumbs-json-ld'
import { MarketingAgentTools } from '@/components/agent/marketing-agent-tools'
import { DemoModalRoot } from '@/components/marketing/demo-modal'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const altMap = await getSiteAltMap()
  return (
    <AltMapProvider map={altMap}>
      <BreadcrumbsJsonLd />
      <MarketingAgentTools />
      <div className="flex min-h-screen flex-col">
        <MarketingNav />
        <main className="flex-1">{children}</main>
        <MarketingFooter />
      </div>
      <DemoModalRoot />
    </AltMapProvider>
  )
}
