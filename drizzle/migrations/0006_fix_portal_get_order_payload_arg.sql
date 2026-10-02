CREATE OR REPLACE FUNCTION public.portal_get_order(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.portal_orders%ROWTYPE;
  v_payload jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 4 THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;
  IF NOT portal_rate_ok(p_token, 'get', 120, interval '1 minute') THEN
    RETURN jsonb_build_object('error', 'rate_limited');
  END IF;
  SELECT * INTO v_order FROM portal_orders WHERE token = p_token AND token_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'invalid_token'); END IF;

  UPDATE portal_orders SET last_accessed_at = now() WHERE id = v_order.id;

  v_payload := portal_order_payload(v_order);
  v_payload := v_payload || jsonb_build_object(
    'customerOrders', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'orderNo', o.order_no,
        'createdAt', o.created_at,
        'total', o.total,
        'paid', o.paid_amount,
        'remaining', GREATEST(o.total - o.paid_amount, 0),
        'status', o.status,
        'fulfillmentStatus', o.fulfillment_status
      ) ORDER BY o.created_at DESC)
      FROM portal_orders o
      WHERE o.customer_id = v_order.customer_id AND o.id <> v_order.id
    ), '[]'::jsonb)
  );
  RETURN v_payload;
END;
$$;
REVOKE ALL ON FUNCTION public.portal_get_order(text) FROM public;
GRANT EXECUTE ON FUNCTION public.portal_get_order(text) TO anon, authenticated;