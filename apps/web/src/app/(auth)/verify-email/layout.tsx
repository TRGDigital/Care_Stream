import { authMeta } from '../auth-meta'

export const metadata = authMeta('Verify your email', 'Confirming your email address for CareStreamAI.')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
