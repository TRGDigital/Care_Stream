'use client'

import NextImage from 'next/image'
import { useImageAlt } from './alt-map-provider'

type SiteImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'width' | 'height'> & {
  src: string
  /** Fallback alt used if none is set for this src in the console. */
  alt?: string
  /** Pass natural width+height to render an optimised, responsive next/image. */
  width?: number
  height?: number
  /** Mark the LCP / above-the-fold image so it isn't lazy-loaded. */
  priority?: boolean
  /** Responsive sizes hint for next/image (e.g. "(max-width:1024px) 100vw, 50vw"). */
  sizes?: string
}

// Pulls alt text from the central store (managed in the platform console → Blog →
// Alt Tags). When width+height are supplied it renders an optimised next/image
// (AVIF/WebP + responsive srcset + lazy below the fold); otherwise it falls back
// to a plain <img>, lazy-loaded by default so off-screen images don't block load.
export function SiteImage({ src, alt = '', width, height, priority, sizes, className, ...rest }: SiteImageProps) {
  const resolved = useImageAlt(src, alt)

  if (width && height) {
    return (
      <NextImage
        src={src}
        alt={resolved}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes ?? '100vw'}
        className={className}
      />
    )
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={resolved} loading={priority ? 'eager' : 'lazy'} decoding="async" className={className} {...rest} />
}
