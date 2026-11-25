// HOUSE RULE 4: every document an agent makes or shows has two SEPARATE buttons, Save PDF and Print. Both work from the same PDF (the designed layout, or the letterhead), so what you save is what you print.
// A document that is not approved yet comes out stamped DRAFT, a sample comes out stamped SAMPLE, and nothing is recorded as shared by either button.
export const safeFileName = (title: string, ext: string) => `${String(title ?? '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'document'}.${ext}`
export function saveBlob(blob: Blob, title: string, ext: 'pdf' | 'docx') {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = safeFileName(title, ext); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
/** Opens the print dialog for a PDF through a hidden frame, so only the document is printed (not the app around it). */
export function printBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; f.src = url
  f.onload = () => { try { f.contentWindow?.focus(); f.contentWindow?.print() } catch { window.open(url, '_blank') } setTimeout(() => { URL.revokeObjectURL(url); f.remove() }, 120_000) }
  document.body.appendChild(f)
}
/** The label under the buttons: what kind of copy this is. */
export const copyNote = (o: { draft?: boolean; sample?: boolean }) => o.sample ? 'A sample: SAMPLE is printed on every page.' : o.draft ? 'A draft copy: DRAFT is printed on every page until it is approved.' : ''
