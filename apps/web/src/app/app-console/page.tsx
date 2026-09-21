import type { Metadata } from 'next'
import Link from 'next/link'

// Shown inside the CareStream phone app when someone opens an admin console page. The app is
// the staff hub only (see appMode in middleware.ts); running the organisation, including
// anything that is paid for, happens in a web browser. Deliberately no link out to the site:
// the stores do not allow an app to steer people to buy elsewhere.

export const metadata: Metadata = {
  title: 'Use a web browser to manage your organisation | CareStreamAI',
  robots: { index: false, follow: false },
}

export default function AppConsoleNotice() {
  return (
    <main style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: '48px 24px', background: '#F7F5FA', fontFamily: 'Inter, system-ui, sans-serif', color: '#17121F' }}>
      <div style={{ maxWidth: 420, width: '100%', background: '#fff', border: '1px solid #E2DDE9', borderRadius: 20, padding: '32px 28px', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-color.svg" alt="CareStream" width={154} height={40} style={{ margin: '0 auto 24px', display: 'block' }} />
        <h1 style={{ fontSize: '1.35rem', lineHeight: 1.25, margin: '0 0 12px', fontWeight: 700 }}>This app is the staff hub</h1>
        <p style={{ margin: '0 0 24px', fontSize: '.95rem', lineHeight: 1.6, color: '#3A3245' }}>
          Managing your organisation, including staff, policies, training and your account, is done
          in the CareStream console in a web browser on a computer or tablet.
        </p>
        <Link href="/chat" style={{ display: 'block', padding: '13px 18px', borderRadius: 999, background: '#17121F', color: '#fff', fontWeight: 600, fontSize: '.95rem', textDecoration: 'none' }}>
          Open the staff hub
        </Link>
      </div>
    </main>
  )
}
