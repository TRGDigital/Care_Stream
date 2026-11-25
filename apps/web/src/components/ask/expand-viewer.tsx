'use client'

// ONE shared full screen viewer for everything the agents show or make: layout thumbnails, a designed newsletter, a letter, a report, a table, a picture, a PDF. Wrap a thing in
// <Expandable> (click it, or press Enter or Space, or use its Expand button) and it opens over the whole screen, above the Ask panel, on a light backdrop. The page is scaled to fit
// (no scroll bars), with zoom, Previous and Next for pages, Download, Print, a Text or Designed switch when there is one, Esc and a visible Close. Focus stays inside it and goes back
// to where it was. On a phone it is the whole screen. The rules (zoom limits, paging, keys, focus) are in lib/expand-viewer-logic.ts and tested there.
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as RKeyboardEvent, type ReactNode } from 'react'
import { DocumentActions, type DocumentActionsProps } from './document-actions'
import { SheetFrame, SHEET_PX } from './sheet-frame'
import { ChevronLeft, ChevronRight, Download, Maximize2, Printer, X, ZoomIn, ZoomOut } from 'lucide-react'
import { canZoomIn, canZoomOut, clampPage, clampZoom, fitScale, hasNext, hasPrev, isActivateKey, pageLabel, stepPage, trapTab, viewerKey, zoomIn, zoomLabel, zoomOut } from '../../lib/expand-viewer-logic'

export type ViewerItem =
  | { kind: 'html'; html: string; css?: string; label?: string }
  | { kind: 'sheet'; html: string; orientation: 'portrait' | 'landscape'; label?: string }
  | { kind: 'node'; node: ReactNode; label?: string }
  | { kind: 'image'; src: string; alt: string; label?: string }
  | { kind: 'pdf'; src: string; pages?: number; label?: string }
export interface ViewerButton { label: string; onClick: () => void | Promise<void>; disabled?: boolean; primary?: boolean }
export interface ViewerSwitch { value: string; options: Array<{ id: string; label: string }>; onChange: (id: string) => void }
export interface ViewerProps {
  open: boolean; onClose: () => void; title: string
  /** The pages. One item is one page; several items step with Previous and Next. */
  items: ViewerItem[]
  /** Download buttons (Word, PDF) where they exist. */
  downloads?: ViewerButton[]
  /** Other buttons, for example "Use this layout". */
  actions?: ViewerButton[]
  /** A Text or Designed switch (newsletters). */
  switcher?: ViewerSwitch
  /** Print is on unless turned off. */
  noPrint?: boolean
  /** HOUSE RULE 4: a real document or sample: Save PDF and Print as two separate buttons (both from the same PDF), Word where there is one. */
  pdf?: { getPdf: () => Promise<Blob>; getDocx?: () => Promise<Blob>; draft?: boolean; sample?: boolean; tooLong?: DocumentActionsProps['tooLong'] }
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Prints one item through a hidden frame, so only the item is printed and not the app around it. */
function printItem(item: ViewerItem, title: string) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true'); frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
  let doc = ''
  if (item.kind === 'html') doc = `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><style>${item.css ?? ''}@page{margin:12mm}body{margin:0}</style>${item.html}`
  else if (item.kind === 'sheet') doc = item.html
  else if (item.kind === 'image') doc = `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><style>body{margin:0}img{max-width:100%}</style><img src="${esc(item.src)}" alt="${esc(item.alt)}">`
  else if (item.kind === 'pdf') { frame.src = item.src }
  else { const el = document.getElementById('expand-viewer-node'); doc = `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:sans-serif;margin:16px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}</style>${el?.innerHTML ?? ''}` }
  document.body.appendChild(frame)
  const go = () => { try { frame.contentWindow?.focus(); frame.contentWindow?.print() } catch { /* printing was blocked */ } setTimeout(() => frame.remove(), 60_000) }
  if (item.kind === 'pdf') frame.onload = go
  else { frame.srcdoc = doc; frame.onload = go }
}

