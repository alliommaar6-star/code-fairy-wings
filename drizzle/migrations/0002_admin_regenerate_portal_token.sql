CREATE OR REPLACE FUNCTION public.admin_regenerate_token(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_token text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  UPDATE portal_orders
    SET token = encode(gen_random_bytes(18), 'hex'), token_active = true, updated_at = now()
    WHERE id = p_order_id RETURNING token INTO v_token;
  IF v_token IS NULL THEN RETURN jsonb_build_object('error','not_found'); END IF;
  INSERT INTO order_status_history(order_id, status, note)
    VALUES (p_order_id, 'token_regenerated', NULL);
  RETURN jsonb_build_object('token', v_token);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_regenerate_token(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_regenerate_token(uuid) TO authenticated;