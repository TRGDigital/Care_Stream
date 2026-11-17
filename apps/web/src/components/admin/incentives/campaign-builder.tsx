'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2, X, ImagePlus, Search } from 'lucide-react'
import {
  createIncentivesClient,
  type IncentiveCampaignDetail, type IncentiveCampaignInput, type RuleEventDef, type RuleEvent,
} from '@/lib/incentives-api'
import { inputCls, btnPrimary, btnSecondary, btnDangerOutline, ErrorBox, errMsg, Field } from '@/components/admin/residents/ui'
import { Section, currentMonth, monthLabel } from './shared'
import { resizeImageToDataUrl } from './image-utils'

export interface StaffOption { id: string; name: string; job_role: string | null }

interface RuleRow { rid: number; event: RuleEvent; points: string; max: string }
interface RewardRow { rid: number; key: string; title: string; image: string | null; target: string; limited: boolean; quantity: string; value: string }

let ridCounter = 1
const nextRid = () => ridCounter++

function fromDetail(d: IncentiveCampaignDetail | null, events: RuleEventDef[]) {
  if (!d) {
    const first = events[0]
    return {
      name: '', month: currentMonth(), everyone: true, chosen: [] as string[],
      rules: [{ rid: nextRid(), event: (first?.key ?? 'training_completed') as RuleEvent, points: String(first?.suggested_points ?? 10), max: '' }] as RuleRow[],
      rewards: [{ rid: nextRid(), key: 'r1', title: '', image: null, target: '100', limited: false, quantity: '1', value: '' }] as RewardRow[],
      targets: {} as Record<string, Record<string, string>>,
    }
  }
  const targets: Record<string, Record<string, string>> = {}
  for (const p of d.participants) {
    const t: Record<string, string> = {}
    for (const [k, v] of Object.entries(p.targets ?? {})) t[k] = String(v)
    if (Object.keys(t).length) targets[p.user_id] = t
  }
  return {
    name: d.name, month: d.month, everyone: d.everyone,
    chosen: d.everyone ? [] : d.participants.map(p => p.user_id),
    rules: d.rules.map(r => ({ rid: nextRid(), event: r.event, points: String(r.points), max: r.max_per_month == null ? '' : String(r.max_per_month) })),
    rewards: d.rewards.map(r => ({
      rid: nextRid(), key: r.key, title: r.title, image: r.image_data, target: String(r.target_points),
      limited: r.quantity != null, quantity: r.quantity == null ? '1' : String(r.quantity),
      value: r.value_pence == null ? '' : (r.value_pence / 100).toFixed(2),
    })),
    targets,
  }
}

const isInt = (s: string) => /^\d+$/.test(s.trim())

