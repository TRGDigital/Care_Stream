import { sendSearchTermsDigestEmail, type SearchTermsDigest } from '../email/outbound'

// The daily Google Ads search term review for Len (cron /search-terms-digest, 08:00 UK). The
// recommendations come from Funnel Insights (/api/search-terms-digest, the same logic as
// FI › Ads › Search terms): for CareStream and TRG Digital, the terms to add as negatives, the
// terms to add as keywords and the ones to check. Terms he has marked Actioned are left out, so
// the email shrinks as he works through it. Sent every day, even when there is nothing to do,
// as the reminder to check.
const DIGEST_URL = process.env.FI_SEARCH_TERMS_URL || 'https://trg-funnel-insights.vercel.app/api/search-terms-digest'

export async function runSearchTermsDigest(): Promise<Record<string, unknown>> {
  const secret = process.env.FI_INGEST_SECRET
  if (!secret) throw new Error('FI_INGEST_SECRET is not set')
  const res = await fetch(DIGEST_URL, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`Funnel Insights answered ${res.status}`)
  const digest = await res.json() as SearchTermsDigest
  await sendSearchTermsDigestEmail(digest)
  return {
    sent: true,
    accounts: digest.accounts.map(a => ({ site: a.site, negatives: a.negatives.length, keywords: a.keywords.length, check: a.check.length })),
  }
}
