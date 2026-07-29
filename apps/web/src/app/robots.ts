import { MetadataRoute } from 'next'

// The authenticated app routes to keep out of every crawler's index. Trailing slashes where a
// prefix would otherwise catch a public marketing page (e.g. /staff/ must not block /staff-training).
const APP_ROUTES = [
  '/dashboard', '/policies', '/staff/', '/analytics', '/settings', '/billing', '/onboarding',
  '/knowledge', '/guides', '/queries', '/gaps', '/training', '/audits', '/cqc-questions',
  '/chat', '/cqc/', '/api/', '/register', '/login',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: allow all crawlers onto the public marketing site; keep the authenticated app out.
      { userAgent: '*', allow: '/', disallow: APP_ROUTES },
      // Deliberate, on-the-record policy for AI answer engines. We WANT CareStream in AI answers and
      // citations (the marketing content is server-rendered and we publish /llms.txt), so these are
      // explicitly allowed the public site and kept out of the app — not blocked.
      { userAgent: 'GPTBot', allow: '/', disallow: APP_ROUTES },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: APP_ROUTES },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: APP_ROUTES },
      { userAgent: 'ClaudeBot', allow: '/', disallow: APP_ROUTES },
      { userAgent: 'Claude-Web', allow: '/', disallow: APP_ROUTES },
      { userAgent: 'PerplexityBot', allow: '/', disallow: APP_ROUTES },
      { userAgent: 'Google-Extended', allow: '/', disallow: APP_ROUTES },
      { userAgent: 'Applebot-Extended', allow: '/', disallow: APP_ROUTES },
    ],
    sitemap: 'https://www.carestreamai.com/sitemap.xml',
  }
}
