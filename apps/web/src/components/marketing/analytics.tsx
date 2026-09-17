'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { CONSENT_EVENT, hasAnalyticsConsent } from './cookie-consent'

// Google Tag Manager + GA4, loaded ONLY once the visitor has accepted cookies.
//
// These used to sit unconditionally in the root layout, so a visitor who pressed
// Decline still got GA4 and its cookies. UK PECR wants consent before non-essential
// cookies are set, and the banner was already gating Microsoft Clarity — analytics
// now goes through the same gate, so one answer governs everything.
//
// Deliberately a hard gate rather than Google Consent Mode. Consent Mode keeps GTM
// loaded in a denied state and relies on every tag inside the container being
// configured to respect the signal — configuration that lives in GTM, not here, and
// that this change cannot verify. Loading nothing is the version whose correctness
// is visible in the code. If you later want modelled conversions, Consent Mode is
// the upgrade, and it needs the container reviewed tag by tag first.

const GTM_ID = 'GTM-MZ4DJVLH'
// A SECOND GA4 property, loaded directly because it is not in the GTM container
// above (which fires its own GA4, G-KGFBN80R3W). If it ever moves into GTM, delete
// the two gtag Scripts below.
const GA4_ID = 'G-0CD7WMQF8B'

export function Analytics() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (hasAnalyticsConsent()) setAllowed(true)
    // Accepting from the banner must start analytics straight away, without
    // waiting for the visitor to navigate.
    const onChange = () => setAllowed(hasAnalyticsConsent())
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [])

  // Nothing is rendered, and so nothing is requested, until consent exists.
  // Withdrawing consent stops future loads; scripts already running in this tab
  // are cleared by the reload the banner performs.
  if (!allowed) return null

  return (
    <>
      {/* Deferred to idle so it does not add to mobile Total Blocking Time. */}
      <Script id="gtm" strategy="lazyOnload">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
      <Script id="gtag-ga4" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}');`}
      </Script>
    </>
  )
}
