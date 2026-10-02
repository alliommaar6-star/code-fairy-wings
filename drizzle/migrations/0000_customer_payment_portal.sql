-- ============ CUSTOMER PAYMENT PORTAL (additive) ============

CREATE TABLE public.portal_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_customers TO authenticated;
GRANT ALL ON public.portal_customers TO service_role;
ALTER TABLE public.portal_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage customers" ON public.portal_customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.portal_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.portal_customers(id) ON DELETE RESTRICT,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(12,2) NOT NULL DEFAULT 0,
  delivery_fee_payer text NOT NULL DEFAULT 'Customer'
    CHECK (delivery_fee_payer IN ('Customer','Business')),
  advance_amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) GENERATED ALWAYS AS (
    GREATEST(subtotal - discount, 0)
    + CASE WHEN delivery_fee_payer = 'Customer' THEN delivery_fee ELSE 0 END
  ) STORED,
  status text NOT NULL DEFAULT 'created',
  fulfillment_status text NOT NULL DEFAULT 'CREATED',
  delivery_address text NOT NULL DEFAULT '',
  driver_name text,
  driver_phone text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  token_active boolean NOT NULL DEFAULT true,
  last_accessed_at timestamptz,
  sale_id uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX portal_orders_token_idx ON public.portal_orders(token);
CREATE INDEX portal_orders_customer_idx ON public.portal_orders(customer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_orders TO authenticated;
GRANT ALL ON public.portal_orders TO service_role;
ALTER TABLE public.portal_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage orders" ON public.portal_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.portal_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.portal_orders(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  image_url text,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0
);
CREATE INDEX portal_order_items_order_idx ON public.portal_order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_order_items TO authenticated;
GRANT ALL ON public.portal_order_items TO service_role;
ALTER TABLE public.portal_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage items" ON public.portal_order_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.portal_orders(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  mode text NOT NULL DEFAULT 'full' CHECK (mode IN ('advance','full')),
  method text NOT NULL CHECK (method IN ('EVC','EDAHAB','JEEB')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','customer_confirmed','verified','rejected','cancelled')),
  reference text,
  client_key text NOT NULL,
  confirmed_at timestamptz,
  verified_at timestamptz,
  verified_by uuid,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, client_key)
);
CREATE INDEX payment_attempts_order_idx ON public.payment_attempts(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_attempts TO authenticated;
GRANT ALL ON public.payment_attempts TO service_role;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage payments" ON public.payment_attempts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.portal_orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_status_history_order_idx ON public.order_status_history(order_id);
GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read history" ON public.order_status_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff write history" ON public.order_status_history
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.portal_access_log (
  id bigserial PRIMARY KEY,
  token_hash text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX portal_access_log_recent_idx ON public.portal_access_log(token_hash, created_at DESC);
GRANT ALL ON public.portal_access_log TO service_role;
ALTER TABLE public.portal_access_log ENABLE ROW LEVEL SECURITY;

-- ============ SINGLE FINANCIAL ENGINE ============

CREATE OR REPLACE FUNCTION public.portal_amount_due(p_order public.portal_orders, p_mode text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(
    CASE
      WHEN p_mode = 'advance' THEN
        LEAST(
          GREATEST(p_order.advance_amount, 0)
            + CASE WHEN p_order.delivery_fee_payer = 'Customer' THEN p_order.delivery_fee ELSE 0 END
            - p_order.paid_amount,
          p_order.total - p_order.paid_amount)
      ELSE p_order.total - p_order.paid_amount
    END, 0)::numeric(12,2);
$$;

CREATE OR REPLACE FUNCTION public.portal_order_payload(p_order public.portal_orders)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'orderNo', p_order.order_no,
    'createdAt', p_order.created_at,
    'status', p_order.status,
    'fulfillmentStatus', p_order.fulfillment_status,
    'customer', jsonb_build_object(
      'name', c.name, 'phone', c.phone, 'district', c.district),
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
    'driver', CASE WHEN p_order.driver_name IS NULL THEN NULL
      ELSE jsonb_build_object('name', p_order.driver_name, 'phone', p_order.driver_phone) END,
    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id, 'amount', a.amount, 'method', a.method,
        'status', a.status, 'createdAt', a.created_at)
        ORDER BY a.created_at DESC)
      FROM payment_attempts a WHERE a.order_id = p_order.id
        AND a.status <> 'pending'), '[]'::jsonb),
    'history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('status', h.status, 'at', h.created_at)
        ORDER BY h.created_at)
      FROM order_status_history h WHERE h.order_id = p_order.id), '[]'::jsonb)
  )
  FROM portal_customers c WHERE c.id = p_order.customer_id;
