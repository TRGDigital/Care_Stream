import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'
import { CheckCircle2, FileText, GraduationCap, Search, ShieldCheck, Zap } from 'lucide-react'
import { pageMetadata } from '@/lib/page-meta'
import { HubChatMockup } from '@/components/marketing/hub-chat-mockup'
import { RagEngineMockup } from '@/components/marketing/rag-engine-mockup'

// Overridable from the platform console (Blog → Pages / site_pages).
export const generateMetadata = () => pageMetadata('/rag', {
  title:       'How Our AI Works | CareStreamAI',
  description: 'CareStreamAI uses Retrieval Augmented Generation to ground every answer and training question in verified source material. Here is what that means and why it matters for care compliance.',
})

export default function RagPage() {
  return (
    <>
      <PageHero
        label="How Our AI Works"
        title="Every answer comes from a source. Every question is grounded in knowledge."
        subtitle="CareStreamAI is built on a class of AI architecture called Retrieval Augmented Generation. This page explains what that means, why we chose it, and what it means for the accuracy and trustworthiness of what your staff receive."
        centered
      />

      {/* ── What RAG is ───────────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="mb-14 grid items-center gap-12 lg:grid-cols-[1.25fr_1fr]">
            <div>
              <SectionLabel>The Principle</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                AI that is anchored to facts, not free to guess.
              </h2>
              <div className="space-y-5 text-lg leading-relaxed text-neutral-mid">
                <p>
                  The most widely reported problem with AI is hallucination, where a system produces a confident,
                  plausible-sounding answer that is simply wrong. In most general-purpose AI tools, the model draws
                  on everything it was trained on: vast amounts of internet text, much of which is outdated, incorrect,
                  or irrelevant to your organisation.
                </p>
                <p>
                  Retrieval Augmented Generation (RAG) is the architectural answer to that problem. Instead of relying
                  on what a model already knows, RAG requires the system to find the relevant information first, and
                  only then compose a response from what it has retrieved. The model is not guessing. It is reading
                  and summarising verified source material.
                </p>
                <p>
                  CareStreamAI uses RAG across the platform: answering policy questions from your uploaded documents,
                  generating training from specialist care knowledge, and grounding the CQC prep and audit tools in real
                  guidance. In every case, the AI is explicitly bounded by the source material it is given. It cannot go beyond it.
                </p>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <HubChatMockup />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Search,
                title: 'Retrieve first',
                body: 'Before any response is generated, the system searches for the most relevant content in the verified source material. Only the most relevant sections are passed to the AI.',
              },
              {
                icon: FileText,
                title: 'Ground the response',
                body: 'The AI composes its response using only the retrieved content. It is explicitly instructed not to draw on general knowledge, internet sources, or inference beyond what has been retrieved.',
              },
              {
                icon: ShieldCheck,
                title: 'Cite the source',
                body: 'Every response includes a reference to the source it drew from, whether a specific policy, procedure, or authoritative guidance document. Staff and managers can always trace an answer back to its origin.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light">
                  <Icon size={20} className="text-teal" />
                </div>
                <h3 className="mb-3 text-lg font-bold text-neutral-dark">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Policy RAG ────────────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>Policy Questions</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                Your policies are the only source of truth.
              </h2>
              <div className="space-y-4 text-lg leading-relaxed text-neutral-mid">
                <p>
                  When a staff member asks a question in the hub or by email, CareStreamAI
                  searches your organisation's uploaded policy library. Only your documents are searched.
                  Not the internet. Not another organisation's policies. Not a generic care knowledge base.
                </p>
                <p>
                  The most relevant sections of your policies are identified and passed to the AI as the sole
                  basis for its response. The answer your staff member receives reflects your policies exactly
                  as you have written them.
                </p>
                <p>
                  If no relevant content is found in your library, the system says so, and logs the question
                  as a knowledge gap so you can identify which policies need to be written or updated.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { step: '01', label: 'Staff member asks a question',          detail: 'In the hub or by email, in any language.' },
                { step: '02', label: 'System searches your policy library',   detail: 'Only your uploaded documents are searched. Nothing else.' },
                { step: '03', label: 'Relevant sections are identified',       detail: 'The most applicable content is retrieved from your policies.' },
                { step: '04', label: 'AI composes a response from the source', detail: 'The answer is drawn directly from the retrieved content.' },
                { step: '05', label: 'Response delivered with citation',        detail: 'Staff receive the answer and a reference to the source policy.' },
              ].map(({ step, label, detail }) => (
                <div key={step} className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal text-xs font-extrabold text-white">
                    {step}
                  </span>
                  <div>
                    <p className="font-semibold text-neutral-dark">{label}</p>
                    <p className="mt-0.5 text-sm text-neutral-mid">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Training RAG ──────────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1 space-y-4">
              {[
                { icon: FileText,      label: 'Specialist knowledge base',  detail: 'Each training topic is underpinned by a curated knowledge entry covering its care context, practical requirements, and authoritative source guidance.' },
                { icon: ShieldCheck,   label: 'Authoritative source links',  detail: 'Training questions draw on published guidance from bodies including CQC, Skills for Care, and NHS England, not general internet content.' },
                { icon: GraduationCap, label: 'Grounded question generation', detail: 'Questions are generated from the source knowledge, not invented. Every option and correct answer reflects real guidance from the topic area.' },
                { icon: CheckCircle2,  label: 'Accurate assessments',         detail: 'Because questions are grounded in verified knowledge, staff are tested on what guidance actually says, not on approximations or generalisations.' },
              ].map(({ icon: Icon, label, detail }) => (
                <div key={label} className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-light">
                    <Icon size={16} className="text-teal" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-dark">{label}</p>
                    <p className="mt-0.5 text-sm text-neutral-mid">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="order-1 lg:order-2">
              <SectionLabel>Training Questions</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                Questions generated from knowledge, not imagination.
              </h2>
              <div className="space-y-4 text-lg leading-relaxed text-neutral-mid">
                <p>
                  CareStreamAI's training assessment questions are not written by guesswork. Each training topic
                  is supported by a specialist knowledge entry that describes the topic in the context of care
                  delivery and references authoritative published guidance.
                </p>
                <p>
                  When a training question is generated, the AI retrieves the relevant knowledge for that topic
                  and uses it as the basis for the question and its answer options. The correct answer is grounded
                  in what the guidance actually says.
                </p>
                <p>
                  This means your staff are not being assessed against vague generalisations. They are being
                  tested on the real, current requirements that CQC and sector bodies expect care workers to know.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why it matters ────────────────────────────────────────────────────── */}
      <section className="bg-teal-gradient py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>Why It Matters</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold leading-tight text-white">
            Accuracy is not a feature. It is a requirement.
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: 'No hallucination risk',
                body: 'Because responses are bounded by retrieved source material, the system cannot invent procedures, thresholds, or responsibilities that do not exist in your policies.',
              },
              {
                icon: FileText,
                title: 'Your policies, reflected accurately',
                body: 'The AI answers based on what your organisation has written. If your policy says 30 minutes, the answer says 30 minutes. If your policy names a specific role, the answer names that role.',
              },
              {
                icon: Search,
                title: 'Gaps surface automatically',
                body: 'When a question cannot be answered from your documents, that is recorded as a knowledge gap. You can see what your staff are asking about that your policies do not yet cover.',
              },
              {
                icon: CheckCircle2,
                title: 'Audit trail for every response',
                body: 'Every answer is logged alongside the source it drew from. You have a complete, traceable record of what information was provided to staff and where it came from.',
              },
              {
                icon: GraduationCap,
                title: 'Training grounded in guidance',
                body: 'Assessment questions reflect published sector guidance, not approximations. Staff are tested on what CQC and regulatory bodies actually expect, not a generic interpretation of it.',
              },
              {
                icon: Zap,
                title: 'Consistent at scale',
                body: 'Whether ten staff or two hundred are asking questions, every response is subject to the same retrieval process and the same document boundaries. Quality does not degrade with volume.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="card-lift rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="mb-2 font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/75">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What we don't tell you ────────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionLabel>A Note on Transparency</SectionLabel>
              <h2 className="mb-6 text-3xl font-extrabold text-neutral-dark">
                We explain the principle. We protect the craft.
              </h2>
              <p className="mb-5 text-lg leading-relaxed text-neutral-mid">
                This page explains how CareStreamAI's AI architecture works at the level that matters for your
                governance, your compliance teams, and your staff. We believe you deserve to understand what
                the system is doing with your data and why its answers can be trusted.
              </p>
              <p className="text-lg leading-relaxed text-neutral-mid">
                We do not publish the specific technical implementation that makes CareStreamAI work as well as
                it does, the retrieval design, the knowledge structures, the prompt engineering, and the quality
                controls that have been built and refined for care settings specifically. That work is what
                differentiates CareStreamAI, and it is what we continue to invest in on your behalf.
              </p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <RagEngineMockup />
            </div>
          </div>
        </div>
      </section>

      <EditableContentBlock path="/rag" />

      <PageCta
        heading="See it working on your own policies."
        sub="Book a demo and watch CareStreamAI answer questions from your documents in real time."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'Trust and security', href: '/trust' }}
      />
    </>
  )
}
