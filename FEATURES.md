# CareStreamAI — Feature Specifications

## Stack context
- **API:** Express + Prisma + PostgreSQL (Supabase) + BullMQ (Redis)
- **AI:** Claude (claude-sonnet-4-5) + Pinecone (vector search) + OpenAI (embeddings)
- **Channels:** Chat (web portal) + Email (SendGrid inbound parse) — both hit the same RAG pipeline
- **Auth:** JWT, tenant-scoped, roles: admin | staff
- **Existing query channel enum:** `chat | email`

---

## Feature 1 — Voice Input

### What it is
A microphone button on the chat portal that converts spoken queries to text and
submits them through the existing pipeline. Optionally reads responses aloud.

### Why it's low-risk
This is entirely a frontend feature. The API, RAG pipeline, and DB are untouched.
It uses the browser-native Web Speech API (no third-party dependency, no cost).

### Implementation

**Files to create/modify:**
- `apps/web/src/app/(portal)/chat/page.tsx` — add mic button + useSpeech hook
- `apps/web/src/hooks/useSpeech.ts` — new hook (record, transcribe, state machine)

**useSpeech hook behaviour:**
```
idle → listening (user clicks mic) → transcribing (processing) → done (text in field)
        ↑ abort at any point → idle
```

**UI changes:**
- Mic icon button sits inside the chat input bar (right side, alongside send button)
- Pulsing ring animation while listening
- Automatically populates the text field on completion
- User can review/edit before hitting send
- Small "tap to cancel" affordance while listening
- Optional TTS toggle: reads responses aloud via SpeechSynthesis API

**Browser support:** Chrome, Edge, Safari 15+ (covers ~95% of mobile browsers)
**Fallback:** Button hidden if `'webkitSpeechRecognition' in window` is false

### DB changes: none
### API changes: none
### Estimated complexity: Small (1–2 days)

---

## Feature 2 — Policy Gap Detection

### What it is
A dashboard view for admins showing which staff questions aren't being answered
by any policy in the library — surfacing what to write or upload next.

### Data already available
- `QueryRecord.no_match` (boolean) — already set when RAG returns no relevant chunks
- `QueryRecord.query_text` — the original question
- `ExternalRegulation` table — platform-wide regulatory KB (regulations that should
  have policies covering them)
- `Policy` table — what the tenant has uploaded

### Implementation

**New API endpoint:**
```
GET /analytics/gaps
```
Response:
```json
{
  "unanswered_queries": [
    {
      "theme": "medication administration",
      "count": 12,
      "sample_questions": ["Who can administer insulin?", "..."],
      "last_seen": "2025-05-10T03:22:00Z"
    }
  ],
  "regulation_gaps": [
    {
      "regulation": "Mental Capacity Act 2005",
      "reference_key": "MCA_2005",
      "summary": "Requires evidence of staff understanding of MCA principles",
      "covered_by": null
    }
  ],
  "coverage_score": 74
}
```

**Unanswered query clustering:**
- Pull all `no_match=true` queries from last 90 days
- Group by semantic similarity (simple TF-IDF keyword clustering — no extra AI cost)
- Return top 10 themes by frequency with sample questions

**Regulation gap detection:**
- For each `ExternalRegulation`, check if any tenant policy has cited it
  (via `policy_ids_cited` array and policy tags)
- Regulations with zero policy coverage = gap

**Coverage score:**
- `covered_regulations / total_regulations * 100` — simple headline metric

**New admin UI page:**
- Route: `/admin/gaps` (or tab within `/admin/analytics`)
- Three sections:
  1. **Unanswered questions** — card per theme, count, sample Qs, CTA: "Upload a policy to cover this"
  2. **Regulation gaps** — list of regulations with no matching policy, CTA: "Add policy"
  3. **Coverage score** — prominent number with trend vs. last month

**Files to create/modify:**
- `apps/api/src/routes/analytics.router.ts` — add `/gaps` route
- `apps/api/src/services/gapDetection.service.ts` — new service
- `apps/web/src/app/(admin)/gaps/page.tsx` — new admin page

