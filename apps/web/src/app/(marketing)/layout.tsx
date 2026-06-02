import { MarketingNav } from '@/components/marketing/nav'
import { MarketingFooter } from '@/components/marketing/footer'
import { AltMapProvider } from '@/components/alt-map-provider'
import { getSiteAltMap } from '@/lib/image-alts'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const altMap = await getSiteAltMap()
  return (
    <AltMapProvider map={altMap}>
      <div className="flex min-h-screen flex-col">
        <MarketingNav />
        <main className="flex-1">{children}</main>
        <MarketingFooter />
      </div>
    </AltMapProvider>
  )
}
