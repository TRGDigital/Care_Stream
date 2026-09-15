import { draftMode, cookies } from 'next/headers'

// Reads the preview token set by /api/preview, when draft mode is on.
//
// Returns a query fragment to append to a public API call, so a page fetch can ask for the
// draft. Empty for everyone else, which means the normal path is unchanged and a page cannot
// accidentally serve unpublished content to a visitor.
export async function previewParam(): Promise<string> {
  try {
    const draft = await draftMode()
    if (!draft.isEnabled) return ''
    const token = (await cookies()).get('cs_preview')?.value
    return token ? `?preview=${encodeURIComponent(token)}` : ''
  } catch {
    // draftMode() throws outside a request scope (e.g. during static generation). Treat that
    // as "not previewing" rather than failing the render.
    return ''
  }
}

/** True when this request is a preview, for showing the banner. */
export async function isPreview(): Promise<boolean> {
  try {
    return (await draftMode()).isEnabled
  } catch {
    return false
  }
}
