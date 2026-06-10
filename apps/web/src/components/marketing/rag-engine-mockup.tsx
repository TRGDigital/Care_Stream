import { Database, Cpu, Search, FileText } from 'lucide-react'

// Coded diagram of the retrieval engine: your document database and the AI engine
// working together to produce a cited answer. Conceptual (no implementation detail),
// in the same card style as the other site mock-ups.
export function RagEngineMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[420px] rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl ${className}`}>
      {/* Database */}
      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-neutral-light p-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-teal-light"><Database size={18} className="text-teal" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-neutral-dark">Your document library</p>
          <p className="text-[11px] text-neutral-mid">Indexed, searchable, private</p>
        </div>
        <span className="flex-shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-teal ring-1 ring-teal/20">200+ docs</span>
      </div>

      {/* Flow: retrieve */}
      <div className="flex flex-col items-center gap-1 py-1.5">
        <div className="h-3 w-px bg-teal/30" />
        <span className="flex items-center gap-1.5 rounded-full bg-teal/10 px-3 py-1 text-[10px] font-semibold text-teal"><Search size={11} /> Retrieve the relevant sections</span>
        <div className="h-3 w-px bg-teal/30" />
      </div>

      {/* AI engine */}
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-dark p-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10"><Cpu size={18} className="text-white" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">CareStream engine</p>
          <p className="text-[11px] text-white/60">Composes the answer from the source only</p>
        </div>
      </div>

      {/* Flow: ground */}
      <div className="flex flex-col items-center py-1.5">
        <div className="h-3 w-px bg-teal/30" />
      </div>

      {/* Cited answer */}
      <div className="rounded-xl border border-teal/20 bg-teal-light/40 p-4">
        <div className="mb-1.5 flex items-center gap-2"><FileText size={14} className="text-teal" /><p className="text-sm font-bold text-neutral-dark">Cited answer</p></div>
        <p className="text-[11px] leading-relaxed text-neutral-mid">Follow the post-fall observation schedule set out in your Falls Policy, and record each check.</p>
        <span className="mt-2 inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-teal ring-1 ring-teal/20">Source: Falls Policy, Section 4.2</span>
      </div>
    </div>
  )
}
