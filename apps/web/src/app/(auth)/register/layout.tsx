import { authMeta } from '../auth-meta'

export const metadata = authMeta('Create your account', 'Start your 14 day free trial of CareStreamAI.')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
