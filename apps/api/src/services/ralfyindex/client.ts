// Thin client for the RalfyIndex API (https://api.ralfyindex.com).
// All requests are JSON POST and must carry the API key in `apikey`.

const API_URL = process.env.RALFYINDEX_API_URL || 'https://api.ralfyindex.com'

type RalfyResponse = {
  status?: string
  balance?: number
  creditsUsed?: number
  errorCode?: number
  message?: string
}

async function call(endpoint: string, body: Record<string, unknown>): Promise<RalfyResponse> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    return (await res.json().catch(() => ({}))) as RalfyResponse
  } finally {
    clearTimeout(timer)
  }
}

export function ralfyStatus(apiKey: string) {
  return call('/status', { apikey: apiKey })
}

export function ralfyBalance(apiKey: string) {
  return call('/balance', { apikey: apiKey })
}

// Submit a batch of URLs as a new indexing project.
export function ralfyCreateProject(apiKey: string, projectName: string, urls: string[], instantIndex: boolean) {
  return call('/project', {
    apikey: apiKey,
    projectName,
    urls,
    instantIndex: instantIndex ? 1 : 0,
  })
}
