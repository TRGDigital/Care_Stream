-- Supervisions and appraisals are on Starter, Professional and Enterprise. They used to share one flag (has_workforce_compliance, Enterprise
-- only) with the workforce register (DBS, right to work, references), which stays Enterprise. A separate flag lets the two differ.
-- Additive. Safe to run before the deploy.
alter table plans add column if not exists has_supervisions boolean not null default false;
update plans set has_supervisions = true where name in ('Starter', 'Professional', 'Enterprise');
