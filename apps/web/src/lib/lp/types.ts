export type LpField = {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea'
  required?: boolean
  placeholder?: string
  autocomplete?: string
  columnSpan?: 'half' | 'full'
  options?: { value: string; label: string }[]
  validation?: { pattern?: string; minLength?: number; maxLength?: number; warnFreeEmail?: boolean; blockFreeEmail?: boolean }
}

export type LpContent = {
  hero: {
    eyebrow?: string
    headline: string
    subheadline: string
    primaryCta: { label: string; anchor?: string }
    heroImage?: { src: string; alt: string; width?: number; height?: number }
    trustRibbon?: { label?: string; stat?: string; logos?: { src: string; alt: string }[] }
    ticks?: string[]
  }
  stats?: { items: { value: string; label: string }[] }
  whyUs?: {
    eyebrow?: string
    headline: string
    intro?: string
    points: { title: string; body: string }[]
    image?: { src: string; alt: string }
  }
  services?: {
    headline: string
    intro?: string
    items: { title: string; description: string; href?: string }[]
  }
  problem: { eyebrow?: string; headline: string; body: string[] }
  howItWorks: { eyebrow?: string; headline: string; subheadline?: string; steps: { number: string; title: string; body: string }[] }
  features: { headline: string; subheadline?: string; items: { icon: string; title: string; description: string }[] }
  socialProof?: {
    headline?: string
    testimonials?: { quote: string; name: string; role: string; company: string; avatarUrl?: string }[]
    caseStudyHighlight?: { quote: string; company: string; stat: string; logoUrl?: string; linkUrl?: string }
    logoWall?: { src: string; alt: string }[]
  }
  faq?: { headline?: string; items: { question: string; answer: string }[] }
  finalCta: { headline: string; subheadline?: string; ctaLabel: string; ctaAnchor?: string }
  form: {
    headline?: string
    subheadline?: string
    submitLabel?: string
    successHeadline?: string
    successMessage: string
    consentText: string
    privacyLinkUrl: string
    fields: LpField[]
  }
}

export type LpTracking = {
  ga4_measurement_id?: string | null
  google_ads_conversion_id?: string | null
  google_ads_conversion_label?: string | null
  meta_pixel_id?: string | null
  meta_event_name?: string | null
  linkedin_partner_id?: string | null
  linkedin_conversion_id?: string | null
}

export type LpPage = {
  id: string
  product_slug: string
  campaign_slug: string
  noindex: boolean
  conversion_type: string
  meta_title?: string | null
  meta_description?: string | null
  og_image_url?: string | null
  variant_group?: string | null
  variant_label?: string | null
  tracking: LpTracking
  content: LpContent
}
