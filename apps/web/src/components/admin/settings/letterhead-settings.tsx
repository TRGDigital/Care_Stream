'use client'

// Settings > Letterhead and company details. What prints at the top and bottom of every formal letter, report and newsletter. The preview on the right is made by the server with the
// same code as the PDF and Word files, so it matches what prints. Missing details are a gentle checklist, never an error.

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Info, Loader2 } from 'lucide-react'
import { letterhead, type Details, type LetterheadState } from '@/lib/letterhead-client'
import { brandProblem, normaliseHex, DEFAULT_BRAND } from '@/lib/brand-colour'

const INPUT = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
type Key = keyof Details

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-1 block text-sm font-medium text-neutral-dark">{label}</label>{children}{hint && <p className="mt-1 text-xs text-neutral-mid">{hint}</p>}</div>
}

export function LetterheadSettingsBody({ token }: { token: string }) {
  const [state, setState] = useState<LetterheadState | null>(null)
  const [d, setD] = useState<Details | null>(null)
  const [error, setError] = useState(''); const [saved, setSaved] = useState(false); const [busy, setBusy] = useState(false)
  const [brand, setBrand] = useState(''); const [note, setNote] = useState('')   // the brand colour ('' = the default) and a gentle message when the database needs updating
  const [preview, setPreview] = useState<{ html: string; css: string; missing: string[] } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let live = true
    letterhead.get(token).then(s => { if (live) { setState(s); setD(s.details); setBrand(s.brand_colour ?? '') } }).catch(e => { if (live) setError(e?.message ?? 'Could not load your details.') })
    return () => { live = false }
  }, [token])

  // The live preview: the server draws the sample letter for what is typed so far (a moment after typing stops).
  useEffect(() => {
    if (!d) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { letterhead.preview(token, { ...d, brand_colour: brandProblem(brand) ? '' : brand }).then(setPreview).catch(() => undefined) }, 350)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [d, brand, token])

  const set = (k: Key, v: string | boolean) => { setSaved(false); setD(cur => (cur ? { ...cur, [k]: v === '' ? null : v } as Details : cur)) }
  const txt = (k: Key) => (d?.[k] as string | null) ?? ''

  async function save() {
    if (!d || busy) return
    const bad = brandProblem(brand); if (bad) { setError(bad); return }
    setBusy(true); setError(''); setSaved(false); setNote('')
    try { const r = await letterhead.save(token, { ...d, brand_colour: brand }); setD(r.details); setSaved(true); setNote(r.brand_note ?? ''); if (r.brand_colour !== undefined && !r.brand_note) setBrand(r.brand_colour ?? ''); setPreview(p => (p ? { ...p, missing: r.missing } : p)) } catch (e: any) { setError(e?.message ?? 'Could not save. Please try again.') } finally { setBusy(false) }
  }

  if (error && !state) return <p className="text-sm text-red-700" role="alert">{error}</p>
  if (!state || !d) return <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p>

  return (
    <div className="space-y-5">
      {!state.table_ready && <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"><Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> Letterhead details are not switched on yet. Letters use your account name until they are.</p>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="lh-trading" label="Name you trade under" hint={`Printed at the top and in letters. Today letters use: ${state.display_name}`}><input id="lh-trading" className={INPUT} value={txt('trading_name')} onChange={e => set('trading_name', e.target.value)} /></Field>
            <Field id="lh-legal" label="Legal company name" hint="Printed in the footer."><input id="lh-legal" className={INPUT} value={txt('legal_name')} onChange={e => set('legal_name', e.target.value)} /></Field>
          </div>
          {state.organisation_address && !state.details?.address_line1 && <p className="flex gap-2 rounded-lg bg-teal/5 px-3 py-2 text-xs text-neutral-dark"><Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> <span>Letters and newsletters are using the address from Organisation details: <strong>{state.organisation_address}</strong>. Type an address below only if the letterhead should show a different one.</span></p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="lh-a1" label="Address line 1"><input id="lh-a1" className={INPUT} value={txt('address_line1')} onChange={e => set('address_line1', e.target.value)} autoComplete="address-line1" /></Field>
            <Field id="lh-a2" label="Address line 2"><input id="lh-a2" className={INPUT} value={txt('address_line2')} onChange={e => set('address_line2', e.target.value)} autoComplete="address-line2" /></Field>
            <Field id="lh-town" label="Town or city"><input id="lh-town" className={INPUT} value={txt('town')} onChange={e => set('town', e.target.value)} /></Field>
            <Field id="lh-county" label="County"><input id="lh-county" className={INPUT} value={txt('county')} onChange={e => set('county', e.target.value)} /></Field>
            <Field id="lh-pc" label="Postcode"><input id="lh-pc" className={INPUT} value={txt('postcode')} onChange={e => set('postcode', e.target.value)} autoComplete="postal-code" /></Field>
            <Field id="lh-phone" label="Phone"><input id="lh-phone" className={INPUT} value={txt('phone')} onChange={e => set('phone', e.target.value)} inputMode="tel" /></Field>
            <Field id="lh-email" label="Email"><input id="lh-email" className={INPUT} value={txt('email')} onChange={e => set('email', e.target.value)} inputMode="email" /></Field>
            <Field id="lh-web" label="Website"><input id="lh-web" className={INPUT} value={txt('website')} onChange={e => set('website', e.target.value)} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="lh-co" label="Company registration number"><input id="lh-co" className={INPUT} value={txt('company_number')} onChange={e => set('company_number', e.target.value)} /></Field>
            <Field id="lh-in" label="Registered in">
              <select id="lh-in" className={INPUT} value={d.registered_in ?? 'England and Wales'} onChange={e => set('registered_in', e.target.value)}>{state.registered_in_options.map(o => <option key={o}>{o}</option>)}</select>
            </Field>
            {d.registered_in === 'Other' && <Field id="lh-other" label="Registered in (place)"><input id="lh-other" className={INPUT} value={txt('registered_in_other')} onChange={e => set('registered_in_other', e.target.value)} /></Field>}
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-dark"><input type="checkbox" className="h-4 w-4" checked={d.registered_office_same} onChange={e => set('registered_office_same', e.target.checked)} /> The registered office is the address above</label>
          {!d.registered_office_same && <Field id="lh-ro" label="Registered office address"><textarea id="lh-ro" rows={2} className={INPUT} value={txt('registered_office')} onChange={e => set('registered_office', e.target.value)} /></Field>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="lh-vat" label="VAT number (optional)"><input id="lh-vat" className={INPUT} value={txt('vat_number')} onChange={e => set('vat_number', e.target.value)} /></Field>
            <Field id="lh-ico" label="ICO registration number (optional)"><input id="lh-ico" className={INPUT} value={txt('ico_number')} onChange={e => set('ico_number', e.target.value)} /></Field>
            <Field id="lh-cqcp" label="CQC provider ID (optional)"><input id="lh-cqcp" className={INPUT} value={txt('cqc_provider_id')} onChange={e => set('cqc_provider_id', e.target.value)} /></Field>
            <Field id="lh-cqcl" label="CQC location ID (optional)"><input id="lh-cqcl" className={INPUT} value={txt('cqc_location_id')} onChange={e => set('cqc_location_id', e.target.value)} /></Field>
          </div>
          <Field id="lh-foot" label="Footer line (optional)" hint="One short extra line at the bottom of every page."><input id="lh-foot" className={INPUT} value={txt('footer_line')} onChange={e => set('footer_line', e.target.value)} maxLength={160} /></Field>
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-neutral-dark">Logo position</legend>
            <div className="flex gap-4 text-sm">
              {(['left', 'centre'] as const).map(k => <label key={k} className="flex items-center gap-2"><input type="radio" name="lh-align" checked={d.logo_align === k} onChange={() => set('logo_align', k)} /> {k === 'left' ? 'Top left, name and address on the right' : 'Centred at the top'}</label>)}
            </div>
            <p className="mt-1 text-xs text-neutral-mid">{state.has_logo ? 'Your logo is the one in Organisation logo, above.' : 'You have not added a logo yet. Add one under Organisation logo in Settings.'}</p>
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-neutral-dark">Brand colour</legend>
            <p className="mb-2 text-xs text-neutral-mid">Used for the designed newsletters, the line and headings on letters and reports, and the button in emails. Body text stays black.</p>
            <div className="flex flex-wrap items-center gap-3">
              <input type="color" aria-label="Pick a brand colour" value={normaliseHex(brand) ?? DEFAULT_BRAND} onChange={e => { setSaved(false); setBrand(e.target.value.toUpperCase()) }} className="h-9 w-12 cursor-pointer rounded border border-gray-300 bg-white p-0.5" />
              <input aria-label="Brand colour as a hex code" className={INPUT + ' !w-32'} value={brand} placeholder={DEFAULT_BRAND} maxLength={7} onChange={e => { setSaved(false); setBrand(e.target.value) }} />
              <button type="button" onClick={() => { setSaved(false); setBrand('') }} disabled={!brand} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-neutral-dark hover:bg-neutral-light disabled:opacity-40">Clear</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Suggested colours">
              {(state.brand_swatches ?? [DEFAULT_BRAND]).map(c => <button key={c} type="button" onClick={() => { setSaved(false); setBrand(c) }} aria-label={`Use ${c}`} title={c} className={`h-7 w-7 rounded-full border-2 ${normaliseHex(brand) === c ? 'border-neutral-dark' : 'border-white ring-1 ring-gray-300'}`} style={{ background: c }} />)}
            </div>
            {(() => { const shown = brandProblem(brand) ? DEFAULT_BRAND : (normaliseHex(brand) ?? DEFAULT_BRAND); return (
              <div className="mt-2 inline-flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2" aria-label="How the colour looks">
                <span className="text-sm font-bold" style={{ color: shown }}>Sample heading</span>
                <span className="inline-block rounded-md px-3 py-1 text-xs font-semibold text-white" style={{ background: shown }}>Button</span>
                {!brand && <span className="text-xs text-neutral-mid">Default colour</span>}
              </div>) })()}
            {brandProblem(brand) && <p className="mt-1 text-xs text-red-700" role="alert">{brandProblem(brand)}</p>}
            {state.brand_ready === false && <p className="mt-1 text-xs text-amber-800">Saving a brand colour needs a database update first. Everything else on this page still saves.</p>}
            {note && <p className="mt-1 text-xs text-amber-800" role="status">{note}</p>}
          </fieldset>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={busy || !state.table_ready} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />} Save</button>
            {saved && <span className="inline-flex items-center gap-1 text-sm text-green-700" role="status"><CheckCircle2 size={14} aria-hidden="true" /> Saved</span>}
            {error && <span className="text-sm text-red-700" role="alert">{error}</span>}
          </div>
        </div>
        <div className="min-w-0 space-y-3">
          <p className="text-sm font-semibold text-neutral-dark">How it will print</p>
          <div className="no-scrollbar overflow-x-auto rounded-xl bg-neutral-light p-3">
            {preview ? <><style>{preview.css}</style><div dangerouslySetInnerHTML={{ __html: preview.html }} /></> : <p className="text-sm text-neutral-mid">Preview loading</p>}
          </div>
          {(preview?.missing ?? state.missing).length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm">
              <p className="font-medium text-neutral-dark">To make your letters look complete, you could add:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-neutral-mid">{(preview?.missing ?? state.missing).map(m => <li key={m}>{m}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
