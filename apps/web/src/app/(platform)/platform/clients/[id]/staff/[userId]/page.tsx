'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'

// The full staff profile: everything we hold about one person, one tab at a time. Platform console only.
// Chats are shown in full, including chats the person deleted (marked "Deleted by staff"). Every tab view is written to the audit log by the API.

type Tab = 'overview' | 'training' | 'audits' | 'cqc' | 'onboarding' | 'supervision' | 'chats' | 'certificates' | 'access'
const TABS: Array<[Tab, string]> = [['overview', 'Overview'], ['training', 'Training and CPD'], ['audits', 'Audits and actions'], ['cqc', 'CQC prep'], ['onboarding', 'Onboarding and face to face'], ['supervision', 'Supervisions and appraisals'], ['chats', 'Chats and knowledge gaps'], ['certificates', 'Certificates'], ['access', 'Access and devices']]

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const ACTIVITY: Record<string, string> = { 'Active this week': 'bg-emerald-100 text-emerald-800', 'Occasional': 'bg-amber-100 text-amber-800', 'Dormant': 'bg-red-100 text-red-700', 'Never signed in': 'bg-red-100 text-red-700', 'No activity': 'bg-gray-100 text-gray-600' }
const STATUS: Record<string, string> = { complete: 'bg-emerald-100 text-emerald-800', completed: 'bg-emerald-100 text-emerald-800', done: 'bg-emerald-100 text-emerald-800', attended: 'bg-emerald-100 text-emerald-800', evaluated: 'bg-emerald-100 text-emerald-800', in_progress: 'bg-blue-100 text-blue-800', open: 'bg-blue-100 text-blue-800', allocated: 'bg-blue-100 text-blue-800', not_started: 'bg-gray-100 text-gray-600', pending: 'bg-gray-100 text-gray-600', expired: 'bg-red-100 text-red-700', overdue: 'bg-red-100 text-red-700', missed: 'bg-red-100 text-red-700', absent: 'bg-red-100 text-red-700' }
const label = (s: string) => String(s ?? '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
const Pill = ({ s }: { s: string }) => <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[s] ?? 'bg-gray-100 text-gray-600'}`}>{label(s)}</span>
const Chip = ({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'red' | 'amber' | 'green' | 'blue' | 'purple' }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${{ gray: 'bg-gray-100 text-gray-600', red: 'bg-red-100 text-red-700', amber: 'bg-amber-100 text-amber-800', green: 'bg-emerald-100 text-emerald-800', blue: 'bg-blue-100 text-blue-800', purple: 'bg-purple-100 text-purple-700' }[tone]}`}>{children}</span>)
const Card = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-gray-200 bg-white p-5"><h2 className="text-sm font-semibold text-neutral-dark">{title}</h2>{sub && <p className="mt-0.5 text-xs text-neutral-mid">{sub}</p>}<div className="mt-3">{children}</div></section>)
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-neutral-mid">{children}</p>
function Table({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <Empty>{empty}</Empty>
  return (
    <div className="max-h-[28rem] overflow-auto rounded-lg border border-gray-100">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-neutral-light text-left text-xs uppercase tracking-wide text-neutral-mid"><tr>{head.map(h => <th key={h} className="whitespace-nowrap px-3 py-2">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100">{rows.map((r, i) => <tr key={i} className="align-top">{r.map((c, j) => <td key={j} className="px-3 py-2 text-neutral-dark">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>)
}
const Stat = ({ label: l, children }: { label: string; children: React.ReactNode }) => <div><dt className="text-xs text-neutral-mid">{l}</dt><dd className="mt-0.5 text-sm font-medium text-neutral-dark">{children}</dd></div>

// ─── tabs ────────────────────────────────────────────────────────────────────
function Overview({ d, go }: { d: any; go: (t: Tab) => void }) {
  const c = d.counts
  const tiles: Array<[Tab, string, string, string]> = [
    ['training', 'Training and CPD', `${c.training.completed} of ${c.training.assigned} complete`, c.training.overdue ? `${c.training.overdue} overdue` : ''],
    ['audits', 'Audits and actions', `${c.audits.carried_out} carried out, ${c.audits.scheduled_open} scheduled`, c.audits.actions_open ? `${c.audits.actions_open} actions open` : ''],
    ['cqc', 'CQC prep', `${c.cqc.answered} of ${c.cqc.assigned} answered`, ''],
    ['onboarding', 'Onboarding and face to face', `${c.onboarding.completed} of ${c.onboarding.assigned} induction, ${c.face_to_face.attended} of ${c.face_to_face.allocated} sessions`, ''],
    ['supervision', 'Supervisions and appraisals', `${c.supervisions} recorded`, ''],
    ['chats', 'Chats and knowledge gaps', `${c.chats.total} questions, ${c.chats.last_30_days} in 30 days`, c.chats.no_match ? `${c.chats.no_match} not answered by a policy` : ''],
    ['certificates', 'Certificates', `${c.certificates.training} training, ${c.certificates.face_to_face} face to face`, ''],
    ['access', 'Access and devices', `${c.access.sign_ins} sign ins recorded`, c.access.push_devices ? `${c.access.push_devices} device${c.access.push_devices === 1 ? '' : 's'} with notifications` : ''],
  ]
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([t, title, line, warn]) => (
          <button key={t} onClick={() => go(t)} className="rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-teal">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">{title}</p>
            <p className="mt-1 text-sm font-medium text-neutral-dark">{line}</p>
            {warn && <p className="mt-0.5 text-xs font-medium text-red-600">{warn}</p>}
          </button>))}
      </div>
      {d.flags?.length > 0 && <Card title="Needs attention"><div className="flex flex-wrap gap-2">{d.flags.map((f: any) => <Chip key={f.kind} tone={f.level === 'high' ? 'red' : 'amber'}>{f.label}</Chip>)}</div></Card>}
      <Card title="Recent activity" sub="Training, induction, questions and sign ins, newest first">
        {d.timeline.length === 0 ? <Empty>No activity recorded yet.</Empty> : <ul className="space-y-1.5 text-sm">{d.timeline.map((e: any, i: number) => <li key={i} className="flex gap-3"><span className="w-36 shrink-0 text-xs text-neutral-mid">{when(e.at)}</span><span>{e.label}</span></li>)}</ul>}
      </Card>
    </div>)
}

function Training({ d }: { d: any }) {
  const rows = (items: any[]) => items.map(i => [<div key="n"><span className="font-medium">{i.module_name}</span><span className="block text-xs capitalize text-neutral-mid">{i.category}{i.cpd_accredited ? ' · CPD certified' : ''}{i.requires_practical ? ` · practical ${i.practical_signed ? 'signed' : 'needed'}` : ''}</span></div>, <Pill key="s" s={i.status} />, i.score ? `${i.score.pct}%` : '', i.due_date ? <span key="d" className={i.overdue ? 'font-semibold text-red-600' : ''}>{day(i.due_date)}{i.overdue ? ' (overdue)' : ''}</span> : '', day(i.completed_at), day(i.expires_at), i.reminders_sent ? `${i.reminders_sent}, last ${day(i.last_reminded_at)}` : ''])
  const head = ['Module', 'Status', 'Score', 'Due', 'Completed', 'Expires', 'Reminders']
  const a = d.annual.summary, t = d.training.summary
  return (
    <div className="space-y-6">
      <Card title="Summary"><dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Training">{t.completed} of {t.assigned} complete{t.overdue ? <span className="text-red-600">, {t.overdue} overdue</span> : ''}</Stat>
        <Stat label="Annual training">{a.completed} of {a.assigned} complete</Stat>
        <Stat label="CPD certified completed">{d.cpd.completed} ({d.cpd.hours} hours)</Stat>
        <Stat label="Reminders sent by admins">{d.reminders.manual_total}</Stat>
      </dl></Card>
      <Card title={`Annual training (${d.annual.items.length})`}><Table head={head} rows={rows(d.annual.items)} empty="No annual training allocated." /></Card>
      <Card title={`Training (${d.training.items.length})`}><Table head={head} rows={rows(d.training.items)} empty="No training allocated." /></Card>
      {d.required && <Card title="Required training for their role" sub={`${d.required.job_role ?? 'No job role set'}: ${d.required.met} of ${d.required.required} met${d.required.compliance_pct != null ? ` (${d.required.compliance_pct}%)` : ''}`}>
        <Table head={['Requirement', 'Status', 'Detail']} rows={(d.required.items ?? []).map((i: any) => [i.label, <Pill key="s" s={i.status} />, i.detail ?? ''])} empty="Nothing required for this role." /></Card>}
      {d.reading && <Card title="Policies read" sub={`${d.reading.summary.policies_read} policies, ${d.reading.summary.thorough} thorough, ${d.reading.summary.skimmed} skimmed`}>
        <Table head={['Policy', 'How', 'Sessions', 'Time', 'Best scroll', 'Last read']} rows={(d.reading.items ?? []).map((i: any) => [i.title, <Chip key="h" tone={i.how === 'thorough' ? 'green' : 'amber'}>{label(i.how)}</Chip>, i.sessions, `${Math.round((i.total_seconds ?? 0) / 60)} min`, `${i.best_scroll_pct}%`, day(i.last_read_at)])} empty="No policies read yet." /></Card>}
    </div>)
}

function Audits({ d }: { d: any }) {
  return (
    <div className="space-y-6">
      <Card title={`Audits allocated to them (${d.assignments.items.length})`} sub={`${d.assignments.summary.open} open, ${d.assignments.summary.overdue} overdue, ${d.assignments.summary.completed} completed, ${d.assignments.summary.missed} missed`}>
        <Table head={['Audit', 'Subject', 'Due', 'Repeats', 'Status', 'Completed']} rows={d.assignments.items.map((a: any) => [a.template_name ?? a.template?.name ?? 'Audit', a.subject ?? a.subject_room ?? '', <span key="d" className={a.overdue ? 'font-semibold text-red-600' : ''}>{day(a.due_date)}</span>, label(a.repeat ?? ''), <Pill key="s" s={a.overdue ? 'overdue' : a.status} />, day(a.completed_at)])} empty="No audits allocated to them." /></Card>
      <Card title={`Audits they carried out (${d.runs.total})`}>
        <Table head={['Audit', 'Month', 'Status', 'Approval', 'Completed', 'Room or shift']} rows={d.runs.items.map((r: any) => [r.audit, day(r.month), <Pill key="s" s={r.status} />, r.approval_status ? <span key="a">{label(r.approval_status)}{r.approved_by ? ` by ${r.approved_by}` : ''}</span> : '', day(r.completed_at), [r.room, r.shift].filter(Boolean).join(', ')])} empty="No audits carried out." /></Card>
      <Card title={`Actions assigned to them (${d.actions.items.length})`} sub={`${d.actions.open} still open`}>
        <Table head={['Action', 'From audit', 'Priority', 'Due', 'Status', 'Completed']} rows={d.actions.items.map((a: any) => [<div key="d">{a.description}{a.completion_note && <span className="block text-xs text-neutral-mid">Note: {a.completion_note}</span>}</div>, a.audit ? `${a.audit} (${day(a.audit_month)})` : '', label(a.priority ?? ''), <span key="u" className={a.overdue ? 'font-semibold text-red-600' : ''}>{day(a.due_date)}{a.overdue ? ' (overdue)' : ''}</span>, <Pill key="s" s={a.status} />, day(a.done_at)])} empty="No audit actions assigned to them." /></Card>
    </div>)
}

function Cqc({ d }: { d: any }) {
  const c = d.cqc
  return (
    <div className="space-y-6">
      <Card title="CQC staff prep" sub={`${c.answered} answered, ${c.pending} waiting${c.avg_score != null ? `, average score ${c.avg_score}%` : ''}${c.improvement != null ? `, ${c.improvement > 0 ? '+' : ''}${c.improvement} points on retry` : ''}`}>
        <Table head={['Domain', 'Question', 'Status', 'Score', 'First score', 'Attempts', 'Answered']} rows={(c.questions ?? []).map((q: any) => [label(q.domain ?? ''), q.question, <Pill key="s" s={q.status} />, q.score != null ? `${q.score}%` : '', q.first_score != null ? `${q.first_score}%` : '', q.attempts, day(q.answered_at)])} empty="No CQC prep questions sent yet." /></Card>
      {d.follow_up && <Card title="Gaps from quizzes and induction" sub={`${d.follow_up.open_count} open, ${d.follow_up.unreviewed_count} not yet reviewed${d.follow_up.last_review ? `, last review ${day(d.follow_up.last_review.at)}` : ''}`}>
        <Table head={['Source', 'Topic', 'Question', 'When']} rows={(d.follow_up.gaps ?? []).map((g: any) => [label(g.source), g.topic ?? '', g.question ?? '', day(g.when)])} empty="No knowledge gaps from training." /></Card>}
    </div>)
}

function Onboarding({ d }: { d: any }) {
  return (
    <div className="space-y-6">
      <Card title="Induction" sub={`${d.onboarding.summary.completed ?? 0} of ${d.onboarding.summary.assigned ?? 0} complete`}>
        <Table head={['Induction', 'Status', 'Enrolled', 'Completed', 'Due']} rows={(d.onboarding.items ?? []).map((o: any) => [o.flow_name ?? '', <Pill key="s" s={o.overdue ? 'overdue' : o.status} />, day(o.enrolled_at), day(o.completed_at), day(o.due_date)])} empty="Not enrolled on an induction." /></Card>
      {d.induction_questions && <Card title="Induction questions" sub={`${d.induction_questions.summary.correct} of ${d.induction_questions.summary.answered} correct`}>
        <Table head={['Induction', 'Question', 'Their answer', 'Correct answer', '']} rows={(d.induction_questions.items ?? []).map((q: any) => [q.flow_name ?? '', q.question, q.selected ?? '', q.correct_answer ?? '', <Chip key="c" tone={q.is_correct ? 'green' : 'red'}>{q.is_correct ? 'Correct' : 'Wrong'}</Chip>])} empty="No induction questions answered." /></Card>}
      <Card title="Face to face sessions" sub={`${d.face_to_face.summary.attended} attended, ${d.face_to_face.summary.missed} missed, ${d.face_to_face.summary.allocated} allocated`}>
        <Table head={['Session', 'Date', 'Status', 'Follow up course']} rows={(d.face_to_face.items ?? []).map((s: any) => [s.title, day(s.date), <Pill key="s" s={s.status} />, s.module_assigned ? (s.completion ? label(s.completion) : 'Assigned') : ''])} empty="No face to face sessions." /></Card>
      <Card title="Face to face certificates"><Table head={['Title', 'Session', 'Competency', 'Issued']} rows={(d.face_to_face_certificates.items ?? []).map((c: any) => [c.title, day(c.session_date), c.competency ?? '', day(c.issued_at)])} empty="No certificates stored." /></Card>
    </div>)
}

function Supervision({ d, clientId }: { d: any; clientId: string }) {
  const sup = (list: any[], none: string) => <Table head={['Held', 'By', 'Status', 'Completed', 'Next due', 'Notes']} rows={list.map((s: any) => [day(s.held_on), s.conducted_by ?? '', <Pill key="s" s={s.status} />, day(s.completed_at), day(s.next_due), s.notes ?? ''])} empty={none} />
  return (
    <div className="space-y-6">
      {!d.available_on_plan && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Supervisions, appraisals and credentials are an Enterprise feature (Workforce). This account is not on a plan that includes it, so nothing is recorded here.</div>}
      <p className="text-xs text-neutral-mid">This is the same data as the client's Workforce page (Supervisions and appraisals). <Link href={`/platform/clients/${clientId}`} className="text-teal hover:underline">Back to the client</Link></p>
      <Card title={`Supervisions (${d.supervisions.length})`}>{sup(d.supervisions, 'No supervisions recorded.')}</Card>
      <Card title={`Appraisals (${d.appraisals.length})`}>{sup(d.appraisals, 'No appraisals recorded.')}</Card>
      <Card title={`Actions from supervisions (${d.actions.length})`}><Table head={['Action', 'Status', 'Created', 'Done']} rows={d.actions.map((a: any) => [a.description, <Pill key="s" s={a.status} />, day(a.created_at), day(a.done_at)])} empty="No supervision actions." /></Card>
      <Card title={`Credentials (${d.credentials.length})`} sub="DBS, right to work, registration and similar">
        <Table head={['Type', 'Reference', 'Issued', 'Expires', 'Evidence']} rows={d.credentials.map((c: any) => [label(c.type), c.reference ?? '', day(c.issued_at), <span key="e" className={c.expired ? 'font-semibold text-red-600' : c.expires_soon ? 'text-amber-700' : ''}>{day(c.expires_at)}{c.expired ? ' (expired)' : c.expires_soon ? ' (soon)' : ''}</span>, c.evidence_name ?? ''])} empty="No credentials recorded." /></Card>
    </div>)
}

function Chats({ d, more, loadingMore }: { d: any; more: () => void; loadingMore: boolean }) {
  // group the messages into conversations (newest conversation first, messages in time order inside each)
  const groups: Array<{ key: string; msgs: any[] }> = []
  const index = new Map<string, number>()
  for (const m of d.messages) {
    const k = m.session ?? `single-${m.id}`
    if (!index.has(k)) { index.set(k, groups.length); groups.push({ key: k, msgs: [] }) }
    groups[index.get(k)!].msgs.push(m)
  }
  for (const g of groups) g.msgs.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  const L = d.languages
  return (
    <div className="space-y-6">
      <Card title="Summary"><dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Questions asked">{d.total}</Stat>
        <Stat label="Deleted by staff">{d.deleted_count} <span className="text-xs font-normal text-neutral-mid">(still shown below)</span></Stat>
        <Stat label="Not answered by a policy">{d.knowledge_gaps.length}</Stat>
        <Stat label="Languages used">{L.used_in_chats.map((l: any) => `${l.language} (${l.count})`).join(', ') || 'None yet'}</Stat>
      </dl></Card>
      <Card title="Knowledge gaps" sub="Questions the assistant could not answer from the client's policies, newest first">
        <Table head={['Asked', 'Question', 'Topic', 'Channel', '']} rows={d.knowledge_gaps.map((g: any) => [when(g.at), g.question, label(g.category ?? ''), label(g.channel ?? ''), g.deleted_by_staff ? <Chip key="d">Deleted by staff</Chip> : ''])} empty="Every question they asked was answered from a policy." /></Card>
      <Card title="Language settings" sub="Their set languages, and every time they switched language in a training or hub set">
        <dl className="mb-3 grid grid-cols-2 gap-4 sm:grid-cols-4"><Stat label="First language">{L.first}</Stat><Stat label="Second language">{L.second ?? 'None'}</Stat><Stat label="Messages in first language">{L.comms_in_first_language ? 'Yes' : 'English'}</Stat><Stat label="May switch language">{L.switching_allowed ? 'Yes' : 'No'}</Stat></dl>
        <Table head={['When', 'Where', 'Set', 'Language']} rows={L.switches.map((s: any) => [when(s.at), label(s.area ?? ''), s.set ?? '', s.language ?? ''])} empty="No language switches recorded." /></Card>
      <Card title={`Chats (${d.total} questions)`} sub="Full text. Chats the person deleted are kept and marked.">
        {groups.length === 0 ? <Empty>They have not used the chat yet.</Empty> : <div className="space-y-5">{groups.map(g => (
          <div key={g.key} className="rounded-lg border border-gray-100">
            <div className="border-b border-gray-100 bg-neutral-light/60 px-3 py-1.5 text-xs text-neutral-mid">{g.msgs.length > 1 ? `Conversation, ${g.msgs.length} questions` : 'Single question'} · {when(g.msgs[0].at)}</div>
            <div className="space-y-3 p-3">{g.msgs.map((m: any) => (
              <div key={m.id} className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-neutral-mid">{when(m.at)}</span><Chip>{label(m.channel ?? '')}</Chip>{m.language && <Chip tone="blue">{m.language}</Chip>}{m.category && <Chip tone="purple">{label(m.category)}</Chip>}
                  {m.no_match && <Chip tone="red">No policy match</Chip>}{m.deleted_by_staff && <Chip tone="amber">Deleted by staff{m.deleted_at ? ` ${day(m.deleted_at)}` : ''}</Chip>}{m.feedback && <Chip tone={m.feedback === 'up' || m.feedback === 'positive' ? 'green' : 'amber'}>Feedback: {m.feedback}</Chip>}{m.seconds != null && <span className="text-neutral-mid">{m.seconds}s</span>}
                </div>
                <div className="rounded-lg bg-purple-50 px-3 py-2 text-sm text-neutral-dark"><span className="mb-0.5 block text-xs font-semibold text-purple-700">They asked</span><span className="whitespace-pre-wrap">{m.question}</span></div>
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-neutral-dark"><span className="mb-0.5 block text-xs font-semibold text-neutral-mid">Answer</span><span className="whitespace-pre-wrap">{m.answer}</span>{m.policies.length > 0 && <span className="mt-1 block text-xs text-neutral-mid">Policies cited: {m.policies.join(', ')}</span>}</div>
              </div>))}</div>
          </div>))}</div>}
        {d.has_more && <button onClick={more} disabled={loadingMore} className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-teal hover:bg-gray-50 disabled:opacity-50">{loadingMore ? 'Loading…' : 'Load older chats'}</button>}
      </Card>
    </div>)
}

function Certificates({ d }: { d: any }) {
  return (
    <div className="space-y-6">
      <Card title={`Training and CPD certificates (${d.training_certificates.length})`}>
        <Table head={['Course', 'Type', 'Completed', 'Expires', 'Score', 'CPD', 'Certificate']} rows={d.training_certificates.map((c: any) => [c.module_name, c.kind, day(c.completed_at), day(c.expires_at), c.score_pct != null ? `${c.score_pct}%` : '', c.cpd_accredited ? `${c.cpd_hours ?? ''} hrs` : '', c.certificate_url ? <a key="u" href={c.certificate_url} target="_blank" rel="noreferrer" className="text-teal hover:underline">Open</a> : 'Not issued'])} empty="No completed courses yet." /></Card>
      <Card title={`Face to face certificates (${d.face_to_face_certificates.count})`}><Table head={['Title', 'Session', 'Competency', 'Issued']} rows={(d.face_to_face_certificates.items ?? []).map((c: any) => [c.title, day(c.session_date), c.competency ?? '', day(c.issued_at)])} empty="None stored." /></Card>
      <Card title={`Credentials with evidence (${d.credentials.length})`}><Table head={['Type', 'Reference', 'Expires', 'Evidence file']} rows={d.credentials.map((c: any) => [label(c.type), c.reference ?? '', <span key="e" className={c.expired ? 'font-semibold text-red-600' : ''}>{day(c.expires_at)}{c.expired ? ' (expired)' : ''}</span>, c.evidence_name ?? 'None'])} empty="None recorded." /></Card>
    </div>)
}

function Access({ d }: { d: any }) {
  const s = d.summary, h = d.hub_installed
  return (
    <div className="space-y-6">
      <Card title="Summary" sub={`Sign ins have been recorded since ${d.recording_started}. Earlier ones were not kept.`}><dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Sign ins">{s.sign_ins}</Stat><Stat label="Failed attempts">{s.failed}</Stat><Stat label="Different IPs">{s.distinct_ips}</Stat><Stat label="Different devices">{s.distinct_devices}</Stat><Stat label="Last sign in">{when(s.last_sign_in) || 'None recorded'}</Stat><Stat label="Policies read (sessions)">{d.policies_read_sessions}</Stat>
      </dl></Card>
      <Card title="Hub on their phone"><div className="flex flex-wrap items-center gap-2"><Chip tone={h.installed ? 'green' : 'amber'}>{h.installed ? 'Installed or notifications on' : 'No sign of the hub on a phone'}</Chip>{h.via && <span className="text-sm text-neutral-dark">{label(h.via)}{h.last_seen ? `, last seen ${when(h.last_seen)}` : ''}</span>}</div><p className="mt-2 text-xs text-neutral-mid">{h.note}</p></Card>
      <Card title={`Sign in history (latest ${d.sign_ins.length})`}><Table head={['When', 'Result', 'IP address', 'Place', 'Device', 'Opened as', 'How']} rows={d.sign_ins.map((r: any) => [when(r.at), r.success ? <Chip key="o" tone="green">Signed in</Chip> : <Chip key="f" tone="red">{label(r.failure_reason ?? 'Failed')}</Chip>, r.ip ?? '', r.place, r.device ?? '', label(r.client ?? ''), label(r.method ?? '')])} empty="No sign ins recorded yet." /></Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Devices (${d.devices.length})`}><Table head={['Device', 'Opened as', 'Sign ins', 'Last seen', 'Last IP']} rows={d.devices.map((x: any) => [x.device, label(x.client), x.sign_ins, when(x.last_seen), x.last_ip ?? ''])} empty="None yet." /></Card>
        <Card title={`IP addresses (${d.ips.length})`}><Table head={['IP address', 'Place', 'Times', 'Last seen']} rows={d.ips.map((x: any) => [x.ip, x.place, x.count, when(x.last_seen)])} empty="None yet." /></Card>
      </div>
      <Card title={`Devices with notifications on (${d.push_devices.length})`}><Table head={['Device', 'Registered', 'Last used']} rows={d.push_devices.map((x: any) => [x.device, when(x.registered_at), when(x.last_used_at)])} empty="No device has notifications switched on." /></Card>
      <Card title={`Acknowledgements (${d.acknowledgements.length})`}><Table head={['What', 'Version', 'When']} rows={d.acknowledgements.map((a: any) => [label(a.kind), a.version, when(a.at)])} empty="None recorded." /></Card>
    </div>)
}

// ─── page ────────────────────────────────────────────────────────────────────
export default function StaffProfilePage() {
  const token = usePlatformAuth()
  const { id, userId } = useParams<{ id: string; userId: string }>()
  const [tab, setTab] = useState<Tab>('overview')
  const [header, setHeader] = useState<any>(null)
  const [cache, setCache] = useState<Record<string, any>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [chatPage, setChatPage] = useState(1)

  useEffect(() => {
    if (!token || cache[tab]) return
    let live = true
    setLoading(true); setError('')
    createPlatformClient(token).tenants.staffProfile(id, userId, tab).then(r => { if (live) { setHeader(r.header); setCache(c => ({ ...c, [tab]: r.data })) } })
      .catch(e => { if (live) setError(e?.message ?? 'Could not load this tab') }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [token, id, userId, tab, cache])

  async function loadMoreChats() {
    if (!token) return
    setLoadingMore(true)
    try {
      const next = chatPage + 1
      const r = await createPlatformClient(token).tenants.staffProfile(id, userId, 'chats', next)
      setChatPage(next)
      setCache(c => ({ ...c, chats: { ...r.data, messages: [...(c.chats?.messages ?? []), ...r.data.messages], deleted_count: (c.chats?.deleted_count ?? 0) + r.data.deleted_count } }))
    } catch (e: any) { setError(e?.message ?? 'Could not load more') } finally { setLoadingMore(false) }
  }

  const d = cache[tab]
  return (
    <PlatformShell>
      <div className="space-y-5">
        <div>
          <Link href={`/platform/clients/${id}`} className="inline-flex items-center gap-1 text-sm text-neutral-mid hover:text-teal"><ArrowLeft size={14} /> {header?.tenant?.name ?? 'Back to the client'}</Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-neutral-dark">{header?.user?.name ?? 'Staff profile'}</h1>
            {header && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTIVITY[header.activity.label] ?? 'bg-gray-100'}`}>{header.activity.label}</span>}
            {header && !header.user.is_active && <Chip>Deactivated</Chip>}
            {header?.user?.is_agency && <Chip tone="purple">Agency{header.user.agency_name ? `: ${header.user.agency_name}` : ''}</Chip>}
          </div>
          {header && <p className="mt-1 text-sm text-neutral-mid">{header.user.email} · {header.user.role}{header.user.job_role ? ` · ${header.user.job_role}` : ''}{header.user.phone_number ? ` · ${header.user.phone_number}` : ''} · Last active {when(header.activity.last_active_at) || 'never'} · Account added {day(header.user.created_at)}</p>}
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
          {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${tab === k ? 'border-teal text-teal' : 'border-transparent text-neutral-mid hover:text-neutral-dark'}`}>{l}</button>)}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {!d && loading && <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-neutral-mid" /></div>}
        {d && tab === 'overview' && <Overview d={d} go={setTab} />}
        {d && tab === 'training' && <Training d={d} />}
        {d && tab === 'audits' && <Audits d={d} />}
        {d && tab === 'cqc' && <Cqc d={d} />}
        {d && tab === 'onboarding' && <Onboarding d={d} />}
        {d && tab === 'supervision' && <Supervision d={d} clientId={id} />}
        {d && tab === 'chats' && <Chats d={d} more={loadMoreChats} loadingMore={loadingMore} />}
        {d && tab === 'certificates' && <Certificates d={d} />}
        {d && tab === 'access' && <Access d={d} />}

        <p className="border-t border-gray-100 pt-3 text-xs text-neutral-mid">Viewing this profile is recorded in the audit log. Chats are shown in full, including ones the person deleted.</p>
      </div>
    </PlatformShell>
  )
}
