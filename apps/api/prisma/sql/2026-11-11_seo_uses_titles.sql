-- SEO sweep: descriptive <title> for the 14 /uses/<slug> user case pages.
-- Today they read "Adhoc Training | CareStreamAI", "Policy Gaps | CareStreamAI" and so on.
-- Idempotent: a backup row is stored once per (table, row, column), and the update only touches
-- rows whose title is not already the new value. Re-running changes nothing.
-- Undo: update user_case_pages u set meta_title = b.old_value
--       from seo_content_backup b where b.tbl = 'user_case_pages' and b.row_key = u.slug and b.col = 'meta_title';

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

create temporary table _uses_titles (slug text primary key, new_title text not null);
insert into _uses_titles (slug, new_title) values
  ('multilingual-staff-hub',   'Care Policies in 60+ Languages for Your Staff | CareStreamAI'),
  ('policy-gaps',              'Find Policy Gaps Before CQC Does | CareStreamAI'),
  ('policy-inconsistencies',   'Fix Care Policies That Contradict Each Other | CareStreamAI'),
  ('cqc-wording-alignment',    'Align Your Care Policies with CQC Wording | CareStreamAI'),
  ('out-of-date-policies',     'Update Out of Date Care Policies Fast | CareStreamAI'),
  ('staff-compliance',         'Live Staff Compliance Tracking for Care Homes | CareStreamAI'),
  ('annual-training',          'Annual Statutory Care Training, Evidenced | CareStreamAI'),
  ('adhoc-training',           'Turn a Care Incident into Staff Training | CareStreamAI'),
  ('face-to-face-training',    'Record Face to Face Care Training Digitally | CareStreamAI'),
  ('training-matrix',          'Live Care Staff Training Matrix | CareStreamAI'),
  ('training-calendar',        'Care Staff Training Calendar and Planner | CareStreamAI'),
  ('cqc-prep-questions',       'CQC Inspection Question Prep for Care Staff | CareStreamAI'),
  ('staff-onboarding',         'Care Staff Onboarding in Week One | CareStreamAI'),
  ('resident-knowledge',       'Share What Your Longest Serving Staff Know | CareStreamAI');

insert into seo_content_backup (tbl, row_key, col, old_value)
select 'user_case_pages', u.slug, 'meta_title', u.meta_title
from user_case_pages u join _uses_titles t on t.slug = u.slug
where u.meta_title is distinct from t.new_title
on conflict (tbl, row_key, col) do nothing;

update user_case_pages u
set meta_title = t.new_title, updated_at = now()
from _uses_titles t
where t.slug = u.slug and u.meta_title is distinct from t.new_title;

-- Verification: expect 14 rows, every length <= 65, none left with the old two word title.
select slug, meta_title, length(meta_title) as len from user_case_pages
where slug in (select slug from _uses_titles) order by slug;
