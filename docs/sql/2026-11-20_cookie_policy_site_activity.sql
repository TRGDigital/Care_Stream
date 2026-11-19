-- Cookie policy: disclose the site's own activity recording (components/marketing/site-tracker.tsx). Apply when the feature is live.
-- Adds one paragraph straight after the existing "If you accept cookies, we also keep a random visitor identifier..." paragraph. Backs up the row first.
create table if not exists backup_site_pages_20261119 as select * from site_pages where false;
insert into backup_site_pages_20261119 select * from site_pages where path = '/cookies' and not exists (select 1 from backup_site_pages_20261119 b where b.path = '/cookies');
update site_pages set
  content = regexp_replace(
    content,
    '(<p>[^<]*<strong>If you accept cookies</strong>, we also keep a random visitor identifier.*?</p>)',
    E'\\1<p><strong>If you accept cookies</strong>, we also record how you use our website in our own system: which pages you view, how long you are actively on each one, how far you scroll, which buttons and links you click, and whether you start a sign up or demo form. If you type into an email field we note only that you did, never what you typed. We do not record your IP address, your name or your email address in this record. It is linked only to a random identifier kept in your browser''s local storage (named cs_vid), so we can see when someone comes back. We use it to understand which pages help visitors and which do not. If you decline, nothing is recorded, and if you withdraw consent the identifier is removed from your browser.</p>',
    ''
  ),
  updated_at = now()
where path = '/cookies' and content ~ 'If you accept cookies</strong>, we also keep a random visitor identifier' and content not like '%named cs_vid%';
