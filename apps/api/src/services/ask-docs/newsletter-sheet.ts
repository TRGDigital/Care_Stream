// The A4 SHEET: one HTML page that the screen, Print and Save PDF all use, so the structure never changes between them (photos, columns, blocks, colours, order).
// HOUSE RULE 10 (document layout): a newsletter is ONE page, portrait or landscape. A fit step in the page measures the design and shrinks it in small steps (never below
// MIN_SCALE, which keeps body text at about 9pt) until it fits. If it will not fit at the minimum, the sheet says so (data-fit="over") and shows ALL of it, uncut, so the caller can
// ask the administrator what to do (switch to landscape, shorten it, or allow two pages). Nothing is ever clipped and nothing is ever shrunk below a readable size.
// No database and no browser in this file: it only builds the HTML (and the small script that does the fitting).
import { renderNewsletterHtml, type DesignInput } from './newsletter-design'

export type Orientation = 'portrait' | 'landscape'
export type PagesMode = 'one' | 'two'
/** Millimetres, a hair under A4 (210 x 297) so a full page never spills onto a blank second sheet. */
export const PAGE_MM: Record<Orientation, { w: number; h: number }> = { portrait: { w: 210, h: 296 }, landscape: { w: 297, h: 209 } }
/** The sizes the fit step tries, largest first. 0.8 of the 15px body text is 12px, which is 9pt: the smallest body text allowed. */
export const FIT_STEPS = [1, 0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.8]
export const MIN_SCALE = FIT_STEPS[FIT_STEPS.length - 1]
/** Space kept clear at the bottom of the page for the draft or sample note and the margin. */
export const BOTTOM_RESERVE_PX = 24
export interface FitInfo { mode: PagesMode; fits: boolean; scale: number; contentHeight: number; pageHeight: number; pages: number }

export const orientationOf = (v: unknown): Orientation => (v === 'landscape' ? 'landscape' : 'portrait')

/** The fit step, as the small script that runs inside the page (so the screen, the print preview and the PDF engine all run the SAME code). */
export function fitScript(): string {
  return `(function(){var d=document,sheet=d.getElementById('cs-sheet'),el=d.getElementById('cs-fit');if(!sheet||!el)return;
var mode=sheet.getAttribute('data-mode')==='two'?'two':'one',STEPS=${JSON.stringify(FIT_STEPS)},R=${BOTTOM_RESERVE_PX};
function run(){sheet.style.height='';sheet.style.minHeight='';el.style.position='';
var W=sheet.clientWidth,H=sheet.clientHeight,fits=false,used=1,ch=0;
function apply(s){el.style.transform=s===1?'none':'scale('+s+')';el.style.width=(W/s)+'px';ch=el.offsetHeight*s;return ch}
if(mode==='two'){apply(1);used=1;fits=ch<=H-R}
else{for(var i=0;i<STEPS.length;i++){used=STEPS[i];apply(used);if(ch<=H-R){fits=true;break}}}
if(mode==='one'&&!fits){sheet.style.height=Math.ceil(ch+R)+'px'}
if(mode==='two'){sheet.style.height='auto';sheet.style.minHeight=H+'px';sheet.style.overflow='visible';el.style.position='relative'}
var pages=Math.max(1,Math.ceil((ch+R)/H));
var info={mode:mode,fits:mode==='two'?true:fits,scale:used,contentHeight:Math.round(ch),pageHeight:H,pages:mode==='two'?pages:(fits?1:pages)};
window.__nlFit=info;d.documentElement.setAttribute('data-fit',info.fits?(info.pages>1?'two':'one'):'over');
try{parent.postMessage({type:'cs-sheet-fit',fit:info},'*')}catch(e){}return info}
window.__nlRun=run;run();if(d.fonts&&d.fonts.ready){d.fonts.ready.then(function(){run()})}})();`
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/** The whole document for one newsletter sheet. `fonts` is optional extra CSS (the PDF engine passes embedded fonts, since a server has none of the usual ones). */
export function renderNewsletterSheet(input: DesignInput, o: { orientation?: Orientation; pages?: PagesMode; stamp?: string | null; fonts?: string } = {}): string {
  const orientation = orientationOf(o.orientation ?? input.orientation)
  const pages = o.pages === 'two' ? 'two' : 'one'
  const { w, h } = PAGE_MM[orientation]
  const card = renderNewsletterHtml({ ...input, orientation }, 'web', { sheet: true })
  const stamp = o.stamp ?? input.stamp ?? ''
  const css = `@page{size:A4 ${orientation};margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#FFFFFF}
@media print{html,body{width:${w}mm;${pages === 'one' ? `height:${h}mm;overflow:hidden;` : ''}}}
.cs-sheet{position:relative;width:${w}mm;height:${h}mm;overflow:hidden;background:#FFFFFF}
.cs-fit{position:absolute;left:0;top:0;transform-origin:0 0}
.cs-fit table{border-collapse:separate}
.cs-fit tr,.cs-fit .nl-card>table>tbody>tr{break-inside:avoid;page-break-inside:avoid}
.cs-stamp{position:fixed;right:14px;bottom:6px;font:700 9px/1 Helvetica,Arial,sans-serif;letter-spacing:.3px;color:#B91C1C;background:rgba(255,255,255,.9);padding:2px 6px;border-radius:4px}
${o.fonts ?? ''}`
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(input.title)}</title><style>${css}</style></head><body><div class="cs-sheet" id="cs-sheet" data-mode="${pages}" data-orientation="${orientation}"><div class="cs-fit" id="cs-fit">${card}</div>${stamp ? `<div class="cs-stamp">${esc(stamp)}</div>` : ''}</div><script>${fitScript()}</script></body></html>`
}
