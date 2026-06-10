import { Mic, Send, Volume2, FileText } from 'lucide-react'

// Hub mock-up showing the multilingual point: the policy/question is in English,
// the answer comes back in the staff member's language (Romanian here), cited.
export function HubMultilingualMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[380px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ${className}`}>
      <div className="flex items-center justify-between bg-teal px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-[10px] font-extrabold text-white">CS</div>
          <div>
            <p className="text-sm font-bold text-white">The hub</p>
            <p className="text-[10px] text-white/70">Crossways Care Home</p>
          </div>
        </div>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white">On shift</span>
      </div>
      <div className="space-y-3 bg-gray-50 p-4">
        {/* Question in English */}
        <div className="flex justify-end">
          <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-teal px-3 py-2 text-[11px] font-medium text-white">
            What should I do after a resident has a fall?
            <span className="mt-1 block text-[9px] font-semibold text-white/70">Asked in English</span>
          </div>
        </div>
        {/* Answer in Romanian */}
        <div className="flex gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
          <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-gray-100 bg-white p-3 shadow-sm">
            <p className="mb-1.5 text-[11px] font-semibold text-neutral-dark">Înainte de sfârșitul turei:</p>
            <div className="space-y-1 text-[10px] text-neutral-mid">
              <div className="flex items-start gap-1.5"><span className="font-bold text-teal">1.</span><p>Efectuați și înregistrați observațiile post-cădere.</p></div>
              <div className="flex items-start gap-1.5"><span className="font-bold text-teal">2.</span><p>Completați formularul de accident și incident.</p></div>
              <div className="flex items-start gap-1.5"><span className="font-bold text-teal">3.</span><p>Anunțați familia dacă se suspectează o rănire.</p></div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-teal/15 bg-teal/5 px-2 py-1">
              <FileText size={11} className="shrink-0 text-teal" />
              <span className="text-[10px] font-medium text-teal">Sursă: Falls Policy, Secțiunea 4.2</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-mid"><Volume2 size={11} /> Ascultați</span>
              <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-bold text-teal">Română</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
        <div className="flex-1 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] text-gray-300">Puneți o întrebare…</div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal/10 text-teal"><Mic size={13} /></div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal text-white"><Send size={12} /></div>
      </div>
    </div>
  )
}
