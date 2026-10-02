ALTER FUNCTION public.portal_amount_due(public.portal_orders, text) SET search_path = public;
REVOKE ALL ON FUNCTION public.portal_amount_due(public.portal_orders, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_order_payload(public.portal_orders) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_rate_ok(text, text, int, interval) FROM public, anon, authenticated;

CREATE POLICY "no direct access to access log" ON public.portal_access_log
  FOR SELECT TO authenticated USING (false);