// Serializable content shape for DB-driven feature pages (the /pricing feature
// list). Kept in a plain module — NO React/component imports — so both the public
// renderer (feature-page.tsx) and the platform admin editor can import it without
// pulling the marketing component graph into the admin bundle.

export type FeaturePageContent = {
  eyebrow: string
  intro: string
  chips: string[]
  whatItIs: { heading: string; body: string }
  outcomes: string[]
  howItWorks: { heading: string; intro: string; sections: Array<{ heading: string; body: string }> }
  keyPoints: string[]
  sidebar: Array<{ title: string; body: string }>
  whyItWorks: { heading: string; intro: string; tiles: Array<{ title: string; body: string }> }
  cta: { heading: string; sub: string }
}

// A blank content object — the shape the platform editor starts from.
export const EMPTY_FEATURE_CONTENT: FeaturePageContent = {
  eyebrow: '', intro: '', chips: [],
  whatItIs: { heading: '', body: '' },
  outcomes: [],
  howItWorks: { heading: '', intro: '', sections: [] },
  keyPoints: [],
  sidebar: [],
  whyItWorks: { heading: '', intro: '', tiles: [] },
  cta: { heading: '', sub: '' },
}
