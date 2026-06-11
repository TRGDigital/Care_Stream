/* eslint-disable @next/next/no-img-element */
import {
  Plus, MessageSquare, LifeBuoy, Compass, RefreshCw, Repeat, ClipboardCheck,
  ShieldCheck, TrendingUp, BookOpen, Users, Brain, Target, Mic, SendHorizonal, FileText,
  type LucideIcon,
} from 'lucide-react'

function NavItem({ Icon, label, badge, badgeColor, active }: { Icon: LucideIcon; label: string; badge?: string; badgeColor?: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 rounded px-1.5 py-[3px] ${active ? 'bg-teal-light font-semibold text-teal' : 'text-neutral-mid'}`}>
      <Icon className="h-2.5 w-2.5 flex-shrink-0" />
      <span className="flex-1 truncate text-[8px] font-medium">{label}</span>
      {badge && <span className={`flex h-3 min-w-3 items-center justify-center rounded-full px-1 text-[6px] font-bold text-white ${badgeColor}`}>{badge}</span>}
    </div>
  )
}

function Card({ Icon, title, sub, active }: { Icon: LucideIcon; title: string; sub: string; active?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-md border bg-white px-1.5 py-2.5 text-center ${active ? 'border-teal ring-1 ring-teal/40' : 'border-cream-line'}`}>
      <span className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-teal-light"><Icon className="h-3 w-3 text-teal" /></span>
      <p className="text-[8px] font-bold leading-tight text-neutral-dark">{title}</p>
      <p className="mt-0.5 text-[6px] leading-tight text-neutral-mid">{sub}</p>
    </div>
  )
}

// Coded replica of the hub "knowledge area" picker (sidebar + cards + chat bar).
export function HubDashboardMockup() {
  return (
    <div className="w-full max-w-xl select-none overflow-hidden rounded-xl border border-cream-line bg-white shadow-card">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-cream-line bg-cream-warm px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        <span className="h-2 w-2 rounded-full bg-amber-300" />
        <span className="h-2 w-2 rounded-full bg-green-400" />
        <span className="ml-2 flex-1 truncate rounded bg-white px-2 py-[3px] text-[7px] text-neutral-mid">app.carestreamai.com/hub</span>
      </div>

      {/* App top nav */}
      <div className="flex items-center justify-between border-b border-cream-line px-3 py-2">
        <img src="/logo-color.svg" alt="CareStreamAI" className="h-3 w-auto" />
        <div className="flex items-center gap-2.5 text-[8px]">
          <span className="font-semibold text-teal">Chat Hub</span>
          <span className="text-neutral-mid">My Progress</span>
          <span className="text-neutral-mid">CQC Prep</span>
          <span className="text-neutral-mid">Admin</span>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-[36%] space-y-2 border-r border-cream-line bg-cream/50 p-2">
          <div className="flex items-center justify-center gap-1 rounded-md bg-teal-gradient py-1.5 text-[8px] font-semibold text-white shadow-teal-glow">
            <Plus className="h-2.5 w-2.5" /> New chat
          </div>
          <div className="space-y-[2px]">
            <NavItem Icon={MessageSquare} label="Chat" active />
            <NavItem Icon={LifeBuoy} label="My Induction" badge="2" badgeColor="bg-blue-500" />
            <NavItem Icon={Compass} label="My Training" badge="2" badgeColor="bg-amber-brand" />
            <NavItem Icon={RefreshCw} label="Annual Training" badge="3" badgeColor="bg-teal" />
            <NavItem Icon={Repeat} label="Follow-up" badge="14" badgeColor="bg-red-500" />
            <NavItem Icon={ClipboardCheck} label="Audits" badge="7" badgeColor="bg-amber-brand" />
            <NavItem Icon={ShieldCheck} label="CQC Prep" />
            <NavItem Icon={TrendingUp} label="My Progress" />
          </div>
          <div>
            <p className="mb-1 px-1.5 text-[6px] font-bold uppercase tracking-wide text-neutral-mid/70">Saved policies</p>
            <div className="space-y-[2px]">
              <div className="flex items-center gap-1 px-1.5 text-[7px] text-neutral-mid"><FileText className="h-2 w-2" /> 116 Infection Control a…</div>
              <div className="flex items-center gap-1 px-1.5 text-[7px] text-neutral-mid"><FileText className="h-2 w-2" /> 461 Promoting the welf…</div>
            </div>
          </div>
          <div>
            <p className="mb-1 px-1.5 text-[6px] font-bold uppercase tracking-wide text-neutral-mid/70">Today</p>
            <div className="px-1.5 text-[7px] text-neutral-mid">What is our falls preventio…</div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 bg-teal-light/40 p-3">
          <p className="text-center text-[11px] font-bold text-neutral-dark">What would you like to ask about?</p>
          <p className="mb-3 text-center text-[7px] text-neutral-mid">Choose a knowledge area to get started</p>

          <div className="grid grid-cols-3 gap-1.5">
            <Card Icon={BookOpen} title="Policies & Procedures" sub="Care, clinical & operational" />
            <Card Icon={Users} title="Staff Handbook" sub="HR, employment & guidance" active />
            <Card Icon={Brain} title="Training & Learning" sub="Modules & sector knowledge" />
            <Card Icon={ShieldCheck} title="CQC Compliance" sub="Inspection readiness" />
            <Card Icon={ClipboardCheck} title="Auditing" sub="Findings & AI recommendations" />
            <Card Icon={Target} title="Business Continuity" sub="Emergency & contingency" />
          </div>

          <div className="mt-3 flex items-center gap-1.5 rounded-full border border-cream-line bg-white px-2.5 py-1.5">
            <span className="flex-1 text-[7px] text-neutral-mid">Choose a topic above to start chatting…</span>
            <Mic className="h-2.5 w-2.5 text-neutral-mid" />
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-gradient"><SendHorizonal className="h-2 w-2 text-white" /></span>
          </div>
          <p className="mt-1.5 text-center text-[6px] text-neutral-mid">Responses are generated from your organisation's policies</p>
        </div>
      </div>
    </div>
  )
}
