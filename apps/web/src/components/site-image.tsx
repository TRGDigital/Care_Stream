'use client'

import { useImageAlt } from './alt-map-provider'

type SiteImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'alt'> & {
  src: string
  /** Fallback alt used if none is set for this src in the console. */
  alt?: string
}

// Renders a plain <img> but pulls its alt text from the central store via context
// (provided by the marketing/auth layout). Works in both server and client
// component trees, and the alt is present during SSR so it's in the HTML for SEO.
// Manage the values in the platform console → Blog → Alt Tags.
export function SiteImage({ src, alt = '', ...rest }: SiteImageProps) {
  const resolved = useImageAlt(src, alt)
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={resolved} {...rest} />
}