export function CampaignBuilder({ token, events, maxImageBytes, staff, staffLoading, existing, onClose, onSaved }: {
  token: string
  events: RuleEventDef[]
  maxImageBytes: number
  staff: StaffOption[]
  staffLoading: boolean
  existing: IncentiveCampaignDetail | null
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const init = useMemo(() => fromDetail(existing, events), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [name, setName] = useState(init.name)
  const [month, setMonth] = useState(init.month)
  const [everyone, setEveryone] = useState(init.everyone)
  const [chosen, setChosen] = useState<string[]>(init.chosen)
  const [search, setSearch] = useState('')
  const [rules, setRules] = useState<RuleRow[]>(init.rules)
  const [rewards, setRewards] = useState<RewardRow[]>(init.rewards)
  const [targets, setTargets] = useState<Record<string, Record<string, string>>>(init.targets)
  const [errors, setErrors] = useState<string[]>([])
  const [apiError, setApiError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'save' | 'submit' | null>(null)
  const [imgError, setImgError] = useState<Record<number, string>>({})
  const topRef = useRef<HTMLDivElement>(null)
  const dirty = useRef(false)
  const savedId = useRef<string | null>(existing?.id ?? null)   // set once created, so a retry updates instead of duplicating
  const eventMap = useMemo(() => Object.fromEntries(events.map(e => [e.key, e])) as Record<string, RuleEventDef>, [events])
  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff])

  // Escape closes (asks first if something was changed). Focus moves into the panel on open.
  useEffect(() => {
    topRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[data-nested-dialog]')) return
      if (!dirty.current || window.confirm('Close without saving your changes?')) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const touch = () => { dirty.current = true }
  const maxBytes = Math.min(150 * 1024, maxImageBytes || 150 * 1024)

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? staff.filter(s => s.name.toLowerCase().includes(q) || (s.job_role ?? '').toLowerCase().includes(q)) : staff
  }, [staff, search])

  const targetPeople = everyone ? staff : chosen.map(id => staffMap[id]).filter(Boolean)

  function toggleStaff(id: string) {
    touch()
    setChosen(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id])
  }
  function updateRule(rid: number, patch: Partial<RuleRow>) { touch(); setRules(r => r.map(x => x.rid === rid ? { ...x, ...patch } : x)) }
  function updateReward(rid: number, patch: Partial<RewardRow>) { touch(); setRewards(r => r.map(x => x.rid === rid ? { ...x, ...patch } : x)) }
  function addRule() {
    touch()
    const used = new Set(rules.map(r => r.event))
    const def = events.find(e => !used.has(e.key)) ?? events[0]
    setRules(r => [...r, { rid: nextRid(), event: (def?.key ?? 'training_completed') as RuleEvent, points: String(def?.suggested_points ?? 10), max: '' }])
  }
  function addReward() {
    touch()
    setRewards(r => {
      let n = r.length + 1
      while (r.some(x => x.key === `r${n}`)) n++
      return [...r, { rid: nextRid(), key: `r${n}`, title: '', image: null, target: '100', limited: false, quantity: '1', value: '' }]
    })
  }
  function setTarget(userId: string, key: string, value: string) {
    touch()
    setTargets(t => ({ ...t, [userId]: { ...(t[userId] ?? {}), [key]: value } }))
  }

  async function pickImage(rid: number, file: File | undefined) {
    if (!file) return
    setImgError(e => { const n = { ...e }; delete n[rid]; return n })
    try { updateReward(rid, { image: await resizeImageToDataUrl(file, maxBytes) }) }
    catch (e) { setImgError(x => ({ ...x, [rid]: errMsg(e) })) }
  }

  function validate(): string[] {
    const out: string[] = []
    if (!name.trim()) out.push('Give the incentive a name.')
    if (!/^\d{4}-\d{2}$/.test(month)) out.push('Choose a month.')
    else if (month < currentMonth() && !(existing && existing.month === month)) out.push(`Choose ${monthLabel(currentMonth())} or a later month. A past month cannot be used.`)
    if (!everyone && chosen.length === 0) out.push('Choose at least one member of staff, or switch to Everyone.')
    if (rules.length === 0) out.push('Add at least one way to earn points.')
    rules.forEach((r, i) => {
      const label = eventMap[r.event]?.label ?? `Rule ${i + 1}`
      if (!isInt(r.points) || +r.points < 1 || +r.points > 1000) out.push(`"${label}": points must be a whole number from 1 to 1000.`)
      if (r.max.trim() !== '' && (!isInt(r.max) || +r.max < 1)) out.push(`"${label}": the most times it can earn must be a whole number of 1 or more, or left empty.`)
    })
    if (rewards.length === 0) out.push('Add at least one reward.')
    rewards.forEach((r, i) => {
      const label = r.title.trim() || `Reward ${i + 1}`
      if (!r.title.trim()) out.push(`Reward ${i + 1}: give it a title, for example "£25.00 M&S voucher".`)
      if (!isInt(r.target) || +r.target < 1) out.push(`"${label}": the points target must be a whole number of 1 or more.`)
      if (r.limited && (!isInt(r.quantity) || +r.quantity < 1)) out.push(`"${label}": the number of places must be a whole number of 1 or more.`)
      if (r.value.trim() !== '' && !(/^\d+(\.\d{1,2})?$/.test(r.value.trim()))) out.push(`"${label}": the value must be an amount in pounds, for example 25 or 25.00.`)
    })
    for (const [uid, t] of Object.entries(targets)) {
      for (const [k, v] of Object.entries(t)) {
        if (v.trim() !== '' && (!isInt(v) || +v < 1)) {
          const rw = rewards.find(r => r.key === k)
          if (rw) out.push(`${staffMap[uid]?.name ?? 'A person'}: the target for "${rw.title.trim() || k}" must be a whole number of 1 or more, or left empty.`)
        }
      }
    }
    return out
  }

  function build(): IncentiveCampaignInput {
    const keys = new Set(rewards.map(r => r.key))
    const cleanTargets = (uid: string) => {
      const out: Record<string, number> = {}
      for (const [k, v] of Object.entries(targets[uid] ?? {})) {
        if (!keys.has(k) || v.trim() === '') continue
        const rw = rewards.find(r => r.key === k)!
        if (+v !== +rw.target) out[k] = +v
      }
      return out
    }
    const ids = everyone ? Object.keys(targets) : chosen
    const participants = ids
      .map(uid => ({ user_id: uid, targets: cleanTargets(uid) }))
      .filter(p => !everyone || Object.keys(p.targets).length > 0)
    return {
      name: name.trim(), month, everyone, participants,
      rules: rules.map(r => ({ event: r.event, points: +r.points, max_per_month: r.max.trim() === '' ? null : +r.max })),
      rewards: rewards.map(r => ({
        key: r.key, title: r.title.trim(), image_data: r.image, target_points: +r.target,
        quantity: r.limited ? +r.quantity : null,
        value_pence: r.value.trim() === '' ? null : Math.round(parseFloat(r.value) * 100),
      })),
    }
  }

  async function save(andSubmit: boolean) {
    setApiError(null)
    const problems = validate()
    setErrors(problems)
    if (problems.length) { topRef.current?.scrollIntoView({ block: 'start' }); return }
    setBusy(andSubmit ? 'submit' : 'save')
    const api = createIncentivesClient(token)
    let id = savedId.current
    try {
      const body = build()
      const saved = id ? await api.update(id, body) : await api.create(body)
      id = saved.id; savedId.current = saved.id
      if (andSubmit) await api.submit(saved.id)
      dirty.current = false
      onSaved(saved.id)
    } catch (e) {
      // If the save worked but the submit did not, the draft exists: say so and let them retry.
      setApiError(andSubmit && id ? `Your incentive was saved as a draft, but could not be submitted: ${errMsg(e)}` : errMsg(e))
      setBusy(null)
      topRef.current?.scrollIntoView({ block: 'start' })
    }
  }

  const rewardHeading = (r: RewardRow, i: number) => r.title.trim() || `Reward ${i + 1}`

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-light" role="dialog" aria-modal="true" aria-label={existing ? 'Edit incentive' : 'New incentive'}>
      <div className="mx-auto max-w-4xl px-4 py-4 sm:py-8">
        <div ref={topRef} tabIndex={-1} className="mb-4 flex items-start justify-between gap-3 focus:outline-none">
          <div>
            <h2 className="text-xl font-bold text-neutral-dark">{existing ? 'Edit incentive' : 'New incentive'}</h2>
            <p className="mt-0.5 text-sm text-neutral-mid">A care manager approves the incentive before it goes live.</p>
          </div>
          <button type="button" onClick={() => { if (!dirty.current || window.confirm('Close without saving your changes?')) onClose() }} aria-label="Close" className="rounded-lg p-2 text-neutral-mid hover:bg-white"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          {errors.length > 0 && (
            <ErrorBox>
              <p className="font-semibold">Please fix the following before saving.</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </ErrorBox>
          )}
          {apiError && <ErrorBox>{apiError}</ErrorBox>}

          <Section title="The basics">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" htmlFor="inc-name">
                <input id="inc-name" className={inputCls} value={name} maxLength={120} placeholder="For example, November training push" onChange={e => { touch(); setName(e.target.value) }} />
              </Field>
              <Field label="Month" htmlFor="inc-month" hint="Points count from the first to the last day of this month.">
                <input id="inc-month" type="month" className={inputCls} value={month} min={currentMonth()} onChange={e => { touch(); setMonth(e.target.value) }} />
              </Field>
            </div>
          </Section>

          <Section title="Who can take part">
            <div className="flex flex-col gap-2 sm:flex-row" role="radiogroup" aria-label="Who can take part">
              <label className={`flex flex-1 cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${everyone ? 'border-teal bg-teal-light/10' : 'border-gray-200'}`}>
                <input type="radio" name="inc-who" checked={everyone} onChange={() => { touch(); setEveryone(true) }} className="mt-0.5" />
                <span><span className="font-medium text-neutral-dark">Everyone</span><br /><span className="text-xs text-neutral-mid">All current staff, agency staff excluded</span></span>
              </label>
              <label className={`flex flex-1 cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${!everyone ? 'border-teal bg-teal-light/10' : 'border-gray-200'}`}>
                <input type="radio" name="inc-who" checked={!everyone} onChange={() => { touch(); setEveryone(false) }} className="mt-0.5" />
                <span><span className="font-medium text-neutral-dark">Choose staff</span><br /><span className="text-xs text-neutral-mid">Pick the people who can take part</span></span>
              </label>
            </div>
            {!everyone && (
              <div className="mt-3">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input aria-label="Search staff" className={`${inputCls} pl-8`} placeholder="Search by name or job role" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-neutral-mid">{chosen.length} chosen</span>
                  <button type="button" className="font-semibold text-teal hover:underline" onClick={() => { touch(); setChosen(c => Array.from(new Set([...c, ...shown.map(s => s.id)]))) }}>Choose everyone shown</button>
                  <button type="button" className="font-semibold text-teal hover:underline" onClick={() => { touch(); setChosen([]) }}>Clear</button>
                </div>
                <ul className="mt-2 max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200" aria-label="Staff">
                  {staffLoading && staff.length === 0 && <li className="p-3 text-sm text-neutral-mid">Loading staff...</li>}
                  {!staffLoading && shown.length === 0 && <li className="p-3 text-sm text-neutral-mid">No staff match.</li>}
                  {shown.map(s => (
                    <li key={s.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-neutral-light">
                        <input type="checkbox" checked={chosen.includes(s.id)} onChange={() => toggleStaff(s.id)} />
                        <span className="min-w-0 flex-1 truncate font-medium text-neutral-dark">{s.name}</span>
                        <span className="shrink-0 text-xs text-neutral-mid">{s.job_role ?? ''}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          <Section title="How points are earned" hint="CareStream adds points automatically when these things are recorded. Nobody can add points by hand.">
            <div className="space-y-3">
              {rules.map((r, i) => (
                <div key={r.rid} className="rounded-lg border border-gray-200 p-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_7rem_10rem_auto] sm:items-end">
                    <Field label="Event" htmlFor={`rule-event-${r.rid}`}>
                      <select id={`rule-event-${r.rid}`} className={inputCls} value={r.event}
                        onChange={e => { const ev = e.target.value as RuleEvent; updateRule(r.rid, { event: ev, points: String(eventMap[ev]?.suggested_points ?? r.points) }) }}>
                        {events.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Points" htmlFor={`rule-points-${r.rid}`}>
                      <input id={`rule-points-${r.rid}`} inputMode="numeric" className={inputCls} value={r.points} onChange={e => updateRule(r.rid, { points: e.target.value })} />
                    </Field>
                    <Field label="Most times per person" htmlFor={`rule-max-${r.rid}`}>
                      <input id={`rule-max-${r.rid}`} inputMode="numeric" className={inputCls} value={r.max} placeholder="No limit" onChange={e => updateRule(r.rid, { max: e.target.value })} />
                    </Field>
                    <button type="button" aria-label={`Remove rule ${i + 1}`} disabled={rules.length === 1} onClick={() => { touch(); setRules(x => x.filter(y => y.rid !== r.rid)) }} className="justify-self-start rounded-lg p-2 text-neutral-mid hover:bg-neutral-light disabled:opacity-30"><Trash2 size={16} /></button>
                  </div>
                  {eventMap[r.event]?.help && <p className="mt-2 text-xs text-neutral-mid">{eventMap[r.event].help}</p>}
                </div>
              ))}
              <button type="button" className={btnSecondary} onClick={addRule}><Plus size={14} /> Add a way to earn points</button>
            </div>
          </Section>

          <Section title="Rewards" hint={<>
            <p>Reaching the points target unlocks the reward. CareStream only records and reports. It never buys vouchers or moves money.</p>
            <p className="mt-1 font-medium text-amber-700">Cash and many gift cards count as pay. Check with your payroll provider.</p>
          </>}>
            <div className="space-y-3">
              {rewards.map((r, i) => (
                <div key={r.rid} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-neutral-dark">{rewardHeading(r, i)}</p>
                    <button type="button" aria-label={`Remove ${rewardHeading(r, i)}`} disabled={rewards.length === 1} onClick={() => { touch(); setRewards(x => x.filter(y => y.rid !== r.rid)) }} className="rounded-lg p-1.5 text-neutral-mid hover:bg-neutral-light disabled:opacity-30"><Trash2 size={16} /></button>
                  </div>
                  <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_8rem]">
                    <Field label="Title" htmlFor={`rw-title-${r.rid}`}>
                      <input id={`rw-title-${r.rid}`} className={inputCls} value={r.title} maxLength={120} placeholder="For example, £25.00 M&S voucher" onChange={e => updateReward(r.rid, { title: e.target.value })} />
                    </Field>
                    <Field label="Points target" htmlFor={`rw-target-${r.rid}`}>
                      <input id={`rw-target-${r.rid}`} inputMode="numeric" className={inputCls} value={r.target} onChange={e => updateReward(r.rid, { target: e.target.value })} />
                    </Field>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {r.image
                      ? <img src={r.image} alt={`Picture for ${rewardHeading(r, i)}`} className="h-16 w-16 rounded-lg border border-gray-200 object-contain" />
                      : <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400"><ImagePlus size={20} /></div>}
                    <div className="space-y-1">
                      <label className={`${btnSecondary} cursor-pointer`}>
                        {r.image ? 'Change image' : 'Add an image'}
                        <input type="file" accept="image/*" className="sr-only" onChange={e => { pickImage(r.rid, e.target.files?.[0]); e.target.value = '' }} />
                      </label>
                      {r.image && <button type="button" className={`${btnDangerOutline} ml-2`} onClick={() => updateReward(r.rid, { image: null })}>Remove image</button>}
                      <p className="text-xs text-neutral-mid">Optional, for example a shop logo. It is shrunk to fit.</p>
                      {imgError[r.rid] && <p role="alert" className="text-xs text-red-700">{imgError[r.rid]}</p>}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="flex cursor-pointer items-start gap-2 text-sm">
                        <input type="checkbox" role="switch" className="mt-1" checked={r.limited} onChange={e => updateReward(r.rid, { limited: e.target.checked })} />
                        <span><span className="font-medium text-neutral-dark">Limited places</span><br /><span className="text-xs text-neutral-mid">First to reach it gets it, by earliest completion time. Off means everyone who reaches it.</span></span>
                      </label>
                      {r.limited && (
                        <div className="mt-2 max-w-[10rem]">
                          <Field label="Number of places" htmlFor={`rw-qty-${r.rid}`}>
                            <input id={`rw-qty-${r.rid}`} inputMode="numeric" className={inputCls} value={r.quantity} onChange={e => updateReward(r.rid, { quantity: e.target.value })} />
                          </Field>
                        </div>
                      )}
                    </div>
                    <Field label="Value of each reward in pounds (optional)" htmlFor={`rw-value-${r.rid}`} hint="Used only to total what the scheme costs.">
                      <input id={`rw-value-${r.rid}`} inputMode="decimal" className={inputCls} value={r.value} placeholder="25.00" aria-describedby={`rw-value-${r.rid}-hint`} onChange={e => updateReward(r.rid, { value: e.target.value })} />
                    </Field>
                  </div>
                </div>
              ))}
              <button type="button" className={btnSecondary} onClick={addReward}><Plus size={14} /> Add a reward</button>
            </div>
          </Section>

          <Section title="Different targets for one person (optional)" hint="Leave a box empty to use the reward's own target. Useful for part time staff.">
            {targetPeople.length === 0 ? (
              <p className="text-sm text-neutral-mid">{staffLoading ? 'Loading staff...' : 'Choose some staff above to set their targets.'}</p>
            ) : (
              <div className="max-h-80 overflow-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead className="sticky top-0 bg-neutral-light text-xs text-neutral-mid">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Person</th>
                      {rewards.map((r, i) => <th key={r.rid} scope="col" className="px-3 py-2 font-medium">{rewardHeading(r, i)} <span className="font-normal">(default {r.target || '0'})</span></th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {targetPeople.map(p => (
                      <tr key={p.id}>
                        <th scope="row" className="px-3 py-1.5 font-medium text-neutral-dark">{p.name}</th>
                        {rewards.map((r, i) => (
                          <td key={r.rid} className="px-3 py-1.5">
                            <input aria-label={`${p.name}, target for ${rewardHeading(r, i)}`} inputMode="numeric" className={`${inputCls} w-24`} placeholder={r.target}
                              value={targets[p.id]?.[r.key] ?? ''} onChange={e => setTarget(p.id, r.key, e.target.value)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border">
            <p className="mr-auto text-xs text-neutral-mid">A care manager approves the incentive before it goes live.</p>
            <button type="button" className={btnSecondary} onClick={() => { if (!dirty.current || window.confirm('Close without saving your changes?')) onClose() }} disabled={busy !== null}>Cancel</button>
            <button type="button" className={btnSecondary} onClick={() => save(false)} disabled={busy !== null}>{busy === 'save' ? 'Saving...' : 'Save draft'}</button>
            <button type="button" className={btnPrimary} onClick={() => save(true)} disabled={busy !== null}>{busy === 'submit' ? 'Submitting...' : 'Submit for approval'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
