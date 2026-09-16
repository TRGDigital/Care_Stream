'use client'

import { useEffect } from 'react'

// The connector lines on the home page: the hero's constellation and the hub diagram.
//
// Ported from the theme's own script, near line for line. They are drawn in real pixels from
// each node's measured box because the design uses rectilinear paths with rounded elbows, and a
// rounded corner shears if a viewBox is stretched non-uniformly. They re-route on resize. The
// travelling pulses are skipped under prefers-reduced-motion, as the theme does.

const PAIRS: [string, string, string][] = [
  ['n-policies', 'n-people', '#7B3FBF'],
  ['n-people', 'n-training', '#1F8A5B'],
  ['n-policies', 'n-library', '#7B3FBF'],
  ['n-library', 'n-hub', '#2F6FD0'],
  ['n-training', 'n-gaps', '#D08A15'],
  ['n-gaps', 'n-evidence', '#C2503E'],
  ['n-hub', 'n-audit', '#1F8A5B'],
  ['n-evidence', 'n-cqc', '#D08A15'],
  ['n-library', 'n-people', '#8478A6'],
  ['n-gaps', 'n-cqc', '#8478A6'],
  ['n-audit', 'n-manager', '#1F8A5B'],
  ['n-manager', 'n-edits', '#2F6FD0'],
  ['n-edits', 'n-cqc', '#7B3FBF'],
]

type Box = { l: number; r: number; t: number; b: number; cx: number; cy: number }
type Port = { x: number; y: number; ax: 'h' | 'v' }

function heroLines(): () => void {
  const svg = document.getElementById('heroLines')
  const hero = svg?.closest('.hero') as HTMLElement | null
  if (!svg || !hero) return () => {}
  const R = 16

  const box = (el: Element): Box => {
    const a = el.getBoundingClientRect(), b = hero.getBoundingClientRect()
    return { l: a.left - b.left, r: a.right - b.left, t: a.top - b.top, b: a.bottom - b.top,
      cx: a.left - b.left + a.width / 2, cy: a.top - b.top + a.height / 2 }
  }
  const ports = (a: Box, b: Box): [Port, Port] => {
    const dx = Math.abs(b.cx - a.cx), dy = Math.abs(b.cy - a.cy)
    if (dx >= dy) {
      return b.cx > a.cx ? [{ x: a.r, y: a.cy, ax: 'h' }, { x: b.l, y: b.cy, ax: 'h' }]
        : [{ x: a.l, y: a.cy, ax: 'h' }, { x: b.r, y: b.cy, ax: 'h' }]
    }
    return b.cy > a.cy ? [{ x: a.cx, y: a.b, ax: 'v' }, { x: b.cx, y: b.t, ax: 'v' }]
      : [{ x: a.cx, y: a.t, ax: 'v' }, { x: b.cx, y: b.b, ax: 'v' }]
  }
  const elbow = (p: Port, q: Port) => {
    if (p.ax === 'h') {
      if (Math.abs(p.y - q.y) < 2) return `M${p.x} ${p.y} L${q.x} ${q.y}`
      const mx = (p.x + q.x) / 2, dy = Math.sign(q.y - p.y)
      const sx1 = Math.sign(mx - p.x) || 1, sx2 = Math.sign(q.x - mx) || 1
      const r = Math.max(0, Math.min(R, Math.abs(q.y - p.y) / 2, Math.abs(mx - p.x), Math.abs(q.x - mx)))
      return `M${p.x} ${p.y}H${mx - r * sx1}Q${mx} ${p.y} ${mx} ${p.y + r * dy}`
        + `V${q.y - r * dy}Q${mx} ${q.y} ${mx + r * sx2} ${q.y}H${q.x}`
    }
    if (Math.abs(p.x - q.x) < 2) return `M${p.x} ${p.y} L${q.x} ${q.y}`
    const my = (p.y + q.y) / 2, dx = Math.sign(q.x - p.x)
    const sy1 = Math.sign(my - p.y) || 1, sy2 = Math.sign(q.y - my) || 1
    const r = Math.max(0, Math.min(R, Math.abs(q.x - p.x) / 2, Math.abs(my - p.y), Math.abs(q.y - my)))
    return `M${p.x} ${p.y}V${my - r * sy1}Q${p.x} ${my} ${p.x + r * dx} ${my}`
      + `H${q.x - r * dx}Q${q.x} ${my} ${q.x} ${my + r * sy2}V${q.y}`
  }

  function draw() {
    const w = hero!.clientWidth, h = hero!.clientHeight
    if (getComputedStyle(svg!).display === 'none') return
    svg!.setAttribute('viewBox', `0 0 ${w} ${h}`)
    svg!.setAttribute('width', String(w)); svg!.setAttribute('height', String(h))
    let out = '', i = 0, dots = '', travellers = ''
    const seen = new Set<string>()
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dot = (x: number, y: number, col: string, d: number) => {
      const k = `${Math.round(x)},${Math.round(y)}`
      if (seen.has(k)) return
      seen.add(k)
      dots += `<circle class="jd" cx="${x}" cy="${y}" r="4.5" fill="${col}" `
        + `stroke="#fff" stroke-width="2" style="animation-delay:${d.toFixed(2)}s"/>`
    }
    // A node hidden by a media query measures 0x0 at the origin; skip its pairs.
    const visible = (el: HTMLElement | null) => !!el && !!el.offsetParent && el.getBoundingClientRect().width > 0
    for (const [a, b, col] of PAIRS) {
      const A = document.getElementById(a), B = document.getElementById(b)
      if (!visible(A) || !visible(B)) continue
      const [p, q] = ports(box(A!), box(B!))
      const pid = `pth${i}`
      out += `<path id="${pid}" class="ln" d="${elbow(p, q)}" stroke="${col}" style="animation-delay:${(i * 0.07).toFixed(2)}s"/>`
      dot(p.x, p.y, col, 0.7 + i * 0.07); dot(q.x, q.y, col, 0.75 + i * 0.07)
      if (!still) {
        travellers += `<circle r="4" fill="${col}" opacity=".95">`
          + `<animateMotion dur="6.2s" begin="${(1.1 + i * 0.44).toFixed(2)}s" repeatCount="indefinite" `
          + `keyPoints="0;1" keyTimes="0;1" calcMode="linear">`
          + `<mpath href="#${pid}"/></animateMotion>`
          + `<animate attributeName="opacity" dur="6.2s" begin="${(1.1 + i * 0.44).toFixed(2)}s" `
          + `repeatCount="indefinite" values="0;.95;.95;0" keyTimes="0;.12;.88;1"/></circle>`
      }
      i++
    }
    svg!.innerHTML = out + travellers + dots
  }

  let t: ReturnType<typeof setTimeout> | undefined
  const onResize = () => { clearTimeout(t); t = setTimeout(draw, 120) }
  const mq = matchMedia('(max-height:880px)')
  draw()
  addEventListener('resize', onResize)
  mq.addEventListener('change', draw)
  document.fonts?.ready.then(draw)
  const late = setTimeout(draw, 400)
  return () => { removeEventListener('resize', onResize); mq.removeEventListener('change', draw); clearTimeout(t); clearTimeout(late) }
}

