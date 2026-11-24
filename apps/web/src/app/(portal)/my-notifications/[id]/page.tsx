'use client'

// Old address kept working (emails and bookmarks): it opens the same page inside the hub, so the sidebar stays in view.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'

export default function Redirect() {
  const router = useRouter()
  const id = String(useParams()?.id ?? '')
  useEffect(() => { router.replace(`/chat?view=notifications&id=${encodeURIComponent(id)}`) }, [router, id])
  return null
}
