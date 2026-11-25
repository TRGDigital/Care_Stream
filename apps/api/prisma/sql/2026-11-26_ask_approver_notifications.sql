-- Approver notifications for Ask CareStream documents. ONE new column only; nothing existing is changed. Safe to run more than once.
-- ask_settings.approver_emails: whether the notice that a letter, newsletter or report is waiting for approval (and the decision notice to the author) is ALSO emailed.
--   The hub notification is always sent; the email is on by default. Until this is run the notices still go out (hub and email), and the switch in Settings says it is not available yet.
-- The times a document was submitted, announced and reminded are kept inside the document's own data (data.approval), so there is no new table.
alter table public.ask_settings add column if not exists approver_emails boolean not null default true;

-- OPTIONAL, run once: the ONE reminder for anything that has waited 3 days for approval, checked once a day at 08:30 UTC.
-- select cron.schedule('cs-ask-approval-reminders', '30 8 * * *', $$select public.carestream_cron('ask-approval-reminders')$$);
