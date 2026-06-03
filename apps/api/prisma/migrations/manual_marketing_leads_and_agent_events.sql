-- Applied to Supabase project shjpatdojoigcgmaewbg on 2026-06-03.
-- Platform-level tables (no tenant_id), accessed only via the API (postgres role,
-- which bypasses RLS). RLS enabled with no anon/authenticated policies so the
-- PostgREST/anon path is denied by default — defence in depth.

CREATE TABLE IF NOT EXISTS public.marketing_leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text NOT NULL,                       -- contact | demo
  name         text NOT NULL,
  email        text NOT NULL,
  organisation text,
  role         text,
  phone        text,
  homes        text,
  subject      text,
  message      text,
  source       text NOT NULL DEFAULT 'web',         -- web | agent
  user_agent   text,
  status       text NOT NULL DEFAULT 'new',         -- new | contacted | archived
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketing_leads_created_at_idx ON public.marketing_leads (created_at DESC);
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.agent_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name   text NOT NULL,
  source      text NOT NULL DEFAULT 'webmcp',       -- webmcp | mcp-server
  path        text,
  user_agent  text,
  status      text NOT NULL DEFAULT 'ok',           -- ok | error
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_events_created_at_idx ON public.agent_events (created_at DESC);
CREATE INDEX IF NOT EXISTS agent_events_tool_name_idx ON public.agent_events (tool_name);
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;
