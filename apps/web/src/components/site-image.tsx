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
  /** Render an optimised next/image that fills its (positioned) parent — use for
   *  `object-cover` images in an aspect-ratio/inset box where intrinsic dims aren't known. */
  fill?: boolean
  /** Mark the LCP / above-the-fold image so it isn't lazy-loaded. */
  priority?: boolean
  /** Responsive sizes hint for next/image (e.g. "(max-width:1024px) 100vw, 50vw"). */
  sizes?: string
  /** JPEG/WebP/AVIF quality (default 75). Lower it for decorative/grayscale images. */
  quality?: number
}

// Pulls alt text from the central store (managed in the platform console → Blog →
// Alt Tags). When width+height are supplied it renders an optimised next/image
// (AVIF/WebP + responsive srcset + lazy below the fold); otherwise it falls back
// to a plain <img>, lazy-loaded by default so off-screen images don't block load.
export function SiteImage({ src, alt = '', width, height, fill, priority, sizes, quality, className, ...rest }: SiteImageProps) {
  const resolved = useImageAlt(src, alt)

  if (fill) {
    return (
      <NextImage
        src={src}
        alt={resolved}
        fill
        priority={priority}
        sizes={sizes ?? '100vw'}
        quality={quality}
        className={className}
      />
    )
  }

  if (width && height) {
    return (
      <NextImage
        src={src}
        alt={resolved}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes ?? '100vw'}
        quality={quality}
        className={className}
      />
    )
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={resolved} loading={priority ? 'eager' : 'lazy'} decoding="async" className={className} {...rest} />
}
