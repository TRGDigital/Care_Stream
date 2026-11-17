// Resize a chosen image on the client: at most 256px on the longest side, webp (or png) as a data URL under maxBytes.

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('We could not read that image. Try a PNG, JPG or WebP file.')) }
    img.src = url
  })
}

const bytesOf = (dataUrl: string) => Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75)

export async function resizeImageToDataUrl(file: File, maxBytes = 150 * 1024): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  const img = await loadImage(file)
  let side = 256
  const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight))
  let w = Math.max(1, Math.round(img.naturalWidth * scale))
  let h = Math.max(1, Math.round(img.naturalHeight * scale))
  for (let attempt = 0; attempt < 4; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Your browser could not process the image.')
    ctx.drawImage(img, 0, 0, w, h)
    for (const q of [0.9, 0.75, 0.6]) {
      const webp = canvas.toDataURL('image/webp', q)
      if (webp.startsWith('data:image/webp') && bytesOf(webp) <= maxBytes) return webp
    }
    const png = canvas.toDataURL('image/png')
    if (bytesOf(png) <= maxBytes) return png
    side = Math.round(side * 0.75)
    w = Math.max(1, Math.round(w * 0.75)); h = Math.max(1, Math.round(h * 0.75))
  }
  throw new Error('That image is too large even after shrinking. Please choose a simpler image.')
}
