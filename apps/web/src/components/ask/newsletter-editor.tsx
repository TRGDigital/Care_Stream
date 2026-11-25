'use client'

// Changing a newsletter without leaving the Ask panel: its COLOURS (the whole newsletter, then any one block) and the BLOCKS (move, edit, copy, delete, and add your own: text, picture and
// text, quote, callout, button, big numbers, list, dates). Every change is saved to the draft straight away and the designed preview above follows. The words are checked against the
// newsletter house rules by the server, and the reason is shown here in plain words. No scroll bars: the lists grow.
import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Loader2, Palette, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { ask, AskError, type NewsletterEditItem, type NewsletterEditState } from '@/lib/ask-client'
import { brandProblem, normaliseHex } from '@/lib/brand-colour'

const field = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
const btn = 'inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-semibold text-neutral-dark hover:bg-neutral-light focus:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50'
const primary = 'inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-teal bg-teal px-3 text-sm font-semibold text-white hover:bg-teal-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50'
const STYLE_LABEL: Record<string, string> = { soft: 'Soft tint', bold: 'Bold colour', outline: 'White with outline', none: 'Plain' }
const ICON_LABEL: Record<string, string> = { megaphone: 'Announcement', star: 'Star', heart: 'Heart', calendar: 'Calendar', check: 'Tick', users: 'People', book: 'Book', shield: 'Shield', sun: 'Sun', clock: 'Clock', gift: 'Gift', snow: 'Snow' }

type Content = Record<string, any>
const blank = (type: string): Content => type === 'text' ? { heading: '', text: '' } : type === 'picture_text' ? { heading: '', text: '', alt: '', image_id: '', side: 'left' }
  : type === 'quote' ? { text: '', who: '' } : type === 'callout' ? { title: '', text: '', icon: 'megaphone' } : type === 'button' ? { label: '', kind: 'url', url: '' }
  : type === 'numbers' ? { heading: '', items: [{ n: '', label: '' }, { n: '', label: '' }] } : type === 'list' ? { heading: '', style: 'bullets', items: [''] } : { heading: '', rows: [{ date: '', what: '' }] }

