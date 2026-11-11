-- SEO sweep: broken link in blog post "infection-control-training-for-care-staff-a-guide-for-managers".
-- The body has <a href="england.nhs.uk/national-infection-prevention-and-control-manual-nipcm-for-england/">,
-- a relative URL with no scheme or host, which resolves to /blog/england.nhs.uk/... and 404s.
-- Idempotent: the full original content is stored once in seo_content_backup, and the replace only
-- changes a body that still contains the broken href (a second run finds nothing to replace).
-- Undo: update blog_posts p set content = b.old_value
--       from seo_content_backup b
--       where b.tbl = 'blog_posts' and b.row_key = p.slug and b.col = 'content'
--         and p.slug = 'infection-control-training-for-care-staff-a-guide-for-managers';

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

insert into seo_content_backup (tbl, row_key, col, old_value)
select 'blog_posts', slug, 'content', content
from blog_posts
where slug = 'infection-control-training-for-care-staff-a-guide-for-managers'
  and content like '%href="england.nhs.uk/%'
on conflict (tbl, row_key, col) do nothing;

update blog_posts
set content = replace(content,
      'href="england.nhs.uk/national-infection-prevention-and-control-manual-nipcm-for-england/"',
      'href="https://www.england.nhs.uk/national-infection-prevention-and-control-manual-nipcm-for-england/"'),
    updated_at = now()
where slug = 'infection-control-training-for-care-staff-a-guide-for-managers'
  and content like '%href="england.nhs.uk/%';

-- Verification. Expect: broken_hrefs = 0, fixed_hrefs = 1, backed_up = 1.
select
  (length(content) - length(replace(content, 'href="england.nhs.uk/', ''))) / length('href="england.nhs.uk/') as broken_hrefs,
  (length(content) - length(replace(content, 'href="https://www.england.nhs.uk/national-infection-prevention-and-control-manual-nipcm-for-england/"', '')))
    / length('href="https://www.england.nhs.uk/national-infection-prevention-and-control-manual-nipcm-for-england/"') as fixed_hrefs,
  (select count(*) from seo_content_backup where tbl = 'blog_posts' and row_key = slug and col = 'content') as backed_up
from blog_posts
where slug = 'infection-control-training-for-care-staff-a-guide-for-managers';
