'use client'

// The signed in person's own picture in the hub: one small shared store so the header avatar (portal-nav) and the "Your picture"
// control in the sidebar always agree, and a change shows in both at once.

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useSession } from 'next-auth/react'
import { Camera, X } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'
import { StaffAvatar } from '@/components/admin/staff-avatar'
import { StaffPictureBlock } from '@/components/admin/staff-picture-controls'

let current: string | null = null
let loadedFor: string | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const setCurrent = (u: string | null) => { current = u; emit() }

/** The person's own picture link plus a way to refresh it (links expire) and to set or remove it. */
export function useMyPhoto(token: string | undefined) {
  const url = useSyncExternalStore(subscribe, () => current, () => null)

  const refresh = useCallback(() => {
    if (!token) return
    createApiClient(token).me.profile().then(p => setCurrent(p.photo_url ?? null)).catch(() => { /* keep initials */ })
  }, [token])

  useEffect(() => {
    if (!token || loadedFor === token) return
    loadedFor = token
    refresh()
  }, [token, refresh])

  const set = useCallback(async (file: File) => {
    const r = await createApiClient(token ?? '').me.setPhoto(file)
    setCurrent(r.photo_url); return r.photo_url
  }, [token])
  const remove = useCallback(async () => {
    await createApiClient(token ?? '').me.removePhoto()
    setCurrent(null)
  }, [token])

  return { url, refresh, set, remove }
}

/** Small round avatar for the hub header, next to the person's name. */
export function HeaderAvatar({ name }: { name: string }) {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const { url, refresh } = useMyPhoto(token)
  return <StaffAvatar name={name} photoUrl={url} size={28} onRefresh={refresh} />
}

/** "Your picture" button for the hub sidebar, opening a small dialog to add, change or remove it. */
export function YourPicture({ name }: { name: string }) {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const viewOnly = (session as any)?.user?.impersonation?.mode === 'view'   // an admin looking at someone's hub cannot change it
  const { url, refresh, set, remove } = useMyPhoto(token)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-mid transition-colors hover:bg-neutral-light hover:text-neutral-dark"
      >
        <Camera size={15} />
        Your picture
        <span className="ml-auto"><StaffAvatar name={name} photoUrl={url} size={20} onRefresh={refresh} /></span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div role="dialog" aria-modal="true" aria-label="Your picture" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-dark">Your picture</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
            </div>
            {viewOnly ? (
              <p className="text-sm text-neutral-mid">You are viewing this hub as someone else, so their picture cannot be changed from here.</p>
            ) : (
              <>
                <StaffPictureBlock name={name} photoUrl={url} idPrefix="hub-picture" who="your" isAdmin={(session as any)?.user?.role === 'admin'} onRefresh={refresh} onSet={set} onRemove={remove} />
                <p className="mt-3 text-xs text-neutral-mid">Your managers can also see and change your picture.</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
