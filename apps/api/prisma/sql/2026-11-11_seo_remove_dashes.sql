-- SEO sweep: remove em and en dashes from the copy that is shown on public pages (house rule: no dashes in copy).
-- Scope is ONLY the DB columns the 351 public pages were found to render dashes from:
--   external_regulations.summary (all rows), .care_home_context and .practical_meaning (the one row each shown on a policy page)
--   blog_posts.content, excerpt, faqs, sources (published posts)
--   training_modules.standards (all rows), .description and .learning_content (the one module shown on public pages)
--   site_pages.title for the COSHH training page
-- NOT touched: the legal documents in site_pages.content (privacy, cookies, DPA, client services agreement; they use a
-- dash as a bullet marker and are contracts, so Len/legal decides), verbatim customer reviews (none contain dashes in the DB),
-- tenant data (policies, policy_documents, etc.), and internal tables (seeds, prompts, caches).
--
-- Rules (applied in this order):
--   "</strong> - text"            -> "</strong>: text"        (bold lead-in on a list item)
--   "12 - 14", "16(1) - (2)"      -> "12 to 14", "16(1) to (2)"
--   ", - text", " - " (spaced)    -> ", "                      (prose)
--   "word-word" with an en dash   -> hyphen
--   any remaining em / en dash    -> ", "
--   labels (blog sources, training standards): first spaced dash -> ": "  ("CQC - Regulation 17" -> "CQC: Regulation 17")
--   the file name pattern "Policy Name - V1.0 - 2026-01-15" -> hyphens (it is a literal naming convention)
-- (the dash characters above are shown as hyphens here so this file stays dash free)
--
-- Idempotent: one backup row per (table, row, column) the first time (seo_content_backup), updates only touch values that
-- still contain a dash, so a second run changes nothing. Undo (per column), for example:
--   update blog_posts p set content = b.old_value from seo_content_backup b
--   where b.tbl = 'blog_posts' and b.col = 'content' and b.row_key = p.slug;      (jsonb columns: set col = b.old_value::jsonb)

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

create function pg_temp.undash_prose(t text) returns text language sql immutable as $fn$
  select regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    replace(t, 'Policy Name ' || chr(8211) || ' V1.0 ' || chr(8211) || ' 2026-01-15', 'Policy Name - V1.0 - 2026-01-15'),
    '(</strong>|</b>)\s*[' || chr(8212) || chr(8211) || ']\s+', '\1: ', 'g'),
    '([0-9)])\s*' || chr(8211) || '\s*([0-9(])', '\1 to \2', 'g'),
    ',\s*[' || chr(8212) || chr(8211) || ']\s+', ', ', 'g'),
    '\s+[' || chr(8212) || chr(8211) || ']\s+', ', ', 'g'),
    '(\w)' || chr(8211) || '(\w)', '\1-\2', 'g'),
    '\s*' || chr(8212) || '\s*', ', ', 'g')
$fn$;
create function pg_temp.undash_final(t text) returns text language sql immutable as $fn$
  select regexp_replace(pg_temp.undash_prose(t), '\s*' || chr(8211) || '\s*', ', ', 'g')
$fn$;
create function pg_temp.undash_label(t text) returns text language sql immutable as $fn$
  select pg_temp.undash_final(regexp_replace(
    regexp_replace(t, '([0-9)])\s*' || chr(8211) || '\s*([0-9(])', '\1 to \2', 'g'),
    '("label": "[^"' || chr(8211) || chr(8212) || ']*)\s+[' || chr(8212) || chr(8211) || ']\s+', '\1: ', 'g'))
$fn$;
-- (undash_label: inside each "label" value the first spaced dash becomes a colon, the rest follow the prose rules)

-- What is in scope and still has a dash (rows to change).
create temporary table _dash_targets as
select 'external_regulations' as tbl, id::text as row_key, 'summary' as col, summary as val, 'prose' as kind from external_regulations where summary ~ '[\u2013\u2014]'
union all select 'external_regulations', id::text, 'care_home_context', care_home_context, 'prose' from external_regulations
  where id::text = '7e55db6d-f471-471f-909c-6d22f7022dcc' and care_home_context ~ '[\u2013\u2014]'
union all select 'external_regulations', id::text, 'practical_meaning', practical_meaning, 'prose' from external_regulations
  where id::text = 'ec97af76-0b4c-41f8-a742-ccd7ab5bf01b' and practical_meaning ~ '[\u2013\u2014]'
