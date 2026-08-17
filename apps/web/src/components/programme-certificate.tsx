// Branded diploma / pathway certificate. Deliberately carries the evidence a
// single-module certificate cannot: cumulative CPD hours substantiated by real time
// on the lessons, learning gain summed across every unit, the synoptic (cross-unit)
// result, observed-competency sign-offs, and a transcript of the units themselves.
//
// Keeps the `.cert-sheet` class so the existing print CSS in globals.css isolates
// and colour-prints just the certificate.

import { Award, ShieldCheck, TrendingUp } from 'lucide-react'

function fmt(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '—' }
}

const KIND_LABEL: Record<string, string> = { diploma: 'Diploma', pathway: 'Pathway', award: 'Award' }

export type ProgrammeCertificateProps = {
  staffName:      string
  staffRole?:     string | null
  programmeName:  string
  kind?:          string
  orgName?:       string | null
  orgLogoUrl?:    string | null
  completedAt?:   string | null
  expiresAt?:     string | null
  cpd?:           { accredited: boolean; hours: number | null; provider_number: string | null; verified_hours: number | null }
  independentlyReviewed?: boolean
  attestedByName?: string | null
  attestedByRole?: string | null
  synoptic?:      { score: number | null; total: number | null; pass_mark: number }
  averageUnitScore?: number | null
  learningGain?:  { before: number; before_total: number; after: number | null } | null
  practicalSignedCount?: number
  outcomes?:      string[]
  standards?:     Array<{ framework: string; code: string; label: string }>
  units?:         Array<{ name: string; score: number | null; completed_at: string | null; duration_minutes: number | null; practical_signed: boolean }>
  reflection?:    string | null
}

