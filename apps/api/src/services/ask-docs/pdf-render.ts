// Makes a PDF from the SAME HTML sheet the screen shows, with a headless Chromium, so the PDF cannot drift from the design (HOUSE RULE 10: what you see is what you print).
// Chromium comes from @sparticuz/chromium on the server (a build made for Vercel and AWS Lambda) or from CHROME_EXECUTABLE_PATH on a developer machine.
// If Chromium cannot start for any reason, the caller falls back to the pdfkit drawing (newsletter-design.ts), which is fitted to one page the same way. A download never fails because of this.
import fs from 'fs'
import { createRequire } from 'module'
import type { FitInfo, Orientation } from './newsletter-sheet'

export interface ChromiumPdf { buffer: Buffer; pages: number; fit: FitInfo | null }

const LAUNCH_TIMEOUT_MS = 25_000
const RENDER_TIMEOUT_MS = 40_000

/** The engine to use: "auto" (Chromium, then pdfkit if it cannot start), "pdfkit" (never start a browser) or "chromium" (no fallback, for tests). */
export const pdfEngine = (): 'auto' | 'pdfkit' | 'chromium' => {
  const v = String(process.env.CS_PDF_ENGINE ?? 'auto').toLowerCase()
  return v === 'pdfkit' || v === 'chromium' ? v : 'auto'
}

/** The number of pages in a PDF made by Chromium (its page objects are written in plain text). */
export const countPdfPages = (buf: Buffer): number => {
  const m = buf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g)
  return m ? m.length : 1
}

let fontCache: string | null = null
/** Embedded fonts for the PDF engine. A server has no Georgia, so the serif headings would fall back to a sans font and the design would change: "Georgia" is mapped to Lora (OFL licence, about 40 KB). If the font files are not there, nothing is added and the system serif is used. */
export function embeddedFontCss(): string {
  if (fontCache !== null) return fontCache
  let css = ''
  try {
    const req = createRequire(__filename)
    const face = (file: string, weight: number, style: string) => `@font-face{font-family:'Georgia';font-weight:${weight};font-style:${style};src:url(data:font/woff2;base64,${fs.readFileSync(req.resolve(`@fontsource/lora/files/${file}`)).toString('base64')}) format('woff2')}`
    css = [face('lora-latin-400-normal.woff2', 400, 'normal'), face('lora-latin-700-normal.woff2', 700, 'normal'), face('lora-latin-400-italic.woff2', 400, 'italic'), face('lora-latin-700-italic.woff2', 700, 'italic')].join('')
  } catch { css = '' }
  fontCache = css
  return css
}

const withTimeout = <T>(p: Promise<T>, ms: number, what: string): Promise<T> => new Promise<T>((resolve, reject) => { const t = setTimeout(() => reject(new Error(`${what} took longer than ${ms / 1000} seconds`)), ms); p.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) }) })

async function launch(): Promise<any> {
  const pptr: any = await import('puppeteer-core')
  const launcher = pptr.launch ? pptr : pptr.default
  const exe = process.env.CHROME_EXECUTABLE_PATH
  if (exe) return launcher.launch({ executablePath: exe, headless: true, args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'] })
  const mod: any = await import('@sparticuz/chromium')
  const chromium = mod.default ?? mod
  return launcher.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' })
}

/** Prints one HTML sheet to a PDF. Throws if Chromium cannot start or the page cannot be made (the caller then uses the fallback). */
export async function htmlToPdf(html: string, o: { orientation: Orientation }): Promise<ChromiumPdf> {
  const browser = await withTimeout(launch(), LAUNCH_TIMEOUT_MS, 'Starting the browser')
  try {
    const run = async (): Promise<ChromiumPdf> => {
      const page = await browser.newPage()
      await page.setViewport({ width: o.orientation === 'landscape' ? 1123 : 794, height: o.orientation === 'landscape' ? 794 : 1123 })
      await page.emulateMediaType('print')
      await page.setContent(html, { waitUntil: 'load' })
      try { await page.evaluate('document.fonts ? document.fonts.ready.then(function () { return true }) : true') } catch { /* fonts are best effort */ }
      // the fit step runs when the page loads; run it again once the fonts are in, so the measure matches what is printed
      const fit = (await page.evaluate('window.__nlRun ? window.__nlRun() : (window.__nlFit || null)')) as FitInfo | null
      const pdf: Uint8Array = await page.pdf({ preferCSSPageSize: true, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } })
      const buffer = Buffer.from(pdf)
      return { buffer, pages: countPdfPages(buffer), fit }
    }
    return await withTimeout(run(), RENDER_TIMEOUT_MS, 'Making the PDF')
  } finally { try { await browser.close() } catch { /* already closed */ } }
}
