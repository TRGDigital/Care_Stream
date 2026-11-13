'use client'

import { useEffect, useState } from 'react'
import { getPlatformToken } from '@/lib/platform-api'
import kwVolumes from '@/lib/keyword-volumes.json'

// ?yellowkws on a blog post: highlights the post's target keywords in yellow and shows a small
// panel of how many times each is used. For platform admins only:
//  - nothing happens unless the URL has ?yellowkws AND this browser holds the platform admin token
//    (so visitors and crawlers never see or fetch the keywords);
//  - the keywords come from the admin API, never from the public API;
//  - it works on the live post page and on the draft preview page.
// Highlighting runs in the browser after the page loads and does not change the stored page.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

type Kw = { term: string; primary: boolean; count: number }

export function KeywordHighlighter({ slug, keywords }: { slug: string; keywords?: { primary: string | null; secondary: string[] } }) {
  const [panel, setPanel] = useState<{ kws: Kw[]; words: number; inFirst100: boolean | null; none: boolean } | null>(null)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!new URLSearchParams(window.location.search).has('yellowkws')) return
    const token = getPlatformToken()
    if (!token) return
    let cancelled = false
    ;(async () => {
      let primary: string | null = keywords?.primary ?? null
      let secondary: string[] = keywords?.secondary ?? []
      if (!keywords) {
        try {
          const r = await fetch(`${API_URL}/admin/blog/posts`, { headers: { Authorization: `Bearer ${token}` } })
          const j = await r.json()
          const p = (j?.data?.posts ?? []).find((x: any) => x.slug === slug)
          primary = p?.primary_keyword ?? null
          secondary = p?.secondary_keywords ?? []
        } catch { /* leave empty */ }
      }
      if (cancelled) return
      const terms: Array<{ term: string; primary: boolean }> = [
        ...(primary ? [{ term: primary, primary: true }] : []),
        ...secondary.filter(Boolean).map(t => ({ term: t, primary: false })),
      ]
      if (terms.length === 0) { setPanel({ kws: [], words: 0, inFirst100: null, none: true }); return }
      // wait one tick so the article has rendered
      await new Promise(r => setTimeout(r, 400))
      const root = (document.querySelector('main') ?? document.body) as HTMLElement
      const sorted = [...terms].sort((a, b) => b.term.length - a.term.length)
      const re = new RegExp('(?<![A-Za-z0-9])(' + sorted.map(t => esc(t.term)).join('|') + ')(?![A-Za-z0-9])', 'gi')
      const counts = new Map<string, number>(terms.map(t => [t.term.toLowerCase(), 0]))
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          const el = n.parentElement
          if (!el) return NodeFilter.FILTER_REJECT
          if (el.closest('script,style,noscript,mark.cs-kw,#cs-kw-panel,textarea')) return NodeFilter.FILTER_REJECT
          return re.test(n.nodeValue ?? '') ? (re.lastIndex = 0, NodeFilter.FILTER_ACCEPT) : (re.lastIndex = 0, NodeFilter.FILTER_REJECT)
        },
      })
      const nodes: Text[] = []
      while (walker.nextNode()) nodes.push(walker.currentNode as Text)
      let wordCount = 0
      for (const node of nodes) {
        const text = node.nodeValue ?? ''
        const frag = document.createDocumentFragment()
        let last = 0
        text.replace(re, (m: string, _g: string, off: number) => {
          if (off > last) frag.appendChild(document.createTextNode(text.slice(last, off)))
          const mk = document.createElement('mark')
          mk.className = 'cs-kw'
          mk.textContent = m
          const isPrimary = !!primary && m.toLowerCase() === primary.toLowerCase()
          mk.setAttribute('style', `background:#FFE600;color:#000;padding:0 2px;border-radius:2px;${isPrimary ? 'outline:2px solid #F59E0B;' : ''}`)
          frag.appendChild(mk)
          counts.set(m.toLowerCase(), (counts.get(m.toLowerCase()) ?? 0) + 1)
          last = off + m.length
          return m
        })
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)))
        node.parentNode?.replaceChild(frag, node)
      }
      const body = (document.querySelector('article') ?? root) as HTMLElement
      const bodyText = (body.innerText || '').replace(/\s+/g, ' ').trim()
      wordCount = bodyText ? bodyText.split(' ').length : 0
      const first100 = bodyText.split(' ').slice(0, 100).join(' ').toLowerCase()
      setPanel({
        kws: terms.map(t => ({ ...t, count: counts.get(t.term.toLowerCase()) ?? 0 })),
        words: wordCount,
        inFirst100: primary ? first100.includes(primary.toLowerCase()) : null,
        none: false,
      })
    })()
    return () => { cancelled = true }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!panel) return null
  return (
    <div id="cs-kw-panel" style={{ position: 'fixed', left: 16, bottom: 16, zIndex: 9999, width: 320, maxWidth: 'calc(100vw - 32px)', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,.18)', fontSize: 13, color: '#111' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', fontWeight: 700, background: '#FFE600', borderRadius: open ? '12px 12px 0 0' : 12, border: 0, cursor: 'pointer' }}>
        <span>Keywords in this post</span><span>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: 12 }}>
          {panel.none ? <p style={{ margin: 0 }}>No keywords saved for this post. Add them in the post editor in the platform blog.</p> : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#6B7280', fontSize: 11, textAlign: 'right' }}>
                    <th style={{ textAlign: 'left', fontWeight: 600, paddingBottom: 4 }}>Keyword</th>
                    <th style={{ fontWeight: 600, paddingBottom: 4 }} title="UK searches a month (Google Keyword Planner)">Searches/mo</th>
                    <th style={{ fontWeight: 600, paddingBottom: 4 }}>Used</th>
                  </tr>
                </thead>
                <tbody>
                  {panel.kws.map(k => (
                    <tr key={k.term} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '4px 0' }}><mark style={{ background: '#FFE600', padding: '0 3px', borderRadius: 2, outline: k.primary ? '2px solid #F59E0B' : 'none' }}>{k.term}</mark>{k.primary && <span style={{ marginLeft: 6, color: '#B45309', fontWeight: 700 }}>primary</span>}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: '#374151' }} title="UK searches a month, Google Keyword Planner. A dash means under 10 or no data.">{(kwVolumes.volumes as Record<string, number>)[k.term.toLowerCase()]?.toLocaleString('en-GB') ?? '\u2013'}</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700, color: k.count === 0 ? '#DC2626' : '#047857' }}>{k.count}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ margin: '8px 0 0', color: '#4B5563' }}>
                {panel.words} words{panel.inFirst100 === null ? '' : panel.inFirst100 ? ' · primary keyword is in the first 100 words' : ' · primary keyword is NOT in the first 100 words'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
