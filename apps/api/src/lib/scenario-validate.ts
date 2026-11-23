// Checks a scenario page (the JSON shape in apps/web/src/data/scenarios) before the nightly routine may save it as a draft.
// Mirrors the research validator (validate_scenario.py) without its network checks. Pure, so it is tested without a database.

export interface ScenarioQueueKeywords { primary: string; secondary: string[] }
export interface ValidateOptions {
  expected?: ScenarioQueueKeywords      // from the queue: the page must use exactly these
  blogSlugs?: string[]                  // published blog slugs, for read_next
}
export interface ValidateResult { errors: string[]; warnings: string[]; words: number }

const ALLOWED_TAGS = new Set(['a', 'em', 'b', 'strong'])
const ALLOWED_EXT = ['legislation.gov.uk', 'gov.uk', 'cqc.org.uk', 'nice.org.uk', 'hse.gov.uk', 'skillsforcare.org.uk', 'ico.org.uk', 'england.nhs.uk', 'nhs.uk', 'scie.org.uk', 'alzheimers.org.uk']
const BANNED = ['mock inspection', 'e-signature', 'electronic signature', 'offline mode', 'works offline', 'incident register', 'complaints register',
  'deputy cover', 'family portal', 'care plan link', 'automatically sends a lesson', 'automatically writes a lesson', 'fire drill register']
const MOCKS: Record<string, string[]> = {
  training: ['module', 'questions'], followup: ['module', 'question', 'why', 'remember', 'picture'], language: ['second_language'],
  gaps: ['stats', 'missed', 'weak'], audit: ['audit', 'blocks'],
}
const REQUIRED = ['slug', 'status', 'order', 'title', 'meta_title', 'meta_description', 'eyebrow', 'lede', 'panel', 'image', 'image_alt', 'card_title', 'card_snippet',
  'primary_keyword', 'secondary_keywords', 'feature_links', 'intro', 'trail', 'trail_close', 'why', 'how', 'talk', 'limits', 'read_next', 'faqs', 'guide']

