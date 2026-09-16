import { authMeta } from '../auth-meta'

export const metadata = authMeta('Check your inbox', 'Verify your email address to activate your CareStreamAI account.')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
