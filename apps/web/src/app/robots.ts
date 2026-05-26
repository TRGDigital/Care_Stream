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
          '/staff',
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
          '/cqc',
          '/api/',
          '/register',
          '/login',
        ],
      },
    ],
    sitemap: 'https://carestreamai.co.uk/sitemap.xml',
  }
}
