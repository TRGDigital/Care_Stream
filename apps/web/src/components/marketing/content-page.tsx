import { PageHero } from './ui'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Fetches a site_pages record (managed in the platform Pages tab) and renders its
// HTML body. Used for content pages such as the legal pages.
async function getPage(path: string): Promise<{ content?: string } | null> {
  try {
    const res = await fetch(`${API_URL}/public/site-pages?path=${encodeURIComponent(path)}`, {
      next: { revalidate: 60 },
    })
    if (res.ok) {
      const body = await res.json()
      return body?.data?.page ?? null
    }
  } catch {
    // fall through to the empty state
  }
  return null
}

export async function ContentPage({ path, title }: { path: string; title: string }) {
  const page = await getPage(path)
  const content = page?.content ?? ''

  return (
    <>
      <PageHero label="Legal" title={title} />
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          {content ? (
            <div
              className="prose prose-neutral max-w-none prose-headings:text-neutral-dark prose-a:text-teal"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-neutral-mid">This page is being updated. Please check back soon.</p>
          )}
        </div>
      </section>
    </>
  )
}
