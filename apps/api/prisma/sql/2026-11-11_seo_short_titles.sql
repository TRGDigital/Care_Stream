-- SEO sweep: shorten page titles that render over 65 characters (Google cuts them off).
-- DB-held titles only: 43 blog posts (blog_posts.meta_title), 17 feature pages (feature_pages.meta_title),
-- 1 collection (collections.meta_title) and 4 training module pages (site_pages.title, which overrides the code title).
-- Policy page titles are built in code (same PR).
-- Keywords are kept; wording is a PROPOSAL until Len approves the before/after table in the PR.
-- Blog meta_title is the part before the site template adds " | CareStreamAI" (so 50 characters at most);
-- feature and collection titles are absolute (brand included, 65 at most). Several blog posts also had a
-- doubled brand ("... | CareStream | CareStreamAI"); the new values carry no brand.
-- Idempotent: one backup row per (table, row, column) the first time, update only when different.
-- Undo: update site_pages p set title = b.old_value from seo_content_backup b where b.tbl = 'site_pages' and b.row_key = p.path and b.col = 'title'; and
--       update blog_posts p set meta_title = b.old_value from seo_content_backup b
--       where b.tbl = 'blog_posts' and b.row_key = p.slug and b.col = 'meta_title';  (same for feature_pages, collections)

create table if not exists seo_content_backup (
  id        bigserial primary key,
  tbl       text not null,
  row_key   text not null,
  col       text not null,
  old_value text,
  saved_at  timestamptz not null default now(),
  unique (tbl, row_key, col)
);
alter table seo_content_backup enable row level security;  -- service role only, no policies