function hubLines(): () => void {
  const svg = document.getElementById('hubLines'), hub = document.getElementById('hub'),
    core = document.getElementById('hubCore')
  if (!svg || !hub || !core) return () => {}
  const cards = Array.from(hub.querySelectorAll<HTMLElement>('.hc'))
  const R = 14
  const rel = (el: Element): Box => {
    const a = el.getBoundingClientRect(), b = hub.getBoundingClientRect()
    return { l: a.left - b.left, r: a.right - b.left, t: a.top - b.top, b: a.bottom - b.top,
      cx: a.left - b.left + a.width / 2, cy: a.top - b.top + a.height / 2 }
  }
  function draw() {
    if (getComputedStyle(svg!).display === 'none') return
    const w = hub!.clientWidth, h = hub!.clientHeight
    svg!.setAttribute('viewBox', `0 0 ${w} ${h}`); svg!.setAttribute('width', String(w)); svg!.setAttribute('height', String(h))
    if (!core!.offsetParent) return
    const C = rel(core!)
    let out = ''
    // Landing points spaced evenly down the plate edge, so the outermost cards on a side do
    // not share an endpoint.
    const side = (el: Element) => (rel(el).cx < C.cx ? 'L' : 'R')
    const groups = { L: cards.filter(e => side(e) === 'L'), R: cards.filter(e => side(e) === 'R') }
    const pad = 20, span = (C.b - C.t) - pad * 2
    const landing = (el: HTMLElement) => {
      const g = groups[side(el)], n = g.length, i = g.indexOf(el)
      return n < 2 ? C.t + (C.b - C.t) / 2 : C.t + pad + span * i / (n - 1)
    }
    cards.forEach(el => {
      if (!el.offsetParent) return
      const a = rel(el), onLeft = a.cx < C.cx
      const p = { x: onLeft ? a.r : a.l, y: a.cy }
      const q = { x: onLeft ? C.l : C.r, y: landing(el) }
      const mx = (p.x + q.x) / 2, dy = Math.sign(q.y - p.y) || 1
      const sx1 = Math.sign(mx - p.x) || 1, sx2 = Math.sign(q.x - mx) || 1
      const r = Math.max(0, Math.min(R, Math.abs(q.y - p.y) / 2, Math.abs(mx - p.x), Math.abs(q.x - mx)))
      const d = Math.abs(p.y - q.y) < 2
        ? `M${p.x} ${p.y}L${q.x} ${q.y}`
        : `M${p.x} ${p.y}H${mx - r * sx1}Q${mx} ${p.y} ${mx} ${p.y + r * dy}V${q.y - r * dy}`
          + `Q${mx} ${q.y} ${mx + r * sx2} ${q.y}H${q.x}`
      const col = (el.querySelector('.i') as HTMLElement | null)?.style.background || '#9A93A6'
      out += `<path d="${d}" stroke="${col}"/>`
        + `<circle cx="${p.x}" cy="${p.y}" r="3.4" fill="${col}" stroke="#fff" stroke-width="1.6"/>`
        + `<circle cx="${q.x}" cy="${q.y}" r="3.4" fill="${col}" stroke="#fff" stroke-width="1.6"/>`
    })
    svg!.innerHTML = out
  }
  let t: ReturnType<typeof setTimeout> | undefined
  const onResize = () => { clearTimeout(t); t = setTimeout(draw, 120) }
  draw()
  addEventListener('resize', onResize)
  const img = core.querySelector('img')
  if (img && !img.complete) img.addEventListener('load', draw)
  const late = setTimeout(draw, 400)
  return () => { removeEventListener('resize', onResize); img?.removeEventListener('load', draw); clearTimeout(t); clearTimeout(late) }
}

/** Renders nothing; draws the hero and hub connectors once the page is in the browser. */
export function HomeLines() {
  useEffect(() => {
    const a = heroLines()
    const b = hubLines()
    return () => { a(); b() }
  }, [])
  return null
}
