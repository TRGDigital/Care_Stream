import { authMeta } from '../auth-meta'

export const metadata = authMeta('Sign in', 'Sign in to your CareStreamAI account.')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
