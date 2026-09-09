-- Watch more than regulations.
--
-- Three blind spots, counted rather than guessed at:
--
--   * the 34 CQC quality statements had NO source column at all, so a revision to the
--     framework that judges every inspection would have gone unnoticed
--   * 29 policy lint signals already carried source URLs that nothing ever read — and a
--     renamed body is exactly what those signals exist to catch
--   * two regulation URLs were dead (one 404, one unreachable domain), including the Oliver
--     McGowan Code of Practice, which was that regulation's ONLY source
--
-- reference_key is not unique across the three, so the check table is keyed by subject as
-- well. Existing rows default to 'regulation', which is what they all are.

alter table quality_statements add column if not exists source_urls text[] not null default '{}';

alter table regulation_source_checks add column if not exists subject_kind text not null default 'regulation';
alter table regulation_changes       add column if not exists subject_kind text not null default 'regulation';

alter table regulation_source_checks drop constraint if exists regulation_source_checks_reference_key_url_key;
drop index if exists regulation_source_checks_reference_key_url_key;
create unique index if not exists regulation_source_checks_subject_url_key
  on regulation_source_checks (subject_kind, reference_key, url);

create index if not exists regulation_changes_kind_idx on regulation_changes (subject_kind, detected_at desc);

-- Seed the quality statements with the page CQC actually publishes the framework on. They
-- share one URL; the monitor fetches a URL once per run however many subjects cite it, so
-- this is one fetch and one recorded change, not 34.
update quality_statements
set source_urls = array['https://www.cqc.org.uk/guidance-regulation/providers/assessment/assessment-framework']
where is_active = true and coalesce(array_length(source_urls, 1), 0) = 0;

-- The dead regulation sources, replaced and removed respectively.
update external_regulations
set source_urls = array['https://www.gov.uk/government/publications/oliver-mcgowan-code-of-practice']
where reference_key = 'oliver-mcgowan-mandatory-training';

update external_regulations
set source_urls = array_remove(source_urls, 'https://transform.england.nhs.uk/information-governance/guidance/freedom-to-speak-up/')
where reference_key = 'freedom-to-speak-up';
