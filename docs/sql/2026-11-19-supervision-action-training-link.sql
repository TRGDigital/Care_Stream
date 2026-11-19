-- Link a supervision action to the training it asked for, so the action closes itself when the course is completed.
alter table supervision_actions add column if not exists module_id text;
alter table supervision_actions add column if not exists enrollment_id text;
alter table supervision_actions add column if not exists linked_by text;   -- 'supervision_form' (agreed action) or 'training_assign' (button on the assign screen)
create index if not exists supervision_actions_enrollment_idx on supervision_actions (enrollment_id) where enrollment_id is not null;
