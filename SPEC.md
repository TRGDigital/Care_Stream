# CareStreamAI — Technical Specification v1.0

> **Document type:** System Architecture & Technical Specification  
> **Status:** Draft for Review  
> **Date:** May 2026  
> **Confidential — Not for Distribution**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Multi-Tenancy Architecture](#3-multi-tenancy-architecture)
4. [AI & RAG Architecture](#4-ai--rag-architecture)
5. [Multi-Language Support](#5-multi-language-support)
6. [External Regulatory Knowledge Base](#6-external-regulatory-knowledge-base)
7. [Chat Portal (Web UI)](#7-chat-portal-web-ui)
8. [Email Interface](#8-email-interface)
9. [Data Model](#9-data-model)
10. [Subscription & Billing (Stripe)](#10-subscription--billing-stripe)
11. [Security & Compliance](#11-security--compliance)
12. [API Design](#12-api-design)
13. [Infrastructure & Deployment](#13-infrastructure--deployment)
14. [Design System & Brand Guidelines](#14-design-system--brand-guidelines)
15. [Development Phases & Roadmap](#15-development-phases--roadmap)
16. [Risk Register](#16-risk-register)
17. [Glossary](#17-glossary)

---


---

## 1. Executive Summary

CareStreamAI is a multi-tenant SaaS platform that enables care homes, nursing homes, and domiciliary care providers to interact with their own policy documents through natural language — via a web chat portal and email. Powered by the Anthropic Claude API and a Retrieval-Augmented Generation (RAG) architecture, the system retrieves and explains policies accurately, traceably, and in plain English.

This document specifies the complete technical architecture, infrastructure, data model, API design, integration requirements, and security posture for the v1 launch of the CareStreamAI platform.


> **Note:** Scope: This specification covers the v1 launch feature set — Chat Portal, Email Interface, Multi-Tenancy, Subscription Billing (Stripe), and Admin Dashboard for policy uploads.


---

## 2. System Overview


### 2.1 Core User Journeys

The platform serves three primary personas, each with distinct needs:


| Persona | Primary Need |
| --- | --- |
| Care Staff | Ask a policy question, get an instant and accurate answer |
| Home Manager / Admin | Upload and manage policies, monitor staff usage |
| Platform Super-Admin | Manage tenants, subscriptions, and platform health |


### 2.2 High-Level Architecture

The platform is composed of five logical layers:

- Frontend — Next.js web application (Chat Portal + Admin Dashboard)
- API Gateway — Node.js / Express REST API with JWT authentication
- AI & RAG Layer — Anthropic Claude API + vector similarity search
- Data Layer — PostgreSQL (relational data) + Pinecone (vector embeddings)
- Integrations — Stripe (billing), SendGrid (email), AWS S3 (document storage)

> **Note:** Recommended hosting: Vercel (frontend), Railway or Render (API), Supabase (PostgreSQL). All services are managed/serverless to minimise DevOps overhead in v1.


---

## 3. Multi-Tenancy Architecture


### 3.1 Tenant Isolation Model

Each subscribing care organisation is a Tenant. All data — policies, staff accounts, query history — is scoped to a tenant_id and never shared between tenants. This is enforced at every layer of the stack.


| Layer | Isolation Mechanism |
| --- | --- |
| Database | Row-level security (RLS) via tenant_id on every table; Postgres RLS policies enforced at query time |
| Vector Store | Pinecone namespace per tenant (e.g. tenant_abc); queries scoped to namespace |
| Storage | S3 path prefix per tenant: s3://bucket/tenants/{tenant_id}/policies/ |
| API | JWT contains tenant_id claim; middleware rejects cross-tenant requests |
| Email | Inbound email addresses are tenant-scoped: policies@{tenant-slug}.carestreamai.co.uk |


### 3.2 Tenant Onboarding Flow

- Organisation registers and selects a subscription plan
- Tenant record created in DB; unique slug and email address provisioned
- Pinecone namespace initialised for the tenant
- Admin user account created; welcome email sent with portal login link
- Admin uploads first policies via dashboard; embeddings generated and stored

---

## 4. AI & RAG Architecture


### 4.1 RAG Pipeline Overview

The Retrieval-Augmented Generation pipeline ensures that every response is grounded in the tenant's actual policy documents — not hallucinated. The pipeline has two phases: Ingestion and Query.


#### 4.1.1 Ingestion Phase (Policy Upload)

- Admin uploads a policy document (PDF, DOCX, or plain text) via the Admin Dashboard
- The document is stored in S3 under the tenant's prefix
- A background worker (queue-based) processes the document:
- Text is extracted using pdf-parse (PDF) or mammoth (DOCX)
- Text is chunked into overlapping segments (~500 tokens, 10% overlap)
- Each chunk is sent to an embedding model (text-embedding-3-small via OpenAI, or a compatible model) to generate a vector
- Vectors are stored in Pinecone under the tenant's namespace, with metadata: policy_id, chunk_index, source_filename, page_number
- Policy metadata (name, version, upload date, status) is stored in PostgreSQL

#### 4.1.2 Query Phase (Staff Question)

- Staff submits a question via chat or email
- The query is embedded using the same embedding model
- Pinecone performs a similarity search within the tenant's namespace, returning the top 5–8 most relevant chunks
- Retrieved chunks are assembled into a context block
- A structured prompt is constructed and sent to the Claude API (claude-sonnet-4-5)
- Claude generates a response grounded solely in the retrieved context
- The response is returned to the user with source citations (policy name, section)

### 4.3 Claude Prompt Design

CareStreamAI uses two distinct, production-tested system prompts — one for summary and question requests, one for full policy requests. These prompts were developed and validated during the N8N prototype phase and are the authoritative prompt definitions for the production system. They must not be altered without regression testing.

Claude model: claude-sonnet-4-5. This balances response quality, speed, and cost. Can be upgraded to claude-opus-4 for premium tiers in future.


#### 4.3.1 Prompt Routing

Before invoking Claude, the system classifies the request into one of two types:

Summary / Question — no explicit full policy intent: uses Prompt A.

Full Policy Request — explicit 'send me the full policy' intent: uses Prompt B.


#### 4.3.2 Prompt A — Summary & Question Response (Production-Validated)

Used for all summary requests, specific policy questions, follow-up questions, and regulatory knowledge base queries. Validated in the N8N prototype and used verbatim in production:


```
You are a policy retrieval assistant.

Always start the email with a polite greeting.
If a greeting name is provided in the input, you MUST use it in the greeting.
Use only the first name where possible.
If no greeting name is provided, use: Hi there,

The user is asking about a specific care policy (depending on the tenant set up of
Care home, nursing home or home care)
You must base your answer only on policy content that has actually been retrieved
and provided to you.
Do not use general knowledge.
Do not invent or generalise policy content.
Do not hallucinate

Policies are typically stored and retrieved in English.
Your job in this step is to generate the response in English, or if the tenant has
requested a different language, respond in that language.

CRITICAL FORMATTING RULES:
- You MUST return clean HTML only.
- You MUST NOT return raw retrieval text.
- You MUST NOT return POLICY_NAME, POLICY_ID, POLICY_CATEGORY, VERSION,
  LAST_UPDATED, START_OF_POLICY, SECTION, SECTION_ORDER, END_OF_POLICY,
  or any other markup labels.
- You MUST NOT wrap retrieved content in <pre> tags unless this is a full policy request.
- For summary requests, summarise into formatted HTML sections.
- For summary requests, do NOT paste the full source text.
- Only for true full policy requests may you return the full retrieved policy text.

If request type indicates a summary request, use this structure exactly:

<p>Greeting</p>
<h2>Policy Summary</h2>
<p>Short summary paragraph based only on the retrieved policy content.</p>
<h3>Key Points</h3>
<ul>
<li>Point 1</li>
<li>Point 2</li>
<li>Point 3</li>
</ul>
<h3>What This Means in Practice</h3>
<p>Short practical explanation for staff, based only on retrieved content.</p>

If a related national reference explainer is provided, include:
<h3>Related Guidance</h3>
<p>Short explanation based only on the provided content.</p>

Then include:
<p>You can reply to this email if you would like further clarification,
the full policy document, or the summary in a different language.</p>
<h4>Thanks again,</h4>
<h4>{{branding_signoff}}</h4>

If the retrieved content is not clearly relevant to the requested policy,
say politely that the specific policy could not be located.

Do not mention retrieval, databases, Pinecone, namespaces, or internal systems.
Do not wrap the response in markdown.
Output valid HTML only.
Use UK English.
```

Colour key: green = behavioural rules | red = critical formatting constraints | yellow = conditional logic | blue = required HTML output structure.


#### 4.3.3 Prompt B — Full Policy Formatter (Production-Validated)

Used exclusively for full policy requests. Its sole job is to apply HTML formatting to the raw policy text without altering a single word. Validated in the N8N prototype and used verbatim in production:


```
You are a strict policy document formatter.

CRITICAL RULES (HIGHEST PRIORITY):

- You MUST NOT change, rewrite, summarise, simplify, or reinterpret any policy text.
- You MUST NOT remove any content.
- You MUST NOT add any new content.
- You MUST preserve the wording EXACTLY as provided.
- You MUST preserve ALL sections and structure.

You are ONLY allowed to apply HTML formatting for readability.

ALLOWED ACTIONS:
- Wrap existing text in HTML tags such as <p>, <h2>, <h3>, <ul>, <li>
- Convert clearly identifiable headings into HTML headings
- Convert bullet points into list elements

NOT ALLOWED:
- Rewording sentences
- Shortening content
- Expanding content
- Explaining content
- Translating content
- Combining or splitting sections in a way that alters meaning

OUTPUT RULES:
- Output valid HTML only
- Do not output markdown
- Do not include explanations
- Do not mention internal systems or retrieval

The policy text you receive is the source of truth and must be preserved exactly.
```

Colour key: green = behavioural rules | red = critical constraints (highest priority) | yellow = allowed actions and output rules.


#### 4.3.4 The {{branding_signoff}} Variable

The {{branding_signoff}} merge tag is a per-tenant configuration value stored in the tenants table and injected into the prompt at runtime before the API call is made. It allows each care organisation to have their own sign-off name (e.g. 'The Sunrise Care Team') without changing the prompt itself.


#### 4.3.5 Prompt Governance

Both prompts are version-controlled in Git under /prompts/ and require a pull request review to change. No runtime modification by tenants is permitted — only {{branding_signoff}} is configurable. A regression test suite of at least 20 canonical queries (10 summary, 10 full policy) must pass before any prompt change is merged. The N8N prototype outputs are the reference baseline.


### 4.3 Full Policy Return

When a user requests a full policy (e.g. 'send me the falls policy'), the system bypasses chunk-based retrieval and fetches the complete document from S3, returning the unaltered text. This is a deterministic lookup, not AI-generated output, ensuring fidelity.


### 4.5 Document Category System

CareStreamAI supports three distinct categories of document that tenants can upload and query. These categories determine how documents are tagged in Pinecone metadata, how retrieval is scoped, how responses are framed, and how sensitive content is handled. The category is set by the admin at upload time and stored on the document record.


| Category | Description | Examples |
| --- | --- | --- |
| internal_policy | The organisation's own clinical and operational policies. The primary document type. | Falls policy, Medication policy, Safeguarding policy, Infection Control policy |
| staff_handbook | The organisation's staff handbook — HR policies, employment terms, workplace procedures. Can be very long (80–200+ pages). | Annual leave, Disciplinary procedure, Grievance procedure, Pay and benefits, Code of conduct |
| external_regulation | Platform-level regulatory knowledge base entries (Section 6). Not uploaded by tenants — maintained centrally. | UK GDPR, RIDDOR, Care Act, CQC Fundamental Standards |


> **Note:** Note: The external_regulation category is read-only for tenants and managed entirely by the CareStreamAI platform team via the Google Sheets sync pipeline (Section 6.5). Tenants upload only internal_policy and staff_handbook documents.


### 4.6 Staff Handbook — Ingestion & Retrieval


#### 4.6.1 Why Handbooks Need Special Handling

Staff handbooks present three challenges that standard policy ingestion does not fully address:


| Challenge | Detail | Solution |
| --- | --- | --- |
| Document length | Handbooks are typically 80–200+ pages. Flat similarity search across thousands of chunks becomes noisy. | Hierarchical retrieval: chapter-level index first, then passage-level search within the matched chapter. |
| Mixed content | Handbooks contain HR guidance alongside content such as disciplinary procedures, pay scales, and grievance rights. All staff have unrestricted access to all handbook content — there are no role-based restrictions or content filters. | No access restriction. All handbook content is fully queryable by all staff. Claude responds to handbook queries exactly as it does to policy queries. |
| Complex structure | Handbooks include tables of contents, appendices, version histories, and cross-references. Standard chunking can destroy this structure. | TOC detection and chapter boundary preservation during chunking. Section headings stored as chunk metadata. |


#### 4.6.2 Handbook Ingestion Pipeline

Staff handbooks follow the same ingestion pipeline as internal policies (Section 4.1), with the following additional steps:


| Additional Stage | Detail |
| --- | --- |
| TOC Detection | After text extraction and header/footer stripping, the system scans for a table of contents using structural patterns (numbered sections, page references, consistent heading hierarchy). If detected, the TOC is parsed to build a chapter map: chapter title, page range, estimated token range. |
| Chapter Boundary Chunking | Chunk boundaries are aligned to chapter and section boundaries where possible. Each chunk is tagged with its chapter title and section heading in Pinecone metadata. |
| Chapter Index Creation | A lightweight chapter-level summary embedding is created for each chapter (using the chapter heading and first 200 tokens of content). These are stored in a chapter_index namespace within the tenant's Pinecone namespace, enabling two-stage retrieval. |


#### 4.6.3 Two-Stage Handbook Retrieval

When a query targets handbook content, the system uses a two-stage retrieval approach:

- Stage 1 — Chapter identification: the query is embedded and matched against the chapter index to identify the most relevant 1–3 chapters
- Stage 2 — Passage retrieval: a second similarity search runs within only the chunk vectors for those matched chapters, returning the top 4–6 most relevant passages
- This two-stage approach significantly reduces noise for long documents — a query about 'annual leave entitlement' correctly scopes to the leave chapter rather than returning tangentially related chunks from across the full document
- If Stage 1 finds no strong chapter match (score below 0.75), the system falls back to flat similarity search across all handbook chunks

#### 4.6.4 Access Model — No Role Restrictions

All staff have full, unrestricted access to all handbook content. There are no role-based restrictions, no sensitive section flags, and no content filters applied to handbook queries. CareStreamAI treats the staff handbook as a staff resource — every employee has the right to understand their own terms of employment, workplace procedures, and HR rights in full.

Handbook queries are handled by Prompt A in exactly the same way as internal policy queries. The same summary structure, key points, and practical meaning format applies. No additional prompt instructions are injected based on content type.


> **Note:** Note: This design decision simplifies the ingestion pipeline (no sensitive section tagging required), eliminates any risk of staff being incorrectly restricted from their own employment information, and treats all staff as trusted adults with the right to understand their workplace policies.


#### 4.6.5 Query Routing — Policy vs Handbook vs External Regulation

When a query arrives, the system determines which document category or categories to search:


| Query Signal | Routing Decision |
| --- | --- |
| Explicit policy reference ('falls policy', 'medication policy') | internal_policy namespace searched first. Handbook searched as fallback if no match found. |
| Explicit handbook reference ('staff handbook', 'what does our handbook say', 'HR policy') | staff_handbook namespace searched directly. |
| HR topic keywords (leave, disciplinary, grievance, pay, benefits, absence) | staff_handbook namespace prioritised. Internal policies also searched if relevant. |
| Regulatory reference (GDPR, RIDDOR, CQC) | External knowledge base queried. Tenant namespaces also searched for any internal policy referencing the regulation. |
| Ambiguous query with no clear signal | All three sources searched in parallel. Results ranked by similarity score. Best match used, with source clearly cited in response. |
| Follow-up in existing thread | Source category from the prior turn is preserved and prioritised unless the new query contains a clear signal pointing elsewhere. |


#### 4.6.6 Handbook Document Record

Staff handbooks are stored in the same policies table as internal policies, differentiated by the document_category column (see Section 9.1). Additional handbook-specific metadata is stored in a handbook_metadata JSONB column:


| Metadata Field | Description |
| --- | --- |
| chapter_count | Number of chapters detected by TOC parsing |
| chapter_map | JSON array of {chapter_title, page_start, page_end, chunk_ids, has_sensitive_content} |
| toc_detected | Boolean — whether a TOC was successfully parsed |
| total_chunks | Total number of chunks created from this document |
| chapter_index_namespace | Pinecone namespace reference for the chapter-level index |


---

## 5. Multi-Language Support

CareStreamAI is designed to serve care workforces that are linguistically diverse. Staff can submit questions and receive responses in any language, with no configuration required. The system automatically detects the language of each query and responds in kind, including full policy summaries and regulatory explanations.


### 5.1 How Language Detection Works

Language detection is handled at the query processing stage, before the RAG pipeline is invoked:

- The incoming query text is passed to a lightweight language detection library (e.g. franc or langdetect) to identify the ISO language code
- The detected language code is stored alongside the query record in the database for analytics
- The Claude system prompt is dynamically constructed to instruct the model to respond in the detected language
- If language detection confidence is below threshold, the system defaults to English and flags the query for review

### 5.2 Scope of Language Support


| Feature | Language Behaviour |
| --- | --- |
| Chat queries | Staff can type in any language; response returned in same language |
| Email queries | Email body parsed in any language; reply sent in same language as the original email |
| Policy summaries | Key points summary translated into the query language by Claude |
| Full policy text | Returned verbatim in the original language it was written (translation of full policy text is out of scope for v1) |
| Regulatory knowledge base | External regulation explanations translated into the query language on the fly |
| UI labels | English only for v1; internationalisation of the portal UI is a Phase 2 item |


> **Note:** Claude supports over 70 languages natively. Common languages in UK care settings include Polish, Romanian, Portuguese, Tagalog, Yoruba, and Hindi. No additional configuration is required to support these.


### 5.3 Prompt Engineering for Multi-Language

The system prompt passed to Claude includes an explicit language instruction derived from detection:


```
// Pattern 1 — English default (no injection needed, prompt defaults to English)

// Pattern 2 — English query, explicit language requested
The staff member has written in English but has explicitly requested a response in Hindi.
You must respond entirely in Hindi.
Translate all summaries, explanations, key points, and guidance into Hindi.
Do not translate the full policy text if included — return policy wording as written.

// Pattern 3 — Non-English query, implicit language response
The staff member has asked their question in Tagalog.
You must respond entirely in Tagalog.
The policy content provided to you is in English — use it as your source of truth
but write your entire response in Tagalog.
Do not translate the full policy text if included — return policy wording as written.
```


### 5.4 Audit & Compliance Considerations

- The language detected for each query is logged in the queries table (language_detected column)
- Managers can filter query history by language in the admin dashboard to identify language-based knowledge gaps
- All responses, regardless of language, remain linked to the source policy for full auditability
- Future enhancement (Phase 2): usage analytics broken down by language to support workforce planning

---

## 6. External Regulatory Knowledge Base

Care policies frequently reference external legislation, frameworks, and regulatory bodies such as UK GDPR, RIDDOR, the Care Act, or CQC Fundamental Standards. When a staff member asks about one of these references, or when a policy cites one, CareStreamAI can provide a rich, contextual explanation drawn from a curated platform-level knowledge base.

This knowledge base is maintained centrally by the CareStreamAI platform team and is available to all subscribers. It is entirely separate from tenant-uploaded policies and tenant data is never mixed with it.


### 6.1 Knowledge Base Data Structure

The knowledge base is sourced from a structured Google Sheet maintained by the platform team and imported into the platform database. Each row represents one external regulation or framework:


| Field | Description & Usage |
| --- | --- |
| Reference Key | Short unique identifier (e.g. gdpr, riddor). Used internally to link policy mentions to knowledge base entries and as the upsert key during Google Sheets sync. |
| Official Name | Full legal or regulatory name (e.g. UK General Data Protection Regulation). Displayed prominently in responses. |
| Additionally Known As / Search Terms | Comma-separated synonyms, misspellings, and common staff phrases (e.g. 'what is gdpr', 'data protection rules', 'gdrp'). Used for fuzzy matching and intent detection. |
| Summary | Comprehensive plain-English explanation. Used as primary RAG context when staff ask about the regulation. |
| Care Home Context | Specific explanation of how the regulation applies in a care home setting. Included when query is care-context specific. |
| Care Company Interaction | How the regulation interacts with a typical care company's internal policies. Used to explain the link between internal and external requirements. |
| Practical Meaning | Concise, actionable guidance for frontline staff. Surfaced as a key takeaway in all responses. |
| Source URL | One or more authoritative source links (e.g. ICO, legislation.gov.uk). Included as a reference in every response. |


### 6.2 How the Knowledge Base is Stored


| Storage Layer | Detail |
| --- | --- |
| PostgreSQL | Master table external_regulations stores all fields. Synced from Google Sheets via a scheduled import job (daily or on-demand by platform admin). |
| Pinecone (platform namespace) | Summary, Care Home Context, and Practical Meaning fields are embedded and stored in a dedicated platform-level Pinecone namespace. This enables semantic similarity search across all regulations. |
| Search Term Index | The Additionally Known As field is tokenised and stored in a PostgreSQL full-text search index (tsvector) for fast keyword and fuzzy lookup, complementing semantic search. |


> **Note:** The platform knowledge base namespace in Pinecone is shared across all tenants but contains zero tenant data. It is strictly read-only from the tenant query pipeline.


### 6.3 Query Routing — When the Knowledge Base is Used

A two-stage routing step determines whether to query the tenant namespace, the platform knowledge base, or both:


| Scenario | Routing Decision |
| --- | --- |
| Staff asks 'what is RIDDOR?' or 'explain GDPR' | Knowledge base only. Regulation explanation returned with care home context and practical meaning. |
| Staff asks 'what does our falls policy say about RIDDOR?' | Tenant namespace first (falls policy retrieved), then knowledge base for RIDDOR context. Both combined in a single response. |
| Policy text contains a reference to an external regulation | During ingestion, regulation references are detected and tagged. At query time, relevant knowledge base entries are automatically included as supplementary context. |
| Query matches neither policy nor knowledge base | Honest not-found response with suggestion to contact manager. |


### 6.4 Regulation Detection During Policy Ingestion

When a policy document is uploaded and chunked, an additional processing step scans each chunk for references to known regulations:

- Each chunk is matched against the Reference Key and Additionally Known As terms in the knowledge base
- Matched regulation references are stored as metadata on the Pinecone vector for that chunk (e.g. regulations_cited: ['gdpr', 'riddor'])
- At query time, if a relevant chunk is retrieved, its regulation metadata automatically triggers the matching knowledge base entry to be included as supplementary context
- Staff never need to explicitly ask about a regulation — if their policy references it, the context is surfaced automatically

### 6.5 Google Sheets Sync Pipeline

- Google Sheets API reads the master knowledge base sheet on a daily schedule, or triggered manually by a platform admin
- Each row is upserted into the external_regulations table using Reference Key as the unique identifier
- After each sync, new or changed entries are re-embedded and updated in the platform Pinecone namespace
- A sync log records the timestamp, number of records updated, and any errors
- Platform admins can trigger a manual sync and view sync history via the super-admin dashboard

### 6.6 External Regulations Table (PostgreSQL)


#### external_regulations


| Column | Description |
| --- | --- |
| id (UUID) | Primary key |
| reference_key | Unique short identifier (e.g. gdpr) — upsert key for Google Sheets sync |
| official_name | Full regulatory name |
| also_known_as | Text array of synonyms and search terms |
| also_known_as_tsv | PostgreSQL tsvector for full-text search |
| summary | Full plain-English summary |
| care_home_context | Care-setting-specific explanation |
| care_company_interaction | How it interacts with internal care policies |
| practical_meaning | Actionable staff-facing guidance |
| source_urls | Text array of authoritative source URLs |
| pinecone_vector_id | Reference to vector stored in the platform Pinecone namespace |
| last_synced_at | Timestamp of last Google Sheets sync |
| is_active | Boolean — inactive records excluded from retrieval |


### 6.7 Response Format for Regulatory Explanations

When the knowledge base is used, the response is structured consistently:

- Regulation name and official reference clearly stated
- Plain-English summary tailored to care home context
- How it relates to the staff member's specific question or their organisation's policy
- Practical meaning — what this means day-to-day for frontline staff
- Source URL provided for further reading
- Full response delivered in the detected language of the query (see Section 5)

> **Note:** Example: A staff member emails asking 'what does GDPR mean for us?' — the system returns: the official name, a plain-English summary, a care home specific explanation, what it means practically for day-to-day work, and a link to the ICO guidance page. If the question was asked in Polish, the entire response is returned in Polish.


### 6.8 Language Handling for Knowledge Base Responses

The language resolution logic defined in Section 5 applies equally and without exception to all responses that draw from the external regulatory knowledge base. There is no separate language pipeline for regulatory content — the same three interaction patterns govern how language is detected, resolved, and applied regardless of whether the response comes from a tenant policy, the knowledge base, or both.

The one scenario worth making explicit is the hybrid query — where a staff member asks a question that spans both their organisation's internal policy and an external regulation in the same message. The table below shows how all three patterns handle this:


| Query | Language Pattern | What Happens |
| --- | --- | --- |
| 'What does our falls policy say about RIDDOR?' (English) | Pattern 1 — English in, English out | Tenant namespace queried for falls policy. Knowledge base queried for RIDDOR. Both results combined. Entire response delivered in English as a single unified reply. |
| 'What does our falls policy say about RIDDOR? Please reply in Urdu' | Pattern 2 — English query, explicit language request | Same dual retrieval. Language override applied to the entire response — both the falls policy summary and the RIDDOR explanation are rendered in Urdu in a single coherent reply. |
| 'ano ang sinasabi ng aming patakaran sa pagbagsak tungkol sa RIDDOR?' (Tagalog) | Pattern 3 — Non-English query, implicit response language | Intent classification identifies falls policy and RIDDOR as topics, both translated to English for retrieval. Dual retrieval runs against both sources. Full response — policy summary and regulatory explanation — delivered in Tagalog. |

The key principle is that language wraps the entire response, not individual retrieval sources. Claude receives all retrieved content — whether from one source or several — and generates a single unified response in the resolved language. The staff member never sees separate English and non-English sections within the same reply.


> **Note:** This means the language layer is source-agnostic by design. As new content sources are added in future versions (e.g. training materials, CQC inspection guidance), they are automatically covered by the same language resolution pipeline without any additional development.


---

## 7. Chat Portal (Web UI)


### 13.1 Technology Stack


| Component | Technology |
| --- | --- |
| Framework | Next.js 14 (App Router) |
| UI Library | Tailwind CSS + shadcn/ui components |
| Authentication | NextAuth.js with email/password + optional SSO (future) |
| State Management | React Query (server state) + Zustand (local UI state) |
| Deployment | Vercel (global CDN, automatic scaling) |


### 13.2 Staff Chat Interface

The chat interface is the primary staff-facing surface. Key design principles:

- Simple, WhatsApp-style conversational UI — minimal training required
- Conversation history persisted per session and searchable
- Responses include source citations as collapsible references
- Multi-language support: auto-detects query language and responds in kind
- Mobile-responsive for use on phones and tablets on the care floor
- Accessibility compliant: WCAG 2.1 AA

### 13.3 Admin Dashboard

The Admin Dashboard is accessible to managers and org administrators. Key features for v1:

- Policy Management: Upload, version, activate/deactivate policies
- Supported formats: PDF, DOCX, TXT
- Policy tagging: category, department, regulatory framework (CQC, RIDDOR, etc.)
- Staff Management: Invite staff by email, set roles (Admin / Staff)
- Usage Overview: Queries per day, most-asked policies, active users
- Subscription & Billing: View current plan, usage against limits, manage payment via Stripe Customer Portal

---

## 8. Email Interface

The email interface functions as a full conversational channel — not just a one-shot query mechanism. Staff can start a policy conversation by sending an email and continue that conversation through natural reply chains, exactly as they would in the web chat portal. The system maintains full context across the entire email thread.


### 8.1 Inbound Email Handling — Initial Query

Each tenant has a dedicated inbound email address: policies@{tenant-slug}.carestreamai.co.uk. Inbound emails are processed via SendGrid Inbound Parse, which webhooks to the CareStreamAI API.


| Step | Detail |
| --- | --- |
| 1. Receive | SendGrid receives inbound email and triggers a webhook POST to /api/email/inbound |
| 2. Authenticate | Sender email is looked up against the tenant's staff list. Unknown senders receive a polite rejection reply with instructions to contact their manager. |
| 3. Thread Detection | The system checks the email headers (References, In-Reply-To, Message-ID) and the Subject line to determine whether this is a new conversation or a reply to an existing thread. |
| 4. Context Assembly | For new conversations, a fresh email_sessions record is created. For replies, the full prior conversation history is retrieved from the email_sessions table. |
| 5. Parse | The latest message body is extracted (quoted previous replies are stripped). Intent is classified: full policy request, specific question, or follow-up question within an existing thread. |
| 6. RAG Query | The same RAG pipeline as the chat portal is invoked, with the full conversation history passed as context — enabling follow-up questions to reference prior answers. |
| 7. Format & Reply | Response is formatted as a structured HTML email and sent via SendGrid, preserving the original email thread (correct Message-ID and References headers set). |


### 8.2 Threaded Conversation — How It Works

The key to multi-turn email conversations is maintaining a session record that mirrors how the web chat stores conversation history. The following mechanisms enable this:


#### Email Session Tracking

- When a new email arrives with no prior thread, a new email_sessions record is created, storing: tenant_id, user_id, thread_id (derived from Message-ID), and an empty messages array
- Each subsequent reply in the thread appends to the messages array — both the staff message and the system response — building an accurate conversation history
- The thread_id links all emails in the same conversation, even if the subject line changes

#### Quoted Reply Stripping

- When a staff member replies, their email client appends the prior exchange as quoted text (e.g. preceded by '>' characters or 'On [date] you wrote:')
- The system uses a quoted-reply parser library (e.g. email-reply-parser) to strip the quoted portion and extract only the new message
- This ensures the RAG pipeline only processes the new question, not the entire prior thread

#### Conversation Context Injection

- The full conversation history (all prior turns) is retrieved from email_sessions and formatted as a structured message array
- This array is passed to the Claude API alongside the new query, in the same format as the web chat — enabling Claude to answer follow-up questions with full awareness of what was previously discussed
- Example: staff asks 'what is the falls policy?' in email 1, then replies 'what does it say about night shifts?' — Claude understands the context and answers correctly

### 8.3 Conversation Flow Example


| Turn | What Happens |
| --- | --- |
| Staff sends: 'Can you send me the falls policy?' | New session created. Full policy retrieved and returned. Message-ID stored as thread anchor. |
| Staff replies: 'What does it say about reporting timescales?' | Reply detected via In-Reply-To header. Prior context loaded. RAG query focuses on reporting timescales within falls policy context. Response continues the thread. |
| Staff replies: 'And what does RIDDOR say about this?' | Conversation continues. Knowledge base queried for RIDDOR. Response links RIDDOR requirements back to the falls policy context discussed earlier in the thread. |
| Staff replies: 'Can you explain that more simply?' | Claude rephrases the previous response in plain English, with full awareness of the thread. No new RAG query needed. |


### 8.4 Session Expiry & New Conversations

- Email sessions expire after 7 days of inactivity — after which a reply starts a fresh session rather than continuing the old one
- Staff can explicitly start a new topic by sending a new email (not a reply), even if a session is still active
- Expired sessions are archived but retained in the audit log for compliance purposes

### 8.5 Email Response Format

Outbound emails follow a consistent, professional template:

- Subject: Re: [Original Subject] — CareStreamAI (preserving the thread subject)
- Greeting using staff member's first name
- Direct answer to the latest question, with awareness of prior context
- Key points in a clear, scannable format
- Full policy text appended below (only when explicitly requested)
- Source citation footer: which policy or regulation was referenced, and when it was last updated
- Prompt: 'Just reply to continue the conversation — I'll remember what we discussed'

> **Note:** Email replies are sent within 30 seconds of receipt under normal load. Threaded conversation history is stored per-tenant and subject to the same 12-month retention and audit logging rules as web chat queries.


### 8.6 email_sessions Table (PostgreSQL)


#### email_sessions


| Column | Description |
| --- | --- |
| id (UUID) | Primary key |
| tenant_id | FK to tenants — enforces isolation |
| user_id | FK to users (staff member who started the thread) |
| thread_id | Derived from original Message-ID header — unique identifier for the email thread |
| subject | Subject line of the original email |
| messages | JSONB array of all turns: [{role: user\|assistant, content, timestamp, policy_ids_cited}] |
| last_message_at | Timestamp of most recent message in thread |
| expires_at | Timestamp after which the session is considered closed (default: 7 days from last_message_at) |
| created_at | Timestamp of first message |


---

## 9. Data Model


### 9.1 Core PostgreSQL Tables


#### tenants


| Column | Description |
| --- | --- |
| id (UUID) | Primary key |
| name | Organisation name (e.g. Sunrise Care Home) |
| slug | URL-safe unique identifier (e.g. sunrise-care) |
| email_domain | Inbound email address prefix |
| stripe_customer_id | Stripe customer reference |
| subscription_status | active \| trialling \| past_due \| cancelled |
| plan_id | FK to plans table |
| created_at | Timestamp |


#### users


| Column | Description |
| --- | --- |
| id (UUID) | Primary key |
| tenant_id | FK to tenants — enforces data isolation |
| email | Login email |
| name | Display name |
| role | admin \| staff |
| password_hash | bcrypt hash |
| last_login_at | Timestamp |


#### policies


| Column | Description |
| --- | --- |
| id (UUID) | Primary key |
| tenant_id | FK to tenants |
| name | Policy display name |
| filename | Original uploaded filename |
| s3_key | Full S3 object key |
| version | Integer version number, auto-incremented on re-upload |
| status | active \| processing \| archived |
| tags | JSONB array of tags |
| uploaded_by | FK to users |
| created_at / updated_at | Timestamps |


#### queries


| Column | Description |
| --- | --- |
| id (UUID) | Primary key |
| tenant_id | FK to tenants |
| user_id | FK to users (null for email queries) |
| channel | chat \| email |
| query_text | Raw staff question |
| response_text | Full response returned |
| policy_ids_cited | Array of policy IDs referenced in response |
| language_detected | ISO language code |
| response_time_ms | Latency of AI response |
| created_at | Timestamp |


---

## 10. Subscription & Billing (Stripe)


### 10.2 Basic Analytics (Starter Plan)

Basic analytics answers the operational question: is the platform being used and is the policy library complete enough to serve staff? All metrics cover the current calendar month with a comparison to the previous month.


| Metric | Detail |
| --- | --- |
| Total queries | Count of all queries this month vs. last month. Shown as a stat card with trend indicator. |
| Queries by channel | Email vs. web chat split — helps admins understand which channel staff prefer. |
| Most requested policies | Top 10 policies by query volume this month. Tells managers which policies staff find most complex or refer to most often. |
| Most requested handbook sections | Top 5 handbook topics by query volume, derived from chapter metadata on retrieved chunks. |
| Active users | Number of staff who have submitted at least one query this month vs. last month. |
| Plan usage | Queries used vs. monthly limit, displayed as a progress bar. Triggers a warning at 80% and 95% to avoid unexpected overage. |
| Policy not found rate | Percentage of queries where no relevant policy was retrieved — flags gaps in the policy library. |
| Policy last updated | Date each active policy or handbook was last uploaded or replaced. Shown in the policy library view so admins can see ageing documents at a glance. |


### 10.3 Advanced Analytics (Professional Plan)

Advanced analytics answers the strategic question: how is CareStreamAI improving care quality, staff confidence, and compliance readiness? All Basic analytics are included, plus the following:


| Metric | Detail |
| --- | --- |
| Language breakdown | Query volume by detected language by month. Shows which languages are most active, enabling admins to identify workforce needs and evidence inclusivity. Exportable as CSV. |
| Knowledge gap detection | Queries returning no policy match, grouped by topic cluster. Tells admins precisely which policy gaps exist — not just that gaps exist. Updated weekly. |
| Query trend analysis | Weekly and monthly query volume over a rolling 12-month window. Spike detection highlights unusual surges (e.g. sudden rise in falls policy queries following an incident). |
| Staff engagement breakdown | Query activity by staff role and by individual (anonymisable toggle). Identifies staff who may need additional training or encouragement. |
| Document category breakdown | Query split across internal policies, staff handbook, and external regulations — helping admins understand whether staff are using the platform for clinical, HR, or regulatory guidance. |
| Most cited external regulations | Which regulations (GDPR, RIDDOR, CQC Fundamental Standards) appear most frequently in responses. Useful for identifying regulatory training priorities. |
| Policy last updated & access correlation | For each policy: last updated date, days since last update, query volume since last update, and whether staff accessed the policy after it was updated. Highlights stale policies and updates that did not reach staff. |
| Full policy vs. summary request ratio | Shows whether staff want to read the full policy or just get a quick summary — useful for understanding staff confidence levels. |
| Response time performance | Average and 95th percentile query response times by channel. Flags performance degradation. |
| CQC Readiness Report | See Section 10.4 — a dedicated monthly inspection-evidence export. |


### 10.4 CQC Readiness Report

The CQC Readiness Report is a Professional plan feature that automatically transforms CareStreamAI's audit log into structured evidence for Care Quality Commission inspections. CQC inspectors look for proof that staff are actively using and understanding policies — not just that policies exist. This report provides that proof in a format immediately presentable at inspection.

The report is generated on demand or scheduled monthly as a PDF export. It covers a configurable date range (default: rolling 12 months) and includes the following sections:


| Report Section | Content & Inspection Value |
| --- | --- |
| Policy Access Summary | Every active policy showing: total queries in the period, number of unique staff who accessed it, date of most recent access, and current version number. Demonstrates that policies are live and being used. |
| Policies Not Accessed | Active policies that received zero queries in the period. Flags potential awareness gaps — and gives the manager an action list before inspection. |
| Policy Version History | For each policy: version number, upload date, who uploaded it, and query volume in the 30 days following each update. Shows inspectors that updated policies reached staff. |
| Staff Engagement Evidence | Aggregate query activity by staff role. Shows policies are being accessed at the care delivery level, not just by management. Individually anonymised to protect staff privacy. |
| Regulatory Framework Activity | Queries referencing CQC Fundamental Standards, RIDDOR, safeguarding, GDPR, and other key frameworks — with dates and frequency. Demonstrates staff awareness of regulatory requirements. |
| Multi-Language Access | Summary of queries in non-English languages, showing the organisation is providing equitable policy access across its multilingual workforce. Relevant to CQC Equality and Diversity requirements. |
| Handbook Access Summary | Staff handbook query activity, showing that staff are actively accessing their employment terms and HR procedures. |
| Knowledge Gap Log | Queries where no policy was found — presented as evidence of ongoing quality improvement: the organisation identified gaps and resolved them. |


> **Note:** Note: The CQC Readiness Report does not make any claims about CQC rating outcomes. It provides factual audit data. The framing in the UI should be 'inspection evidence' rather than 'CQC compliance' to avoid any regulatory misrepresentation. Legal review of the report format is recommended before launch.


### 10.5 Policy Versioning & Update Pipeline

Policies and handbooks will be updated over time as regulations change, procedures evolve, or CQC requirements shift. CareStreamAI treats every document update as a formal versioning event — preserving full audit history while ensuring staff always receive answers based on the current version.


#### Archiving a Policy (Removal)

Admins cannot permanently delete a policy — deletion would destroy audit history. Instead, policies are archived:

- Admin selects 'Archive' on a policy in the Admin Dashboard
- The policy status is set to archived in PostgreSQL
- All vectors for this policy are removed from the tenant's active Pinecone namespace — the policy is immediately excluded from all future query retrieval
- The original document file is retained in S3 indefinitely — it is never deleted
- Archived policies are visible in the Admin Dashboard under an 'Archived' tab for audit purposes
- The audit log records: policy name, version archived, who archived it, and timestamp

#### Updating a Policy (Version Replacement)

When a policy is updated, the admin uploads the new version and the system handles the transition atomically:


| Step | Detail |
| --- | --- |
| 1. Admin uploads new version | Admin navigates to the existing policy and selects 'Upload New Version'. This preserves the policy name and all historical query data. |
| 2. Version number incremented | The system auto-increments the version number (v1 to v2). The new record is created with status: processing. The existing v1 record remains active during processing so staff are not interrupted. |
| 3. Ingestion pipeline runs | The new document goes through the full pipeline: header/footer stripping, chunking, embedding, regulation tagging, and Pinecone indexing. |
| 4. Atomic namespace swap | Once processing completes, the old version's vectors are removed from Pinecone and the new version's vectors are activated in a single atomic operation. There is no window where staff receive mixed old/new responses. |
| 5. Old record superseded | The v1 policy record status is updated to superseded. A superseded_by foreign key is added pointing to the v2 record. The v1 S3 file is moved to a /versions/ prefix path for permanent retention. |
| 6. Audit log entry | An entry is written: policy name, old version number, new version number, who uploaded, timestamp, and file size change. |
| 7. Admin confirmation | The admin receives a dashboard notification and optional email confirming the new version is live. |


> **Note:** Note: The atomic swap in Step 4 is critical. Use a Pinecone namespace alias or two-namespace staging approach (staging to active) to guarantee no gap between old and new version availability. Confirm implementation approach based on the Pinecone SDK version in use at build time.


#### Policy Review Reminders

To prevent policies from becoming stale, CareStreamAI supports configurable review reminders:

- Admins can set a review interval on each policy (e.g. 12 months, 24 months) — stored as review_interval_days on the policy record
- A scheduled daily job checks for policies where last_reviewed_at + review_interval_days <= today
- Admins receive an in-dashboard alert and an email listing policies due for review
- The Advanced Analytics 'Policy last updated & access correlation' view surfaces ageing policies and updates not subsequently accessed by staff
- Policy review dates are visible in Basic analytics (last updated date) and fully actionable in Advanced analytics (full correlation view)

### 10.6 Stripe Integration

- Stripe Checkout used for subscription sign-up (hosted, PCI-compliant)
- Stripe Customer Portal for self-serve plan changes and cancellation
- Stripe webhooks consumed by the API to update tenant subscription status in real time
- Key webhook events handled: checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted
- Usage metering via Stripe Metered Billing for query overage (v1.1)

---

## 11. Security & Compliance


### 13.1 Authentication & Authorisation

- JWT-based authentication with 1-hour access tokens and 7-day refresh tokens
- Passwords hashed with bcrypt (12 rounds minimum)
- Role-based access control: Admin and Staff roles enforced on every API route
- Rate limiting on all API endpoints (100 req/min per user, 10 req/min on auth routes)
- Brute-force protection on login: account lockout after 5 failed attempts

### 13.2 Data Protection & UK GDPR

- All data stored within UK/EEA regions (AWS eu-west-2 / eu-west-1)
- Data encrypted at rest (AES-256) and in transit (TLS 1.3)
- Staff query logs retained for 12 months then auto-deleted (configurable)
- No staff query data used to train AI models — Anthropic API terms compliant
- Data Processing Agreement (DPA) provided to all subscribers
- Privacy Policy and Terms of Service required at sign-up

### 13.3 Audit Logging

A comprehensive audit log is maintained for regulatory and CQC inspection readiness:

- Every policy query: who asked, what was asked, what was returned, which policy cited
- Every policy upload, update, and deactivation
- Every admin action (user invite, role change, billing change)
- Logs are immutable — stored in append-only format with timestamps

### 13.4 AI Safety Controls

- System prompt instructs Claude to only answer from retrieved policy context
- Output is checked for hallucination indicators before returning to user
- Queries containing sensitive PII (patient names, NHS numbers) are flagged and excluded from logs
- Content moderation filter applied to all inputs to detect and reject inappropriate queries

---

## 12. API Design


### 12.1 REST API Endpoints (v1)


| Endpoint | Description |
| --- | --- |
| POST /auth/register | Create new tenant and admin account |
| POST /auth/login | Authenticate user, return JWT |
| POST /auth/refresh | Refresh access token |
| GET /policies | List tenant's policies (admin) |
| POST /policies | Upload new policy document |
| GET /policies/:id | Retrieve full policy text |
| DELETE /policies/:id | Archive a policy |
| POST /query | Submit a chat query, returns AI response |
| GET /queries | List query history for tenant (admin) |
| POST /email/inbound | Webhook endpoint for SendGrid inbound parse |
| GET /users | List staff users (admin) |
| POST /users/invite | Invite a staff member by email |
| GET /billing/portal | Generate Stripe Customer Portal session URL |
| POST /billing/webhook | Stripe webhook receiver |
| GET /regulations | List all active external regulations in the knowledge base |
| GET /regulations/:key | Retrieve full knowledge base entry by reference key |
| POST /admin/regulations/sync | Trigger manual Google Sheets knowledge base sync (platform admin only) |


### 12.2 API Response Format

All API responses follow a consistent envelope:


```
{ "success": true, "data": { ... }, "meta": { "request_id": "...", "timestamp": "..." } }
{ "success": false, "error": { "code": "POLICY_NOT_FOUND", "message": "..." } }
```


---

## 13. Infrastructure & Deployment


### 13.1 Recommended Stack


| Service | Provider & Rationale |
| --- | --- |
| Frontend hosting | Vercel — zero-config Next.js deployment, global CDN, auto-scaling |
| API hosting | Railway — managed Node.js hosting with auto-deploy from GitHub, UK region available |
| Database | Supabase (managed PostgreSQL) — built-in RLS, real-time, UK region, generous free tier |
| Vector database | Pinecone — managed vector DB, namespace isolation, generous free tier for v1 |
| File storage | AWS S3 (eu-west-2) — reliable, cheap, lifecycle policies for auto-archival |
| Email | SendGrid — inbound parse + transactional email, strong deliverability |
| Background jobs | BullMQ + Redis (Railway) — async document processing queue |
| Monitoring | Sentry (errors) + Posthog (analytics) + Uptime Robot (availability) |


### 13.2 CI/CD Pipeline

- GitHub repository with main, staging, and feature branch strategy
- GitHub Actions: lint, test, and deploy on every merge to main
- Vercel preview deployments on every pull request
- Environment variables managed via Railway and Vercel secret stores
- Database migrations managed with Prisma Migrate — applied automatically on deploy

### 13.3 Scalability Considerations

- Stateless API design — horizontally scalable from day one
- Document processing is fully async via queue — large uploads do not block the API
- Pinecone scales vector search automatically; no configuration required
- Database connection pooling via PgBouncer (built into Supabase)
- CDN-cached static assets and Next.js ISR for admin dashboard performance

---

## 14. Design System & Brand Guidelines

CareStreamAI's visual identity should communicate trust, clarity, and professionalism — the same qualities care organisations need from their policies. The design is inspired by modern UK care-sector SaaS platforms: clean, uncluttered, and built for busy frontline environments. It is distinctly its own brand, not derivative of any existing product.


### 14.1 Design Principles


| Principle | What This Means in Practice |
| --- | --- |
| Clarity first | Every screen has one clear purpose. No visual clutter. Staff should be able to use the chat interface without any training. |
| Calm confidence | Colours, typography and spacing convey reliability. This is a tool staff trust with compliance-critical information. |
| Care-sector appropriate | Warm but professional. Not corporate-cold, not clinical-sterile. Accessibility is non-negotiable — WCAG 2.1 AA minimum. |
| Mobile-native | Designed for a phone held in one hand on a care floor, not just a desktop manager's office. |
| Consistent across channels | The email template, admin dashboard, and public website share the same visual language so the brand feels coherent. |


### 14.2 Colour Palette


| Token | Hex Value & Usage |
| --- | --- |
| Primary — Deep Teal | #0D6E6E — Primary CTAs, active navigation, key headings. Communicates trust and care without being clinical blue. |
| Primary Light | #E6F4F4 — Backgrounds for highlighted sections, hover states, info panels. |
| Accent — Warm Amber | #E8850A — Secondary CTAs, badges, notification indicators. Adds warmth and energy without alarming. |
| Neutral Dark | #1C2B2B — Body text, headings. Near-black with a warm teal undertone. |
| Neutral Mid | #5C7070 — Secondary text, labels, captions. |
| Neutral Light | #F4F8F8 — Page backgrounds, alternating table rows. |
| White | #FFFFFF — Card backgrounds, input fields, modal surfaces. |
| Success | #1A8754 — Confirmation messages, active status indicators. |
| Warning | #C96B00 — Expiry alerts, policy review reminders. |
| Error | #C0392B — Validation errors, failed actions. |


> **Note:** Deep Teal (#0D6E6E) is deliberately chosen over the more common NHS/corporate blue to give CareStreamAI its own identity within the care sector. It reads as trustworthy and professional while being immediately distinguishable from competitors.


### 14.3 Typography


| Role | Typeface & Specification |
| --- | --- |
| Headings (H1–H3) | Inter — Bold/SemiBold. Clean, highly legible geometric sans-serif. Available via Google Fonts. |
| Body text | Inter — Regular, 16px base size, 1.6 line height. Optimised for readability on screen. |
| UI labels & navigation | Inter — Medium, 14px. Consistent weight used throughout dashboard chrome. |
| Code / policy references | JetBrains Mono — Used sparingly for policy clause references and API documentation. |
| Minimum accessible size | 14px for any text the user is expected to read. 12px only for legal footnotes. |


### 14.4 Spacing & Layout

- Base unit: 8px. All spacing, padding, and margins are multiples of 8 (8, 16, 24, 32, 48, 64px)
- Maximum content width: 1200px centred — prevents over-wide layouts on large monitors
- Mobile breakpoints: 375px (phone), 768px (tablet), 1024px (laptop), 1280px (desktop)
- Cards use 16px padding, 8px border radius, and a subtle box shadow (0 1px 4px rgba(0,0,0,0.08))
- Section spacing on public pages: 80px vertical padding between sections (40px on mobile)

### 14.5 Component Patterns


#### Primary Button

- Background: Deep Teal (#0D6E6E), text: White, border-radius: 6px, padding: 12px 24px
- Hover: 10% darker (#0A5858), transition: 150ms ease
- Focus: 3px teal outline offset 2px (accessibility)

#### Chat Bubble — Staff Message

- Right-aligned, Deep Teal background, white text, 16px border-radius (flat bottom-right)
- Staff avatar initial shown on the right

#### Chat Bubble — System Response

- Left-aligned, white card with 1px #D8E8E8 border, Neutral Dark text
- CareStreamAI logo mark shown top-left of bubble
- Citation tag shown below response: small teal pill with policy name and version

#### Navigation — Admin Dashboard

- Left sidebar: 240px wide, Neutral Light background, Deep Teal active state with left border indicator
- Top bar: White, company name/logo left, user avatar + logout right
- Mobile: sidebar collapses to bottom tab bar with 5 icons maximum

### 14.6 Public Marketing Website

The public-facing website (carestreamai.co.uk) uses the same design system and follows a structure similar to leading UK care SaaS products — clean hero, social proof, feature sections, pricing, and a strong demo CTA — but with CareStreamAI's own visual identity.


| Page / Section | Key Design Detail |
| --- | --- |
| Navigation | White background, Deep Teal logo, clean horizontal nav with 'Book a Demo' as a filled teal CTA button. Sticky on scroll. |
| Hero section | Large headline (Inter Bold, 52px), subheading, two CTAs (primary + ghost). Teal background with a subtle diagonal wave at the base. No stock photo — use a clean product screenshot or illustration. |
| Social proof bar | Scrolling logo strip of care organisation types (not named customers at launch). Grey logos on white. |
| Feature sections | Alternating left/right image + text layout. Teal section headings, body in Neutral Mid. Icon set consistent (Lucide or Phosphor icons). |
| Pricing section | Clean card layout on Neutral Light background. Two plans side by side. Recommended plan has Deep Teal header. Monthly/annual toggle. |
| Testimonials | Large quote in Deep Teal italic, attribution below. White card on Neutral Light background. |
| Footer | Dark footer (#1C2B2B), white text, 4-column link layout, social icons. Legal links in small Neutral Mid text. |


### 14.7 Admin Dashboard Layout


| Screen | Layout Description |
| --- | --- |
| Dashboard home | Welcome header + 4 stat cards (Queries today, Policies active, Staff users, Plan usage). Query volume chart below. Recent queries table at bottom. |
| Policy library | Searchable, filterable table of policies. Status badge (Active/Processing/Archived). Upload button top-right. Row actions: View, Archive, Replace. |
| Chat query history | Filterable table: date, staff name, query excerpt, language, policies cited, response time. Click row to expand full exchange. |
| Staff management | Table of users with role badges. Invite by email button. Pending invite status shown. |
| Billing | Current plan summary card. Usage bar (queries used vs. limit). 'Manage Billing' button linking to Stripe portal. |


### 14.8 Chat Portal Interface


| Element | Design Detail |
| --- | --- |
| Layout | Full-height, two-panel: left panel shows conversation history list (desktop only); right panel is the active chat. |
| Input bar | Fixed bottom, white background, rounded text input, send button in Deep Teal. Paper clip icon for future file attachment. Character limit indicator. |
| Empty state | Centred CareStreamAI logo mark, heading 'What would you like to know?', 3 suggested query chips in teal outline style. |
| Loading state | Three animated dots in Deep Teal while response is being generated. Typing indicator styled like a chat bubble. |
| Citation display | Collapsible section below each response: 'Source: [Policy Name] — last updated [Date]'. Expand to show the exact chunk retrieved. |
| Language indicator | Small flag/language chip shown on responses not in English, confirming which language was detected. |


### 14.9 Email Template Design

The outbound email template follows the same brand language to create a consistent experience across channels:

- Header: Deep Teal background, white CareStreamAI wordmark, tenant organisation name in smaller white text below
- Body: White background, Inter font, Neutral Dark text, 16px base size
- Quoted key points: Teal left-border callout box (matching the note/callout style in the web UI)
- Full policy section (when included): Neutral Light background block with monospace font for easy scanning
- Citation footer: Small grey text — 'Response generated from [Policy Name] v[X], uploaded [Date]'
- Footer bar: Deep Teal strip — Unsubscribe | Privacy Policy | carestreamai.co.uk

> **Note:** Email templates should be built in MJML (a responsive email framework) and compiled to HTML. This ensures consistent rendering across Gmail, Outlook, Apple Mail, and mobile clients without manual cross-client testing.


---

## 15. Development Phases & Roadmap


### Phase 1 — v1 Launch (Months 1–3)

- Multi-tenant architecture and database schema
- Policy upload, processing, and vector embedding pipeline
- Chat portal (staff UI + admin dashboard)
- Email in / email reply interface
- Stripe subscription billing
- Authentication, RBAC, and audit logging
- UK GDPR compliance controls and DPA documentation
- Multi-language query and response support
- External regulatory knowledge base (Google Sheets sync + platform Pinecone namespace)

### Phase 2 — v1.1 (Months 4–6)

- Voice-based policy queries (Web Speech API)
- Advanced analytics: knowledge gap detection, most-queried topics
- Automated policy version tracking and expiry alerts
- SSO / SAML integration for large group operators
- Stripe usage metering and overage billing

### Phase 3 — v2 (Months 7–12)

- Integration with training management systems (e.g. automatic quiz generation from policies)
- CQC inspection mode: curated policy evidence packs
- White-label option for large care groups
- Mobile app (React Native)
- API access for integration with care management platforms

---

## 16. Risk Register


| Risk | Mitigation |
| --- | --- |
| AI hallucination returns incorrect policy guidance | RAG grounding + system prompt constraints + full-policy verbatim fallback + source citations on every response |
| Data breach exposes tenant policy data | Tenant isolation at every layer + encryption at rest/transit + penetration test before launch |
| Staff distrust of AI responses | Source citations on every response + option to always escalate to manager + audit trail |
| Email deliverability issues | SendGrid dedicated IP (on Professional plan) + SPF/DKIM/DMARC configuration |
| Policy document quality too poor for RAG | Validation warnings on upload + admin guidance on document formatting best practices |
| Anthropic API outage | Graceful error handling + fallback message directing staff to physical policy binders |
| Language detection misidentifies query language | Confidence threshold check with English fallback + staff can re-ask or select language manually (Phase 2) |
| Knowledge base becomes outdated | Daily automated Google Sheets sync + platform admin alerts for entries not updated in 90+ days + source URLs always surfaced so staff can verify |


---

## 17. Glossary


| Term | Definition |
| --- | --- |
| RAG | Retrieval-Augmented Generation — a technique where an AI model answers questions using retrieved document excerpts as context, rather than relying solely on training data |
| Tenant | A subscribing care organisation with its own isolated data environment |
| Embedding | A numerical vector representation of text, used to measure semantic similarity |
| Namespace | A Pinecone concept for isolating vectors by tenant within a shared index |
| Chunk | A segment of a policy document, typically 400–600 tokens, used as the unit of retrieval |
| CQC | Care Quality Commission — the independent regulator of health and social care in England |
| RIDDOR | Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013 |
| RLS | Row-Level Security — a PostgreSQL feature that restricts which rows a user can access |
| DPA | Data Processing Agreement — a contract required under UK GDPR when a processor handles personal data on behalf of a controller |
| External Knowledge Base | A curated, platform-maintained library of external regulations and frameworks (e.g. GDPR, RIDDOR, Care Act), synced from Google Sheets and available to all tenants |
| Reference Key | A short unique identifier (e.g. gdpr, riddor) used to link regulation entries in the knowledge base to mentions within tenant policy documents |
| Language Detection | Automated identification of the language a query was written in, used to ensure Claude responds in the same language as the staff member |
| Platform Namespace | A dedicated Pinecone namespace holding the external knowledge base vectors, shared across tenants but containing no tenant data — read-only from tenant pipelines |
| DPA | Data Processing Agreement — a contract required under UK GDPR when a processor handles personal data on behalf of a controller |

— End of Document —
