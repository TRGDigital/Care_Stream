import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { siteUrl } from '../lib/urls'
import { checkAiCreditLimit, logAiCredit, PlanLimitError } from '../lib/plan-limits'
import { callClaude } from '../services/ai/claude'
import { requireAdmin } from '../middleware/auth'
import { notifyUsers } from '../lib/notify'
import { sendPushToUsers } from '../lib/push'
import { sendCqcPrepEmail } from '../services/email/outbound'
import { translateText, translateTextsBatch, withTranslationBudget } from '../lib/translate'
import { languageNameForCode } from '../data/languages'

export const cqcQuestionsRouter = Router()

// ─── Default prompts (fallback when DB prompt not yet saved) ──────────────────

export const DEFAULT_QUESTION_GENERATION_PROMPT = `You are a CQC (Care Quality Commission) inspection expert with extensive knowledge of the Health and Social Care Act 2008, the Fundamental Standards, and the CQC's Key Lines of Enquiry (KLOEs).

Your role is to generate realistic, open-ended questions that a CQC inspector would ask frontline care workers during an inspection visit, along with detailed model answers that reflect best practice in UK adult social care.

Domain: {{domain}}
Topic: {{topic}}

Generate one CQC inspector-style question and a comprehensive model answer.

Requirements for the question:
- Open-ended (not multiple choice or yes/no)
- Realistic — exactly the kind of question a CQC inspector would ask a care worker on the floor
- Tests practical knowledge and safe working practices, not theoretical knowledge
- Phrased naturally, as if the inspector is speaking directly to the staff member
- Appropriately challenging but fair for a frontline care worker

Requirements for the model answer:
- 3–6 sentences covering the key points a strong answer should include
- Practical and specific — references real actions, not vague intentions
- Reflects current CQC expectations and best practice for the domain
- Written from the staff member's perspective (first person)
- Includes the specific detail that distinguishes an excellent answer from a basic one

Respond in this exact JSON format with no markdown, no code block, no preamble:
{"question":"...","model_answer":"..."}`

export const DEFAULT_ANSWER_EVALUATION_PROMPT = `You are a CQC (Care Quality Commission) inspection expert evaluating a care worker's practice answer to a CQC inspector-style question.

Your role is to fairly and constructively assess how well the staff member's answer demonstrates the knowledge, values, and practical competency required to speak confidently with a CQC inspector.

Question asked: {{question}}
Model answer (reference standard): {{model_answer}}
Staff member's answer: {{staff_answer}}

Scoring guidance:
- 80–100: Excellent — demonstrates strong understanding, covers key points clearly, would reassure an inspector
- 60–79: Good — solid knowledge with minor gaps or missed detail
- 40–59: Partial — some good points but significant gaps that an inspector would probe further
- 0–39: Insufficient — key knowledge missing, incorrect, or vague to the point of concern

Important:
- Be fair and encouraging — this is practice, not a real inspection
- Acknowledge genuine strengths before suggesting improvements
- Be specific in feedback — tell the staff member exactly what was missing or what they could add
- Do not penalise minor wording differences; focus on whether the key concepts are present
- Score 0 only if the answer demonstrates unsafe practice or fundamental misunderstanding

Provide 2–3 sentences of constructive feedback that the staff member can act on immediately.

Respond in this exact JSON format with no markdown, no code block, no preamble:
{"score":75,"feedback":"..."}`

