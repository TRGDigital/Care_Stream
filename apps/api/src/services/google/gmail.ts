// Gmail via a Google Workspace service account with domain-wide delegation.
// Mints a short-lived access token (JWT bearer) impersonating GOOGLE_IMPERSONATE_USER
// and creates drafts in that mailbox. Draft-only scope (gmail.compose) — this code
// CANNOT send mail; the human presses Send in Gmail.
import crypto from 'node:crypto'

interface ServiceAccount {
  client_email: string
  private_key: string
}

function serviceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  return JSON.parse(raw) as ServiceAccount
}

function impersonatedUser(): string {
  const u = process.env.GOOGLE_IMPERSONATE_USER
  if (!u) throw new Error('GOOGLE_IMPERSONATE_USER not set')
  return u
}

export function gmailConfigured(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !!process.env.GOOGLE_IMPERSONATE_USER
}

const b64url = (b: Buffer | string): string => Buffer.from(b).toString('base64url')

let cachedToken: { token: string; exp: number } | null = null

async function getAccessToken(scope: string): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.exp > nowSec + 60) return cachedToken.token

  const sa = serviceAccount()
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: 'https://oauth2.googleapis.com/token',
      exp: nowSec + 3600,
      iat: nowSec,
      sub: impersonatedUser(),
    }),
  )
  const input = `${header}.${claim}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(input)
  signer.end()
  const jwt = `${input}.${b64url(signer.sign(sa.private_key))}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const body: any = await res.json()
  if (!res.ok) throw new Error(`Google token error ${res.status}: ${JSON.stringify(body)}`)
  cachedToken = { token: body.access_token, exp: nowSec + (Number(body.expires_in) || 3600) }
  return cachedToken.token
}

// RFC2047-encode a header value if it contains non-ASCII (e.g. £, accents).
function encodeHeader(s: string): string {
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`
}

export interface DraftInput {
  to: string
  subject: string
  body: string
  fromName?: string
}

// Create a plain-text draft in the impersonated mailbox. Returns the Gmail draft id.
export async function createGmailDraft({ to, subject, body, fromName = 'CareStream' }: DraftInput): Promise<string> {
  const token = await getAccessToken('https://www.googleapis.com/auth/gmail.compose')
  const from = `${encodeHeader(fromName)} <${impersonatedUser()}>`
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ].join('\r\n')
  const raw = Buffer.from(message, 'utf8').toString('base64url')

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { raw } }),
  })
  const dBody: any = await res.json()
  if (!res.ok) throw new Error(`Gmail draft error ${res.status}: ${JSON.stringify(dBody)}`)
  return dBody.id as string
}
