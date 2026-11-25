// The colour choices offered as option cards when an administrator asks to change a newsletter's colours in chat (house rules 2 and 7). Plain code, no model: the same list every time.
// Each card previews the administrator's OWN draft in that colour (preview kind newsletter_palette) and Choose applies it through set_newsletter_style.
import { usablePalettes } from './newsletter-edit'

export interface ColourOption { id: string; title: string; description: string; preview: { kind: 'newsletter_palette'; template_id: string; document_id: string } }
export function colourOptions(documentId: string, brand: string | null): ColourOption[] {
  const p = (id: string) => ({ kind: 'newsletter_palette' as const, template_id: id, document_id: documentId })
  return [
    { id: 'category', title: 'Category colour', description: 'The colour this kind of newsletter normally has.', preview: p('category') },
    ...(brand ? [{ id: 'brand', title: 'Your brand colour', description: `The colour saved in Settings (${brand}).`, preview: p('brand') }] : []),
    ...usablePalettes().map(x => ({ id: x.id, title: x.label, description: `Colour ${x.accent}`, preview: p(x.id) })),
  ]
}
/** The fenced block the agent puts in its message, exactly as given. */
export const colourOptionsBlock = (documentId: string, brand: string | null) => '```options\n' + JSON.stringify({ title: 'Choose a colour for your newsletter', options: colourOptions(documentId, brand) }) + '\n```'
