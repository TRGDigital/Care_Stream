// Centralised schema.org (JSON-LD) builders. Rendered via <JsonLd>. All entities
// describe CareStreamAI accurately as a B2B SaaS (Organization + SoftwareApplication),
// not a care facility.

export const SITE_URL  = 'https://www.carestreamai.com'
export const SITE_NAME = 'CareStreamAI'
export const ORG_ID    = `${SITE_URL}/#organization`
export const SITE_ID   = `${SITE_URL}/#website`

// Top-level navigation used for SiteNavigationElement.
export const PRIMARY_NAV: Array<{ name: string; path: string }> = [
  { name: 'How It Works',        path: '/how-it-works' },
  { name: 'Features',            path: '/care-policies' },
  { name: 'CQC & Compliance',    path: '/cqc-compliance' },
  { name: 'Staff Training',      path: '/staff-training' },
  { name: 'Regulatory Knowledge',path: '/regulatory-knowledge' },
  { name: 'Who It’s For',        path: '/who-its-for' },
  { name: 'Pricing',             path: '/pricing' },
  { name: 'Blog',                path: '/blog' },
  { name: 'About',               path: '/about' },
  { name: 'Contact',             path: '/contact' },
]

export function organizationSchema() {
  return {
    '@context':   'https://schema.org',
    '@type':      'Organization',
    '@id':        ORG_ID,
    name:         SITE_NAME,
    legalName:    'CareStreamAI Limited',
    url:          SITE_URL,
    logo:         `${SITE_URL}/logo-color.png`,
    email:        'hello@carestreamai.com',
    description:  'AI-powered policy access and compliance platform for UK care providers: instant, multilingual access to your own policies and training, in the hub or by email.',
    // sameAs / address / telephone added once the real values are supplied.
    contactPoint: {
      '@type':       'ContactPoint',
      contactType:   'customer support',
      email:         'support@carestreamai.com',
      url:           `${SITE_URL}/contact`,
      areaServed:    'GB',
      availableLanguage: ['en'],
    },
  }
}

export function webSiteSchema() {
  return {
    '@context':  'https://schema.org',
    '@type':     'WebSite',
    '@id':       SITE_ID,
    name:        SITE_NAME,
    url:         SITE_URL,
    inLanguage:  'en-GB',
    publisher:   { '@id': ORG_ID },
  }
}

export function siteNavigationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type':    'SiteNavigationElement',
    name:       PRIMARY_NAV.map(i => i.name),
    url:        PRIMARY_NAV.map(i => `${SITE_URL}${i.path}`),
  }
}

export function webApplicationSchema() {
  return {
    '@context':           'https://schema.org',
    '@type':              ['WebApplication', 'SoftwareApplication'],
    name:                 SITE_NAME,
    url:                  SITE_URL,
    applicationCategory:  'HealthApplication',
    operatingSystem:      'Web and mobile hub (also accessible by email)',
    description:          'Gives care teams 24/7 access to their organisation’s own policies and training, in 60+ languages, in the hub or by email, grounded in approved documents (RAG), with audits and CQC readiness reporting.',
    provider:             { '@id': ORG_ID },
    offers: [
      { '@type': 'Offer', name: 'Starter',      price: '49.00',  priceCurrency: 'GBP', category: 'subscription', url: `${SITE_URL}/pricing` },
      { '@type': 'Offer', name: 'Professional', price: '129.00', priceCurrency: 'GBP', category: 'subscription', url: `${SITE_URL}/pricing` },
    ],
  }
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    '@context':        'https://schema.org',
    '@type':           'BreadcrumbList',
    itemListElement:   items.map((it, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      name:      it.name,
      item:      `${SITE_URL}${it.path}`,
    })),
  }
}

