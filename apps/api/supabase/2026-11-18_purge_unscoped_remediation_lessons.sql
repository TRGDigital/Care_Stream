-- Follow up lessons used to be cached under "<source>:<question id>" with no tenant or module,
-- so one home could be served another home's lesson. New keys are "<tenant>:<source>:<module or flow>:<question id>".
-- Remove the old unscoped rows so nothing built under the old key can ever be served again.
-- Lessons regenerate on demand under the new key. Safe to run once.
DELETE FROM remediation_lessons
WHERE ref_key LIKE 'training:%' OR ref_key LIKE 'induction:%';
