// app/api/geo-check/route.ts
import { NextRequest, NextResponse } from 'next/server'

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY
const SITE = 'evaftermarket.io'

export async function GET(request: NextRequest) {
  // 安全检查：仅开发环境或带有正确 API Key
  const isProduction = process.env.NODE_ENV === 'production'
  if (isProduction) {
    const authHeader = request.headers.get('Authorization')
    const key = authHeader?.replace('Bearer ', '')
    if (!INTERNAL_API_KEY || key !== INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const query = request.nextUrl.searchParams.get('q')
  if (!query) {
    return NextResponse.json({ error: 'Missing ?q= parameter' }, { status: 400 })
  }

  if (query.length > 500) {
    return NextResponse.json({ error: 'Query too long (max 500 chars)' }, { status: 400 })
  }

  if (!PERPLEXITY_API_KEY) {
    return NextResponse.json({ error: 'PERPLEXITY_API_KEY not configured' }, { status: 500 })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  let response: Response
  try {
    response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: query }],
        max_tokens: 500,
      }),
    })
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Perplexity API timeout' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Perplexity API request failed' }, { status: 502 })
  }
  clearTimeout(timeoutId)

  if (!response.ok) {
    return NextResponse.json({ error: `Perplexity error: ${response.status}` }, { status: 502 })
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[]
    citations?: string[]
  }

  const text = data.choices[0]?.message?.content ?? ''
  const citations: string[] = data.citations ?? []
  const allText = text + ' ' + citations.join(' ')
  const cited = allText.toLowerCase().includes(SITE)
  const citationUrl = citations.find(c => c.toLowerCase().includes(SITE)) ?? null

  return NextResponse.json({
    query,
    cited,
    citation_url: citationUrl,
    snippet: text.slice(0, 300),
    all_citations: citations,
    engine: 'perplexity',
  })
}
