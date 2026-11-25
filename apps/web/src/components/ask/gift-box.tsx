'use client'

// The OPTIONAL gift on an Employee of the month style newsletter: a few words (a pound value is allowed here) and an optional small picture (png, jpg or webp, up to 1 MB, kept privately for
// this account). Without a picture the newsletter shows a gift icon. No gift means no gift card.
import { useEffect, useState } from 'react'
import { Gift, Loader2 } from 'lucide-react'
import { ask } from '@/lib/ask-client'

export function GiftBox({ token, docId, gift, onSaved }: { token: string; docId: string; gift: { text?: string; image_id?: string | null } | null | undefined; onSaved: () => void }) {
  const [text, setText] = useState(gift?.text ?? ''), [imageId, setImageId] = useState<string | null>(gift?.image_id ?? null), [imageName, setImageName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [ok, setOk] = useState('')
  useEffect(() => { setText(gift?.text ?? ''); setImageId(gift?.image_id ?? null) }, [gift?.text, gift?.image_id])
  async function pick(f: File | undefined) {
    if (!f) return
    if (!/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 1024 * 1024) { setErr('Use a png, jpg or webp picture up to 1 MB.'); return }
    setBusy(true); setErr('')
    try { const r = await ask.giftImage(token, f); setImageId(r.image_id); setImageName(f.name) } catch (e) { setErr(e instanceof Error ? e.message : 'That picture could not be added.') } finally { setBusy(false) }
  }
  async function save(clear = false) {
    setBusy(true); setErr(''); setOk('')
    try { await ask.setGift(token, docId, clear ? { text: '', image_id: null } : { text, image_id: imageId }); if (clear) { setText(''); setImageId(null); setImageName(null) } setOk(clear ? 'The gift card is removed.' : text.trim() || imageId ? 'The gift card is in the newsletter.' : 'No gift.'); onSaved() }
    catch (e) { setErr(e instanceof Error ? e.message : 'It could not be saved.') } finally { setBusy(false) }
  }
  return (
    <div className="rounded-lg border border-gray-200 p-3 text-sm text-neutral-dark">
      <p className="flex items-center gap-1.5 font-semibold"><Gift size={14} aria-hidden="true" /> Gift (optional)</p>
      <p className="mt-0.5 text-xs text-neutral-mid">What the gift is, for example &ldquo;A £25 voucher and a day of extra leave&rdquo;. A gift value is allowed here. Without a picture the card shows a gift icon. No gift, no card.</p>
      <label htmlFor="ask-gift-text" className="sr-only">What the gift is</label>
      <input id="ask-gift-text" value={text} maxLength={200} onChange={e => setText(e.target.value)} placeholder="What the gift is" className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" />
      <div className="mt-2">
        <label htmlFor="ask-gift-pic" className="text-xs font-medium text-neutral-dark">A picture of the gift (optional, up to 1 MB)</label>
        <input id="ask-gift-pic" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => pick(e.target.files?.[0])} className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-neutral-dark" />
        {imageId && <p className="mt-1 text-xs font-medium text-green-800">A picture is added{imageName ? `: ${imageName}` : ''}. <button type="button" className="ml-1 font-semibold underline" onClick={() => { setImageId(null); setImageName(null) }}>Remove the picture</button></p>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || (!text.trim() && !imageId)} onClick={() => save(false)} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-teal px-3 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null} Use this gift</button>
        {(gift?.text || gift?.image_id) && <button type="button" disabled={busy} onClick={() => save(true)} className="text-sm font-medium text-neutral-mid underline hover:text-neutral-dark">No gift</button>}
        {ok && <span role="status" className="text-xs font-semibold text-green-800">{ok}</span>}
        {err && <span role="alert" className="text-xs text-red-700">{err}</span>}
      </div>
    </div>
  )
}
