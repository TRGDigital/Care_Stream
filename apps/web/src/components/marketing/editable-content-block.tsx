import { BlogFaqs } from '@/components/marketing/blog-faqs'
import { faqPageSchema } from '@/lib/schema'
import { JsonLd } from '@/components/json-ld'
import { getSitePageContent } from '@/lib/site-page-content'

// An async server component that renders the CMS-editable body content + FAQs for
// a page (from platform Blog → Main site / Training pages). Renders NOTHING if the
// page has no content and no FAQs, so it's safe to drop onto any page — the
// hardcoded design is untouched until someone adds content in the console.
export async function EditableContentBlock({ path, className = 'bg-white py-16' }: { path: string; className?: string }) {
  const { content, faqs } = await getSitePageContent(path)
  if (!content && faqs.length === 0) return null

  return (
    <section className={className}>
      <div className="mx-auto max-w-content px-6">
        {content && (
          <div
            className="prose prose-lg max-w-none text-neutral-mid prose-headings:font-bold prose-headings:text-neutral-dark prose-a:font-semibold prose-a:text-teal prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-teal-dark"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
        {faqs.length > 0 && (
          <>
            <JsonLd data={faqPageSchema(faqs)} />
            <BlogFaqs faqs={faqs} />
          </>
        )}
      </div>
    </section>
  )
}
