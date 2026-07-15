const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export interface SitePageContent {
  content: string
  faqs: Array<{ question: string; answer: string }>
}

// Fetch the editable body content + FAQs for a marketing page from the CMS
// (site_pages, managed in platform Blog → Main site / Training pages). Returns
// empty values on any error so pages always render. Revalidates every 60s, so
// edits go live without a redeploy.
export async function getSitePageContent(path: string): Promise<SitePageContent> {
  try {
    const res = await fetch(`${API_URL}/public/site-pages?path=${encodeURIComponent(path)}`, {
      next: { revalidate: 60 },
    })
    if (res.ok) {
      const p = (await res.json())?.data?.page
      if (p) {
        return {
          content: typeof p.content === 'string' ? p.content : '',
          faqs: Array.isArray(p.faqs) ? p.faqs.filter((f: any) => f?.question && f?.answer) : [],
        }
      }
    }
  } catch {
    // fall through — no editable block rather than a broken page
  }
  return { content: '', faqs: [] }
}
