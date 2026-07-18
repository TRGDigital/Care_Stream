// Downscale/compress an image in the browser before upload. Vercel serverless
// caps request bodies at ~4.5 MB, and unbounded photos bloat storage, so a phone
// photo/screenshot is reduced to a <=1600px JPEG (typically well under 1 MB).
// Small images (<1.5 MB) are returned untouched to preserve quality.
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (typeof window === 'undefined') return file
  if (!file.type.startsWith('image/') || file.size <= 1.5 * 1024 * 1024) return file
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = () => reject(new Error('read failed'))
      r.readAsDataURL(file)
    })
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('decode failed'))
      i.src = dataUrl
    })
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}
