'use client'

import dynamic from 'next/dynamic'

// Speed: client widgets that draw nothing when the page first renders (they return null until a
// visitor's behaviour, a timer or a fetched setting opens them) are loaded as their own chunks
// once the page has hydrated, instead of being in the scripts the page needs before it can show
// the price and the Add to basket button. Same components, same props, same behaviour; their
// server render was empty, so the HTML is unchanged.
export const LazyExitQuestion = dynamic(() => import('./shop-questions').then(m => m.ExitQuestion), { ssr: false })
export const LazyCaptureOverlay = dynamic(() => import('./capture-overlay').then(m => m.CaptureOverlay), { ssr: false })
export const LazySecondPageOffer = dynamic(() => import('./second-page-offer').then(m => m.SecondPageOffer), { ssr: false })
export const LazyWebsiteChat = dynamic(() => import('./website-chat').then(m => m.WebsiteChat), { ssr: false })
