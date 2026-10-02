CREATE OR REPLACE FUNCTION public.portal_publish_order(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_no text := trim(coalesce(p_payload->>'order_no', ''));
  v_phone text := trim(coalesce(p_payload->>'phone', ''));
  v_customer uuid;
  v_order public.portal_orders%ROWTYPE;
  v_item jsonb;
  v_existing boolean;
BEGIN
  IF v_order_no = '' THEN
    RETURN jsonb_build_object('error', 'missing_order_no');
  END IF;
  IF v_phone = '' THEN
    v_phone := 'no-phone-' || v_order_no;
  END IF;

  IF NOT portal_rate_ok(v_order_no, 'publish', 30, interval '1 minute') THEN
    RETURN jsonb_build_object('error', 'rate_limited');
  END IF;

  INSERT INTO public.portal_customers (phone, name, district)
  VALUES (v_phone, coalesce(p_payload->>'name', ''), coalesce(p_payload->>'district', ''))
  ON CONFLICT (phone) DO UPDATE
    SET name = CASE WHEN excluded.name <> '' THEN excluded.name ELSE public.portal_customers.name END,
        district = CASE WHEN excluded.district <> '' THEN excluded.district ELSE public.portal_customers.district END
  RETURNING id INTO v_customer;

  SELECT * INTO v_order FROM public.portal_orders WHERE order_no = v_order_no;
  v_existing := FOUND;

  IF v_existing AND v_order.status = 'completed' THEN
    RETURN jsonb_build_object('token', v_order.token, 'order_no', v_order.order_no, 'locked', true);
  END IF;

  INSERT INTO public.portal_orders (
    order_no, customer_id, subtotal, discount, delivery_fee, delivery_fee_payer,
    advance_amount, delivery_address, driver_name, driver_phone
  ) VALUES (
    v_order_no,
    v_customer,
    coalesce((p_payload->>'subtotal')::numeric, 0),
    coalesce((p_payload->>'discount')::numeric, 0),
    coalesce((p_payload->>'delivery_fee')::numeric, 0),
    CASE WHEN p_payload->>'delivery_fee_payer' = 'Business' THEN 'Business' ELSE 'Customer' END,
    coalesce((p_payload->>'advance_amount')::numeric, 0),
    coalesce(p_payload->>'delivery_address', ''),
    nullif(p_payload->>'driver_name', ''),
    nullif(p_payload->>'driver_phone', '')
  )
  ON CONFLICT (order_no) DO UPDATE SET
    customer_id = excluded.customer_id,
    subtotal = excluded.subtotal,
    discount = excluded.discount,
    delivery_fee = excluded.delivery_fee,
    delivery_fee_payer = excluded.delivery_fee_payer,
    advance_amount = excluded.advance_amount,
    delivery_address = excluded.delivery_address,
    driver_name = coalesce(excluded.driver_name, public.portal_orders.driver_name),
    driver_phone = coalesce(excluded.driver_phone, public.portal_orders.driver_phone),
    updated_at = now()
  RETURNING * INTO v_order;

  DELETE FROM public.portal_order_items WHERE order_id = v_order.id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p_payload->'items', '[]'::jsonb))
  LOOP
    INSERT INTO public.portal_order_items (
      order_id, product_name, image_url, quantity, unit_price, discount, line_total
    ) VALUES (
      v_order.id,
      coalesce(v_item->>'product_name', ''),
      nullif(v_item->>'image_url', ''),
      coalesce((v_item->>'quantity')::numeric, 1),
      coalesce((v_item->>'unit_price')::numeric, 0),
      coalesce((v_item->>'discount')::numeric, 0),
      coalesce((v_item->>'line_total')::numeric, 0)
    );
  END LOOP;

  IF NOT v_existing THEN
    INSERT INTO public.order_status_history (order_id, status, note)
    VALUES (v_order.id, v_order.fulfillment_status, 'Dalab la sameeyay');
  END IF;

  RETURN jsonb_build_object('token', v_order.token, 'order_no', v_order.order_no, 'locked', false);
END;
$$;

REVOKE ALL ON FUNCTION public.portal_publish_order(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.portal_publish_order(jsonb) TO anon, authenticated;