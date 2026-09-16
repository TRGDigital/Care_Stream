import { authMeta } from '../auth-meta'

export const metadata = authMeta('Choose a new password', 'Set a new password for your CareStreamAI account.')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
