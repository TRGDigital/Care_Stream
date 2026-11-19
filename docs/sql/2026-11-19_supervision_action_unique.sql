-- One action per supervision per enrolment: a double click on "also add to their next supervision" cannot add it twice.
create unique index if not exists supervision_actions_sup_enr_uq on supervision_actions (supervision_id, enrollment_id) where enrollment_id is not null;
