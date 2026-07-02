// Shared content-sniffing for uploaded evidence/document files (face-to-face
// evidence, workforce credential documents). Validate the ACTUAL bytes, never
// trust the browser-reported MIME or the filename extension. We only accept PDF
// + raster images, and store/serve the canonical type detected here. This blocks
// disguised payloads (e.g. an HTML/SVG/script renamed .png) that could otherwise
// become stored XSS when served back from the API origin.

export function detectEvidenceType(buf: Buffer): { mime: string; ext: string } | null {
  const b = buf
  const ascii = (i: number, s: string) => s.split('').every((c, k) => b[i + k] === c.charCodeAt(0))
  if (b.length >= 5 && ascii(0, '%PDF-')) return { mime: 'application/pdf', ext: 'pdf' }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 'PNG') && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return { mime: 'image/png', ext: 'png' }
  if (b.length >= 6 && (ascii(0, 'GIF87a') || ascii(0, 'GIF89a'))) return { mime: 'image/gif', ext: 'gif' }
  if (b.length >= 12 && ascii(0, 'RIFF') && ascii(8, 'WEBP')) return { mime: 'image/webp', ext: 'webp' }
  if (b.length >= 12 && ascii(4, 'ftyp')) {
    const brand = b.toString('ascii', 8, 12)
    if (['heic', 'heix', 'heif', 'hevc', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'].includes(brand)) return { mime: 'image/heic', ext: 'heic' }
  }
  return null
}

// Content types we are willing to serve back inline; anything else is forced to
// download as application/octet-stream.
export const SAFE_EVIDENCE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'])
