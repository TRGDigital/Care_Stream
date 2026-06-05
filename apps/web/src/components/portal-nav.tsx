'use client'

import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { createApiClient } from '@/lib/api-client'
import { SiteImage } from '@/components/site-image'

interface Props {
  userName: string
  userRole: 'admin' | 'staff'
}

export function PortalNav({ userName, userRole }: Props) {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [pendingCqc, setPendingCqc] = useState(0)

  useEffect(() => {
    if (!token) return
    createApiClient(token).cqcQuestions.myDeliveries()
      .then(res => setPendingCqc(res.deliveries.filter((d: any) => d.status === 'pending').length))
      .catch(() => {})
  }, [token])

  return (
    <header className="flex h-20 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <Link href="/chat">
        <SiteImage src="/logo-color.png" alt="CareStreamAI" className="h-16 w-auto" />
      </Link>
      <div className="flex items-center gap-5">
        <Link href="/chat" className="text-sm font-medium text-neutral-mid hover:text-teal">
          Chat Hub
        </Link>
        <Link href="/progress" className="text-sm font-medium text-neutral-mid hover:text-teal">
          My Progress
        </Link>
        <Link href="/cqc" className="flex items-center gap-1.5 text-sm font-medium text-neutral-mid hover:text-teal">
          CQC Prep
          {pendingCqc > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
              {pendingCqc}
            </span>
          )}
        </Link>
        {userRole === 'admin' && (
          <Link href="/dashboard" className="text-sm font-medium text-neutral-mid hover:text-teal">
            Admin
          </Link>
        )}
        <span className="text-sm text-neutral-mid">{userName}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm font-medium text-neutral-mid hover:text-neutral-dark"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
