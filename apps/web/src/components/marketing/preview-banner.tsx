import Link from 'next/link'

// Shown on any page being previewed. Two jobs: make it obvious you are not looking at the
// live page, and give a way back. Without it, a draft and a published page look identical and
// it is genuinely easy to report on the wrong one.
export function PreviewBanner({ path }: { path: string }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 9999, background: '#17121F', color: '#fff',
      padding: '8px 16px', fontSize: 13, display: 'flex', gap: 14,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <span>Preview — this page is not published. Only you can see it.</span>
      <Link href={`/api/preview/exit?path=${encodeURIComponent(path)}`}
            style={{ color: '#fff', textDecoration: 'underline' }}>
        Leave preview
      </Link>
    </div>
  )
}
