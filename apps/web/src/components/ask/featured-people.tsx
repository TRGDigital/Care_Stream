'use client'

// The people in a newsletter (employee of the month, a story, new starters, a farewell): several are fine, each with their own agreement, and everyone already featured stays selected when this
// opens, saves or edits. Removing one person removes only that person. Chosen from the staff list with pictures (house rule 3); only their staff picture is used.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { ask, AskError } from '@/lib/ask-client'
import { StaffPicker, useStaff } from '@/components/ask/staff-picker'
import { CONSENT_TEXT, MAX_FEATURED, canApplyPeople, diffPeople, peopleBody } from '@/lib/featured-people'

export function FeaturedPeople({ token, docId, version, onChanged }: { token: string; docId: string; version: string; onChanged: () => void }) {
  const staff = useStaff(token, true)
  const [people, setPeople] = useState<Array<{ user_id: string; name: string | null; has_picture: boolean }> | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [agreed, setAgreed] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [ok, setOk] = useState('')
  const load = useCallback(async () => {
    try { const r = await ask.newsletterPeople(token, docId); setPeople(r.people); setSelected(r.people.map(p => p.user_id)); setAgreed({}) }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not load the people.') }
  }, [token, docId])
  useEffect(() => { void load() }, [load, version])
  const current = useMemo(() => (people ?? []).map(p => p.user_id), [people])
  const change = useMemo(() => diffPeople(current, selected), [current, selected])
  const nameOf = (id: string) => staff?.find(p => p.id === id)?.name ?? people?.find(p => p.user_id === id)?.name ?? 'This person'
  async function apply() {
    setBusy(true); setErr(''); setOk('')
    try {
      await ask.setNewsletterPeople(token, docId, peopleBody(current, selected, agreed))
      setOk(selected.length ? `${selected.length === 1 ? '1 person is' : `${selected.length} people are`} in the newsletter.` : 'No one is featured now.')
      await load(); onChanged()
    } catch (e) { setErr(e instanceof AskError || e instanceof Error ? e.message : 'That could not be saved. Please try again.') } finally { setBusy(false) }
  }
  const noPic = (people ?? []).filter(p => !p.has_picture)
  return (
    <div className="rounded-lg border border-gray-200 p-3 text-sm text-neutral-dark" id="ask-nl-people">
      <p id="ask-nl-people-label" className="font-semibold">People in this newsletter</p>
      <p className="mt-0.5 text-xs text-neutral-mid">Pick one or more from your staff (up to {MAX_FEATURED}). Only their staff picture is used, and only when they agree. It shows large and round in the preview, the hub and the PDF. The email shows their initials and says the photos are in the hub and the PDF.</p>
      <div className="mt-2">
        {staff === null || people === null
          ? <p className="flex items-center gap-2 text-xs text-neutral-mid" role="status"><Loader2 size={12} className="animate-spin" aria-hidden="true" />Loading your staff</p>
          : <StaffPicker people={staff} mode="multi" max={MAX_FEATURED} label="People in this newsletter" selected={selected} onChange={ids => { setSelected(ids); setOk('') }} />}
      </div>
      {change.added.length > 0 && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
          {change.added.map(id => (
            <label key={id} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={agreed[id] === true} onChange={e => setAgreed(a => ({ ...a, [id]: e.target.checked }))} /><span><strong className="font-medium">{nameOf(id)}:</strong> {CONSENT_TEXT}</span></label>
          ))}
        </div>
      )}
      {change.changed && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy || !canApplyPeople(change, agreed)} onClick={apply} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-teal px-3 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}Use {selected.length === 1 ? 'this person' : 'these people'}</button>
          {change.removed.length > 0 && <span className="text-xs text-neutral-mid">{change.removed.map(nameOf).join(', ')} will be taken out.</span>}
          {change.added.length > 0 && !canApplyPeople(change, agreed) && <span className="text-xs text-amber-900">Tick that each new person agrees.</span>}
        </div>
      )}
      {!change.changed && (people?.length ?? 0) > 0 && <p className="mt-2 text-xs text-neutral-mid" role="status">{(people ?? []).length === 1 ? '1 person is' : `${(people ?? []).length} people are`} in the newsletter, each with their own agreement.</p>}
      {noPic.length > 0 && !change.changed && <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-950" role="status">{noPic.map(p => p.name ?? 'Someone').join(', ')} {noPic.length === 1 ? 'has' : 'have'} no staff picture yet, so initials show. Add one in <a href="/staff" className="font-semibold underline">Staff</a> (open the profile, Picture) and it appears here by itself.</p>}
      {ok && <p role="status" className="mt-2 text-xs font-semibold text-green-800">{ok}</p>}
      {err && <p role="alert" className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">{err}</p>}
    </div>
  )
}
