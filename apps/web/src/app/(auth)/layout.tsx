import Link from 'next/link'
import { AuthRightPanel } from './AuthRightPanel'
import { AltMapProvider } from '@/components/alt-map-provider'
import { SiteImage } from '@/components/site-image'
import { getSiteAltMap } from '@/lib/image-alts'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const altMap = await getSiteAltMap()
  return (
    <AltMapProvider map={altMap}>
      <div className="flex min-h-screen">

        {/* ── Left: form panel ───────────────────────────────────────── */}
        <div className="flex w-full flex-col justify-center bg-white px-8 py-12 lg:w-[46%] lg:px-16">
          <div className="mx-auto w-full max-w-sm">
            <Link href="/" className="mb-10 block">
              <SiteImage src="/logo-color.png" alt="CareStreamAI" className="h-24 w-auto" />
            </Link>
            {children}
          </div>
        </div>

        {/* ── Right: branded panel ───────────────────────────────────── */}
        <AuthRightPanel />

      </div>
    </AltMapProvider>
  )
}