export const DEFAULT_QUESTION_BATCH_PROMPT = `You are a CQC (Care Quality Commission) inspection expert with extensive knowledge of the Health and Social Care Act 2008, the Fundamental Standards, and the CQC's Key Lines of Enquiry (KLOEs).

Generate {{count}} DISTINCT, realistic CQC inspector-style questions that an inspector would ask frontline care workers during an inspection, each with a comprehensive model answer.

{{domain_instruction}}
{{topic_instruction}}

Do NOT duplicate or closely paraphrase any of these existing questions:
{{avoid_list}}

Requirements for each question:
- Open-ended (not multiple choice or yes/no)
- Realistic — exactly the kind of question a CQC inspector would ask a care worker on the floor
- Tests practical knowledge and safe working practices, not theoretical knowledge
- Phrased naturally, as if the inspector is speaking directly to the staff member
- Appropriately challenging but fair for a frontline care worker
- Each question must be meaningfully different from the others in this batch

Requirements for each model answer:
- 3–6 sentences covering the key points a strong answer should include
- Practical and specific — references real actions, not vague intentions
- Reflects current CQC expectations and best practice for the domain
- Written from the staff member's perspective (first person)
- Includes the specific detail that distinguishes an excellent answer from a basic one

Respond with ONLY a valid JSON array — no markdown, no code block, no preamble — in this exact shape:
[{"domain":"safe","question":"...","model_answer":"..."}]
Each "domain" must be exactly one of: safe, effective, caring, responsive, well_led.`