create temporary table _seo_titles (tbl text not null, slug text not null, new_title text not null, primary key (tbl, slug));
insert into _seo_titles (tbl, slug, new_title) values
  ('blog_posts', 'care-home-policies-the-complete-guide', 'Care Home Policies: A Guide to CQC Compliance'),
  ('blog_posts', 'care-policy-version-control', 'Care Policy Version Control: Which Is Current?'),
  ('blog_posts', 'chasing-staff-training-completions', 'Staff Training Completions: End the Reminder Cycle'),
  ('blog_posts', 'cqc-equality-diversity-evidence', 'Equality and Diversity and the CQC: Fair Access'),
  ('blog_posts', 'cqc-evidence-categories-explained', 'The 6 CQC Evidence Categories Explained'),
  ('blog_posts', 'cqc-inspection-day-what-to-expect-and-how-to-be-ready', 'CQC Inspection Day: What to Expect, How to Prepare'),
  ('blog_posts', 'cqc-quality-single-assessment-framework', 'CQC Quality Statements Explained for 2026'),
  ('blog_posts', 'cqc-readiness-report-what-it-is', 'What Is a CQC Readiness Report? A Guide'),
  ('blog_posts', 'cqc-single-assessment-framework-explained', 'The CQC Framework in 2026: What Is Changing'),
  ('blog_posts', 'cqc-terminology-for-care-providers', 'CQC Terminology for Care Providers: A Glossary'),
  ('blog_posts', 'dementia-care-training-in-the-uk', 'Dementia Care Training UK: Why Follow-Up Matters'),
  ('blog_posts', 'face-to-face-training-in-care-what-actually-has-to-be-in-the-room', 'Face to Face Training in Care: What Is Required?'),
  ('blog_posts', 'health-and-safety-awareness-course-for-care-staff', 'Health and Safety Awareness Course for Care Staff'),
  ('blog_posts', 'how-do-you-build-a-training-calendar-for-a-care-home', 'How to Build a Training Calendar for a Care Home'),
  ('blog_posts', 'how-do-you-record-in-person-training-so-it-counts-as-cqc-evidence', 'How to Record In Person Training as CQC Evidence'),
  ('blog_posts', 'how-do-you-run-in-house-training-in-a-care-home', 'Running In House Training in a Busy Care Home'),
  ('blog_posts', 'how-do-you-schedule-care-staff-training-around-a-rota', 'Scheduling Care Staff Training Around a Rota'),
  ('blog_posts', 'how-do-you-use-a-training-matrix-for-safe-staffing-not-just-compliance', 'Using a Training Matrix for Safe Staffing'),
  ('blog_posts', 'how-many-care-workers-in-england-speak-english-as-a-second-language', 'Care Workers and English as a Second Language'),
  ('blog_posts', 'how-often-should-care-policies-be-reviewed', 'How Often Should Care Policies Be Reviewed?'),
  ('blog_posts', 'incident-led-training-in-care', 'Incident-Led Training: Learn From Every Incident'),
  ('blog_posts', 'infection-control-training-for-care-staff-a-guide-for-managers', 'Infection Control Training for Care Staff'),
  ('blog_posts', 'is-an-excel-training-matrix-still-safe-for-a-care-home', 'Is an Excel Training Matrix Still Safe in 2026?'),
  ('blog_posts', 'mandatory-training-for-care-staff-the-full-list-and-how-often-to-refresh', 'Mandatory Training for Care Staff: The Full List'),
  ('blog_posts', 'manual-handling-training-courses-uk-regulations', 'Manual Handling Training Courses: UK Regulations'),
  ('blog_posts', 'mental-health-awareness-training-for-care-staff-a-managers-guide', 'Mental Health Awareness Training for Care Staff'),
  ('blog_posts', 'micro-learning-for-care-staff-what-works-on-a-12-hour-shift', 'Micro Learning for Care Staff on 12 Hour Shifts'),
  ('blog_posts', 'moving-and-handling-training-for-carers-what-must-it-include', 'Moving and Handling Training for Carers'),
  ('blog_posts', 'night-shift-policy-access', 'The 3am Problem: Supporting Care Staff Overnight'),
  ('blog_posts', 'onboarding-international-care-staff-4-week-induction-playbook', 'Onboarding International Care Staff: 4 Week Plan'),
  ('blog_posts', 'overseas-care-workers-policy-access', 'Hidden Risk in Your International Care Workforce'),
  ('blog_posts', 'policies-aligned-to-cqc-quality-statements-a-writers-guide', 'Policies Aligned to CQC Quality Statements'),
  ('blog_posts', 'policies-required-by-cqc-for-a-care-home', 'Policies Required by CQC for a Care Home'),
  ('blog_posts', 'policy-gap-analysis-for-care-homes', 'Policy Gap Analysis for Care Homes: A Guide'),
  ('blog_posts', 'safeguarding-adults-and-children-training', 'Safeguarding Adults and Children Training UK'),
  ('blog_posts', 'the-care-compliance-dashboard-nobody-opens-and-how-to-fix-it', 'Care Compliance Dashboard Staff Actually Open'),
  ('blog_posts', 'the-complete-guide-to-care-certificate-training', 'Care Certificate Training: The 2026 UK Guide'),
  ('blog_posts', 'the-complete-guide-to-care-home-digital-audits', 'Digital Care Home Audits: A Complete Guide'),
  ('blog_posts', 'translating-care-policies', 'Translating Care Policies: Check Understanding'),
  ('blog_posts', 'updating-covid-policies-in-care-homes', 'Updating COVID Policies in Care Homes'),
  ('blog_posts', 'what-compliant-actually-means-for-one-care-staff-member', 'What Staff Compliance Means in Care Homes'),
  ('blog_posts', 'what-should-a-care-home-training-matrix-actually-contain', 'What a Care Home Training Matrix Should Contain'),
  ('blog_posts', 'when-two-policies-disagree-staff-follow-the-wrong-one', 'When Two Care Policies Disagree'),
  ('feature_pages', 'analytics-and-cqc-readiness', 'A Live View of CQC Readiness | CareStreamAI'),
  ('feature_pages', 'audits', 'Care Home Audits Linked to Training | CareStreamAI'),
  ('feature_pages', 'care-manager-policies-hub-approve-see-what-changed', 'Care Manager Policies Hub: Approvals and Changes | CareStreamAI'),
  ('feature_pages', 'cqc-evidence-pack-sign-in-sheets-certificates-files', 'CQC Evidence Pack: Sign-in Sheets, Certificates | CareStreamAI'),
  ('feature_pages', 'cqc-wording-alignment', 'Policies an Inspector Recognises, In Your Voice | CareStreamAI'),
  ('feature_pages', 'cross-policy-consistency-contradictions-between-policies', 'Cross-Policy Consistency Checks | CareStreamAI'),
  ('feature_pages', 'download-a-print-ready-policy-letterhead-sign-off', 'Print-Ready Policy Download with Letterhead | CareStreamAI'),
  ('feature_pages', 'external-approval-by-one-off-link-consultant-trustee', 'External Policy Approval by One-Off Link | CareStreamAI'),
  ('feature_pages', 'legal-basis-source-citation-on-each-recommendation', 'Legal Basis and Source Citations | CareStreamAI'),
  ('feature_pages', 'out-of-date-content-detection-superseded-law-placeholders', 'Out of Date Policy Content Detection | CareStreamAI'),
  ('feature_pages', 'person-centred-rewording-suggestions-in-your-policy-voice', 'Person-Centred Rewording Suggestions | CareStreamAI'),
  ('feature_pages', 'policy-approvals', 'Change, Approve and Prove Policy Updates | CareStreamAI'),
  ('feature_pages', 'policy-gap-detection', 'Find Policy Gaps Before an Inspector Does | CareStreamAI'),
  ('feature_pages', 'regulation-coverage-analysis-reads-inside-your-policies', 'Regulation Coverage Analysis for Your Policies | CareStreamAI'),
  ('feature_pages', 'training', 'Training Built From Your Own Policies | CareStreamAI'),
  ('feature_pages', 'workforce-and-multi-site', 'Workforce Records Across Every Service | CareStreamAI'),
  ('feature_pages', 'workforce-compliance-register-dbs-right-to-work-registration-references', 'Workforce Compliance Register: DBS, Right to Work | CareStreamAI'),
  ('collections', 'medication-training-for-care-staff', 'Medication Training for Care Staff | CareStream'),
  ('site_pages', '/staff-training/safeguarding-adults-and-children', 'Safeguarding Adults and Children Training | CareStreamAI'),
  ('site_pages', '/staff-training/mental-health-awareness', 'Mental Health Awareness Training | CareStreamAI'),
  ('site_pages', '/staff-training/challenging-behaviour-management', 'Challenging Behaviour Management Training | CareStreamAI'),
  ('site_pages', '/staff-training/working-safely-in-people-s-homes', 'Working Safely in People’s Homes Training | CareStreamAI');

