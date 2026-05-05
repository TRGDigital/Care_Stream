'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPlatformToken } from '@/lib/platform-api'

export function usePlatformAuth(): string | null {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const t = getPlatformToken()
    if (!t) {
      router.replace('/platform/login')

    } else {
      setToken(t)
    }
  }, [router])

  return token
}
