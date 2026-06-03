-- Applied to Supabase project shjpatdojoigcgmaewbg on 2026-06-03.
-- Human-friendly, immutable account number per tenant (CS-1001, CS-1002, …),
-- auto-assigned from a sequence so any insert path gets one.

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS account_number text;
CREATE SEQUENCE IF NOT EXISTS tenant_account_seq START WITH 1001;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM public.tenants WHERE account_number IS NULL
)
UPDATE public.tenants t SET account_number = 'CS-' || (1000 + o.rn)::text
FROM ordered o WHERE t.id = o.id;

SELECT setval('tenant_account_seq',
  (SELECT COALESCE(max(substring(account_number from 4)::int), 1000) FROM public.tenants));

ALTER TABLE public.tenants ALTER COLUMN account_number SET DEFAULT 'CS-' || nextval('tenant_account_seq')::text;
ALTER TABLE public.tenants ALTER COLUMN account_number SET NOT NULL;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_account_number_key UNIQUE (account_number);
