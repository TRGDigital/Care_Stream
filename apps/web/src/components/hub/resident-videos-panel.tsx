'use client'

// Staff hub, "This is me" topic: video messages from family. Two pieces:
//   MessagesFromFamilyButton  a button in the topic bar (not an always open strip) that lists a named person's approved videos, newest first
//   ChatVideoRow              the videos found by a chat answer, shown under it with the poster and a play button
// Both play in a full screen player with large controls, made for a tablet in the lounge. Pressing play asks the API for a fresh private
// link (and logs who played it), so a link never goes stale in an open page. The links last about ten minutes. The assistant never
// watches a video: answers use the title and note people wrote.

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Check, Clapperboard, Loader2, Play, X } from 'lucide-react'
import { createResidentsClient, photoSrc, type HubVideo } from '@/lib/residents-api'
import { fmtDuration } from '@/lib/video-upload'

type Client = ReturnType<typeof createResidentsClient>

const date = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const from = (v: HubVideo) => `From ${v.uploaded_by_name}${v.relationship ? `, ${v.relationship}` : ''}`

/** Full screen player. Asks for its link on open (which logs the play) and once more, without logging, if the link runs out. */
function PlayerModal({ client, video, name, onClose }: { client: Client; video: HubVideo; name: string; onClose: () => void }) {
  const [src, setSrc] = useState('')
  const [error, setError] = useState('')
  const [retried, setRetried] = useState(false)
  // English text under the video: only present when a manager chose to share it for this video.
  const [text, setText] = useState<{ text: string; language_name: string | null; label: string } | null>(null)

  useEffect(() => {
    let live = true
    client.playVideo(video.id).then(r => { if (live) { setSrc(photoSrc(r.url)); setText(r.translation ?? null) } }).catch(() => { if (live) setError('This video is not available. It may have been removed.') })
    return () => { live = false }
  }, [client, video.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  async function expired() {
    if (retried) { setError('This video stopped loading. Please close it and try again.'); return }
    setRetried(true)
    try { const r = await client.playVideo(video.id, true); setSrc(photoSrc(r.url)) } catch { setError('This video is not available. It may have been removed.') }
  }

  // Just the video: a dimmed backdrop, the player, and a small close button. Click outside or press Escape to close.
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3 sm:p-6" role="dialog" aria-modal="true"
      aria-label={`Video message${video.title ? `: ${video.title}` : ''}`} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative">
        <button type="button" onClick={onClose} aria-label="Close video"
          className="absolute -top-3 -right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-dark shadow-md hover:bg-neutral-light">
          <X size={20} aria-hidden="true" />
        </button>
        {error ? <p role="alert" className="max-w-md rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-lg text-red-700">{error}</p>
          : !src ? <div className="flex h-48 w-72 items-center justify-center rounded-xl bg-white"><Loader2 size={36} className="animate-spin text-teal" aria-label="Loading" /></div>
          : (
            <div className="flex flex-col items-center gap-2">
              <video key={src} src={src} controls autoPlay playsInline preload="auto" poster={photoSrc(video.poster_url)} onError={expired} className={`${text ? 'max-h-[60vh]' : 'max-h-[85vh]'} max-w-[92vw] rounded-xl bg-black`} />
              {text && (
                <div className="max-h-[22vh] w-full max-w-[92vw] overflow-y-auto rounded-xl bg-white px-4 py-3" aria-label="English translation">
                  <p className="text-xs font-medium text-neutral-mid">{text.label}{text.language_name ? `. Spoken in ${text.language_name}.` : ''}</p>
                  <p className="mt-1 whitespace-pre-line text-base leading-relaxed text-neutral-dark">{text.text}</p>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  )
}

function Tile({ v, onPlay, watchedAt }: { v: HubVideo; onPlay: () => void; watchedAt?: string }) {
  // "New" means nobody has played it yet. Playing it here clears the tag at once (watchedAt), before the list is reloaded.
  const watched = !!watchedAt || !!v.watched
  const isNew = v.is_new !== undefined ? v.is_new && !watchedAt : false
  const approvedDiffers = v.approved_at && v.sent_at && date(v.approved_at) !== date(v.sent_at)
  return (
    <li className="min-w-0">
      <button type="button" onClick={onPlay} aria-label={`Play ${v.title || 'video message'}, ${from(v)}${isNew ? ', new' : ''}`}
        className="group relative block aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 hover:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40">
        {v.poster_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoSrc(v.poster_url)} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-teal shadow-md group-hover:scale-105"><Play size={30} className="ml-1" aria-hidden="true" /></span>
        </span>
        {isNew && <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white shadow">New</span>}
        {v.duration_seconds ? <span className="absolute bottom-1.5 right-1.5 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-neutral-dark">{fmtDuration(v.duration_seconds)}</span> : null}
      </button>
      {(v.resident_name || v.room) && <p className="mt-1.5 text-sm font-semibold text-teal">{[v.resident_name, v.room ? `Room ${v.room}` : ''].filter(Boolean).join(', ')}</p>}
      <p className="text-base font-medium leading-snug text-neutral-dark">{v.title || 'Video message'}</p>
      <p className="text-sm text-neutral-mid">{from(v)}</p>
      {(v.sent_at || v.submitted_at) && (
        <p className="text-xs text-neutral-mid">Sent {date(v.sent_at ?? v.submitted_at)}{approvedDiffers ? `, approved ${date(v.approved_at as string)}` : ''}</p>
      )}
      {v.is_new !== undefined && (watched
        ? <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-green-700"><Check size={12} aria-hidden="true" /> Watched{(watchedAt || v.last_played_at) ? ` ${date(watchedAt ?? v.last_played_at ?? null)}` : ''}</p>
        : <p className="mt-0.5 text-xs font-medium text-amber-700">Not watched yet</p>)}
    </li>
  )
}

/** The "Messages from family" button for the This is me topic. It lists the rooms that have an approved video, then that room's videos. */
export function MessagesFromFamilyButton({ token }: { token: string }) {
  const client = useMemo(() => createResidentsClient(token), [token])
  type Room = { key: string; label: string; count: number; new_count: number; people: Array<{ id: string; name: string }> }
  const [rooms, setRooms] = useState<Room[]>([])
  const [newTotal, setNewTotal] = useState(0)
  const [open, setOpen] = useState(false)
  const [room, setRoom] = useState<Room | null>(null)
  const [videos, setVideos] = useState<HubVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState<HubVideo | null>(null)
  const [watched, setWatched] = useState<Record<string, string>>({})
  const [find, setFind] = useState('')

  const loadRooms = () => client.hubVideoRooms().then(d => { setRooms(d.rooms ?? []); setNewTotal(d.new_count ?? 0) }).catch(() => { /* optional: stay quiet if the plan or table is not ready */ })
  useEffect(() => {
    let live = true
    client.hubVideoRooms().then(d => { if (live) { setRooms(d.rooms ?? []); setNewTotal(d.new_count ?? 0) } }).catch(() => { /* optional */ })
    const t = setInterval(() => { client.hubVideoRooms().then(d => { if (live) { setRooms(d.rooms ?? []); setNewTotal(d.new_count ?? 0) } }).catch(() => { /* optional */ }) }, 60_000)
    return () => { live = false; clearInterval(t) }
  }, [client])

  function chooseRoom(r: Room) {
    setRoom(r); setVideos([]); setLoading(true)
    client.hubRoomVideos(r.key).then(d => setVideos(d.videos ?? [])).catch(() => setVideos([])).finally(() => setLoading(false))
  }
  // Two stages: first the rooms that have videos, then (only after a room is chosen) that room's videos. Even one room is shown as a room.
  function show() { setOpen(true); setRoom(null); setVideos([]) }
  function backToRooms() { setRoom(null); setVideos([]); void loadRooms() }
  function close() { setOpen(false); setRoom(null); setVideos([]); setFind(''); void loadRooms() }
  function play(v: HubVideo) { setPlaying(v); setWatched(w => (w[v.id] ? w : { ...w, [v.id]: new Date().toISOString() })) }

  useEffect(() => {
    if (!open || playing) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, playing])

  if (rooms.length === 0) return null
  const q = find.trim().toLowerCase()
  const shown = rooms.filter(r => !q || r.label.toLowerCase().includes(q) || r.people.some(p => p.name.toLowerCase().includes(q)))

  return (
    <>
      <button type="button" onClick={show} className="flex items-center gap-1 rounded-md border border-teal/40 bg-teal/5 px-2.5 py-1 text-xs font-semibold text-teal hover:bg-teal/10">
        <Clapperboard size={13} aria-hidden="true" /> Messages from family
        {newTotal > 0 && <span className="ml-0.5 rounded-full bg-rose-500 px-1.5 py-px text-[10px] font-bold text-white" aria-label={`${newTotal} new`}>{newTotal} new</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
          <div role="dialog" aria-modal="true" aria-label="Messages from family" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                {room && (
                  <button type="button" onClick={backToRooms} aria-label="Back to the list of rooms" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-neutral-mid hover:bg-neutral-light"><ArrowLeft size={20} /></button>
                )}
                <h2 className="truncate text-lg font-semibold text-neutral-dark">{room ? room.label : 'Messages from family'}</h2>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-neutral-mid hover:bg-neutral-light"><X size={22} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!room ? (
                <div className="space-y-3">
                  <p className="text-base text-neutral-mid">Choose a room to see its video messages.</p>
                  {rooms.length > 8 && <input value={find} onChange={e => setFind(e.target.value)} placeholder="Find a room or a person" aria-label="Find a room or a person" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:w-72" />}
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {shown.map(r => (
                      <li key={r.key}>
                        <button type="button" onClick={() => chooseRoom(r)} className="flex min-h-[64px] w-full items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left hover:border-teal hover:bg-teal/5">
                          <span className="min-w-0">
                            <span className="block truncate text-lg font-semibold text-neutral-dark">{r.label}</span>
                            <span className="block truncate text-sm text-neutral-mid">{r.people.map(p => p.name).join(', ')}</span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-sm text-neutral-mid">{r.count} {r.count === 1 ? 'message' : 'messages'}</span>
                            {r.new_count > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{r.new_count} new</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : loading ? <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-teal" aria-label="Loading" /></div>
                : videos.length === 0 ? <p className="text-base text-neutral-mid">There are no video messages for {room.label} just now.</p>
                : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={`Video messages for ${room.label}`}>{videos.map(v => <Tile key={v.id} v={v} watchedAt={watched[v.id]} onPlay={() => play(v)} />)}</ul>}
            </div>
          </div>
        </div>
      )}
      {playing && <PlayerModal client={client} video={playing} name={playing.resident_name ?? room?.label ?? ''} onClose={() => setPlaying(null)} />}
    </>
  )
}

/** Videos found by a chat answer, shown under it. Tap one to play it full screen. */
export function ChatVideoRow({ videos, name = '' }: { videos: HubVideo[]; name?: string }) {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const client = useMemo(() => (token ? createResidentsClient(token) : null), [token])
  const [playing, setPlaying] = useState<HubVideo | null>(null)
  const [seen, setSeen] = useState<Record<string, string>>({})
  if (!client) return null
  return (
    <div className="mt-2 pl-10">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Video messages">{videos.map(v => <Tile key={v.id} v={v} watchedAt={seen[v.id]} onPlay={() => { setPlaying(v); setSeen(x => (x[v.id] ? x : { ...x, [v.id]: new Date().toISOString() })) }} />)}</ul>
      {playing && <PlayerModal client={client} video={playing} name={name} onClose={() => setPlaying(null)} />}
    </div>
  )
}