union all select 'blog_posts', slug, 'content', content, 'prose' from blog_posts where status = 'published' and content ~ '[\u2013\u2014]'
union all select 'blog_posts', slug, 'excerpt', excerpt, 'prose' from blog_posts where status = 'published' and excerpt ~ '[\u2013\u2014]'
union all select 'blog_posts', slug, 'faqs', faqs::text, 'prose' from blog_posts where status = 'published' and faqs::text ~ '[\u2013\u2014]'
union all select 'blog_posts', slug, 'sources', sources::text, 'label' from blog_posts where status = 'published' and sources::text ~ '[\u2013\u2014]'
union all select 'training_modules', id::text, 'standards', standards::text, 'label' from training_modules where standards::text ~ '[\u2013\u2014]'
union all select 'training_modules', id::text, 'description', description, 'prose' from training_modules
  where id::text = 'e95ace90-ace1-4e58-b5ea-c98af7b341bc' and description ~ '[\u2013\u2014]'
union all select 'training_modules', id::text, 'learning_content', learning_content::text, 'prose' from training_modules
  where id::text = 'e95ace90-ace1-4e58-b5ea-c98af7b341bc' and learning_content::text ~ '[\u2013\u2014]'
union all select 'site_pages', path, 'title', title, 'prose' from site_pages
  where path = '/staff-training/coshh-control-of-substances-hazardous-to-health' and title ~ '[\u2013\u2014]';

insert into seo_content_backup (tbl, row_key, col, old_value)
select tbl, row_key, col, val from _dash_targets
on conflict (tbl, row_key, col) do nothing;

update external_regulations r set summary = pg_temp.undash_final(r.summary), updated_at = now()
  where r.summary ~ '[\u2013\u2014]';
update external_regulations r set care_home_context = pg_temp.undash_final(r.care_home_context), updated_at = now()
  where r.id::text = '7e55db6d-f471-471f-909c-6d22f7022dcc' and r.care_home_context ~ '[\u2013\u2014]';
update external_regulations r set practical_meaning = pg_temp.undash_final(r.practical_meaning), updated_at = now()
  where r.id::text = 'ec97af76-0b4c-41f8-a742-ccd7ab5bf01b' and r.practical_meaning ~ '[\u2013\u2014]';

update blog_posts b set content = pg_temp.undash_final(b.content), updated_at = now()
  where b.status = 'published' and b.content ~ '[\u2013\u2014]';
update blog_posts b set excerpt = pg_temp.undash_final(b.excerpt), updated_at = now()
  where b.status = 'published' and b.excerpt ~ '[\u2013\u2014]';
update blog_posts b set faqs = pg_temp.undash_final(b.faqs::text)::jsonb, updated_at = now()
  where b.status = 'published' and b.faqs::text ~ '[\u2013\u2014]';
update blog_posts b set sources = pg_temp.undash_label(b.sources::text)::jsonb, updated_at = now()
  where b.status = 'published' and b.sources::text ~ '[\u2013\u2014]';

update training_modules m set standards = pg_temp.undash_label(m.standards::text)::jsonb, updated_at = now()
  where m.standards::text ~ '[\u2013\u2014]';
update training_modules m set description = pg_temp.undash_final(m.description), updated_at = now()
  where m.id::text = 'e95ace90-ace1-4e58-b5ea-c98af7b341bc' and m.description ~ '[\u2013\u2014]';
update training_modules m set learning_content = pg_temp.undash_final(m.learning_content::text)::jsonb, updated_at = now()
  where m.id::text = 'e95ace90-ace1-4e58-b5ea-c98af7b341bc' and m.learning_content::text ~ '[\u2013\u2014]';

update site_pages p set title = pg_temp.undash_final(regexp_replace(p.title, '\s+[\u2013\u2014]\s+', ': ')), updated_at = now()
  where p.path = '/staff-training/coshh-control-of-substances-hazardous-to-health' and p.title ~ '[\u2013\u2014]';

-- Verification. Expect dashes_left = 0 on every row; rows_backed_up = rows that had a dash.
select t.tbl, t.col, count(*) as rows_backed_up,
       count(*) filter (where cur.val ~ '[\u2013\u2014]') as dashes_left
from _dash_targets t
left join lateral (
  select case t.tbl || '.' || t.col
    when 'external_regulations.summary' then (select summary from external_regulations where id::text = t.row_key)
    when 'external_regulations.care_home_context' then (select care_home_context from external_regulations where id::text = t.row_key)
    when 'external_regulations.practical_meaning' then (select practical_meaning from external_regulations where id::text = t.row_key)
    when 'blog_posts.content' then (select content from blog_posts where slug = t.row_key)
    when 'blog_posts.excerpt' then (select excerpt from blog_posts where slug = t.row_key)
    when 'blog_posts.faqs' then (select faqs::text from blog_posts where slug = t.row_key)
    when 'blog_posts.sources' then (select sources::text from blog_posts where slug = t.row_key)
    when 'training_modules.standards' then (select standards::text from training_modules where id::text = t.row_key)
    when 'training_modules.description' then (select description from training_modules where id::text = t.row_key)
    when 'training_modules.learning_content' then (select learning_content::text from training_modules where id::text = t.row_key)
    when 'site_pages.title' then (select title from site_pages where path = t.row_key)
  end as val) cur on true
group by t.tbl, t.col order by t.tbl, t.col;
