'use client'

// Staff hub: the notifications an administrator has sent me, unread first.
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Check, Loader2 } from 'lucide-react'
import { PaperclipCount } from '@/components/notifications/attachments'
import { myNotifications, fmtWhen, type MyItem } from '@/lib/notifications-client'

export function MyNotificationsView({ onOpen }: { onOpen: (id: string) => void }) {
  const { data: session } = useSession()
  const token = session?.accessToken
  const [items, setItems] = useState<MyItem[] | null>(null)
  useEffect(() => { if (token) myNotifications.list(token).then(r => setItems(r.notifications)).catch(() => setItems([])) }, [token])
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-dark"><Bell size={22} className="text-teal" aria-hidden="true" /> Notifications</h1>
        <p className="mt-1 text-sm text-neutral-mid">Messages from your managers.</p>
        <div className="mt-5">
          {items === null ? <p className="flex items-center gap-2 text-sm text-neutral-mid" role="status"><Loader2 size={16} className="animate-spin" /> Loading</p>
            : items.length === 0 ? <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-neutral-mid">You have no notifications.</p>
            : (
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
                {items.map(n => (
                  <li key={n.id}>
                    <button type="button" onClick={() => onOpen(n.id)} className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal/30 w-full text-left">
                      <span className="min-w-0">
                        <span className={`block truncate text-base ${n.read_at ? 'font-medium text-neutral-dark' : 'font-bold text-neutral-dark'}`}>{n.title}</span>
                        <span className="block text-xs text-neutral-mid">From {n.sender_name}, {fmtWhen(n.created_at)} <PaperclipCount count={n.file_count} className="ml-1" /></span>
                      </span>
                      {n.read_at ? <span className="inline-flex shrink-0 items-center gap-1 text-xs text-green-700"><Check size={14} aria-hidden="true" /> Read</span>
                        : <span className="shrink-0 rounded-full bg-teal px-2.5 py-0.5 text-xs font-semibold text-white">New</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>
    </div>
  )
}
