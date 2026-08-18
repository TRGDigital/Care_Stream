// Turn an on-screen element into a downloaded PDF file.
//
// window.print() only opens the browser's print dialog, which leaves the user to
// find "Save as PDF" themselves and produces nothing on browsers where that
// destination is unavailable. This writes an actual file to their downloads.
//
// NB: the html2pdf worker is a thenable. Never await it before calling .save() —
// the chain resolves and the worker methods vanish ("Cannot read properties of
// undefined (reading 'save')"). Chain in one go. (Same trap as the F2F sheets.)

/** Filesystem-safe filename fragment. */
export function safeFileName(s: string): string {
  return String(s ?? '')
    .replace(/[\\/:*?"<>|]+/g, ' ')   // characters filesystems reject
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'document'
}

/**
 * Render `el` to a PDF and save it as `filename`.
 * `widthPx` pins the capture width — without it the element is sized against the
 * viewport and the right edge gets clipped on narrow screens.
 */
export async function downloadElementAsPdf(
  el: HTMLElement,
  filename: string,
  widthPx = 768,
): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default
  await html2pdf()
    .set({
      margin: [10, 10, 12, 10],
      filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, width: widthPx, windowWidth: widthPx, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      // Honour CSS break hints and never split a block mid-way.
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'li', '.avoid-break'] },
    } as any)
    .from(el)
    .save()
}