// Fetch a live prompt from the DB, falling back to the default if not yet saved
async function getPrompt(usage: string, defaultPrompt: string): Promise<string> {
  try {
    const row = await (prisma as any).aiPrompt.findUnique({ where: { usage } })
    return row?.content?.trim() || defaultPrompt
  } catch {
    return defaultPrompt
  }
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_QUESTIONS = [
  // SAFE
  {
    domain: 'safe',
    question: 'What would you do if you noticed a colleague treating a resident roughly or unkindly?',
    model_answer: 'I would immediately report my concerns to my manager or the senior on duty. If I felt the resident was in immediate danger, I would step in to protect them and then report. I understand I have a professional and legal duty to raise safeguarding concerns, and I would document what I witnessed accurately. I would not confront the colleague directly as this could escalate the situation.',
  },
  {
    domain: 'safe',
    question: 'How do you ensure you administer medication safely to residents?',
    model_answer: 'I always follow the five rights of medication administration: right resident, right medication, right dose, right time, and right route. I check the MAR chart before administering, check for allergies, observe the resident take the medication, and document it immediately. I never leave medication unattended, and if I have any doubt about a medication or dose I stop and check with a senior before proceeding.',
  },
  {
    domain: 'safe',
    question: 'Describe what steps you take when you identify a risk to a resident\'s safety.',
    model_answer: 'I assess the immediate situation to ensure the resident is safe right now. I take any immediate action needed to reduce the risk, such as removing a hazard. I then report to my manager and document the risk in the relevant records or risk assessment. I continue to monitor the resident and follow any care plan updates. I also contribute to any review of the risk management plan to prevent recurrence.',
  },
  {
    domain: 'safe',
    question: 'What infection control measures do you follow in your daily work?',
    model_answer: 'I follow standard precautions at all times: washing or sanitising my hands between every contact with residents, before and after personal care, handling food, and after touching any potentially contaminated surfaces. I wear appropriate PPE such as gloves and aprons for personal care tasks and dispose of it correctly. I follow the home\'s isolation procedures when a resident has an infectious illness and report any concerns about infection risk to my manager.',
  },
  // EFFECTIVE
  {
    domain: 'effective',
    question: 'How do you make sure the care you provide meets a resident\'s individual needs?',
    model_answer: 'I read each resident\'s care plan before providing care to understand their individual needs, preferences, and any specific requirements. I communicate with the resident about how they would like their care to be delivered and respect their choices. I report any changes in the resident\'s condition or needs to my senior so the care plan can be updated. I also attend handovers and team meetings to stay informed about any changes.',
  },
  {
    domain: 'effective',
    question: 'Can you explain how you support a resident\'s nutrition and hydration needs?',
    model_answer: 'I ensure residents receive meals and drinks that meet their dietary requirements and preferences, including any texture modifications or allergies. I monitor their food and fluid intake and record it accurately on charts. I offer encouragement and assistance with eating and drinking without rushing. If I notice a resident is not eating or drinking adequately, I report this to the nurse or senior so further assessment can take place, as poor nutrition and dehydration can lead to serious health complications.',
  },
  {
    domain: 'effective',
    question: 'How do you support residents to maintain their independence?',
    model_answer: 'I always encourage residents to do as much for themselves as they are able and willing to do, even if it takes longer. I respect their choices and do not take over tasks they can manage. I use enabling language and positive reinforcement. I follow the care plan guidance on reablement and speak with the physiotherapist or occupational therapist if I think additional support could help a resident regain or maintain independence. Doing things for people when they can do them themselves reduces their ability over time.',
  },
  {
    domain: 'effective',
    question: 'What training have you completed and why is ongoing training important in care?',
    model_answer: 'I have completed mandatory training including moving and handling, safeguarding, fire safety, infection control, and medication awareness. Ongoing training is essential because best practice and regulations change, new techniques are developed, and it ensures I can provide safe, effective, and high-quality care. It also helps me understand my responsibilities, protects residents, and supports my professional development.',
  },
  // CARING
  {
    domain: 'caring',
    question: 'How do you promote the dignity of residents in your daily work?',
    model_answer: 'I always knock before entering a resident\'s room, close doors and curtains during personal care, use their preferred name, and speak to them respectfully regardless of their cognitive ability. I maintain their privacy and confidentiality, never discuss residents where others could overhear. I ensure they are dressed appropriately and do not leave them exposed. I respect their personal space and possessions and treat them as individuals with their own histories, preferences, and wishes.',
  },
  {
    domain: 'caring',
    question: 'Describe how you communicate effectively with a resident who has dementia.',
    model_answer: 'I use clear, simple language and short sentences, speaking calmly and at an appropriate pace. I maintain eye contact, use their name, and allow plenty of time for them to respond without rushing. I use non-verbal communication such as gentle touch when appropriate and watch their body language for signs of distress or discomfort. I avoid arguing or correcting them if they are confused, and I use validation techniques to acknowledge their feelings. I also note what time of day they are most alert and communicate important information then.',
  },
  {
    domain: 'caring',
    question: 'How do you support a resident\'s emotional wellbeing?',
    model_answer: 'I take time to talk with residents and show genuine interest in them as individuals. I notice changes in mood and report concerns to a senior. I support residents to engage in activities they enjoy and maintain relationships with family and friends. I am compassionate and reassuring when residents are anxious or distressed. I respect that residents may have good and bad days and adapt my approach accordingly. I recognise that emotional wellbeing is as important as physical health.',
  },
  {
    domain: 'caring',
    question: 'A resident\'s family is upset and complaining about the care their relative is receiving. How do you handle this?',
    model_answer: 'I listen to their concerns calmly and without becoming defensive. I acknowledge their feelings and thank them for raising the concern. I do not make promises I cannot keep or speculate about what may have happened. I explain that I will pass their concerns to my manager immediately and provide information about the formal complaints process. I document the conversation. I recognise that families are important partners in care and that their feedback can help improve the service.',
  },
  {
    domain: 'caring',
    question: 'How do you ensure you respect a resident\'s cultural and religious beliefs?',
    model_answer: 'I read the resident\'s care plan to understand their cultural background, religious practices, dietary requirements, and any specific customs that are important to them. I treat all residents equally regardless of their background. I ask residents and families respectfully about their preferences if I am unsure. I ensure dietary needs are met and support residents to observe religious practices such as prayer times. I challenge any discriminatory attitudes from colleagues and understand that respecting diversity is a fundamental part of person-centred care.',
  },
  // RESPONSIVE
  {
    domain: 'responsive',
    question: 'A resident tells you they feel bored and isolated. What action do you take?',
    model_answer: 'I listen to them, acknowledge their feelings, and ask what kind of activities or social contact they would enjoy. I report this to my manager and the activities coordinator so it can be discussed and addressed in the resident\'s care plan. I engage with the resident myself when I can, and I encourage participation in activities that match their interests. Loneliness and isolation are serious risks to wellbeing and I take this seriously rather than dismissing it as unimportant.',
  },
  {
    domain: 'responsive',
    question: 'How do you respond when a resident\'s condition or needs change suddenly?',
    model_answer: 'I stay calm and assess the situation, ensuring the resident is as comfortable and safe as possible. I call for help immediately — I do not try to manage a medical or urgent situation alone. I report to the nurse or senior on duty, providing clear information about what has changed and when I first noticed it. I document the changes and any actions taken. I continue to monitor the resident as directed and follow the updated care plan. Prompt reporting of changes is critical to good outcomes.',
  },
  {
    domain: 'responsive',
    question: 'How do you make sure residents\' complaints or concerns are taken seriously?',
    model_answer: 'I listen carefully and without judgment when a resident raises a complaint or concern. I never dismiss or minimise what they are saying. I acknowledge their feelings and explain the complaints procedure. I report the concern to my manager promptly and document it. I follow up to make sure the resident has received a response. I understand that residents have the right to complain and that complaints are an important way of improving care quality. I would never allow a resident to feel afraid to raise a concern.',
  },
  {
    domain: 'responsive',
    question: 'Describe how care plans should reflect a person\'s individual preferences and goals.',
    model_answer: 'Care plans should be developed with the resident (and their family or advocates where appropriate) and written in a way that reflects the person\'s own words, preferences, and goals rather than using generic language. They should cover all aspects of the resident\'s life including physical, emotional, social, and spiritual needs. They should be reviewed regularly and updated whenever needs or preferences change. A good care plan is a living document that guides every team member to provide care that is truly personalised.',
  },
  // WELL-LED
  {
    domain: 'well_led',
    question: 'Why is it important to report concerns or near misses, even if no harm occurred?',
    model_answer: 'Near misses and concerns are early warning signs that something could go wrong. Reporting them allows the team to identify patterns, review procedures, and take preventative action before someone is harmed. A culture of open reporting makes the home safer for everyone. I understand it is not about blame but about learning and improvement. I always report concerns through the correct channels and would never stay silent to avoid getting into trouble, as that would put residents at risk.',
  },
  {
    domain: 'well_led',
    question: 'How do you contribute to a positive team culture in your workplace?',
    model_answer: 'I communicate respectfully with colleagues, support newer staff, and share information at handovers. I raise concerns constructively rather than complaining without action. I follow the home\'s policies and act as a role model for good practice. I participate in team meetings and share ideas for improvement. I recognise that a positive culture depends on every individual — including me — treating colleagues and residents with respect and professionalism.',
  },
  {
    domain: 'well_led',
    question: 'What would you do if you were asked by a manager to do something you felt was wrong or unsafe?',
    model_answer: 'I would politely but firmly raise my concern and explain why I felt the action was wrong or unsafe. I would not carry out an instruction I believed could harm a resident. If the manager persisted, I would escalate to a more senior manager or the registered manager. If I still felt the concern was not being taken seriously, I know I have the right to raise it through external channels such as CQC or the local authority safeguarding team. Whistleblowing protections exist to support staff who raise genuine concerns in good faith.',
  },
  {
    domain: 'well_led',
    question: 'How do you keep up to date with changes to policies or procedures in your workplace?',
    model_answer: 'I attend team meetings, handovers, and any training sessions provided. I read notices and updates on the team notice board or communication book. If a policy has been updated, I read the new version and ask questions if anything is unclear. I sign to confirm I have read and understood any new or updated policy. I also take responsibility for my own learning by reading relevant guidance from organisations such as Skills for Care and staying aware of changes to regulations that affect my role.',
  },
]

// ─── Auto-seed helper ─────────────────────────────────────────────────────────

async function ensureSeeded(tenantId: string) {
  const existing = await (prisma as any).cqcStaffQuestion.count({
    where: { tenant_id: tenantId, is_seed: true },
  })
  if (existing > 0) return
  await (prisma as any).cqcStaffQuestion.createMany({
    data: SEED_QUESTIONS.map(q => ({ ...q, tenant_id: tenantId, is_seed: true })),
  })
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /cqc-questions — list all active questions (auto-seeds on first call)
cqcQuestionsRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  try {
    await ensureSeeded(tenantId)
    const questions = await (prisma as any).cqcStaffQuestion.findMany({
      where:   { tenant_id: tenantId, is_active: true },
      orderBy: [{ domain: 'asc' }, { created_at: 'asc' }],
    })
    ok(res, { questions })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// POST /cqc-questions — create a question manually (admin only)
cqcQuestionsRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const { domain, question, model_answer } = req.body
  if (!domain || !question || !model_answer) {
    return err(res, 'MISSING_FIELDS', 'domain, question, and model_answer are required', 400)
  }
  try {
    const q = await (prisma as any).cqcStaffQuestion.create({
      data: { tenant_id: tenantId, domain, question, model_answer },
    })
    ok(res, { question: q }, 201)
  } catch (e: any) {
    err(res, 'CREATE_FAILED', e.message, 500)
  }
})

// POST /cqc-questions/generate — AI generates a question + model answer from a topic
cqcQuestionsRouter.post('/generate', requireAdmin, async (req: Request, res: Response) => {
  const { domain, topic } = req.body
  if (!domain || !topic) {
    return err(res, 'MISSING_FIELDS', 'domain and topic are required', 400)
  }
  const domainLabel: Record<string, string> = {
    safe: 'Safe', effective: 'Effective', caring: 'Caring',
    responsive: 'Responsive', well_led: 'Well-led',
  }
  const tenantId = (req as any).user.tenant_id
  try {
    try { await checkAiCreditLimit(tenantId) }
    catch (e: any) { if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return } throw e }

    const promptTemplate = await getPrompt('cqc_question_generation', DEFAULT_QUESTION_GENERATION_PROMPT)
    const userMessage = promptTemplate
      .replace('{{domain}}', domainLabel[domain] ?? domain)
      .replace('{{topic}}', topic)

    const text = await callClaude('Respond only with valid JSON.', userMessage, { maxTokens: 600 })
    let parsed: { question: string; model_answer: string }
    try {
      parsed = JSON.parse(text.trim())
    } catch {
      return err(res, 'PARSE_FAILED', 'AI returned invalid JSON', 500)
    }
    await logAiCredit(tenantId, 'cqc_questions')
    ok(res, { question: parsed.question, model_answer: parsed.model_answer, domain })
  } catch (e: any) {
    err(res, 'GENERATE_FAILED', e.message, 500)
  }
})

