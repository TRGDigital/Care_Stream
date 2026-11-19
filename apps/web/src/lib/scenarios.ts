// Scenario pages: situation led pages ("staff attended the face to face training, did they
// understand it?") that show how CareStream is used in that situation. The content lives in
// src/data/scenarios/*.json, one file per page, and is rendered by components/marketing/
// scenario-page.tsx. status 'published' pages are public (/scenarios/<slug>, the hub, the
// sitemap and the home page carousel); 'draft' pages are only visible to platform admins at
// /platform/scenarios/preview/<slug>. To approve a page, change its status to 'published' and deploy.

export type ScenarioMock =
  | { type: 'training'; module: string; questions: string[]; staff_count?: number }
  | { type: 'followup'; module: string; question: string; why: string; remember: string[]; picture: string }
  | { type: 'language'; second_language: string }
  | { type: 'audit'; audit: string; stats?: [string, string][]; blocks: [string, [string, string][]][]; caption?: string }
  | { type: 'gaps'; stats: { open: number; affected: number; closed: number; engaged: number }; missed: [string, string][]; weak: [string, string][] }

export interface Scenario {
  slug: string
  status: 'draft' | 'published'
  order: number
  title: string               // H1, may contain <em>
  meta_title: string
  meta_description: string
  eyebrow: string
  lede: string                // may contain <a>
  fine?: string
  panel: { title: string; pill: string; rows: { label: string; note: string; done: boolean }[]; meter: number }
  image: string               // 3:2 scene, used on the home page and as the social image
  image_alt: string
  card_title: string
  card_snippet: string
  primary_keyword: string
  secondary_keywords: string[]
  feature_links: { title: string; body: string; action: string; href: string }[]
  intro: { heading: string; sub: string; paragraph: string }
  trail: { when: string; text: string; kind: 'ok' | 'gap' | 'end' }[]
  trail_close: string
  why: { heading: string; sub: string; cards: { icon: 'chat' | 'tick' | 'alert'; title: string; body: string }[] }
  how: { heading: string; sub: string; blocks: { heading: string; bullets: string[]; tags: { label: string; href: string }[]; mock: ScenarioMock }[] }
  talk: { heading: string; sub: string; items: { q: string; a: string }[] }
  limits: { heading: string; cards: { title: string; body: string }[] }
  read_next: string[]         // blog post slugs
  faqs: { heading: string; groups: { group: string; items: { q: string; a: string }[] }[] }
  guide: { heading: string; lede: string; sections: { h3: string; paragraphs?: string[]; checklist?: string[] }[]; note: string }
}

export const plainText = (s: string) => (s || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim()
