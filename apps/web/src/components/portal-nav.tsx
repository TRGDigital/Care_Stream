'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'

interface Props {
  userName: string
  userRole: 'admin' | 'staff'
}

export function PortalNav({ userName, userRole }: Props) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <Link href="/chat" className="text-lg font-bold text-teal">
        CareStreamAI
      </Link>
      <div className="flex items-center gap-5">
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