// POST /cqc-questions/generate-batch — AI generates a batch of NEW questions and
// saves them to the bank. Charges one AI credit per question generated.
cqcQuestionsRouter.post('/generate-batch', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const VALID = ['safe', 'effective', 'caring', 'responsive', 'well_led']
  const domainLabel: Record<string, string> = {
    safe: 'Safe', effective: 'Effective', caring: 'Caring', responsive: 'Responsive', well_led: 'Well-led',
  }
  const body = req.body ?? {}
  const count = Math.max(1, Math.min(10, parseInt(body.count, 10) || 5))
  const specificDomain = typeof body.domain === 'string' && VALID.includes(body.domain) ? body.domain : null
  const topic = typeof body.topic === 'string' ? body.topic.trim() : ''

  try {
    try { await checkAiCreditLimit(tenantId) }
    catch (e: any) { if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return } throw e }

    // Pass existing questions so the AI avoids duplicates.
    const existing = await (prisma as any).cqcStaffQuestion.findMany({
      where: { tenant_id: tenantId, is_active: true }, select: { question: true }, take: 60,
    }).catch(() => [])
    const avoid = ((existing as any[]).map(q => `- ${q.question}`).join('\n') || '(none yet)').slice(0, 4000)

    const domainInstruction = specificDomain
      ? `All ${count} questions must be for the ${domainLabel[specificDomain]} domain. Set every "domain" field to "${specificDomain}".`
      : `Spread the ${count} questions as evenly as possible across the five CQC domains (safe, effective, caring, responsive, well_led).`
    const topicInstruction = topic ? `Focus the questions on this theme: ${topic}.` : ''

    const promptTemplate = await getPrompt('cqc_question_batch_generation', DEFAULT_QUESTION_BATCH_PROMPT)
    const userMessage = promptTemplate
      .replace('{{count}}', String(count))
      .replace('{{domain_instruction}}', domainInstruction)
      .replace('{{topic_instruction}}', topicInstruction)
      .replace('{{avoid_list}}', avoid)

    const text = await callClaude('Respond only with a valid JSON array.', userMessage, { maxTokens: 4000 })
    let parsed: Array<{ domain: string; question: string; model_answer: string }>
    try {
      const start = text.indexOf('['), end = text.lastIndexOf(']')
      parsed = JSON.parse(text.slice(start, end + 1))
    } catch {
      return err(res, 'PARSE_FAILED', 'AI returned invalid JSON', 500)
    }

    const clean = (Array.isArray(parsed) ? parsed : [])
      .filter(q => q && typeof q.question === 'string' && q.question.trim() && typeof q.model_answer === 'string' && q.model_answer.trim())
      .map(q => ({
        domain:       VALID.includes(q.domain) ? q.domain : (specificDomain ?? 'safe'),
        question:     q.question.trim(),
        model_answer: q.model_answer.trim(),
      }))
      .slice(0, count)

    if (clean.length === 0) return err(res, 'GENERATE_FAILED', 'No questions were generated — please try again', 500)

    const created = await Promise.all(clean.map(q =>
      (prisma as any).cqcStaffQuestion.create({ data: { tenant_id: tenantId, domain: q.domain, question: q.question, model_answer: q.model_answer } })
    ))
    // One AI credit per question generated (consistent with the single-question generate).
    await Promise.all(created.map((q: any) => logAiCredit(tenantId, 'cqc_questions', q.id)))

    ok(res, { questions: created, credits_used: created.length }, 201)
  } catch (e: any) {
    err(res, 'GENERATE_FAILED', e.message, 500)
  }
})

