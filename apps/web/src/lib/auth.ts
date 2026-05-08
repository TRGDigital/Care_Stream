// §11 — NextAuth v4 configuration: credentials provider, JWT strategy.
// tenant_id and role embedded in token claims so every server component can
// read them without a DB round-trip.

import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

// ─── Type augmentation ────────────────────────────────────────────────────────

declare module 'next-auth' {
  interface User {
    role:         'admin' | 'staff'
    tenantId:     string
    tenantName:   string
    accessToken:  string
    refreshToken: string
  }
  interface Session {
    accessToken: string
    user: {
      id:         string
      name?:      string | null
      email?:     string | null
      image?:     string | null
      role:       'admin' | 'staff'
      tenantId:   string
      tenantName: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken:  string
    refreshToken: string
    role:         'admin' | 'staff'
    tenantId:     string
    tenantName:   string
  }
}

// ─── Options ─────────────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name:        'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const res = await fetch(`${API_URL}/auth/login`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            email:    credentials.email,
            password: credentials.password,
          }),
        })

        if (!res.ok) return null
        const body = await res.json()
        if (!body.success) return null

        const { user, tenant, access_token, refresh_token } = body.data
        return {
          id:           user.id,
          name:         user.name,
          email:        user.email,
          role:         user.role         as 'admin' | 'staff',
          tenantId:     user.tenant_id,
          tenantName:   tenant.name,
          accessToken:  access_token,
          refreshToken: refresh_token,
        }
      },
    }),
  ],
  session:  { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in: store tokens and decode expiry from the JWT
      if (user) {
        token.accessToken  = user.accessToken
        token.refreshToken = user.refreshToken
        token.role         = user.role
        token.tenantId     = user.tenantId
        token.tenantName   = user.tenantName
        // Decode expiry so we can proactively refresh before it hits
        try {
          const payload = JSON.parse(Buffer.from(user.accessToken.split('.')[1], 'base64').toString())
          token.accessTokenExpiry = payload.exp * 1000
        } catch { token.accessTokenExpiry = Date.now() + 55 * 60 * 1000 }
        return token
      }

      // Subsequent calls: refresh if within 5 minutes of expiry
      if (Date.now() < ((token.accessTokenExpiry as number) - 5 * 60 * 1000)) {
        return token
      }

      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ refresh_token: token.refreshToken }),
        })
        const body = await res.json()
        if (!res.ok || !body.success) throw new Error('Refresh failed')

        const payload = JSON.parse(Buffer.from(body.data.access_token.split('.')[1], 'base64').toString())
        token.accessToken      = body.data.access_token
        token.accessTokenExpiry = payload.exp * 1000
      } catch {
        // Refresh failed — force re-login by clearing the token
        return { ...token, error: 'RefreshAccessTokenError' }
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken        = token.accessToken
      session.user.role          = token.role
      session.user.tenantId      = token.tenantId
      session.user.tenantName    = token.tenantName
      return session
    },
  },
  pages:  { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}

// Export handler and authOptions
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
