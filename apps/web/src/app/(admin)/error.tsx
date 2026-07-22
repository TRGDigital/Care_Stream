'use client'

// Error boundary for the whole admin console. Without this, any render exception on a page
// (e.g. an unexpected data shape) white-screens the entire app with "Application error". This
// catches it, keeps the user in the console, and offers a graceful retry / reload.

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[admin] render error:', error)
  }, [error])

  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="rounded-full bg-amber-50 p-3">
        <AlertTriangle size={26} className="text-amber-500" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-neutral-dark">Something went wrong on this page</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-neutral-mid">
          This section hit an unexpected error. Your data is safe, nothing was changed. Try again, or reload the page.
        </p>
        {error?.digest && <p className="mt-2 text-[11px] text-neutral-mid/70">Reference: {error.digest}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
        >
          <RotateCcw size={15} /> Try again
        </button>
        <button
          onClick={() => { if (typeof window !== 'undefined') window.location.reload() }}
          className="inline-flex items-center gap-1.5 rounded-btn border border-gray-200 px-4 py-2 text-sm font-medium text-neutral-mid hover:border-gray-300"
        >
          <RefreshCw size={15} /> Reload page
        </button>
      </div>
    </div>
  )
}
