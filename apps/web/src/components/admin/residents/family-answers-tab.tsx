'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import type { ResidentContribution, ResidentDetail, ResidentPhoto, ResidentSectionDef, ResidentVideo } from '@/lib/residents-api'
import { photoSrc } from '@/lib/residents-api'
import { Thumb } from './photos'
import { Player, kindName } from './videos'
import { fmtDate } from './ui'

// What family and friends have told you, once approved, grouped under the person who gave it, so an admin can check it
// against the profile. One accordion per person. (The same text is also in the profile, with their name after it.)
export function FamilyAnswersTab({ resident, sections, onExpired }: { resident: ResidentDetail; sections: ResidentSectionDef[]; onExpired?: () => void }) {
  const label = (k: string) => sections.find(s => s.key === k)?.label ?? k
  const order = (k: string) => { const i = sections.findIndex(s => s.key === k); return i < 0 ? 999 : i }

  const approved = resident.contributions.filter(c => c.status === 'approved')
  const rejected = resident.contributions.filter(c => c.status === 'rejected').length
  type Group = { invite_id: string; name: string; relationship: string; items: ResidentContribution[]; photos: ResidentPhoto[]; videos: ResidentVideo[]; latest: string }
  const groups: Group[] = []
  const groupFor = (invite_id: string, name: string, relationship: string | null, when: string) => {
    let g = groups.find(x => x.invite_id === invite_id)
    if (!g) { g = { invite_id, name, relationship: relationship ?? '', items: [], photos: [], videos: [], latest: when }; groups.push(g) }
    if (when > g.latest) g.latest = when
    return g
  }
  for (const c of approved) groupFor(c.invite_id, c.contributor_name, c.relationship, c.decided_at ?? c.submitted_at).items.push(c)
  // Approved photos and videos sent through a family link, under the person who sent them (the home's own uploads are on the Profile tab).
  for (const p of resident.photos.filter(x => x.status === 'approved' && x.source === 'family' && x.invite_id)) groupFor(p.invite_id as string, p.uploaded_by_name, p.relationship, p.decided_at ?? p.submitted_at).photos.push(p)
  for (const v of (resident.videos ?? []).filter(x => x.status === 'approved' && x.source === 'family' && x.invite_id && x.state === 'ready')) groupFor(v.invite_id as string, v.uploaded_by_name, v.relationship, v.decided_at ?? v.submitted_at).videos.push(v)
  groups.sort((a, b) => b.latest.localeCompare(a.latest))
  for (const g of groups) g.items.sort((a, b) => order(a.section_key) - order(b.section_key))
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

  const [open, setOpen] = useState<Record<string, boolean>>(() => (groups.length === 1 ? { [groups[0].invite_id]: true } : {}))
  const toggle = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }))

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-mid">
        What family and friends have shared about {resident.preferred_name || resident.first_name}, as you approved it, under the name of the person who gave it: written answers, photos and video messages.
        The written answers are also in the profile, with their name after them.
      </p>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-neutral-mid">
          Nothing has been approved yet. Approved answers, photos and videos appear here, under the name of the person who gave them.
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map(g => {
            const isOpen = !!open[g.invite_id]
            const panelId = `fa-${g.invite_id}`
            return (
              <section key={g.invite_id} className="rounded-lg border border-gray-200 bg-white">
                <h4>
                  <button type="button" onClick={() => toggle(g.invite_id)} aria-expanded={isOpen} aria-controls={panelId}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-light/60">
                    {isOpen ? <ChevronDown size={16} className="shrink-0 text-neutral-mid" /> : <ChevronRight size={16} className="shrink-0 text-neutral-mid" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-neutral-dark">{g.name}</span>
                      <span className="block truncate text-xs text-neutral-mid">{g.relationship}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-neutral-mid">
                      {[g.items.length ? plural(g.items.length, 'answer', 'answers') : '', g.photos.length ? plural(g.photos.length, 'photo', 'photos') : '', g.videos.filter(x => x.media_kind !== 'audio').length ? plural(g.videos.filter(x => x.media_kind !== 'audio').length, 'video', 'videos') : '', g.videos.filter(x => x.media_kind === 'audio').length ? plural(g.videos.filter(x => x.media_kind === 'audio').length, 'voice note', 'voice notes') : ''].filter(Boolean).join(', ')}
                      {fmtDate(g.latest) && <span className="block">approved {fmtDate(g.latest)}</span>}
                    </span>
                  </button>
                </h4>
                {isOpen && (
                  <div id={panelId} className="border-t border-gray-100">
                  <ul className="divide-y divide-gray-100">
                    {g.items.map(c => (
                      <li key={c.id} className="space-y-1 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-teal">{label(c.section_key)}</p>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-dark">{c.approved_text ?? c.text}</p>
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-mid">
                          {c.decided_at && <span>Approved {fmtDate(c.decided_at)}{c.decided_by ? ` by ${c.decided_by}` : ''}</span>}
                          {c.approved_text && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-800"><Pencil size={11} /> Edited before approving</span>
                          )}
                        </p>
                        {c.approved_text && (
                          <details className="text-xs text-neutral-mid">
                            <summary className="cursor-pointer select-none">See what they wrote</summary>
                            <p className="mt-1 whitespace-pre-line rounded bg-neutral-light/60 p-2">{c.text}</p>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                  {g.photos.length > 0 && (
                    <div className="space-y-2 border-t border-gray-100 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-teal">Photos</p>
                      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {g.photos.map(p => (
                          <li key={p.id} className="space-y-1">
                            <a href={p.url ? photoSrc(p.url) : undefined} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-gray-200 hover:border-teal">
                              <Thumb photo={p} onExpired={() => onExpired?.()} className="aspect-square w-full" />
                            </a>
                            {p.caption && <p className="text-xs text-neutral-dark">{p.caption}</p>}
                            {p.people_note && <p className="text-xs text-neutral-mid">In the photo: {p.people_note}</p>}
                            {p.decided_at && <p className="text-xs text-neutral-mid">Approved {fmtDate(p.decided_at)}{p.decided_by ? ` by ${p.decided_by}` : ''}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {g.videos.length > 0 && (
                    <div className="space-y-2 border-t border-gray-100 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-teal">Video messages and voice notes</p>
                      <ul className="grid gap-3 sm:grid-cols-2">
                        {g.videos.map(v => (
                          <li key={v.id} className="space-y-1">
                            <Player video={v} onExpired={() => onExpired?.()} className="aspect-video w-full rounded-lg" />
                            <p className="text-sm font-medium text-neutral-dark">{v.title || kindName(v)}</p>
                            {v.note && <p className="text-xs text-neutral-mid">{v.note}</p>}
                            {v.decided_at && <p className="text-xs text-neutral-mid">Approved {fmtDate(v.decided_at)}{v.decided_by ? ` by ${v.decided_by}` : ''}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {rejected > 0 && <p className="text-xs text-neutral-mid">{rejected} {rejected === 1 ? 'answer was' : 'answers were'} rejected and is not shown. You can see it under Approvals, in the history.</p>}
    </div>
  )
}
