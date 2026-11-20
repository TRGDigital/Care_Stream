'use client'

// Staff hub, "This is me" topic: video messages from family. Two pieces:
//   MessagesFromFamilyButton  a button in the topic bar (not an always open strip) that lists a named person's approved videos, newest first
//   ChatVideoRow              the videos found by a chat answer, shown under it with the poster and a play button
// Both play in a full screen player with large controls, made for a tablet in the lounge. Pressing play asks the API for a fresh private
// link (and logs who played it), so a link never goes stale in an open page. The links last about ten minutes. The assistant never
// watches a video: answers use the title and note people wrote.

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Clapperboard, Loader2, Play, X } from 'lucide-react'
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

  useEffect(() => {
    let live = true
    client.playVideo(video.id).then(r => { if (live) setSrc(photoSrc(r.url)) }).catch(() => { if (live) setError('This video is not available. It may have been removed.') })
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

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label={`Video message${video.title ? `: ${video.title}` : ''}`}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-neutral-dark">{video.title || 'Video message'}</p>
          <p className="truncate text-sm text-neutral-mid">{name ? `For ${name}. ` : ''}{from(video)}{video.submitted_at ? `, ${date(video.submitted_at)}` : ''}</p>
        </div>
        <button type="button" onClick={onClose} className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl border border-gray-300 px-4 text-base font-semibold text-neutral-dark hover:bg-neutral-light">
          <X size={20} aria-hidden="true" /> Close
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-50 p-2 sm:p-4">
        {error ? <p role="alert" className="max-w-md rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-lg text-red-700">{error}</p>
          : !src ? <Loader2 size={36} className="animate-spin text-teal" aria-label="Loading" />
          : <video key={src} src={src} controls autoPlay playsInline preload="auto" poster={photoSrc(video.poster_url)} onError={expired} className="max-h-full max-w-full rounded-xl bg-black" />}
      </div>
      {video.note && <p className="border-t border-gray-200 px-4 py-3 text-base text-neutral-dark">{video.note}</p>}
    </div>
  )
}

function Tile({ v, onPlay }: { v: HubVideo; onPlay: () => void }) {
  return (
    <li className="min-w-0">
      <button type="button" onClick={onPlay} aria-label={`Play ${v.title || 'video message'}, ${from(v)}`}
        className="group relative block aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 hover:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40">
        {v.poster_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoSrc(v.poster_url)} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-teal shadow-md group-hover:scale-105"><Play size={30} className="ml-1" aria-hidden="true" /></span>
        </span>
        {v.duration_seconds ? <span className="absolute bottom-1.5 right-1.5 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-neutral-dark">{fmtDuration(v.duration_seconds)}</span> : null}
      </button>
      <p className="mt-1.5 text-base font-medium leading-snug text-neutral-dark">{v.title || 'Video message'}</p>
      <p className="text-sm text-neutral-mid">{from(v)}</p>
      {v.submitted_at && <p className="text-xs text-neutral-mid">{date(v.submitted_at)}</p>}
    </li>
  )
}

/** The "Messages from family" button for the This is me topic. It only shows when someone has an approved video. */
export function MessagesFromFamilyButton({ token }: { token: string }) {
  const client = useMemo(() => createResidentsClient(token), [token])
  const [people, setPeople] = useState<Array<{ id: string; name: string; count: number }>>([])
  const [open, setOpen] = useState(false)
  const [who, setWho] = useState<{ id: string; name: string } | null>(null)
  const [videos, setVideos] = useState<HubVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState<HubVideo | null>(null)
  const [find, setFind] = useState('')

  useEffect(() => {
    let live = true
    client.hubVideoPeople().then(d => { if (live) setPeople(d.people ?? []) }).catch(() => { /* optional: stay quiet if the plan or table is not ready */ })
    return () => { live = false }
  }, [client])

  function choose(p: { id: string; name: string }) {
    setWho(p); setVideos([]); setLoading(true)
    client.hubVideos(p.id).then(d => setVideos(d.videos ?? [])).catch(() => setVideos([])).finally(() => setLoading(false))
  }
  function show() {
    setOpen(true)
    if (people.length === 1) choose(people[0])
  }
  function close() { setOpen(false); setWho(null); setVideos([]); setFind('') }

  useEffect(() => {
    if (!open || playing) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, playing])

  if (people.length === 0) return null
  const shown = people.filter(p => !find.trim() || p.name.toLowerCase().includes(find.trim().toLowerCase()))

  return (
    <>
      <button type="button" onClick={show} className="flex items-center gap-1 rounded-md border border-teal/40 bg-teal/5 px-2.5 py-1 text-xs font-semibold text-teal hover:bg-teal/10">
        <Clapperboard size={13} aria-hidden="true" /> Messages from family
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
          <div role="dialog" aria-modal="true" aria-label="Messages from family" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                {who && people.length > 1 && (
                  <button type="button" onClick={() => { setWho(null); setVideos([]) }} aria-label="Back to the list of people" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-neutral-mid hover:bg-neutral-light"><ArrowLeft size={20} /></button>
                )}
                <h2 className="truncate text-lg font-semibold text-neutral-dark">{who ? `Messages for ${who.name}` : 'Messages from family'}</h2>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-neutral-mid hover:bg-neutral-light"><X size={22} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!who ? (
                <div className="space-y-3">
                  <p className="text-base text-neutral-mid">Choose who you would like to play a message for.</p>
                  {people.length > 8 && <input value={find} onChange={e => setFind(e.target.value)} placeholder="Find a person" aria-label="Find a person" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:w-72" />}
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {shown.map(p => (
                      <li key={p.id}>
                        <button type="button" onClick={() => choose(p)} className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left text-lg font-medium text-neutral-dark hover:border-teal hover:bg-teal/5">
                          <span className="truncate">{p.name}</span><span className="shrink-0 text-sm font-normal text-neutral-mid">{p.count} {p.count === 1 ? 'message' : 'messages'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : loading ? <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-teal" aria-label="Loading" /></div>
                : videos.length === 0 ? <p className="text-base text-neutral-mid">There are no video messages for {who.name} just now.</p>
                : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={`Video messages for ${who.name}`}>{videos.map(v => <Tile key={v.id} v={v} onPlay={() => setPlaying(v)} />)}</ul>}
            </div>
          </div>
        </div>
      )}
      {playing && who && <PlayerModal client={client} video={playing} name={who.name} onClose={() => setPlaying(null)} />}
    </>
  )
}

/** Videos found by a chat answer, shown under it. Tap one to play it full screen. */
export function ChatVideoRow({ videos, name = '' }: { videos: HubVideo[]; name?: string }) {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const client = useMemo(() => (token ? createResidentsClient(token) : null), [token])
  const [playing, setPlaying] = useState<HubVideo | null>(null)
  if (!client) return null
  return (
    <div className="mt-2 pl-10">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Video messages">{videos.map(v => <Tile key={v.id} v={v} onPlay={() => setPlaying(v)} />)}</ul>
      {playing && <PlayerModal client={client} video={playing} name={name} onClose={() => setPlaying(null)} />}
    </div>
  )
}
