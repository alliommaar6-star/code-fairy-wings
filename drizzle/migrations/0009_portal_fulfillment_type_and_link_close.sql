ALTER TABLE public.portal_orders
  ADD COLUMN IF NOT EXISTS fulfillment_type text NOT NULL DEFAULT 'Delivery',
  ADD COLUMN IF NOT EXISTS cargo_company text,
  ADD COLUMN IF NOT EXISTS cargo_region text;

CREATE OR REPLACE FUNCTION public.portal_order_payload(p_order portal_orders)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'orderNo', p_order.order_no,
    'createdAt', p_order.created_at,
    'status', p_order.status,
    'fulfillmentStatus', p_order.fulfillment_status,
    'fulfillmentType', p_order.fulfillment_type,
    'cargo', CASE WHEN p_order.fulfillment_type = 'Cargo'
      THEN jsonb_build_object('company', coalesce(p_order.cargo_company,''), 'region', coalesce(p_order.cargo_region,'')) ELSE NULL END,
    'customer', jsonb_build_object('name', c.name, 'phone', c.phone, 'district', c.district),
    'deliveryAddress', p_order.delivery_address,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', i.product_name, 'imageUrl', i.image_url, 'quantity', i.quantity,
        'unitPrice', i.unit_price, 'discount', i.discount, 'total', i.line_total)
        ORDER BY i.product_name)
      FROM portal_order_items i WHERE i.order_id = p_order.id), '[]'::jsonb),
    'subtotal', p_order.subtotal,
    'discount', p_order.discount,
    'deliveryFee', p_order.delivery_fee,
    'deliveryFeePayer', p_order.delivery_fee_payer,
    'total', p_order.total,
    'advanceAmount', p_order.advance_amount,
    'paidAmount', p_order.paid_amount,
    'remaining', GREATEST(p_order.total - p_order.paid_amount, 0),
    'advanceDue', portal_amount_due(p_order, 'advance'),
    'fullDue', portal_amount_due(p_order, 'full'),
    'driver', CASE WHEN p_order.driver_name IS NULL OR p_order.fulfillment_type = 'Cargo' THEN NULL
      ELSE jsonb_build_object('name', p_order.driver_name, 'phone', p_order.driver_phone) END,
    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id, 'amount', a.amount, 'method', a.method,
        'status', a.status, 'createdAt', a.created_at)
        ORDER BY a.created_at DESC)
      FROM payment_attempts a WHERE a.order_id = p_order.id AND a.status <> 'pending'), '[]'::jsonb),
    'history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('status', h.status, 'at', h.created_at) ORDER BY h.created_at)
      FROM order_status_history h WHERE h.order_id = p_order.id), '[]'::jsonb)
  )
  FROM portal_customers c WHERE c.id = p_order.customer_id;
$function$;

-- Temporary link: closes for good once goods are delivered / order completed
CREATE OR REPLACE FUNCTION public.portal_get_order(p_token text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_order public.portal_orders%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 4 THEN RETURN jsonb_build_object('error','invalid_token'); END IF;
  IF NOT portal_rate_ok(p_token, 'get', 120, interval '1 minute') THEN
    RETURN jsonb_build_object('error','rate_limited');
  END IF;
  SELECT * INTO v_order FROM portal_orders WHERE token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','invalid_token'); END IF;
  IF NOT v_order.token_active OR v_order.fulfillment_status IN ('DELIVERED','COMPLETED') OR v_order.status = 'completed' THEN
    RETURN jsonb_build_object('error','link_closed', 'orderNo', v_order.order_no);
  END IF;
  UPDATE portal_orders SET last_accessed_at = now() WHERE id = v_order.id;
  RETURN portal_order_payload(v_order);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_order_status(p_order_id uuid, p_status text, p_driver_name text DEFAULT NULL::text, p_driver_phone text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_order portal_orders;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  UPDATE portal_orders
    SET fulfillment_status = p_status,
        driver_name = COALESCE(p_driver_name, driver_name),
        driver_phone = COALESCE(p_driver_phone, driver_phone),
        token_active = CASE WHEN p_status IN ('DELIVERED','COMPLETED') THEN false ELSE token_active END,
        updated_at = now()
    WHERE id = p_order_id RETURNING * INTO v_order;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  INSERT INTO order_status_history(order_id, status, note) VALUES (v_order.id, p_status, p_driver_name);
  RETURN jsonb_build_object('status', v_order.fulfillment_status);
END;
$function$;

CREATE OR REPLACE FUNCTION public.portal_publish_order(p_payload jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_order_no text := trim(coalesce(p_payload->>'order_no', ''));
  v_phone text := trim(coalesce(p_payload->>'phone', ''));
  v_ftype text := CASE WHEN p_payload->>'fulfillment_type' IN ('Delivery','Cargo','Pickup') THEN p_payload->>'fulfillment_type' ELSE 'Delivery' END;
  v_customer uuid;
  v_order public.portal_orders%ROWTYPE;
  v_item jsonb;
  v_existing boolean;
BEGIN
  IF v_order_no = '' THEN RETURN jsonb_build_object('error','missing_order_no'); END IF;
  IF v_phone = '' THEN v_phone := 'no-phone-' || v_order_no; END IF;
  IF NOT portal_rate_ok(v_order_no, 'publish', 30, interval '1 minute') THEN
    RETURN jsonb_build_object('error','rate_limited');
  END IF;

  INSERT INTO public.portal_customers (phone, name, district)
  VALUES (v_phone, coalesce(p_payload->>'name',''), coalesce(p_payload->>'district',''))
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
    advance_amount, delivery_address, driver_name, driver_phone, fulfillment_type, cargo_company, cargo_region
  ) VALUES (
    v_order_no, v_customer,
    coalesce((p_payload->>'subtotal')::numeric, 0),
    coalesce((p_payload->>'discount')::numeric, 0),
    coalesce((p_payload->>'delivery_fee')::numeric, 0),
    CASE WHEN p_payload->>'delivery_fee_payer' = 'Business' THEN 'Business' ELSE 'Customer' END,
    coalesce((p_payload->>'advance_amount')::numeric, 0),
    coalesce(p_payload->>'delivery_address',''),
    nullif(p_payload->>'driver_name',''),
    nullif(p_payload->>'driver_phone',''),
    v_ftype,
    nullif(p_payload->>'cargo_company',''),
    nullif(p_payload->>'cargo_region','')
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
    fulfillment_type = excluded.fulfillment_type,
    cargo_company = excluded.cargo_company,
    cargo_region = excluded.cargo_region,
    updated_at = now()
  RETURNING * INTO v_order;

  DELETE FROM public.portal_order_items WHERE order_id = v_order.id;
  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p_payload->'items','[]'::jsonb)) LOOP
    INSERT INTO public.portal_order_items (order_id, product_name, image_url, quantity, unit_price, discount, line_total)
    VALUES (v_order.id, coalesce(v_item->>'product_name',''), nullif(v_item->>'image_url',''),
      coalesce((v_item->>'quantity')::numeric,1), coalesce((v_item->>'unit_price')::numeric,0),
      coalesce((v_item->>'discount')::numeric,0), coalesce((v_item->>'line_total')::numeric,0));
  END LOOP;

  IF NOT v_existing THEN
    INSERT INTO public.order_status_history (order_id, status, note) VALUES (v_order.id, v_order.fulfillment_status, 'Dalab la sameeyay');
  END IF;
  RETURN jsonb_build_object('token', v_order.token, 'order_no', v_order.order_no, 'locked', false);
END;
$function$;