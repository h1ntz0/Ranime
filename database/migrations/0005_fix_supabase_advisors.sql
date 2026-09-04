-- 1. Fix Function Search Path & Permissions for Trigger Function
-- Trigger functions don't need to be SECURITY DEFINER. Reset to normal and revoke public execute.
CREATE OR REPLACE FUNCTION public.set_updated_at() 
RETURNS trigger 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM authenticated;

-- 2. Fix Unindexed Foreign Key on user_activity.review_id
CREATE INDEX IF NOT EXISTS "user_activity_review_id_idx" ON "public"."user_activity" ("review_id");

-- 3. Info / Context regarding "RLS Enabled No Policy":
-- Supabase flags "RLS Enabled No Policy" as an info/notice to ensure tables aren't accidentally empty to PostgREST.
-- In our architecture, this is the INTENDED behavior:
-- Fastify backend connects as superuser (postgres role) which bypasses RLS.
-- Having RLS enabled with NO POLICIES means PostgREST (anon / authenticated HTTP API) is 100% BLOCKED (default deny),
-- preventing anyone with the anon key from querying or modifying tables directly.
