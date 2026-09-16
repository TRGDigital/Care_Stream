import type { Metadata } from 'next'

// Titles for the sign-in and account pages, from the theme. The pages themselves are client
// components, so each route's layout exports these. Without them the pages fall back to the
// site default title and share image text.
export function authMeta(title: string, description: string): Metadata {
  return {
    title,
    description,
    openGraph: {
      title: `${title} | CareStreamAI`,
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'CareStreamAI' }],
    },
    twitter: { title: `${title} | CareStreamAI`, description },
  }
}