function strings(o: unknown, path = ''): Array<[string, string]> {
  if (typeof o === 'string') return [[path, o]]
  if (Array.isArray(o)) return o.flatMap((x, i) => strings(x, `${path}[${i}]`))
  if (o && typeof o === 'object') return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => strings(v, `${path}.${k}`))
  return []
}
const plain = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function validateScenario(d: any, opts: ValidateOptions = {}): ValidateResult {
  const errors: string[] = []; const warnings: string[] = []
  const E = (m: string) => errors.push(m); const W = (m: string) => warnings.push(m)
  if (!d || typeof d !== 'object') return { errors: ['The page is not an object.'], warnings, words: 0 }
  for (const k of REQUIRED) if (!(k in d)) E(`missing key ${k}`)
  if (errors.length) return { errors, warnings, words: 0 }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(d.slug)) || String(d.slug).length > 110) E('slug must be lower case words joined by hyphens')
  const all = strings(d)
  const textish = all.filter(([p]) => !/\.(slug|image|status|href|type)$/.test(p) && !p.includes('.read_next') && !p.includes('primary_keyword') && !p.includes('secondary_keywords'))
  for (const [p, s] of all) {
    if (/[—–]/.test(s)) E(`dash character in ${p}`)
    for (const m of s.matchAll(/<\/?([a-zA-Z0-9]+)/g)) if (!ALLOWED_TAGS.has(m[1].toLowerCase())) E(`html tag <${m[1]}> not allowed in ${p}`)
  }
  const full = textish.map(([, s]) => plain(s)).join(' ')
  const words = full.split(/\s+/).filter(Boolean).length
  if (words < 1700 || words > 2800) E(`word count ${words} outside 1700 to 2800`)
  const low = full.toLowerCase()

  const tr = d.trail
  if (!Array.isArray(tr) || tr.length !== 8) E('trail must have 8 steps')
  else {
    const ks = tr.map((t: any) => t?.kind)
    if (ks[7] !== 'end' || ks.filter((k: string) => k === 'end').length !== 1) E('trail: the last step must be the only "end"')
    if (ks.some((k: string) => !['ok', 'gap', 'end'].includes(k))) E('trail kinds must be ok, gap or end')
    if (tr.some((t: any) => String(t?.text ?? '').length > 120)) W('trail step text over 120 characters')
  }
  if (!Array.isArray(d.why?.cards) || d.why.cards.length !== 3 || d.why.cards.some((c: any) => !['chat', 'tick', 'alert'].includes(c?.icon))) E('why needs 3 cards with icon chat, tick or alert')
  const bl = d.how?.blocks
  if (!Array.isArray(bl) || bl.length !== 4) E('how needs 4 blocks')
  else bl.forEach((b: any, i: number) => {
    const m = b?.mock; const t = m?.type
    if (!MOCKS[t]) { E(`how.blocks[${i}].mock.type invalid`); return }
    for (const f of MOCKS[t]) if (!(f in m)) E(`how.blocks[${i}].mock missing ${f}`)
    if (!Array.isArray(b.bullets) || b.bullets.length < 3) E(`how.blocks[${i}] needs 3 bullets`)
    if (!Array.isArray(b.tags) || !b.tags.length) E(`how.blocks[${i}] needs tags (internal links)`)
  })
  if (!Array.isArray(d.talk?.items) || d.talk.items.length < 6 || d.talk.items.length > 10) E('talk needs 6 to 10 exchanges')
  if (!Array.isArray(d.limits?.cards) || d.limits.cards.length !== 3) E('limits needs 3 cards')
  const fl = d.feature_links
  if (!Array.isArray(fl) || fl.length !== 3 || fl[0]?.href !== '/training-platform') E('feature_links needs 3 cards, the first /training-platform')
  const groups = d.faqs?.groups
  if (!Array.isArray(groups) || groups.length < 2 || groups.reduce((n: number, g: any) => n + (g?.items?.length ?? 0), 0) < 6) E('faqs needs 2 or more groups and 6 or more questions')
  if (!Array.isArray(d.guide?.sections) || d.guide.sections.length < 2) E('guide needs 2 or more sections')
  if (!Array.isArray(d.read_next) || d.read_next.length < 2 || d.read_next.length > 3) E('read_next needs 2 or 3 blog slugs')
  else if (opts.blogSlugs) for (const s of d.read_next) if (!opts.blogSlugs.includes(s)) E(`read_next slug is not a published post: ${s}`)
  if (!/^https:\/\//.test(String(d.image))) E('image must be an https URL')
  if (String(d.image_alt ?? '').length < 20) E('image_alt too short')
  if (String(d.meta_title).length > 70) W('meta_title is long')
  if (String(d.meta_description).length > 160) W('meta_description is long')
  if (String(d.card_title).length > 80 || String(d.card_snippet).length > 200) W('card title or snippet too long')

  const pk = String(d.primary_keyword).toLowerCase()
  const cnt = (k: string) => (low.match(new RegExp(`(?<![a-z0-9])${escRe(k.toLowerCase())}(?![a-z0-9])`, 'g')) ?? []).length
  if (!plain(String(d.title)).toLowerCase().includes(pk)) E('the primary keyword must be in the title')
  if (!low.split(/\s+/).slice(0, 100).join(' ').includes(pk)) E('the primary keyword must be in the first 100 words')
  if (cnt(pk) < 3 || cnt(pk) > 9) E(`primary keyword used ${cnt(pk)} times, want 3 to 9`)
  if (opts.expected) {
    if (d.primary_keyword !== opts.expected.primary) E('primary_keyword must equal the queue primary keyword')
    const want = opts.expected.secondary
    const miss = want.filter(k => cnt(k) === 0)
    if (miss.length) E(`keywords not used in the copy: ${miss.join(', ')}`)
    for (const k of want) if (cnt(k) > 6) W(`keyword "${k}" used ${cnt(k)} times`)
    if (JSON.stringify([...(d.secondary_keywords ?? [])].sort()) !== JSON.stringify([...want].sort())) E('secondary_keywords must equal the queue list')
  }
  for (const b of BANNED) if (low.includes(b)) E(`unverified or unsupported feature mentioned: "${b}"`)
  if (/\bAI\b/.test(full)) E('the letters AI must not appear in page copy')
  if (/\b(claude|anthropic|openai|gpt)\b/i.test(full)) E('an AI vendor or model is named')

  const hrefs: string[] = []
  for (const [p, s] of all) { if (p.endsWith('.href')) hrefs.push(s); for (const m of s.matchAll(/href="([^"]+)"/g)) hrefs.push(m[1]) }
  const internal = Array.from(new Set(hrefs.filter(h => h.startsWith('/'))))
  const external = Array.from(new Set(hrefs.filter(h => h.startsWith('http'))))
  for (const h of hrefs) if (!h.startsWith('/') && !h.startsWith('https://')) E(`bad link ${h}`)
  for (const h of external) { let host = ''; try { host = new URL(h).hostname } catch { E(`bad link ${h}`); continue } if (!ALLOWED_EXT.some(dm => host === dm || host.endsWith('.' + dm))) E(`external link domain is not on the allow list: ${h}`) }
  if (external.length < 2) E('need at least 2 distinct external primary source links in the copy')
  if (internal.length < 8) E('need at least 8 distinct internal links')
  return { errors, warnings, words }
}
