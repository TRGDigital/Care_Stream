// Branded annual-training certificate sheet, shared by the staff hub and the
// admin staff record. Keeps the `.cert-sheet` class so the print CSS in
// globals.css can isolate + colour-print just the certificate.

import { Award } from 'lucide-react'

function fmt(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '—' }
}

export type TrainingCertificateProps = {
  staffName:         string
  moduleName:        string
  orgName?:          string | null
  orgLogoUrl?:       string | null
  score:             number | null | undefined
  completedAt?:      string | null
  expiresAt?:        string | null
  requiresPractical?: boolean
  practicalNote?:    string | null  // overrides the default practical line when provided
}

export function TrainingCertificate({
  staffName, moduleName, orgName, orgLogoUrl, score, completedAt, expiresAt, requiresPractical, practicalNote,
}: TrainingCertificateProps) {
  return (
    <div className="cert-sheet relative overflow-hidden rounded-2xl border border-teal/20 bg-white shadow-card">
      {/* Brand header band */}
      <div className="flex items-center justify-between bg-gradient-to-r from-teal-dark via-teal to-teal-dark px-8 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="CareStream" className="h-11 w-auto object-contain" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/85">Annual Training</span>
      </div>

      <div className="relative px-10 pb-9 pt-7 text-center">
        {/* Decorative corner flourishes — framed inside the white body so they
            never cross into the brand header band. */}
        <span className="pointer-events-none absolute left-3 top-3 h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-teal/25" />
        <span className="pointer-events-none absolute right-3 top-3 h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-teal/25" />
        <span className="pointer-events-none absolute bottom-3 left-3 h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-teal/25" />
        <span className="pointer-events-none absolute bottom-3 right-3 h-8 w-8 rounded-br-lg border-b-2 border-r-2 border-teal/25" />

        {/* Seal */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-light/50 ring-4 ring-teal/10">
          <Award size={30} className="text-teal" />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal">Certificate of Completion</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-neutral-mid">Knowledge Assessment</p>

        <p className="mt-7 text-sm text-neutral-mid">This certifies that</p>
        <p className="mt-1 font-serif text-3xl font-bold text-neutral-dark">{staffName}</p>
        <div className="mx-auto mt-2 h-px w-44 bg-gradient-to-r from-transparent via-teal/50 to-transparent" />

        <p className="mt-5 text-sm text-neutral-mid">has successfully completed the annual training module</p>
        <p className="mt-1 text-xl font-semibold text-teal-dark">{moduleName}</p>
        {orgName && (
          <div className="mt-3 flex flex-col items-center gap-1.5">
            {orgLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={orgLogoUrl} alt={orgName} className="h-14 w-auto object-contain" />
            )}
            <span className="text-sm text-neutral-mid">for {orgName}</span>
          </div>
        )}

        {/* Stats */}
        <div className="mx-auto mt-7 grid max-w-md grid-cols-3 divide-x divide-gray-100 rounded-xl border border-gray-100 bg-neutral-light/40 py-4">
          <div>
            <p className="text-lg font-bold text-teal">{score ?? '—'}%</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-neutral-mid">Score</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-dark">{fmt(completedAt)}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-neutral-mid">Completed</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-dark">{fmt(expiresAt)}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-neutral-mid">Renews</p>
          </div>
        </div>

        {requiresPractical && (
          <p className="mx-auto mt-5 max-w-md rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700">
            {practicalNote ?? 'This is the knowledge component. A practical / observed competency assessment is also required for this topic.'}
          </p>
        )}

        {/* Footer / issuer */}
        <div className="mt-8 flex items-center justify-center gap-2 border-t border-gray-100 pt-5">
          <span className="text-[10px] uppercase tracking-wide text-neutral-mid">Issued &amp; assessed by</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.png" alt="CareStream" className="h-6 w-auto object-contain" />
        </div>
        <p className="mx-auto mt-3 max-w-lg text-[9.5px] leading-relaxed text-neutral-mid">
          Tailored to {orgName ?? 'the home'}&apos;s own policies and assessed by CareStream. This records completion of a knowledge
          assessment and is not an accredited qualification; the provider remains responsible for ensuring training meets regulatory requirements.
        </p>
      </div>
    </div>
  )
}
