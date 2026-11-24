// The audit library with its pictures. A server component: it reads the pictures made so far from the API (cached for five minutes) and hands them to the
// library. If the API is unreachable the cards simply have no pictures, as before.
import { AuditLibrary } from './audit-library'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function getImages(): Promise<Record<string, { url: string; alt: string }>> {
  try {
    const res = await fetch(`${API_URL}/public/audit-images`, { next: { revalidate: 300 } })
    if (!res.ok) return {}
    return (await res.json())?.data?.images ?? {}
  } catch { return {} }
}

export async function AuditLibraryWithImages() {
  return <AuditLibrary images={await getImages()} />
}
