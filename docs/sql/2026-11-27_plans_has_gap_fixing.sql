-- Starter gets the gap analysis (every Free feature, in full). Adopting fixes, approvals,
-- publishing and training/onboarding from a gap stay on Professional and Enterprise.
-- ORDER MATTERS: set has_gap_fixing first, from the plans that have gap detection today.
alter table plans add column if not exists has_gap_fixing boolean not null default false;
update plans set has_gap_fixing = true where has_gap_detection = true;
update plans set has_gap_detection = true, has_gap_fixing = false where name = 'Starter';
-- check: Starter true/false, Professional true/true, Enterprise true/true
select name, has_gap_detection, has_gap_fixing from plans order by price_monthly_pence;
