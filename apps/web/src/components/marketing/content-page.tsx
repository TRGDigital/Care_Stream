import { PageHero } from './ui'
import { LegalPageV2, LEGAL_DOCS } from './legal-page-v2'

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

export async function ContentPage({ path, title, v2 = false }: {
  path: string
  title: string
  /** Render the rebuilt theme design. Same stored body either way: the flag changes the
   *  design and nothing about the words. Opt-in with ?v2=1 until it is signed off. */
  v2?: boolean
}) {
  const page = await getPage(path)

  if (v2) {
    const doc = LEGAL_DOCS[path.replace(/^\//, '')]
    if (doc) return <LegalPageV2 doc={doc} content={page?.content ?? ''} />
  }

  // The PageHero already renders the single <h1>; demote any <h1> in the DB body
  // to <h2> so the page never has multiple H1 tags.
  const content = (page?.content ?? '').replace(/<(\/?)h1(\s|>)/gi, '<$1h2$2')

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
