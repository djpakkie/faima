
-- Customers: staff-only SELECT
DROP POLICY IF EXISTS "Authenticated read customers" ON public.customers;
CREATE POLICY "Staff read customers" ON public.customers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'administrator') OR public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'finance_officer'));

-- Customer documents: staff-only SELECT
DROP POLICY IF EXISTS "Authenticated read docs" ON public.customer_documents;
CREATE POLICY "Staff read docs" ON public.customer_documents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'administrator') OR public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'finance_officer'));

-- Loan products: admin-only SELECT
DROP POLICY IF EXISTS "Authenticated read products" ON public.loan_products;
CREATE POLICY "Admin read products" ON public.loan_products
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'));

-- Storage: staff-only read for customer-documents
DROP POLICY IF EXISTS "Staff read customer docs" ON storage.objects;
CREATE POLICY "Staff read customer docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'customer-documents'
    AND (
      public.has_role(auth.uid(), 'administrator')
      OR public.has_role(auth.uid(), 'loan_officer')
      OR public.has_role(auth.uid(), 'finance_officer')
    )
  );

-- Revoke EXECUTE on internal SECURITY DEFINER functions from public/authenticated/anon.
-- has_role is intentionally left executable because RLS policies reference it.
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_customer_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_customer_number() TO service_role;
