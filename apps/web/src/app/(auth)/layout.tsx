import Link from 'next/link'
import { AuthRightPanel } from './AuthRightPanel'
import { AltMapProvider } from '@/components/alt-map-provider'
import { getSiteAltMap } from '@/lib/image-alts'
import './auth-theme.css'

// Sign in, create account and the pages around them, in the theme's design. No site header or
// footer, so nothing pulls a visitor away from finishing the form.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const altMap = await getSiteAltMap()
  return (
    <AltMapProvider map={altMap}>
      <div className="csauth">
        <main className="lg">
          <section className="lgform">
            <div className="lgform-in">
              <Link className="lglogo" href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="cslogo" src="/logo-color.svg" alt="CareStream" width={177} height={46} />
              </Link>
              {children}
            </div>
          </section>
          <AuthRightPanel />
        </main>
      </div>
    </AltMapProvider>
  )
}
