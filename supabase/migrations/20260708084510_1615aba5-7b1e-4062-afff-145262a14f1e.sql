
CREATE OR REPLACE FUNCTION public.next_customer_number()
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE n bigint;
BEGIN
  n := nextval('public.customer_number_seq');
  RETURN 'CUS-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 5, '0');
END; $$;

REVOKE EXECUTE ON FUNCTION public.next_customer_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_customer_number() TO authenticated;
GRANT USAGE ON SEQUENCE public.customer_number_seq TO authenticated;
