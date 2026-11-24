'use client'

// "My signature" in the hub sidebar, for managers and administrators (pilot). Opens the same editor as Settings, in a small dialog. Hidden for everyone else.
import { useEffect, useState } from 'react'
import { PenLine, X } from 'lucide-react'
import { useSignatureAvailable } from '@/lib/letterhead-client'
import { SignatureEditor } from '@/components/admin/signature-editor'

export function MySignature() {
  const { on, meta, reload } = useSignatureAvailable()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  }, [open])
  if (!on || !meta) return null
  return (
    <>
      <button onClick={() => setOpen(true)} aria-haspopup="dialog" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-mid transition-colors hover:bg-neutral-light hover:text-neutral-dark">
        <PenLine size={15} /> My signature
        {meta.has && <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">Added</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div role="dialog" aria-modal="true" aria-label="My signature" className="no-scrollbar max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold text-neutral-dark">My signature</h2><button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button></div>
            <SignatureEditor name={meta.name ?? ''} role={meta.job_role ?? ''} meta={meta} onChanged={reload} />
          </div>
        </div>
      )}
    </>
  )
}