export function ExpandViewer({ open, onClose, title, items, downloads, actions, switcher, noPrint, pdf }: ViewerProps) {
  const [page, setPage] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [fit, setFit] = useState(1)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')   // a button that fails is never silent: the reason shows in the toolbar
  const boxRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const count = Math.max(1, items.length)
  const item = items[clampPage(page, items.length)]
  const pdfPages = item?.kind === 'pdf' ? Math.max(1, item.pages ?? 1) : 1
  const [pdfPage, setPdfPage] = useState(0)
  const total = items.length > 1 ? count : pdfPages
  const current = items.length > 1 ? page : pdfPage

  // Open: remember where focus was, move it in; close: give it back.
  useEffect(() => {
    if (!open) return
    returnTo.current = (document.activeElement as HTMLElement) ?? null
    setPage(0); setPdfPage(0); setZoom(1)
    const t = setTimeout(() => closeRef.current?.focus(), 0)
    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => { clearTimeout(t); document.documentElement.style.overflow = prevOverflow; const el = returnTo.current; if (el && document.contains(el)) el.focus() }
  }, [open])

  // Scale the page to fit the box (no scroll bars): measured again whenever the box or the page changes size.
  const measure = useCallback(() => {
    const box = boxRef.current, c = contentRef.current
    if (!box || !c) return
    setFit(fitScale(c.scrollWidth, c.scrollHeight, box.clientWidth - 24, box.clientHeight - 24))
  }, [])
  useLayoutEffect(() => {
    if (!open) return
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro) { if (boxRef.current) ro.observe(boxRef.current); if (contentRef.current) ro.observe(contentRef.current) }
    window.addEventListener('resize', measure)
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure) }
  }, [open, measure, page, item])

  const step = (dir: 1 | -1) => { if (items.length > 1) setPage(p => stepPage(p, items.length, dir)); else setPdfPage(p => stepPage(p, pdfPages, dir)) }
  function onKeyDown(e: RKeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Tab') {
      const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      const to = trapTab(nodes.indexOf(document.activeElement as HTMLElement), nodes.length, e.shiftKey)
      if (to != null) { e.preventDefault(); nodes[to]?.focus() }
      return
    }
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
    const a = viewerKey(e.key, { pages: total, page: current })
    if (!a) return
    e.preventDefault(); e.stopPropagation()
    if (a === 'close') onClose(); else if (a === 'prev') step(-1); else if (a === 'next') step(1); else if (a === 'zoomIn') setZoom(z => zoomIn(z)); else if (a === 'zoomOut') setZoom(z => zoomOut(z)); else setZoom(1)
  }
  async function run(label: string, fn: () => void | Promise<void>) { setBusy(label); setErr(''); try { await fn() } catch (e) { setErr(e instanceof Error ? e.message : 'That could not be done just now.') } finally { setBusy('') } }

  if (!open || !item) return null
  const scale = fit * clampZoom(zoom)
  const btnPrimary = 'inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 rounded-lg border border-teal bg-teal px-3 text-sm font-semibold text-white hover:bg-teal-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-40'
  const btn = 'inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-neutral-dark hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-40'
  return createPortal(
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown} className="fixed inset-0 z-[95] flex flex-col bg-neutral-100/95 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2">
        <h2 id={titleId} className="mr-auto min-w-0 truncate text-base font-bold text-neutral-dark">{title}{item.label ? <span className="ml-2 text-sm font-normal text-neutral-mid">{item.label}</span> : null}</h2>
        {switcher && (
          <div role="group" aria-label="View" className="inline-flex overflow-hidden rounded-lg border border-gray-300">
            {switcher.options.map(o => <button key={o.id} type="button" aria-pressed={switcher.value === o.id} onClick={() => switcher.onChange(o.id)} className={`min-h-[40px] px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal ${switcher.value === o.id ? 'bg-teal text-white' : 'bg-white text-neutral-dark hover:bg-gray-50'}`}>{o.label}</button>)}
          </div>
        )}
        {total > 1 && (
          <div className="inline-flex items-center gap-1" role="group" aria-label="Pages">
            <button type="button" className={btn} onClick={() => step(-1)} disabled={!hasPrev(current)} aria-label="Previous page"><ChevronLeft size={16} aria-hidden="true" /><span className="hidden sm:inline">Previous</span></button>
            <span className="px-1 text-sm text-neutral-mid" aria-live="polite">{pageLabel(current, total)}</span>
            <button type="button" className={btn} onClick={() => step(1)} disabled={!hasNext(current, total)} aria-label="Next page"><span className="hidden sm:inline">Next</span><ChevronRight size={16} aria-hidden="true" /></button>
          </div>
        )}
        <div className="inline-flex items-center gap-1" role="group" aria-label="Zoom">
          <button type="button" className={btn} onClick={() => setZoom(z => zoomOut(z))} disabled={!canZoomOut(zoom)} aria-label="Zoom out"><ZoomOut size={16} aria-hidden="true" /></button>
          <button type="button" className={`${btn} w-16`} onClick={() => setZoom(1)} aria-label={`Zoom ${zoomLabel(zoom)}, press to fit the page`}>{zoomLabel(zoom)}</button>
          <button type="button" className={btn} onClick={() => setZoom(z => zoomIn(z))} disabled={!canZoomIn(zoom)} aria-label="Zoom in"><ZoomIn size={16} aria-hidden="true" /></button>
        </div>
        {(actions ?? []).map(a => <button key={a.label} type="button" disabled={a.disabled || !!busy} onClick={() => run(a.label, async () => { await a.onClick() })} className={a.primary ? btnPrimary : btn}>{a.label}</button>)}
        {pdf && <DocumentActions title={title} getPdf={pdf.getPdf} getDocx={pdf.getDocx} draft={pdf.draft} sample={pdf.sample} tooLong={pdf.tooLong} quiet />}
        {!pdf && (downloads ?? []).map(d => <button key={d.label} type="button" disabled={d.disabled || !!busy} onClick={() => run(d.label, async () => { await d.onClick() })} className={btn}><Download size={16} aria-hidden="true" />{busy === d.label ? 'Working' : d.label}</button>)}
        {err && <p role="alert" className="basis-full rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">{err}</p>}
        {!noPrint && !pdf && <button type="button" className={btn} onClick={() => printItem(item, title)}><Printer size={16} aria-hidden="true" /><span className="hidden sm:inline">Print</span><span className="sm:hidden sr-only">Print</span></button>}
        <button ref={closeRef} type="button" className={`${btn} border-neutral-dark`} onClick={onClose} aria-label="Close the viewer"><X size={16} aria-hidden="true" />Close</button>
      </div>
      <div ref={boxRef} className="no-scrollbar relative flex-1 overflow-auto" aria-label={`${title}, enlarged`} tabIndex={-1}>
        <div className="flex min-h-full min-w-full items-start justify-center p-3">
          <div style={{ width: (contentRef.current?.scrollWidth ?? 0) * scale || undefined, height: (contentRef.current?.scrollHeight ?? 0) * scale || undefined }}>
            <div ref={contentRef} id="expand-viewer-node" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 'max-content', maxWidth: 'none' }} className="bg-white shadow-lg">
              {item.kind === 'html' && <><style>{item.css ?? ''}</style><div dangerouslySetInnerHTML={{ __html: item.html }} /></>}
              {item.kind === 'sheet' && <div style={{ width: SHEET_PX[item.orientation].w }}><SheetFrame html={item.html} orientation={item.orientation} fixedScale={1} title={title} /></div>}
              {item.kind === 'node' && item.node}
              {item.kind === 'image' && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={item.src} alt={item.alt} className="block max-h-none max-w-none" onLoad={measure} />)}
              {item.kind === 'pdf' && <iframe title={`${title} PDF`} src={`${item.src}#page=${pdfPage + 1}&toolbar=0&navpanes=0`} style={{ width: 794, height: 1123, border: 0 }} />}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** The state that goes with a viewer: whether it is open, and the props that make a thing clickable (Enter and Space too) with the hint and the Expand icon. */
export function useExpandViewer() {
  const [open, setOpen] = useState(false)
  return { open, show: () => setOpen(true), close: () => setOpen(false) }
}

/**
 * Makes whatever it wraps open in the viewer when clicked or when Enter or Space is pressed. A small Expand icon sits in the corner and "Click to enlarge" shows on hover and focus.
 * The wrapped thing should not contain buttons of its own that matter more (a thumbnail, a preview, a table): put those outside it.
 */
export function Expandable({ label, onOpen, children, className = '', hint = true }: { label: string; onOpen: () => void; children: ReactNode; className?: string; hint?: boolean }) {
  return (
    <div className={`group relative ${className}`}>
      <div role="button" tabIndex={0} aria-label={`${label}. Click to enlarge`} onClick={onOpen} onKeyDown={e => { if (isActivateKey(e.key)) { e.preventDefault(); onOpen() } }}
        className="cursor-zoom-in rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal">{children}</div>
      <span aria-hidden="true" className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-1 text-[11px] font-semibold text-neutral-dark opacity-70 shadow-sm ring-1 ring-gray-200 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <Maximize2 size={12} />{hint && <span className="hidden group-hover:inline group-focus-within:inline">Click to enlarge</span>}
      </span>
    </div>
  )
}
