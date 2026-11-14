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
  intro: string
  lead_points: string[]
  what_it_is_title: string
  what_it_is: string
  steps: Array<{ name: string; text: string }>
  faqs: Array<{ question: string; answer: string }>
  related: string[]
}