### DB changes: none (uses existing data)
### Estimated complexity: Medium (3–4 days)

---

## Feature 3 — WhatsApp Integration

### What it is
Staff send policy questions to a registered WhatsApp number. The same RAG pipeline
handles the query and responds in the same message thread, in the staff member's language.

### Architecture
WhatsApp Business API via **Twilio** (easiest integration path; handles number
provisioning, message threading, media, delivery receipts).

New channel: `whatsapp` added to the existing `channel` enum.

### Message flow
```
Staff WhatsApp → Twilio → POST /whatsapp/inbound (webhook)
  → resolve tenant from WhatsApp Business number
  → validate sender phone against allowlist
  → load/create WhatsAppSession
  → RAG pipeline (same as email/chat, channel='whatsapp')
  → reply via Twilio API (plain text, ~1500 char limit)
  → store QueryRecord (channel='whatsapp')
```

### Session model
Similar to `EmailSession` — maintains conversation history for multi-turn context.

```prisma
model WhatsAppSession {
  id              String    @id @default(uuid())
  tenant_id       String
  phone_number    String    // sender's number (+447...)
  messages        Json      // [{role, content, timestamp, policy_ids_cited}]
  expires_at      DateTime  // 24-hour TTL (WhatsApp session window)
  last_message_at DateTime
  tenant          Tenant    @relation(fields: [tenant_id], references: [id])
  @@index([tenant_id, phone_number])
  @@index([tenant_id, expires_at])
}
```

### Phone number allowlist
Tenants register staff phone numbers (alongside email allowlist).
- New `Settings` field: `phone_allowlist String[]`
- Admin UI: add/remove phone numbers in `/admin/settings`
- Unrecognised numbers receive: "Hi, your number isn't registered. Ask your manager
  to add it to CareStreamAI."

### Tenant → WhatsApp number resolution
Each tenant is assigned a Twilio WhatsApp sender number (or uses a shared pool with
tenant resolved by the incoming `To` header).
- New `Tenant` field: `twilio_whatsapp_number String?`
- Alternatively: use a single platform number + tenant resolved from registered senders

### Response formatting
WhatsApp doesn't render HTML. The RAG pipeline returns HTML — needs a new
`stripHtmlToWhatsApp(html)` formatter:
- `<strong>` → `*bold*`
- `<em>` → `_italic_`
- `<li>` → `• `
- Strip all other tags
- Truncate to 1500 chars with "Reply FULL for the complete policy." affordance

### New API endpoint:
```
POST /whatsapp/inbound   ← Twilio webhook (signed, unauthenticated)
```

**Files to create/modify:**
- `apps/api/src/routes/whatsapp.router.ts` — new router
- `apps/api/src/services/whatsapp.service.ts` — new service
- `apps/api/src/utils/htmlToWhatsApp.ts` — new formatter
- `apps/api/prisma/schema.prisma` — WhatsAppSession model + Settings.phone_allowlist
- `apps/web/src/app/(admin)/settings/page.tsx` — phone allowlist UI

### New env vars required:
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=
```

### DB changes: new `WhatsAppSession` table, new `phone_allowlist` column on Settings
### Estimated complexity: Medium-Large (5–7 days)

---

## Feature 4 — Onboarding Module

### What it is
A structured induction flow for new starters. Admin creates a checklist of policies
staff must read (and optionally answer a question about) before they're considered
inducted. Progress is tracked and visible to managers. Completion is logged to the
audit trail — CQC evidence of induction.

### Core concepts
- **OnboardingFlow** — a named induction programme (e.g. "New Starter Induction")
  owned by a tenant. A tenant can have multiple flows (e.g. by job role).
- **OnboardingStep** — one item in a flow: read Policy X, or answer Question Y about Policy Z.
- **OnboardingEnrollment** — assigns a staff member to a flow.
- **OnboardingProgress** — tracks which steps a user has completed.

### Data models

```prisma
model OnboardingFlow {
  id          String             @id @default(uuid())
  tenant_id   String
  name        String             // "New Starter Induction"
  job_roles   String[]           // optional filter by staff_roles
  is_active   Boolean            @default(true)
  steps       OnboardingStep[]
  enrollments OnboardingEnrollment[]
  tenant      Tenant             @relation(...)
}

