-- Mark an EXISTING onboarding flow as suitable for agency workers.
--
-- Replaces the local_induction flow kind added a few hours earlier. That approach was wrong in
-- practice: it forced a home to build a second, parallel set of flows, when they already have
-- Care Assistant, Senior Care Assistant and Nurse inductions that cover the ground. A tick on
-- the flow they already maintain is one action; rebuilding it is an afternoon and then two
-- copies to keep in step for ever.
--
-- It also puts the judgement in the right place. Whoever wrote the Care Assistant induction
-- knows whether it suits somebody here for four nights. A flow kind asked the system to decide
-- that from a label.
--
-- Agency workers are then enrolled in flows that are BOTH ticked and matched to their job
-- role, so a nurse gets the nurse induction rather than everything that happens to be ticked.

alter table onboarding_flows add column if not exists agency_suitable boolean not null default false;

-- Anything already created as a local induction becomes an ordinary flow that is ticked, so
-- nothing built in the meantime is stranded on a kind that no longer exists.
update onboarding_flows
set flow_kind = 'primary', agency_suitable = true
where flow_kind = 'local_induction';

-- The enrolment query asks "which flows are ticked, for this tenant". That is this index.
create index if not exists onboarding_flows_agency_idx on onboarding_flows (tenant_id, agency_suitable)
  where agency_suitable = true;

comment on column onboarding_flows.agency_suitable is
  'Ticked flows are offered to agency workers, matched to their job role as usual.';
