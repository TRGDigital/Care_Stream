import { Fraunces } from 'next/font/google'

// Editorial display serif for landing-page headlines (scoped to the LP via the
// .lp-editorial wrapper). Body/UI stays on Inter.
export const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
})
