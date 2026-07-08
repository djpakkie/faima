
CREATE SEQUENCE IF NOT EXISTS public.customer_number_seq START 1;

CREATE OR REPLACE FUNCTION public.next_customer_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint;
BEGIN
  n := nextval('public.customer_number_seq');
  RETURN 'CUS-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 5, '0');
END; $$;

-- ============ customers ============
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_number text NOT NULL UNIQUE DEFAULT public.next_customer_number(),
  full_name text NOT NULL,
  id_number text NOT NULL UNIQUE,
  date_of_birth date,
  gender text,
  marital_status text,
  phone text NOT NULL,
  alt_phone text,
  email text,
  physical_address text,
  postal_address text,
  employer text,
  employment_status text,
  occupation text,
  monthly_income numeric(14,2),
  bank_name text,
  bank_account_number text,
  bank_branch_code text,
  next_of_kin_name text,
  next_of_kin_phone text,
  next_of_kin_relationship text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read customers" ON public.customers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'administrator') OR
    public.has_role(auth.uid(), 'loan_officer')
  );
CREATE POLICY "Staff update customers" ON public.customers
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'administrator') OR
    public.has_role(auth.uid(), 'loan_officer')
  ) WITH CHECK (
    public.has_role(auth.uid(), 'administrator') OR
    public.has_role(auth.uid(), 'loan_officer')
  );
CREATE POLICY "Admins delete customers" ON public.customers
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_customers_full_name ON public.customers (lower(full_name));
CREATE INDEX idx_customers_phone ON public.customers (phone);
CREATE INDEX idx_customers_status ON public.customers (status);

-- ============ customer_documents ============
CREATE TABLE public.customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_documents TO authenticated;
GRANT ALL ON public.customer_documents TO service_role;
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read docs" ON public.customer_documents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert docs" ON public.customer_documents
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'administrator') OR
    public.has_role(auth.uid(), 'loan_officer')
  );
CREATE POLICY "Admins delete docs" ON public.customer_documents
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrator'));

CREATE INDEX idx_customer_documents_customer ON public.customer_documents (customer_id);

-- ============ loan_products ============
CREATE TABLE public.loan_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  interest_rate_percent numeric(6,3) NOT NULL,
  interest_method text NOT NULL DEFAULT 'reducing_balance',
  min_amount numeric(14,2) NOT NULL,
  max_amount numeric(14,2) NOT NULL,
  min_term_months integer NOT NULL,
  max_term_months integer NOT NULL,
  repayment_frequency text NOT NULL DEFAULT 'monthly',
  processing_fee_percent numeric(6,3) NOT NULL DEFAULT 0,
  insurance_fee_percent numeric(6,3) NOT NULL DEFAULT 0,
  late_fee_percent numeric(6,3) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_products TO authenticated;
GRANT ALL ON public.loan_products TO service_role;
ALTER TABLE public.loan_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read products" ON public.loan_products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage products" ON public.loan_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'))
  WITH CHECK (public.has_role(auth.uid(), 'administrator'));

CREATE TRIGGER trg_loan_products_updated_at BEFORE UPDATE ON public.loan_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage RLS for customer-documents bucket (bucket created via storage tool)
CREATE POLICY "Staff read customer docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'customer-documents');

CREATE POLICY "Staff upload customer docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'customer-documents' AND (
      public.has_role(auth.uid(), 'administrator') OR
      public.has_role(auth.uid(), 'loan_officer')
    )
  );

CREATE POLICY "Admin delete customer docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'customer-documents' AND public.has_role(auth.uid(), 'administrator')
  );