-- Backups (only where the value will change).
insert into seo_content_backup (tbl, row_key, col, old_value)
select 'blog_posts', b.slug, 'meta_title', b.meta_title from blog_posts b join _seo_titles t on t.tbl = 'blog_posts' and t.slug = b.slug
  where b.meta_title is distinct from t.new_title
union all
select 'feature_pages', f.slug, 'meta_title', f.meta_title from feature_pages f join _seo_titles t on t.tbl = 'feature_pages' and t.slug = f.slug
  where f.meta_title is distinct from t.new_title
union all
select 'collections', c.slug, 'meta_title', c.meta_title from collections c join _seo_titles t on t.tbl = 'collections' and t.slug = c.slug
  where c.meta_title is distinct from t.new_title
union all
select 'site_pages', p.path, 'title', p.title from site_pages p join _seo_titles t on t.tbl = 'site_pages' and t.slug = p.path
  where p.title is distinct from t.new_title
on conflict (tbl, row_key, col) do nothing;

update blog_posts b set meta_title = t.new_title, updated_at = now()
  from _seo_titles t where t.tbl = 'blog_posts' and t.slug = b.slug and b.meta_title is distinct from t.new_title;
update feature_pages f set meta_title = t.new_title, updated_at = now()
  from _seo_titles t where t.tbl = 'feature_pages' and t.slug = f.slug and f.meta_title is distinct from t.new_title;
update collections c set meta_title = t.new_title, updated_at = now()
  from _seo_titles t where t.tbl = 'collections' and t.slug = c.slug and c.meta_title is distinct from t.new_title;

update site_pages p set title = t.new_title, updated_at = now()
  from _seo_titles t where t.tbl = 'site_pages' and t.slug = p.path and p.title is distinct from t.new_title;

-- Verification. Expect: 65 rows, 0 over the limit (blog 50, feature and collection 65).
select t.tbl, count(*) as rows,
       count(*) filter (where length(x.meta_title) > (case t.tbl when 'blog_posts' then 50 else 65 end)) as over_limit,
       count(*) filter (where x.meta_title = t.new_title) as applied
from _seo_titles t
join (select 'blog_posts' as tbl, slug, meta_title from blog_posts
      union all select 'feature_pages', slug, meta_title from feature_pages
      union all select 'collections', slug, meta_title from collections
      union all select 'site_pages', path, title from site_pages) x on x.tbl = t.tbl and x.slug = t.slug
group by t.tbl order by t.tbl;