$$;

-- ============ CUSTOMER (ANON) RPCs — token-scoped only ============

CREATE OR REPLACE FUNCTION public.portal_rate_ok(p_token text, p_action text, p_limit int, p_window interval)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_hash text; v_count int;
BEGIN
  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  SELECT count(*) INTO v_count FROM portal_access_log
   WHERE token_hash = v_hash AND action = p_action AND created_at > now() - p_window;
  INSERT INTO portal_access_log(token_hash, action) VALUES (v_hash, p_action);
  RETURN v_count < p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_get_order(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order portal_orders; v_payload jsonb; v_history jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 20 THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;
  IF NOT portal_rate_ok(p_token, 'get', 120, interval '1 minute') THEN
    RETURN jsonb_build_object('error', 'rate_limited');
  END IF;
  SELECT * INTO v_order FROM portal_orders WHERE token = p_token AND token_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'invalid_token'); END IF;
  UPDATE portal_orders SET last_accessed_at = now() WHERE id = v_order.id;
  v_payload := portal_order_payload(v_order);
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'orderNo', o.order_no, 'createdAt', o.created_at, 'total', o.total,
      'paid', o.paid_amount, 'remaining', GREATEST(o.total - o.paid_amount, 0),
      'status', o.status) ORDER BY o.created_at DESC), '[]'::jsonb)
    INTO v_history FROM portal_orders o WHERE o.customer_id = v_order.customer_id;
  RETURN v_payload || jsonb_build_object('customerOrders', v_history);
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_start_payment(
  p_token text, p_mode text, p_method text, p_client_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order portal_orders; v_amount numeric; v_attempt payment_attempts;
BEGIN
  IF NOT portal_rate_ok(p_token, 'pay', 20, interval '1 minute') THEN
    RETURN jsonb_build_object('error', 'rate_limited');
  END IF;
  SELECT * INTO v_order FROM portal_orders WHERE token = p_token AND token_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'invalid_token'); END IF;
  IF p_mode NOT IN ('advance','full') OR p_method NOT IN ('EVC','EDAHAB','JEEB') THEN
    RETURN jsonb_build_object('error', 'invalid_request');
  END IF;
  v_amount := portal_amount_due(v_order, p_mode);
  IF v_amount <= 0 THEN RETURN jsonb_build_object('error', 'already_paid'); END IF;

  SELECT * INTO v_attempt FROM payment_attempts
    WHERE order_id = v_order.id AND client_key = p_client_key;
  IF NOT FOUND THEN
    INSERT INTO payment_attempts(order_id, amount, mode, method, client_key)
      VALUES (v_order.id, v_amount, p_mode, p_method, p_client_key)
      RETURNING * INTO v_attempt;
  ELSIF v_attempt.status = 'pending' THEN
    UPDATE payment_attempts SET amount = v_amount, mode = p_mode, method = p_method
      WHERE id = v_attempt.id RETURNING * INTO v_attempt;
  END IF;

  RETURN jsonb_build_object(
    'attemptId', v_attempt.id,
    'amount', v_attempt.amount,
    'method', v_attempt.method,
    'status', v_attempt.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_confirm_payment(
  p_token text, p_attempt_id uuid, p_reference text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order portal_orders; v_attempt payment_attempts;
BEGIN
  IF NOT portal_rate_ok(p_token, 'confirm', 20, interval '1 minute') THEN
    RETURN jsonb_build_object('error', 'rate_limited');
  END IF;
  SELECT * INTO v_order FROM portal_orders WHERE token = p_token AND token_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'invalid_token'); END IF;
  SELECT * INTO v_attempt FROM payment_attempts
    WHERE id = p_attempt_id AND order_id = v_order.id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'invalid_request'); END IF;
  IF v_attempt.status = 'pending' THEN
    UPDATE payment_attempts
      SET status = 'customer_confirmed', confirmed_at = now(),
          reference = NULLIF(p_reference, '')
      WHERE id = v_attempt.id RETURNING * INTO v_attempt;
    INSERT INTO order_status_history(order_id, status, note)
      VALUES (v_order.id, 'payment_submitted', v_attempt.method);
  END IF;
  RETURN jsonb_build_object('status', v_attempt.status, 'amount', v_attempt.amount);
