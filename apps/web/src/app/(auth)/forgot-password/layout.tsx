import { authMeta } from '../auth-meta'

export const metadata = authMeta('Reset your password', 'Get a link to reset your CareStreamAI password.')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