// DELETE /cqc-questions/:id — deactivate (soft delete)
cqcQuestionsRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  try {
    await (prisma as any).cqcStaffQuestion.updateMany({
      where: { id: req.params.id, tenant_id: tenantId },
      data:  { is_active: false },
    })
    ok(res, { success: true })
  } catch (e: any) {
    err(res, 'DELETE_FAILED', e.message, 500)
  }
})

// POST /cqc-questions/:id/deliver — send rephrased question to selected staff
cqcQuestionsRouter.post('/:id/deliver', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const { user_ids, channel = 'portal' } = req.body
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return err(res, 'MISSING_FIELDS', 'user_ids array required', 400)
  }
  try {
    const q = await (prisma as any).cqcStaffQuestion.findFirst({
      where: { id: req.params.id, tenant_id: tenantId, is_active: true },
    })
    if (!q) return err(res, 'NOT_FOUND', 'Question not found', 404)

    // Only deliver to users that actually belong to this tenant — prevents
    // arbitrary/cross-tenant user_ids from being written into deliveries or emailed.
    const members = await (prisma as any).user.findMany({
      where:  { id: { in: user_ids }, tenant_id: tenantId },
      select: { id: true },
    })
    const validUserIds: string[] = members.map((m: any) => m.id)
    if (validUserIds.length === 0) {
      return err(res, 'NO_VALID_RECIPIENTS', 'No recipients belong to this organisation.', 400)
    }

    // Skip anyone who already has this question — they keep their existing copy (and
    // can retry it after a low score) rather than getting a duplicate.
    const already = await (prisma as any).cqcStaffDelivery.findMany({
      where: { tenant_id: tenantId, question_id: q.id, user_id: { in: validUserIds } },
      select: { user_id: true },
    })
    const alreadySet = new Set((already as any[]).map(a => a.user_id))
    const newUserIds = validUserIds.filter(id => !alreadySet.has(id))
    const skipped = validUserIds.length - newUserIds.length

    if (newUserIds.length === 0) {
      return ok(res, { delivered: 0, skipped })
    }

    // Rephrase the question so staff cannot memorise exact wording
    const rephrased = await callClaude(
      'You are a CQC interview preparation assistant. Rephrase questions slightly to test the same knowledge without allowing rote memorisation.',
      `Rephrase the following CQC inspector question in a slightly different way that tests the same knowledge and competency. Keep it open-ended and realistic. Return only the rephrased question, nothing else.

Original: ${q.question}`,
      { maxTokens: 200 },
    ).catch(() => q.question as string)

    const deliveries = await (prisma as any).cqcStaffDelivery.createMany({
      data: newUserIds.map((uid: string) => ({
        tenant_id:  tenantId,
        question_id: q.id,
        user_id:    uid,
        rephrased_q: rephrased,
        channel,
      })),
      skipDuplicates: true,
    })

    ok(res, { delivered: deliveries.count, skipped })

    if (deliveries.count > 0) {
      const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
      const portalUrl = siteUrl()
      notifyUsers(tenantId, 'cqc_staff_prep', newUserIds, (email, name) =>
        sendCqcPrepEmail({ to: email, name, orgName: tenant?.name ?? '', questionCount: 1, portalUrl })
      ).catch(e => console.error('[cqc/deliver] Notify error:', e))
      // PWA push (additive — the in-hub nudge that replaces WhatsApp over time)
      sendPushToUsers(newUserIds, { title: 'New CQC practice question', body: 'Tap to answer a quick CQC inspector-style question.', url: '/cqc', tag: 'cqc-prep' }).catch(() => {})
    }
  } catch (e: any) {
    err(res, 'DELIVER_FAILED', e.message, 500)
  }
})