model OnboardingStep {
  id          String   @id @default(uuid())
  flow_id     String
  order       Int
  title       String
  policy_id   String?  // if type=read_policy
  question    String?  // if type=answer_question
  type        String   // read_policy | answer_question | watch_video (future)
  flow        OnboardingFlow @relation(...)
  policy      Policy?        @relation(...)
}

model OnboardingEnrollment {
  id           String               @id @default(uuid())
  tenant_id    String
  flow_id      String
  user_id      String
  enrolled_at  DateTime             @default(now())
  completed_at DateTime?
  due_date     DateTime?
  progress     OnboardingProgress[]
  flow         OnboardingFlow       @relation(...)
  user         User                 @relation(...)
}

model OnboardingProgress {
  id              String              @id @default(uuid())
  enrollment_id   String
  step_id         String
  completed_at    DateTime?
  answer_text     String?             // for answer_question steps
  answer_correct  Boolean?
  enrollment      OnboardingEnrollment @relation(...)
  step            OnboardingStep       @relation(...)
}
```

### Answer checking (answer_question steps)
When a step has a question, staff submit a free-text answer. A single Claude call
checks the answer against the policy content:
```
"Given this policy excerpt: {policy_chunk}
The question is: {question}
The staff member answered: {answer}
Did they demonstrate adequate understanding? Reply YES or NO and one sentence."
```
No embedding needed — direct Claude call, very cheap.

### API endpoints

```
GET  /onboarding                       — list flows (admin: all; staff: their enrollments)
POST /onboarding                       — create flow (admin)
GET  /onboarding/:flowId               — flow detail + steps
PATCH /onboarding/:flowId              — update flow
POST /onboarding/:flowId/steps         — add step
DELETE /onboarding/:flowId/steps/:stepId — remove step

POST /onboarding/:flowId/enroll        — enroll user(s) in flow
GET  /onboarding/enrollments           — list enrollments (admin: all; staff: own)
GET  /onboarding/enrollments/:id       — enrollment detail + progress
POST /onboarding/enrollments/:id/steps/:stepId/complete — mark step done (with optional answer)
```

### Admin UI
- `/admin/onboarding` — list flows, create new, see completion rates
- `/admin/onboarding/:flowId` — drag-reorder steps, enroll staff, see per-staff progress
- `/admin/onboarding/:flowId/progress` — table: staff × steps, completion status

### Staff UI (portal)
- New tab/section in the portal: "My Induction"
- List of enrolled flows with progress bar
- Step-by-step view: read policy inline → confirm read → answer question → next step
- Completion screen: "Induction complete — your manager has been notified"

### Notifications
- Admin receives email when a staff member completes their induction
- Staff receive reminder email if due_date is approaching (3 days before)

### Audit trail
- `AuditLog` events: `onboarding_enrolled`, `onboarding_step_completed`, `onboarding_completed`
- These appear in CQC Readiness Report as evidence of induction

### DB changes: 4 new tables
### Estimated complexity: Large (8–12 days)

---

## Suggested build order

| # | Feature | Why this order |
|---|---------|----------------|
| 1 | Voice Input | Zero API risk, frontend only, immediate UX win — builds confidence |
| 2 | Policy Gap Detection | Uses existing data, high value to managers, moderate effort |
| 3 | WhatsApp Integration | Requires Twilio account setup + new DB table — prep env vars first |
| 4 | Onboarding Module | Largest feature — benefits from WhatsApp already being in place |

---

## Pre-build checklist (WhatsApp)
Before starting Feature 3, you need:
- [ ] Twilio account with WhatsApp Business API access
- [ ] Twilio WhatsApp-enabled phone number
- [ ] `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` in .env
- [ ] Twilio webhook URL pointing to your API `/whatsapp/inbound`