END;
$$;

REVOKE ALL ON FUNCTION public.portal_get_order(text) FROM public;
REVOKE ALL ON FUNCTION public.portal_start_payment(text,text,text,text) FROM public;
REVOKE ALL ON FUNCTION public.portal_confirm_payment(text,uuid,text) FROM public;
GRANT EXECUTE ON FUNCTION public.portal_get_order(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_start_payment(text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_confirm_payment(text,uuid,text) TO anon, authenticated;

-- ============ ADMIN RPCs (authenticated only) ============

CREATE OR REPLACE FUNCTION public.admin_verify_payment(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_attempt payment_attempts; v_order portal_orders;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO v_attempt FROM payment_attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  IF v_attempt.status = 'verified' THEN
    RETURN jsonb_build_object('status','verified','duplicate',true);
  END IF;
  IF v_attempt.status <> 'customer_confirmed' THEN
    RETURN jsonb_build_object('error','not_confirmed');
  END IF;
  UPDATE payment_attempts SET status = 'verified', verified_at = now(), verified_by = auth.uid()
    WHERE id = v_attempt.id;
  UPDATE portal_orders
    SET paid_amount = LEAST(paid_amount + v_attempt.amount, total), updated_at = now()
    WHERE id = v_attempt.order_id RETURNING * INTO v_order;
  INSERT INTO order_status_history(order_id, status, note)
    VALUES (v_order.id, 'payment_verified', v_attempt.amount::text);
  RETURN jsonb_build_object('status','verified','paid', v_order.paid_amount,
    'remaining', GREATEST(v_order.total - v_order.paid_amount, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_payment(p_attempt_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_attempt payment_attempts;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  UPDATE payment_attempts
    SET status = 'rejected', rejection_reason = p_reason
    WHERE id = p_attempt_id AND status = 'customer_confirmed'
    RETURNING * INTO v_attempt;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_confirmed'); END IF;
  INSERT INTO order_status_history(order_id, status, note)
    VALUES (v_attempt.order_id, 'payment_rejected', p_reason);
  RETURN jsonb_build_object('status','rejected');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_complete_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order portal_orders;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO v_order FROM portal_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  IF v_order.sale_id IS NOT NULL THEN
    RETURN jsonb_build_object('status','completed','saleId', v_order.sale_id, 'duplicate', true);
  END IF;
  IF v_order.paid_amount < v_order.total THEN
    RETURN jsonb_build_object('error','not_fully_paid');
  END IF;
  UPDATE portal_orders
    SET status = 'completed', fulfillment_status = 'COMPLETED',
        completed_at = now(), sale_id = gen_random_uuid(), updated_at = now()
    WHERE id = v_order.id RETURNING * INTO v_order;
  INSERT INTO order_status_history(order_id, status) VALUES (v_order.id, 'completed');
  RETURN jsonb_build_object('status','completed','saleId', v_order.sale_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_order_status(
  p_order_id uuid, p_status text, p_driver_name text DEFAULT NULL, p_driver_phone text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order portal_orders;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  UPDATE portal_orders
    SET fulfillment_status = p_status,
        driver_name = COALESCE(p_driver_name, driver_name),
        driver_phone = COALESCE(p_driver_phone, driver_phone),
        updated_at = now()
    WHERE id = p_order_id RETURNING * INTO v_order;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  INSERT INTO order_status_history(order_id, status, note)
    VALUES (v_order.id, p_status, p_driver_name);
  RETURN jsonb_build_object('status', v_order.fulfillment_status);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_verify_payment(uuid) FROM public;
REVOKE ALL ON FUNCTION public.admin_reject_payment(uuid,text) FROM public;
REVOKE ALL ON FUNCTION public.admin_complete_order(uuid) FROM public;
REVOKE ALL ON FUNCTION public.admin_set_order_status(uuid,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_verify_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_payment(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_complete_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_order_status(uuid,text,text,text) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_attempts;
