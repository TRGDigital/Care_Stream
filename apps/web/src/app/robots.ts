import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/policies',
          // Trailing slash so these only block the authenticated app routes and
          // NOT the public marketing pages that share the prefix
          // (/staff-training/*, /cqc-compliance, /cqc-report-chat, /cqc-staff-questions).
          '/staff/',
          '/analytics',
          '/settings',
          '/billing',
          '/onboarding',
          '/knowledge',
          '/guides',
          '/queries',
          '/gaps',
          '/training',
          '/audits',
          '/cqc-questions',
          '/chat',
          '/cqc/',
          '/api/',
          '/register',
          '/login',
        ],
      },
    ],
    sitemap: 'https://www.carestreamai.com/sitemap.xml',
  }
}
