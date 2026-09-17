-- Per-tenant AI token allowance, sized at 12% of each plan's subscription value.
--
-- Starter £85 -> £10.20 -> ~6M tokens
-- Professional £230 -> £27.60 -> ~18M tokens
-- Enterprise £385 -> £46.20 -> ~30M tokens
--
-- at the reference rate of $1.98 per million billed tokens (see lib/ai-tokens.ts).
-- NULL = unlimited, which is what the internal sandbox plan keeps.

ALTER TABLE plans ADD COLUMN IF NOT EXISTS monthly_ai_token_limit INT;

UPDATE plans SET monthly_ai_token_limit =  6000000 WHERE name = 'Starter';
UPDATE plans SET monthly_ai_token_limit = 18000000 WHERE name = 'Professional';
UPDATE plans SET monthly_ai_token_limit = 30000000 WHERE name = 'Enterprise';

-- The per-action credit meter is superseded by the token allowance. Cleared so a
-- tenant is not gated twice; the enforcement code path stays in place so this is
-- reversible by putting the numbers back.
UPDATE plans SET monthly_ai_credit_limit = NULL;
