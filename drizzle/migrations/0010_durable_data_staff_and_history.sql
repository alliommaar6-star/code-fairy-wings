-- Staff membership (who may read/write the business data)
CREATE TABLE IF NOT EXISTS public.staff_members (
  user_id uuid PRIMARY KEY,
  email text,
  role text NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_members TO authenticated;
GRANT ALL ON public.staff_members TO service_role;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_staff(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff_members WHERE user_id = _uid)
$$;

CREATE POLICY "staff read staff list" ON public.staff_members FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- First signed-in account becomes Owner; later accounts must be added by the Owner.
CREATE OR REPLACE FUNCTION public.claim_first_owner()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('staff', false); END IF;
  PERFORM pg_advisory_xact_lock(424242);
  IF NOT EXISTS (SELECT 1 FROM staff_members) THEN
    INSERT INTO staff_members(user_id, email, role)
    VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'owner');
  END IF;
  SELECT role INTO v_role FROM staff_members WHERE user_id = auth.uid();
  RETURN jsonb_build_object('staff', v_role IS NOT NULL, 'role', v_role);
END $$;

CREATE OR REPLACE FUNCTION public.owner_add_staff(p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM staff_members WHERE user_id = auth.uid() AND role = 'owner') THEN
    RETURN jsonb_build_object('error','not_owner');
  END IF;
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(trim(p_email));
  IF v_uid IS NULL THEN RETURN jsonb_build_object('error','no_account'); END IF;
  INSERT INTO staff_members(user_id, email, role) VALUES (v_uid, lower(trim(p_email)), 'staff')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.owner_remove_staff(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM staff_members WHERE user_id = auth.uid() AND role = 'owner') THEN
    RETURN jsonb_build_object('error','not_owner');
  END IF;
  DELETE FROM staff_members WHERE user_id = p_user AND role <> 'owner';
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.claim_first_owner() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owner_add_staff(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owner_remove_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_add_staff(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_remove_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- Every previous version of business data is kept forever (recoverable).
CREATE TABLE IF NOT EXISTS public.app_state_history (
  id bigserial PRIMARY KEY,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz,
  updated_by uuid,
  archived_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_state_history_key_idx ON public.app_state_history(key, archived_at DESC);
GRANT SELECT ON public.app_state_history TO authenticated;
GRANT ALL ON public.app_state_history TO service_role;
ALTER TABLE public.app_state_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read history versions" ON public.app_state_history FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.app_state_keep_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD.value IS DISTINCT FROM NEW.value THEN
    INSERT INTO app_state_history(key, value, updated_at, updated_by)
    VALUES (OLD.key, OLD.value, OLD.updated_at, OLD.updated_by);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS app_state_keep_version ON public.app_state;
CREATE TRIGGER app_state_keep_version BEFORE UPDATE OR DELETE ON public.app_state
  FOR EACH ROW EXECUTE FUNCTION public.app_state_keep_version();

-- Business data: staff only (was: any signed-in account).
DROP POLICY IF EXISTS "staff read app state" ON public.app_state;
DROP POLICY IF EXISTS "staff insert app state" ON public.app_state;
DROP POLICY IF EXISTS "staff update app state" ON public.app_state;
CREATE POLICY "staff read app state" ON public.app_state FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert app state" ON public.app_state FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update app state" ON public.app_state FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));