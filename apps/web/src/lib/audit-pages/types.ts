export interface AuditPageData {
  slug: string
  name: string
  description: string
  frequency: string
  scope: string
  services: string[]
  who_runs_it: string
  evidence_note: string
  regulations: Array<{ ref: string; title: string; url: string }>
  keywords: { primary: { keyword: string; volume: number }; secondary: Array<{ keyword: string; volume: number }> }
  sections: Array<{ title: string; questions: string[] }>
  seo_title: string
  meta_description: string
  h1: string
  /** The headline with an <em> the theme colours. Falls back to h1. */
  h1_html?: string
  intro: string
  lead_points: string[]
  what_it_is_title: string
  what_it_is: string
  steps: Array<{ name: string; text: string }>
  faqs: Array<{ question: string; answer: string }>
  related: string[]
  /** The first questions of the first section, for the hero mock-up. */
  mock: { section: string; section_no: number; sections: number; questions: Array<{ text: string; type: string }> }
  /** Terms the ?yellowkws view highlights (platform admins only). */
  highlight_keywords?: { primary: string; secondary: string[] }
}