// GET /cqc-questions/deliveries — admin: all deliveries with user + question info
cqcQuestionsRouter.get('/deliveries', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  try {
    const deliveries = await (prisma as any).cqcStaffDelivery.findMany({
      where:   { tenant_id: tenantId },
      include: {
        user:     { select: { id: true, name: true, job_role: true } },
        question: { select: { id: true, domain: true, question: true, model_answer: true } },
      },
      orderBy: { sent_at: 'desc' },
    })
    ok(res, { deliveries })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// GET /cqc-questions/my-deliveries — staff: own pending + completed deliveries.
// The model answer is revealed only AFTER a question has been answered (so it can't
// be read ahead of answering a pending question).
cqcQuestionsRouter.get('/my-deliveries', async (req: Request, res: Response) => {
  const userId   = (req as any).user.sub
  const tenantId = (req as any).user.tenant_id
  try {
    const [deliveries, user, tenant] = await Promise.all([
      (prisma as any).cqcStaffDelivery.findMany({
        where:   { user_id: userId },
        include: { question: { select: { domain: true, model_answer: true } } },
        orderBy: [{ status: 'asc' }, { sent_at: 'desc' }],
      }),
      (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, comms_always_first_language: true } }),
      (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null),
    ])

    // Hide the model answer until the question has been answered.
    let safe = (deliveries as any[]).map(d => ({
      ...d,
      question: { domain: d.question.domain, model_answer: d.status === 'evaluated' ? d.question.model_answer : null },
    }))

    // Deliver CQC questions in the staff member's own language (parity with training,
    // induction and chat). Translate the question, the revealed model answer and the
    // AI feedback in batched, cached passes; fall back to English if it runs over budget.
    const lang = user?.comms_always_first_language === false ? 'eng' : ((user?.first_language as string) ?? 'eng')
    if (lang !== 'eng' && safe.length) {
      const langName = languageNameForCode(lang, tenant?.custom_languages)
      safe = await withTranslationBudget((async () => {
        const [qT, mT, fT] = await Promise.all([
          translateTextsBatch(safe.map(d => d.rephrased_q ?? ''), lang, langName),
          translateTextsBatch(safe.map(d => d.question.model_answer ?? ''), lang, langName),
          translateTextsBatch(safe.map(d => d.feedback ?? ''), lang, langName),
        ])
        return safe.map((d, i) => ({
          ...d,
          rephrased_q: qT[i] || d.rephrased_q,
          feedback:    d.feedback ? (fT[i] || d.feedback) : d.feedback,
          question:    { ...d.question, model_answer: d.question.model_answer ? (mT[i] || d.question.model_answer) : null },
        }))
      })(), 18_000, safe)
    }

    ok(res, { deliveries: safe })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// POST /cqc-questions/deliveries/:id/retry — staff re-opens an answered question to
// try again after reviewing the model answer & feedback. Reuses the same delivery
// row (so there's one record per staff+question) and bumps the attempt count.
cqcQuestionsRouter.post('/deliveries/:id/retry', async (req: Request, res: Response) => {
  const userId = (req as any).user.sub
  try {
    const delivery = await (prisma as any).cqcStaffDelivery.findFirst({
      where:   { id: req.params.id, user_id: userId, status: 'evaluated' },
      include: { question: { select: { domain: true } } },
    })
    if (!delivery) return err(res, 'NOT_FOUND', 'Question not found or not yet answered', 404)

    const updated = await (prisma as any).cqcStaffDelivery.update({
      where: { id: delivery.id },
      data:  { status: 'pending', attempts: { increment: 1 }, answered_at: null, evaluated_at: null },
    })
    ok(res, { delivery: { ...updated, question: { domain: delivery.question.domain } } })
  } catch (e: any) {
    err(res, 'RETRY_FAILED', e.message, 500)
  }
})

// POST /cqc-questions/deliveries/:id/answer — staff submits free-text answer
cqcQuestionsRouter.post('/deliveries/:id/answer', async (req: Request, res: Response) => {
  const userId   = (req as any).user.sub
  const tenantId = (req as any).user.tenant_id
  const { answer_text } = req.body
  if (!answer_text?.trim()) {
    return err(res, 'MISSING_FIELDS', 'answer_text required', 400)
  }
  try {
    const delivery = await (prisma as any).cqcStaffDelivery.findFirst({
      where:   { id: req.params.id, user_id: userId, status: 'pending' },
      include: { question: true },
    })
    if (!delivery) return err(res, 'NOT_FOUND', 'Delivery not found or already answered', 404)

    // AI evaluation — fetch prompt from DB (falls back to default if not yet saved)
    const evalPromptTemplate = await getPrompt('cqc_answer_evaluation', DEFAULT_ANSWER_EVALUATION_PROMPT)
    const evalPrompt = evalPromptTemplate
      .replace('{{question}}', delivery.rephrased_q)
      .replace('{{model_answer}}', delivery.question.model_answer)
      .replace('{{staff_answer}}', answer_text)

    const evalText = await callClaude('Respond only with valid JSON.', evalPrompt, { maxTokens: 300 })
    let score = 0
    let feedback = 'Thank you for your answer.'
    try {
      const parsed = JSON.parse(evalText.trim())
      score    = Math.max(0, Math.min(100, Number(parsed.score) || 0))
      feedback = parsed.feedback ?? feedback
    } catch { /* use defaults */ }

    const updated = await (prisma as any).cqcStaffDelivery.update({
      where: { id: delivery.id },
      data: {
        answer_text,
        score,
        // Record the first-ever score once, so retries can show genuine improvement.
        ...(delivery.first_score == null ? { first_score: score } : {}),
        feedback,
        status:       'evaluated',
        answered_at:  new Date(),
        evaluated_at: new Date(),
      },
    })

    // Show the feedback in the staff member's language right away (the stored copy
    // stays English so the admin Performance view is consistent).
    let outFeedback = feedback
    let outModelAnswer = delivery.question.model_answer as string | null
    try {
      const u = await (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, comms_always_first_language: true } })
      const lang = u?.comms_always_first_language === false ? 'eng' : ((u?.first_language as string) ?? 'eng')
      if (lang !== 'eng') {
        const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null)
        const langName = languageNameForCode(lang, tenant?.custom_languages)
        const [f, m] = await Promise.all([
          translateText(feedback, lang, langName),
          delivery.question.model_answer ? translateText(delivery.question.model_answer, lang, langName) : Promise.resolve(null),
        ])
        outFeedback = f || feedback
        outModelAnswer = m
      }
    } catch { /* fall back to English */ }

    ok(res, { delivery: updated, score, feedback: outFeedback, model_answer: outModelAnswer })
  } catch (e: any) {
    err(res, 'ANSWER_FAILED', e.message, 500)
  }
})
