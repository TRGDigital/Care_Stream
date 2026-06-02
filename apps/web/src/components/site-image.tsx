import { getSiteAltMap } from '@/lib/image-alts'

type SiteImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'alt'> & {
  src: string
  /** Fallback alt used if none is set for this src in the console. */
  alt?: string
}

// Async Server Component. Renders a plain <img> but pulls its alt text from the
// central store (platform console → Blog → Alt Tags), so editing an alt there is
// reflected in the server-rendered HTML (good for SEO). Falls back to the alt prop.
export async function SiteImage({ src, alt = '', ...rest }: SiteImageProps) {
  const map = await getSiteAltMap()
  const resolved = map[src] || alt
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={resolved} {...rest} />
}