function Labelled({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-1 block text-xs font-semibold text-neutral-mid">{label}</label>{children}{hint && <p className="mt-1 text-[11px] text-neutral-mid">{hint}</p>}</div>
}

/** The boxes for one kind of block. `uid` keeps the labels unique when several forms are open. */
function BlockForm({ uid, type, value, onChange, token, setErr }: { uid: string; type: string; value: Content; onChange: (c: Content) => void; token: string; setErr: (m: string) => void }) {
  const [up, setUp] = useState(false)
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })
  const rows = (key: 'items' | 'rows', empty: unknown, max: number) => ({ list: (value[key] ?? []) as any[], add: () => (value[key] ?? []).length < max && onChange({ ...value, [key]: [...(value[key] ?? []), empty] }), drop: (i: number) => onChange({ ...value, [key]: (value[key] ?? []).filter((_: unknown, k: number) => k !== i) }), edit: (i: number, patch: Content) => onChange({ ...value, [key]: (value[key] ?? []).map((r: any, k: number) => (k === i ? { ...r, ...patch } : r)) }) })
  async function pick(f: File | undefined) {
    if (!f) return
    if (!/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 1024 * 1024) { setErr('Use a png, jpg or webp picture up to 1 MB.'); return }
    setUp(true); setErr('')
    try { const r = await ask.blockImage(token, f); set('image_id', r.image_id) } catch (e) { setErr(e instanceof Error ? e.message : 'That picture could not be added.') } finally { setUp(false) }
  }
  if (type === 'text') return (<div className="space-y-2">
    <Labelled id={`${uid}-h`} label="Heading (optional)"><input id={`${uid}-h`} className={field} maxLength={80} value={value.heading ?? ''} onChange={e => set('heading', e.target.value)} /></Labelled>
    <Labelled id={`${uid}-t`} label="Text" hint="A blank line starts a new paragraph."><textarea id={`${uid}-t`} rows={4} maxLength={1500} className={field} value={value.text ?? ''} onChange={e => set('text', e.target.value)} /></Labelled></div>)
  if (type === 'picture_text') return (<div className="space-y-2">
    <Labelled id={`${uid}-h`} label="Heading (optional)"><input id={`${uid}-h`} className={field} maxLength={80} value={value.heading ?? ''} onChange={e => set('heading', e.target.value)} /></Labelled>
    <Labelled id={`${uid}-f`} label="Picture (png, jpg or webp, up to 1 MB)"><input id={`${uid}-f`} type="file" accept="image/png,image/jpeg,image/webp" disabled={up} onChange={e => pick(e.target.files?.[0])} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold" /></Labelled>
    {up && <p className="flex items-center gap-1.5 text-xs text-neutral-mid" role="status"><Loader2 size={12} className="animate-spin" aria-hidden="true" />Adding the picture</p>}
    {value.image_id && !up && <p className="text-xs font-medium text-green-800" role="status">A picture is added.</p>}
    <Labelled id={`${uid}-a`} label="Describe the picture (required)" hint="A few words, for people who cannot see it. For example: The team at the summer fair."><input id={`${uid}-a`} className={field} maxLength={120} value={value.alt ?? ''} onChange={e => set('alt', e.target.value)} /></Labelled>
    <Labelled id={`${uid}-t`} label="Words beside the picture"><textarea id={`${uid}-t`} rows={3} maxLength={800} className={field} value={value.text ?? ''} onChange={e => set('text', e.target.value)} /></Labelled>
    <Labelled id={`${uid}-s`} label="Picture on the"><select id={`${uid}-s`} className={field} value={value.side ?? 'left'} onChange={e => set('side', e.target.value)}><option value="left">Left</option><option value="right">Right</option></select></Labelled></div>)
  if (type === 'quote') return (<div className="space-y-2">
    <Labelled id={`${uid}-t`} label="Quote"><textarea id={`${uid}-t`} rows={3} maxLength={300} className={field} value={value.text ?? ''} onChange={e => set('text', e.target.value)} /></Labelled>
    <Labelled id={`${uid}-w`} label="Who said it (optional)"><input id={`${uid}-w`} className={field} maxLength={80} value={value.who ?? ''} onChange={e => set('who', e.target.value)} /></Labelled></div>)
  if (type === 'callout') return (<div className="space-y-2">
    <Labelled id={`${uid}-h`} label="Heading (optional)"><input id={`${uid}-h`} className={field} maxLength={80} value={value.title ?? ''} onChange={e => set('title', e.target.value)} /></Labelled>
    <Labelled id={`${uid}-t`} label="Words"><textarea id={`${uid}-t`} rows={3} maxLength={400} className={field} value={value.text ?? ''} onChange={e => set('text', e.target.value)} /></Labelled>
    <Labelled id={`${uid}-i`} label="Icon"><select id={`${uid}-i`} className={field} value={value.icon ?? 'megaphone'} onChange={e => set('icon', e.target.value)}>{Object.entries(ICON_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Labelled></div>)
  if (type === 'button') return (<div className="space-y-2">
    <Labelled id={`${uid}-l`} label="What the button says"><input id={`${uid}-l`} className={field} maxLength={40} value={value.label ?? ''} onChange={e => set('label', e.target.value)} /></Labelled>
    <Labelled id={`${uid}-k`} label="Where it goes"><select id={`${uid}-k`} className={field} value={value.kind ?? 'url'} onChange={e => set('kind', e.target.value)}><option value="url">A web address</option><option value="hub">The staff hub</option></select></Labelled>
    {value.kind !== 'hub' && <Labelled id={`${uid}-u`} label="Web address" hint="It must start with https://"><input id={`${uid}-u`} className={field} inputMode="url" maxLength={300} placeholder="https://" value={value.url ?? ''} onChange={e => set('url', e.target.value)} /></Labelled>}</div>)
  if (type === 'numbers') { const r = rows('items', { n: '', label: '' }, 4); return (<div className="space-y-2">
    <Labelled id={`${uid}-h`} label="Heading (optional)"><input id={`${uid}-h`} className={field} maxLength={80} value={value.heading ?? ''} onChange={e => set('heading', e.target.value)} /></Labelled>
    {r.list.map((it, i) => <div key={i} className="flex items-end gap-2"><Labelled id={`${uid}-n${i}`} label={`Number ${i + 1}`}><input id={`${uid}-n${i}`} className={`${field} w-24`} maxLength={8} value={it.n ?? ''} onChange={e => r.edit(i, { n: e.target.value })} /></Labelled>
      <div className="min-w-0 flex-1"><Labelled id={`${uid}-l${i}`} label="What it counts"><input id={`${uid}-l${i}`} className={field} maxLength={40} value={it.label ?? ''} onChange={e => r.edit(i, { label: e.target.value })} /></Labelled></div>
      {r.list.length > 2 && <button type="button" className={btn} aria-label={`Remove number ${i + 1}`} onClick={() => r.drop(i)}><X size={14} aria-hidden="true" /></button>}</div>)}
    {r.list.length < 4 && <button type="button" className={btn} onClick={r.add}><Plus size={14} aria-hidden="true" />Add a number</button>}</div>) }
  if (type === 'list') return (<div className="space-y-2">
    <Labelled id={`${uid}-h`} label="Heading (optional)"><input id={`${uid}-h`} className={field} maxLength={80} value={value.heading ?? ''} onChange={e => set('heading', e.target.value)} /></Labelled>
    <Labelled id={`${uid}-s`} label="Style"><select id={`${uid}-s`} className={field} value={value.style ?? 'bullets'} onChange={e => set('style', e.target.value)}><option value="bullets">Bullets</option><option value="ticks">Ticks</option></select></Labelled>
    <Labelled id={`${uid}-i`} label="Items, one on each line" hint="Up to 10."><textarea id={`${uid}-i`} rows={4} className={field} value={(value.items ?? []).join('\n')} onChange={e => set('items', e.target.value.split('\n').slice(0, 10))} /></Labelled></div>)
  const r = rows('rows', { date: '', what: '' }, 8)
  return (<div className="space-y-2">
    <Labelled id={`${uid}-h`} label="Heading (optional)"><input id={`${uid}-h`} className={field} maxLength={80} value={value.heading ?? ''} onChange={e => set('heading', e.target.value)} /></Labelled>
    {r.list.map((it, i) => <div key={i} className="flex items-end gap-2"><div className="w-40"><Labelled id={`${uid}-d${i}`} label={`Date ${i + 1}`}><input id={`${uid}-d${i}`} className={field} maxLength={28} placeholder="Monday 8 December" value={it.date ?? ''} onChange={e => r.edit(i, { date: e.target.value })} /></Labelled></div>
      <div className="min-w-0 flex-1"><Labelled id={`${uid}-w${i}`} label="What is happening"><input id={`${uid}-w${i}`} className={field} maxLength={100} value={it.what ?? ''} onChange={e => r.edit(i, { what: e.target.value })} /></Labelled></div>
      {r.list.length > 1 && <button type="button" className={btn} aria-label={`Remove date ${i + 1}`} onClick={() => r.drop(i)}><X size={14} aria-hidden="true" /></button>}</div>)}
    {r.list.length < 8 && <button type="button" className={btn} onClick={r.add}><Plus size={14} aria-hidden="true" />Add a date</button>}</div>)
}

export function NewsletterEditor({ token, docId, version, focus, onChanged }: { token: string; docId: string; version: string; focus?: 'colours' | 'blocks' | null; onChanged: () => void }) {
  const [st, setSt] = useState<NewsletterEditState | null>(null)
  const [busy, setBusy] = useState(''), [err, setErr] = useState(''), [ok, setOk] = useState('')
  const [hex, setHex] = useState('')
  const [open, setOpen] = useState<'colours' | 'blocks' | null>(focus ?? null)
  const [editing, setEditing] = useState<string | null>(null)   // a block id being edited
  const [adding, setAdding] = useState<{ after: string | null; type: string | null } | null>(null)
  const [draft, setDraft] = useState<Content>({}), [secDraft, setSecDraft] = useState<{ title: string; text: string }>({ title: '', text: '' })
  useEffect(() => { if (focus) setOpen(focus) }, [focus])
  const load = useCallback(async () => { try { setSt(await ask.newsletterEdit(token, docId)) } catch (e) { setErr(e instanceof Error ? e.message : 'Could not open the editor.') } }, [token, docId])
  useEffect(() => { void load() }, [load, version])

  async function run(name: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(name); setErr(''); setOk('')
    try { await fn(); if (done) setOk(done); await load(); onChanged() } catch (e) { setErr(e instanceof AskError || e instanceof Error ? e.message : 'That could not be changed. Please try again.') } finally { setBusy('') }
  }
  const accent = (a: string | null, done: string) => run('accent', () => ask.newsletterOp(token, docId, { op: 'accent', accent: a }), done)
  function customColour() {
    const h = normaliseHex(hex); const p = brandProblem(hex)
    if (!h || p) { setErr(p ?? 'That does not look like a colour. Use a hex colour such as #1D4E89.'); return }
    void accent(h, 'The colour is changed.')
  }
  if (!st || !st.can_edit) return null
  const current = st.accent ?? st.brand_colour ?? st.category_colour
  const where = st.accent ? 'a colour you chose' : st.brand_colour ? 'your brand colour' : 'the colour of this kind of newsletter'
  const items = st.items
  const startEdit = (it: NewsletterEditItem) => { setAdding(null); setEditing(it.id); setErr(''); setOk('') }
  const sw = (hexv: string) => <span aria-hidden="true" className="inline-block h-4 w-4 rounded-full border border-black/10" style={{ background: hexv }} />

  const addBlockHere = (after: string | null, key: string) => (
    <div key={key} className="flex justify-center py-0.5"><button type="button" className={btn} disabled={!!busy} onClick={() => { setEditing(null); setAdding({ after, type: null }); setDraft({}); setErr(''); setOk('') }}><Plus size={13} aria-hidden="true" />Add a block here</button></div>
  )

  return (
    <div className="rounded-lg border border-gray-200 p-3 text-sm text-neutral-dark" id="ask-nl-editor">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto flex items-center gap-1.5 font-semibold"><Palette size={14} aria-hidden="true" /> Change the newsletter</p>
        <button type="button" aria-expanded={open === 'colours'} className={btn} onClick={() => setOpen(open === 'colours' ? null : 'colours')}>Colours</button>
        <button type="button" aria-expanded={open === 'blocks'} className={btn} onClick={() => setOpen(open === 'blocks' ? null : 'blocks')}>Blocks</button>
      </div>
      <p className="mt-1 text-xs text-neutral-mid">Every change is saved to the draft and the designed version above follows. Staff only see it once you share it.</p>

      {open === 'colours' && (
        <div className="mt-3 space-y-3" role="group" aria-label="Colours">
          <p className="flex items-center gap-2 text-xs text-neutral-mid">{sw(current)}In use now: {where} ({current}).</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a colour for the whole newsletter">
            {st.brand_colour && <button type="button" className={btn} disabled={!!busy} aria-pressed={st.accent === st.brand_colour} onClick={() => accent(st.brand_colour, 'Your brand colour is used.')}>{sw(st.brand_colour)}Brand colour</button>}
            <button type="button" className={btn} disabled={!!busy} aria-pressed={st.accent === st.category_colour} onClick={() => accent(st.category_colour, 'The colour of this kind of newsletter is used.')}>{sw(st.category_colour)}Category colour</button>
            {st.palettes.map(p => <button key={p.id} type="button" className={btn} disabled={!!busy} aria-pressed={st.accent === p.accent} onClick={() => accent(p.accent, `${p.label} is used.`)}>{sw(p.accent)}{p.label}</button>)}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Labelled id="ask-nl-hex" label="Your own colour" hint="Pale colours that cannot be read on white are refused."><div className="flex items-center gap-2">
              <input aria-label="Pick a colour" type="color" className="h-9 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0.5" value={normaliseHex(hex) ?? current} onChange={e => setHex(e.target.value.toUpperCase())} />
              <input id="ask-nl-hex" className={`${field} w-32`} placeholder="#1D4E89" maxLength={9} value={hex} onChange={e => setHex(e.target.value)} />
            </div></Labelled>
            <button type="button" className={primary} disabled={!!busy || !hex.trim()} onClick={customColour}>Use this colour</button>
            <button type="button" className={btn} disabled={!!busy || !st.accent} onClick={() => accent(null, 'Back to the default colour.')}><RotateCcw size={13} aria-hidden="true" />Reset to default</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-neutral-mid">The look of each block is in the list under <strong>Blocks</strong>.</p>
            <button type="button" className={btn} disabled={!!busy || !items.some(i => i.style)} onClick={() => run('reset', () => ask.newsletterOp(token, docId, { op: 'reset_styles' }), 'Every block is back to the design.')}><RotateCcw size={13} aria-hidden="true" />Reset all blocks</button>
          </div>
        </div>
      )}

      {open === 'blocks' && (
        <div className="mt-3 space-y-1.5" role="group" aria-label="Blocks">
          {addBlockHere(null, 'add-top')}
          {adding?.after === null && addForm()}
          {items.map(it => (
            <div key={it.id} className="space-y-1.5">
              <div className="rounded-lg border border-gray-200 bg-white p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{it.title}</p><p className="truncate text-xs text-neutral-mid">{it.kind === 'custom' ? `${st.block_types.find(b => b.id === it.type)?.label ?? it.type}: ` : ''}{it.summary || 'No text'}</p></div>
                  <label className="sr-only" htmlFor={`st-${it.id}`}>Colour of {it.title}</label>
                  <select id={`st-${it.id}`} className="min-h-[34px] rounded-lg border border-gray-300 bg-white px-2 text-xs font-semibold" disabled={!!busy} value={it.style ?? ''} onChange={e => run('style', () => ask.newsletterOp(token, docId, { op: 'style', id: it.id, style: e.target.value || null }))}>
                    <option value="">As designed</option>{st.styles.map(x => <option key={x} value={x}>{STYLE_LABEL[x] ?? x}</option>)}
                  </select>
                  <button type="button" className={btn} disabled={!!busy} aria-label={`Move ${it.title} up`} onClick={() => run('move', () => ask.newsletterOp(token, docId, { op: 'move', id: it.id, dir: 'up' }))}><ArrowUp size={14} aria-hidden="true" /></button>
                  <button type="button" className={btn} disabled={!!busy} aria-label={`Move ${it.title} down`} onClick={() => run('move', () => ask.newsletterOp(token, docId, { op: 'move', id: it.id, dir: 'down' }))}><ArrowDown size={14} aria-hidden="true" /></button>
                  <button type="button" className={btn} disabled={!!busy} onClick={() => { startEdit(it); void prefill(it) }}><Pencil size={13} aria-hidden="true" />Edit</button>
                  {it.kind === 'custom' && <button type="button" className={btn} disabled={!!busy} onClick={() => run('copy', () => ask.newsletterOp(token, docId, { op: 'duplicate', id: it.id }), 'Copied.')}><Copy size={13} aria-hidden="true" />Copy</button>}
                  <button type="button" className={`${btn} text-red-700`} disabled={!!busy} onClick={() => { if (window.confirm(`Delete "${it.title}" from this newsletter?`)) run('delete', () => ask.newsletterOp(token, docId, { op: 'delete', id: it.id }), 'Deleted.') }}><Trash2 size={13} aria-hidden="true" />Delete</button>
                </div>
                {editing === it.id && editForm(it)}
              </div>
              {addBlockHere(it.id, `add-${it.id}`)}
              {adding?.after === it.id && addForm()}
            </div>
          ))}
          <p className="text-xs text-neutral-mid">You can add up to {st.max_custom} blocks of your own. Moving, copying and deleting work on the words too, so the text version, the PDF and the email all match.</p>
        </div>
      )}
      {busy && <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-mid" role="status"><Loader2 size={12} className="animate-spin" aria-hidden="true" />Saving</p>}
      {ok && !busy && <p role="status" className="mt-2 text-xs font-semibold text-green-800">{ok}</p>}
      {err && <p role="alert" className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">{err}</p>}
    </div>
  )

  // Opens the boxes for a block with what it holds now (a section's own words come from the server's list; a block of yours from the same list).
  async function prefill(it: NewsletterEditItem) {
    try {
      const r = await ask.document(token, docId)
      if (it.kind === 'section') {
        const secs = r.document.body.split(/\n(?=##\s)/).map(x => x.trim()).filter(x => x.startsWith('## '))
        const hit = secs.find(x => x.split('\n')[0].replace(/^##\s+/, '').trim() === it.title)
        setSecDraft({ title: it.title, text: hit ? hit.split('\n').slice(1).join('\n').trim() : '' })
      } else setDraft((r.document.data?.custom_blocks ?? []).find((c: any) => c.id === it.id)?.content ?? {})
    } catch { /* the boxes stay as they were */ }
  }
  function editForm(it: NewsletterEditItem) {
    if (it.kind === 'section') return (
      <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
        <Labelled id={`sec-${it.id}-h`} label="Heading"><input id={`sec-${it.id}-h`} className={field} maxLength={90} value={secDraft.title} onChange={e => setSecDraft(s => ({ ...s, title: e.target.value }))} /></Labelled>
        <Labelled id={`sec-${it.id}-t`} label="Words" hint="A line starting with a dash is a bullet. A blank line starts a new paragraph."><textarea id={`sec-${it.id}-t`} rows={5} className={field} value={secDraft.text} onChange={e => setSecDraft(s => ({ ...s, text: e.target.value }))} /></Labelled>
        <div className="flex gap-2"><button type="button" className={primary} disabled={!!busy} onClick={() => run('section', async () => { await ask.newsletterOp(token, docId, { op: 'update_section', id: it.id, title: secDraft.title, text: secDraft.text }); setEditing(null) }, 'Saved.')}>Save</button><button type="button" className={btn} onClick={() => setEditing(null)}>Cancel</button></div>
      </div>)
    return (
      <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
        <BlockForm uid={`ed-${it.id}`} type={it.type} value={draft} onChange={setDraft} token={token} setErr={setErr} />
        <div className="flex gap-2"><button type="button" className={primary} disabled={!!busy} onClick={() => run('update', async () => { await ask.newsletterOp(token, docId, { op: 'update', id: it.id, content: draft }); setEditing(null) }, 'Saved.')}>Save</button><button type="button" className={btn} onClick={() => setEditing(null)}>Cancel</button></div>
      </div>)
  }
  function addForm() {
    if (!adding || !st) return null
    if (!adding.type) return (
      <div className="rounded-lg border border-teal/40 bg-teal/5 p-3" role="group" aria-label="Choose a kind of block">
        <p className="mb-2 text-xs font-semibold">What kind of block?</p>
        <div className="grid gap-2 sm:grid-cols-2">{st.block_types.map(b => <button key={b.id} type="button" className="rounded-lg border border-gray-200 bg-white p-2 text-left hover:bg-neutral-light focus:outline-none focus-visible:ring-2 focus-visible:ring-teal" onClick={() => { setAdding({ after: adding.after, type: b.id }); setDraft(blank(b.id)) }}><span className="block text-sm font-semibold">{b.label}</span><span className="block text-xs text-neutral-mid">{b.hint}</span></button>)}</div>
        <button type="button" className={`${btn} mt-2`} onClick={() => setAdding(null)}>Cancel</button>
      </div>)
    return (
      <div className="rounded-lg border border-teal/40 bg-teal/5 p-3">
        <p className="mb-2 text-xs font-semibold">New block: {st.block_types.find(b => b.id === adding.type)?.label}</p>
        <BlockForm uid="add-new" type={adding.type} value={draft} onChange={setDraft} token={token} setErr={setErr} />
        <div className="mt-2 flex gap-2"><button type="button" className={primary} disabled={!!busy} onClick={() => run('add', async () => { await ask.newsletterOp(token, docId, { op: 'add', type: adding.type!, content: draft, after: adding.after }); setAdding(null) }, 'Added.')}>Add the block</button><button type="button" className={btn} onClick={() => setAdding(null)}>Cancel</button></div>
      </div>)
  }
}