export function ProgrammeCertificate({
  staffName, staffRole, programmeName, kind = 'diploma', orgName, orgLogoUrl, completedAt, expiresAt,
  cpd, independentlyReviewed, attestedByName, attestedByRole, synoptic, averageUnitScore,
  learningGain, practicalSignedCount = 0, outcomes = [], standards = [], units = [], reflection,
}: ProgrammeCertificateProps) {
  const kindLabel = KIND_LABEL[kind] ?? 'Programme'
  const gainPct = learningGain && learningGain.before_total
    ? Math.round((learningGain.before / learningGain.before_total) * 100)
    : null

  return (
    <div className="cert-sheet relative overflow-hidden rounded-2xl border border-teal/20 bg-white shadow-card">
      {/* Brand header band */}
      <div className="flex items-center justify-between bg-gradient-to-r from-teal-dark via-teal to-teal-dark px-8 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="CareStream" className="h-16 w-auto object-contain" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/85">{kindLabel}</span>
      </div>

      <div className="relative px-10 pb-9 pt-7 text-center">
        {/* Decorative corner flourishes, framed inside the white body */}
        <span className="pointer-events-none absolute left-3 top-3 h-10 w-10 rounded-tl-lg border-l-2 border-t-2 border-teal/25" />
        <span className="pointer-events-none absolute right-3 top-3 h-10 w-10 rounded-tr-lg border-r-2 border-t-2 border-teal/25" />
        <span className="pointer-events-none absolute bottom-3 left-3 h-10 w-10 rounded-bl-lg border-b-2 border-l-2 border-teal/25" />
        <span className="pointer-events-none absolute bottom-3 right-3 h-10 w-10 rounded-br-lg border-b-2 border-r-2 border-teal/25" />

        {/* Seal */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-teal-light/50 ring-4 ring-teal/10">
          <Award size={38} className="text-teal" />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal">{kindLabel}</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-neutral-mid">
          Multi-unit programme · assessed knowledge, applied judgement and reflective practice
        </p>
        {independentlyReviewed && (
          <span className="mx-auto mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal-light/40 px-3 py-1 text-[11px] font-semibold text-teal-dark">
            <ShieldCheck size={13} className="text-teal" /> Independently reviewed content
          </span>
        )}

        <p className="mt-7 text-sm text-neutral-mid">This certifies that</p>
        <p className="mt-1 font-serif text-3xl font-bold text-neutral-dark">{staffName}</p>
        {staffRole && <p className="mt-0.5 text-xs text-neutral-mid">{staffRole}</p>}
        <div className="mx-auto mt-2 h-px w-52 bg-gradient-to-r from-transparent via-teal/50 to-transparent" />

        <p className="mt-5 text-sm text-neutral-mid">has successfully completed the</p>
        <p className="mt-1 font-serif text-2xl font-semibold text-teal-dark">{programmeName}</p>
        {orgName && (
          <div className="mt-3 flex flex-col items-center gap-1.5">
            {orgLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={orgLogoUrl} alt={orgName} className="h-14 w-auto object-contain" />
            )}
            <span className="text-sm text-neutral-mid">for {orgName}</span>
          </div>
        )}

        {/* Headline stats */}
        <div className="mx-auto mt-7 grid max-w-xl grid-cols-4 divide-x divide-gray-100 rounded-xl border border-gray-100 bg-neutral-light/40 py-4">
          <div>
            <p className="text-lg font-bold text-teal">{units.length}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-neutral-mid">Units</p>
          </div>
          <div>
            <p className="text-lg font-bold text-teal">{cpd?.hours != null ? cpd.hours : '—'}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-neutral-mid">CPD hours</p>
          </div>
          <div>
            <p className="text-lg font-bold text-teal">{synoptic?.score != null ? `${synoptic.score}%` : '—'}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-neutral-mid">Final assessment</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-dark">{fmt(completedAt)}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-neutral-mid">Completed</p>
          </div>
        </div>

        {/* Learning gain — the differentiated evidence: measured, not asserted. */}
        {gainPct != null && (
          <div className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-3 rounded-lg border border-teal/30 bg-teal-light/25 px-4 py-2.5">
            <TrendingUp size={18} className="shrink-0 text-teal" />
            <p className="text-left text-xs text-neutral-dark">
              <span className="font-semibold text-teal-dark">Measured learning gain: </span>
              scored <strong>{gainPct}%</strong> on the pre-course knowledge checks
              {learningGain?.after != null && <> and <strong>{learningGain.after}%</strong> across the unit assessments</>}
              {synoptic?.score != null && <>, passing the cross-unit final assessment at <strong>{synoptic.score}%</strong></>}.
            </p>
          </div>
        )}

        {/* Verified time + practical sign-offs */}
        <div className="mx-auto mt-3 flex max-w-xl flex-wrap items-center justify-center gap-2 text-[11px]">
          {cpd?.verified_hours != null && (
            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-neutral-mid">
              <strong className="text-neutral-dark">{cpd.verified_hours} h</strong> verified time on the lessons
            </span>
          )}
          {practicalSignedCount > 0 && (
            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-neutral-mid">
              <strong className="text-neutral-dark">{practicalSignedCount}</strong> observed competency sign-off{practicalSignedCount === 1 ? '' : 's'}
            </span>
          )}
          {reflection && (
            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-neutral-mid">
              Reflective account completed
            </span>
          )}
          {expiresAt && (
            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-neutral-mid">
              Renews <strong className="text-neutral-dark">{fmt(expiresAt)}</strong>
            </span>
          )}
        </div>

        {cpd?.accredited && (
          <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-3 rounded-lg border border-teal/30 bg-teal-light/30 px-4 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-teal text-[9px] font-bold leading-tight text-teal">CPD</span>
            <div className="text-left">
              <p className="text-xs font-semibold text-teal-dark">CPD Certified{cpd.hours != null ? ` · ${cpd.hours} CPD hour${cpd.hours === 1 ? '' : 's'}` : ''}</p>
              <p className="text-[10px] text-neutral-mid">{cpd.provider_number ? `The CPD Certification Service — Provider ${cpd.provider_number}` : 'Accredited continuing professional development'}</p>
            </div>
          </div>
        )}

        {/* Transcript — every unit, its score and date. This is what makes it a
            programme record rather than a decorative certificate. */}
        {units.length > 0 && (
          <div className="mt-8 text-left">
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">Units completed</p>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-[11px]">
                <thead className="bg-neutral-light/50 text-neutral-mid">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium">Unit</th>
                    <th className="px-3 py-1.5 text-right font-medium">Score</th>
                    <th className="px-3 py-1.5 text-right font-medium">Time</th>
                    <th className="px-3 py-1.5 text-right font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {units.map((u, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-neutral-dark">
                        {u.name}
                        {u.practical_signed && <span className="ml-1.5 text-[9px] font-semibold uppercase text-teal">observed</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-neutral-dark">{u.score != null ? `${u.score}%` : '—'}</td>
                      <td className="px-3 py-1.5 text-right text-neutral-mid">{u.duration_minutes ? `${u.duration_minutes} min` : '—'}</td>
                      <td className="px-3 py-1.5 text-right text-neutral-mid">{fmt(u.completed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {averageUnitScore != null && (
              <p className="mt-1.5 text-right text-[10px] text-neutral-mid">Average unit score <strong className="text-neutral-dark">{averageUnitScore}%</strong></p>
            )}
          </div>
        )}

        {/* Outcomes + standards */}
        {outcomes.length > 0 && (
          <div className="mt-6 text-left">
            <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">On completion, the holder can</p>
            <ol className="list-decimal space-y-0.5 pl-5 text-[11px] leading-relaxed text-neutral-dark">
              {outcomes.map((o, i) => <li key={i}>{o}</li>)}
            </ol>
          </div>
        )}

        {standards.length > 0 && (
          <div className="mt-5">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">Mapped standards</p>
            <div className="flex flex-wrap justify-center gap-1">
              {standards.map((s, i) => (
                <span key={i} className="rounded-full bg-teal-light/40 px-2 py-0.5 text-[10px] text-teal-dark">{s.label}</span>
              ))}
            </div>
          </div>
        )}

        {/* Footer / issuer */}
        <div className="mt-8 flex items-center justify-center gap-2 border-t border-gray-100 pt-5">
          <span className="text-[10px] uppercase tracking-wide text-neutral-mid">Issued &amp; assessed by</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.png" alt="CareStream" className="h-10 w-auto object-contain" />
        </div>
        {attestedByName && (
          <p className="mt-2 text-[10px] text-neutral-mid">
            Content attested by {attestedByName}{attestedByRole ? `, ${attestedByRole}` : ''}
          </p>
        )}
        {/* Same honest framing as the single-module certificate: this is a CareStream
            programme, not an Ofqual-regulated qualification. */}
        <p className="mx-auto mt-3 max-w-lg text-[9.5px] leading-relaxed text-neutral-mid">
          A CareStream {kindLabel.toLowerCase()} recording completion of a multi-unit programme of continuing professional development,
          assessed by knowledge check, cross-unit final assessment and reflective practice. It is <strong>not a regulated
          qualification</strong> and carries no Ofqual/RQF level; the provider remains responsible for ensuring training meets
          regulatory requirements.
        </p>
      </div>
    </div>
  )
}
