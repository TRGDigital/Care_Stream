import { Mic, Send, Volume2, Globe, FileText } from 'lucide-react'

// Self-contained (no iframe) mock-up of the hub answering a policy question with
// a cited source. Reusable across marketing pages; renders crisply at any width.
export function HubChatMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[380px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ${className}`}>
      {/* Header */}
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
      {/* Conversation */}
      <div className="space-y-3 bg-gray-50 p-4">
        <div className="flex justify-end">
          <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-teal px-3 py-2 text-[11px] font-medium text-white">
            A resident has just had a fall. What do I need to do?
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
          <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-gray-100 bg-white p-3 shadow-sm">
            <p className="mb-1.5 text-[11px] font-semibold text-neutral-dark">After a fall, before end of shift:</p>
            <div className="space-y-1 text-[10px] text-neutral-mid">
              {['Carry out and record post-fall observations', 'Complete the accident and incident form', 'Tell the next of kin if any injury is suspected'].map((p, i) => (
                <div key={i} className="flex items-start gap-1.5"><span className="font-bold text-teal">{i + 1}.</span><p>{p}</p></div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-teal/15 bg-teal/5 px-2 py-1">
              <FileText size={11} className="shrink-0 text-teal" />
              <span className="text-[10px] font-medium text-teal">Source: Falls Policy, Section 4.2</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-mid"><Volume2 size={11} /> Listen</span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-mid"><Globe size={11} /> 60+ languages</span>
            </div>
          </div>
        </div>
      </div>
      {/* Input bar */}
      <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
        <div className="flex-1 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] text-gray-300">Ask a question…</div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal/10 text-teal"><Mic size={13} /></div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal text-white"><Send size={12} /></div>
      </div>
    </div>
  )
}
