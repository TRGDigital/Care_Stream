'use client'

// The floating live support chat for the admin portal. Mounted once in AdminShell, so it stays open (or minimised and still live) while the person
// moves between pages. The support menu opens it with the 'cs:open-support-chat' event. State survives a page reload (sessionStorage).

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { MessageCircle, Minus, Volume2, VolumeX } from 'lucide-react'
import { useSupportChat } from '@/lib/use-support-chat'
import { ChatPanel } from '@/components/support/chat-panel'
import { OPEN_EVENT, readWidgetState, writeWidgetState, readSoundOn, writeSoundOn, titleWithUnread } from '@/lib/support-chat-widget'

const store = () => (typeof window === 'undefined' ? null : window.sessionStorage)
const local = () => (typeof window === 'undefined' ? null : window.localStorage)

export function SupportChatWidget() {
  const { data: session } = useSession()
  const onChatPage = usePathname() === '/support/chat'   // the full page shows the same chat, so the bubble stays out of the way there
  const token = (session as any)?.accessToken as string | undefined
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [sound, setSound] = useState(false)
  const baseTitle = useRef<string>('')
  const panel = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)

  // Remember where the person left it.
  useEffect(() => {
    const s = readWidgetState(store())
    setOpen(s.open); setChatId(s.chatId); setSound(readSoundOn(local())); setReady(true)
  }, [])
  useEffect(() => { if (ready) writeWidgetState(store(), { open, chatId }) }, [ready, open, chatId])

  const ping = useCallback(() => {
    if (!sound) return
    try {
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext
      const ctx = new Ctx(); const o = ctx.createOscillator(); const g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = 660; g.gain.value = 0.04
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.18)
      o.onended = () => { void ctx.close() }
    } catch { /* no sound available */ }
  }, [sound])

  // A chat is only loaded in the background when there is one to keep up with (an id was remembered) or the panel is open.
  const chat = useSupportChat({
    token, visible: open, autoLoad: ready && (open || !!chatId),
    defaultName: session?.user?.name ?? '', defaultEmail: session?.user?.email ?? '',
    onAgentMessage: ping, onChatId: setChatId,
  })

  // The support menu opens the widget.
  useEffect(() => {
    const on = () => { setOpen(true); if (!chat.chat) void chat.load() }
    window.addEventListener(OPEN_EVENT, on)
    return () => window.removeEventListener(OPEN_EVENT, on)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.load, chat.chat])

  // Tab title: how many messages from the team have not been read.
  useEffect(() => {
    if (!baseTitle.current) baseTitle.current = document.title
    const base = titleWithUnread(baseTitle.current, 0)
    document.title = titleWithUnread(base, chat.unread)
    return () => { document.title = base }
  }, [chat.unread])

  // Focus moves into the panel when it opens and back to the bubble when it is minimised. Escape minimises.
  useEffect(() => {
    if (open && !wasOpen.current) window.setTimeout(() => panel.current?.querySelector<HTMLElement>('textarea,input,button')?.focus(), 60)
    if (!open && wasOpen.current) bubble.current?.focus()
    wasOpen.current = open
  }, [open])
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [open])

  if (!ready || !token || onChatPage) return null
  const toggleSound = () => { const n = !sound; setSound(n); writeSoundOn(local(), n) }

  return (
    <>
      {open && (
        <div ref={panel} role="dialog" aria-label="Chat with CareStream"
          className="fixed inset-x-0 bottom-0 z-40 flex h-[85vh] max-h-[640px] flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-[calc(var(--ask-dock,0px)+1.25rem)] sm:h-[560px] sm:w-[380px] sm:rounded-2xl">
          <ChatPanel c={chat} widget headerExtra={
            <>
              <button type="button" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? 'Turn the message sound off' : 'Turn the message sound on'}
                className="rounded-lg p-1.5 text-neutral-mid hover:bg-neutral-light focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40">
                {sound ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Minimise the chat"
                className="rounded-lg p-1.5 text-neutral-mid hover:bg-neutral-light focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40">
                <Minus size={18} aria-hidden="true" />
              </button>
            </>
          } />
          <p className="sr-only" role="status" aria-live="polite">{chat.messages.length ? `${chat.messages.length} messages in this chat` : ''}</p>
        </div>
      )}
      {!open && (
        <button ref={bubble} type="button" onClick={() => { setOpen(true); if (!chat.chat) void chat.load() }} aria-label={chat.unread > 0 ? `Open chat, ${chat.unread} new ${chat.unread === 1 ? 'message' : 'messages'}` : 'Open chat with CareStream'}
          className="fixed bottom-5 right-[calc(var(--ask-dock,0px)+1.25rem)] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal text-white shadow-lg hover:bg-teal-dark focus:outline-none focus-visible:ring-4 focus-visible:ring-teal/30">
          <MessageCircle size={26} aria-hidden="true" />
          {chat.unread > 0 && <span className="absolute -right-1 -top-1 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">{chat.unread > 9 ? '9+' : chat.unread}</span>}
        </button>
      )}
    </>
  )
}
