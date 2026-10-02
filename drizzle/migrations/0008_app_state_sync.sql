CREATE TABLE public.app_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.app_state TO authenticated;
GRANT ALL ON public.app_state TO service_role;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read app state" ON public.app_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff insert app state" ON public.app_state FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff update app state" ON public.app_state FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_state;