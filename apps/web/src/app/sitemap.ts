import { MetadataRoute } from 'next'

const BASE = 'https://carestreamai.com'

type Entry = { url: string; lastModified?: Date; changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']; priority?: number }

const MARKETING: Entry[] = [
  { url: '/',                                      changeFrequency: 'weekly',  priority: 1.0 },
  { url: '/how-it-works',                          changeFrequency: 'monthly', priority: 0.9 },
  { url: '/care-policies',                         changeFrequency: 'monthly', priority: 0.9 },
  { url: '/pricing',                               changeFrequency: 'weekly',  priority: 0.9 },
  { url: '/who-its-for',                           changeFrequency: 'monthly', priority: 0.8 },
  { url: '/staff-training',                        changeFrequency: 'monthly', priority: 0.9 },
  { url: '/hr-policies',                           changeFrequency: 'monthly', priority: 0.9 },
  { url: '/care-audits',                           changeFrequency: 'monthly', priority: 0.9 },
  { url: '/cqc-compliance',                        changeFrequency: 'monthly', priority: 0.9 },
  { url: '/cqc-staff-questions',                   changeFrequency: 'monthly', priority: 0.8 },
  { url: '/business-continuity',                   changeFrequency: 'monthly', priority: 0.8 },
  { url: '/cqc-report-chat',                       changeFrequency: 'monthly', priority: 0.8 },
  { url: '/regulatory-knowledge',                  changeFrequency: 'monthly', priority: 0.7 },
  { url: '/rag',                                   changeFrequency: 'monthly', priority: 0.7 },
  { url: '/residential-care',                      changeFrequency: 'monthly', priority: 0.8 },
  { url: '/nursing-homes',                         changeFrequency: 'monthly', priority: 0.8 },
  { url: '/domiciliary-care',                      changeFrequency: 'monthly', priority: 0.8 },
  { url: '/about',                                 changeFrequency: 'monthly', priority: 0.7 },
  { url: '/trust',                                 changeFrequency: 'monthly', priority: 0.7 },
  { url: '/case-studies',                          changeFrequency: 'monthly', priority: 0.7 },
  { url: '/blog',                                  changeFrequency: 'weekly',  priority: 0.8 },
  { url: '/blog/riddor-reporting-care-homes',      changeFrequency: 'monthly', priority: 0.7 },
  { url: '/blog/rag-ai-care-compliance',           changeFrequency: 'monthly', priority: 0.7 },
  { url: '/blog/overseas-care-workers-policy-access', changeFrequency: 'monthly', priority: 0.7 },
  { url: '/blog/night-shift-policy-access',        changeFrequency: 'monthly', priority: 0.7 },
  { url: '/blog/cqc-readiness-report-what-it-is', changeFrequency: 'monthly', priority: 0.7 },
  { url: '/blog/cqc-equality-diversity-evidence',  changeFrequency: 'monthly', priority: 0.7 },
  { url: '/faq',                                   changeFrequency: 'monthly', priority: 0.6 },
  { url: '/demo',                                  changeFrequency: 'monthly', priority: 0.8 },
  { url: '/contact',                               changeFrequency: 'monthly', priority: 0.6 },
  { url: '/help',                                  changeFrequency: 'monthly', priority: 0.5 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return MARKETING.map(({ url, changeFrequency, priority }) => ({
    url:             `${BASE}${url}`,
    lastModified:    now,
    changeFrequency,
    priority,
  }))
}