export function blogPostingSchema(post: {
  slug: string; title: string; excerpt: string | null; meta_description?: string | null
  feature_image_url: string | null; publication_date: string | null
  author?: { name: string } | null
}, hasToc = false) {
  return {
    '@context':          'https://schema.org',
    '@type':             'BlogPosting',
    '@id':               `${SITE_URL}/blog/${post.slug}#article`,
    headline:            post.title,
    description:         post.excerpt || post.meta_description || '',
    ...(post.feature_image_url ? { image: [post.feature_image_url] } : {}),
    ...(post.publication_date ? { datePublished: post.publication_date } : {}),
    author:              post.author?.name
      ? { '@type': 'Person', name: post.author.name }
      : { '@type': 'Organization', name: SITE_NAME, '@id': ORG_ID },
    publisher:           { '@id': ORG_ID },
    mainEntityOfPage:    `${SITE_URL}/blog/${post.slug}`,
    ...(hasToc ? { hasPart: { '@id': `${SITE_URL}/blog/${post.slug}#toc` } } : {}),
    inLanguage:          'en-GB',
  }
}

/**
 * HyperToc (schema.org/HyperToc) for a blog post's table of contents. Each
 * heading becomes a HyperTocEntry with an absolute anchor url and a
 * tocContinuation pointing to the next entry. The ids must match the anchor
 * ids injected into the body by lib/blog-toc.ts.
 */
export function hyperTocSchema(slug: string, headings: Array<{ id: string; text: string }>) {
  const postUrl = `${SITE_URL}/blog/${slug}`
  const tocId    = `${postUrl}#toc`
  const entryId  = (i: number) => `${tocId}-entry-${i + 1}`
  return {
    '@context': 'https://schema.org',
    '@type':    'HyperToc',
    '@id':      tocId,
    name:       'Table of contents',
    isPartOf:   { '@id': `${postUrl}#article` },
    tocEntry:   headings.map((h, i) => ({
      '@type':   'HyperTocEntry',
      '@id':     entryId(i),
      position:  i + 1,
      name:      h.text,
      url:       `${postUrl}#${h.id}`,
      ...(i < headings.length - 1 ? { tocContinuation: { '@id': entryId(i + 1) } } : {}),
    })),
  }
}

// A platform capability (policies, training, audits, CQC readiness…) as a Service provided by the org.
export function serviceSchema(opts: { name: string; description: string; path: string; serviceType?: string }) {
  return {
    '@context':    'https://schema.org',
    '@type':       'Service',
    '@id':         `${SITE_URL}${opts.path}#service`,
    name:          opts.name,
    description:   opts.description,
    serviceType:   opts.serviceType ?? 'Care compliance software',
    provider:      { '@id': ORG_ID },
    areaServed:    { '@type': 'Country', name: 'United Kingdom' },
    url:           `${SITE_URL}${opts.path}`,
    audience:      { '@type': 'BusinessAudience', name: 'UK care providers' },
  }
}

// A step-by-step process (e.g. the how-it-works flow) as HowTo, for featured-snippet / AIO eligibility.
export function howToSchema(opts: { name: string; description: string; path: string; steps: Array<{ name: string; text: string }> }) {
  return {
    '@context':  'https://schema.org',
    '@type':     'HowTo',
    '@id':       `${SITE_URL}${opts.path}#howto`,
    name:        opts.name,
    description: opts.description,
    inLanguage:  'en-GB',
    step:        opts.steps.map((s, i) => ({
      '@type':   'HowToStep',
      position:  i + 1,
      name:      s.name,
      text:      s.text,
    })),
  }
}

// A help / guide article. url is optional (the shared HelpArticle component doesn't know its route);
// headline + section + publisher are enough to be a valid, useful Article.
export function articleSchema(opts: { title: string; description: string; section?: string; url?: string }) {
  return {
    '@context':   'https://schema.org',
    '@type':      'TechArticle',
    headline:     opts.title,
    description:  opts.description,
    ...(opts.section ? { articleSection: opts.section } : {}),
    ...(opts.url ? { mainEntityOfPage: opts.url, url: opts.url } : {}),
    author:       { '@id': ORG_ID },
    publisher:    { '@id': ORG_ID },
    inLanguage:   'en-GB',
  }
}

export function faqPageSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context':  'https://schema.org',
    '@type':     'FAQPage',
    mainEntity:  faqs.map(f => ({
      '@type':         'Question',
      name:            f.question,
      acceptedAnswer:  { '@type': 'Answer', text: f.answer },
    })),
  }
}
