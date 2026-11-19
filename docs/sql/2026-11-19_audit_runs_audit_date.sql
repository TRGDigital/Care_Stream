-- The day an audit was actually carried out. Lets a user back-date an audit they missed. Null = the day it was started.
-- created_at still records when it was entered, so the record shows both. Additive and nullable: safe to run before the deploy.
alter table audit_runs add column if not exists audit_date date;
