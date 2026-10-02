CREATE OR REPLACE FUNCTION public.portal_rate_ok(p_token text, p_action text, p_limit int, p_window interval)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_hash text; v_count int;
BEGIN
  v_hash := md5(p_action || ':' || p_token);
  SELECT count(*) INTO v_count FROM portal_access_log
   WHERE token_hash = v_hash AND action = p_action AND created_at > now() - p_window;
  INSERT INTO portal_access_log(token_hash, action) VALUES (v_hash, p_action);
  RETURN v_count < p_limit;
END;
$$;