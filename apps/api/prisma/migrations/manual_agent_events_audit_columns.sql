-- Applied to Supabase project shjpatdojoigcgmaewbg on 2026-06-03.
-- Enrich agent_events so confirmed, agent-initiated MUTATIONS are auditable.

ALTER TABLE public.agent_events ADD COLUMN IF NOT EXISTS tenant_id  text;
ALTER TABLE public.agent_events ADD COLUMN IF NOT EXISTS user_id    text;
ALTER TABLE public.agent_events ADD COLUMN IF NOT EXISTS summary    text;
ALTER TABLE public.agent_events ADD COLUMN IF NOT EXISTS mutation   boolean NOT NULL DEFAULT false;
ALTER TABLE public.agent_events ADD COLUMN IF NOT EXISTS confirmed  boolean;

CREATE INDEX IF NOT EXISTS agent_events_mutation_idx ON public.agent_events (mutation) WHERE mutation = true;
