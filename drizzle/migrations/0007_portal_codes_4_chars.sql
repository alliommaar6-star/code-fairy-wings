CREATE OR REPLACE FUNCTION public.portal_new_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alphabet text := 'abcdefghijkmnpqrstuvwxyz23456789';
  v_code text;
  i int;
  n int := 0;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..4 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.portal_orders WHERE token = v_code);
    n := n + 1;
    IF n > 50 THEN
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
      EXIT;
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.portal_new_code() FROM public;

ALTER TABLE public.portal_orders ALTER COLUMN token SET DEFAULT public.portal_new_code();

UPDATE public.portal_orders SET token = public.portal_new_code() WHERE length(token) > 4;