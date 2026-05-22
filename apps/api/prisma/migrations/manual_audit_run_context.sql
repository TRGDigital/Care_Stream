-- Add shift and room_number context fields to audit_runs
-- shift: 'day' | 'night' for shift-based daily templates (e.g. Fire Marshall Checklist)
-- room_number: free text room identifier for room-by-room templates (e.g. Resident Bedrooms)

ALTER TABLE audit_runs ADD COLUMN IF NOT EXISTS shift TEXT;
ALTER TABLE audit_runs ADD COLUMN IF NOT EXISTS room_number TEXT;
