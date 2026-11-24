'use client'

// The full page version of the live support chat. The floating chat (components/support/chat-widget.tsx) is the normal way in; this page stays
// as a fallback for anyone who has the old link. It shows the same conversation, full size.

import { useSession } from 'next-auth/react'
import { useSupportChat } from '@/lib/use-support-chat'
import { ChatPanel } from '@/components/support/chat-panel'

export default function SupportChatPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const chat = useSupportChat({ token, visible: true, autoLoad: true, defaultName: session?.user?.name ?? '', defaultEmail: session?.user?.email ?? '' })
  return <ChatPanel c={chat} />
}
