import type { MetadataRoute } from 'next'
import { BASE_URL } from '@/lib/config'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: ['/api/'],
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
      },
      {
        userAgent: 'Googlebot-Extended',
        allow: '/',
      },
      {
        userAgent: 'AhrefsBot',
        allow: '/',
        crawlDelay: 10,
      },
      {
        userAgent: 'SemrushBot',
        allow: '/',
        crawlDelay: 10,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
