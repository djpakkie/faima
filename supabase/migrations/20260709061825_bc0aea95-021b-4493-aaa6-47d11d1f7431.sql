
-- Sequences for auto-numbering
CREATE SEQUENCE IF NOT EXISTS public.application_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.loan_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START 1;

CREATE OR REPLACE FUNCTION public.next_application_number() RETURNS text
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n bigint;
BEGIN n := nextval('public.application_number_seq');
  RETURN 'APP-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 5, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.next_loan_number() RETURNS text
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n bigint;
BEGIN n := nextval('public.loan_number_seq');
  RETURN 'LN-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 5, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.next_receipt_number() RETURNS text
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n bigint;
BEGIN n := nextval('public.receipt_number_seq');
  RETURN 'RCP-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0');
END; $$;

REVOKE EXECUTE ON FUNCTION public.next_application_number(), public.next_loan_number(), public.next_receipt_number() FROM PUBLIC, anon, authenticated;

-- loan_applications
CREATE TABLE public.loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number TEXT NOT NULL UNIQUE DEFAULT public.next_application_number(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.loan_products(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  term_months INT NOT NULL CHECK (term_months > 0),
  repayment_frequency TEXT NOT NULL CHECK (repayment_frequency IN ('monthly','weekly','biweekly')),
  interest_rate_percent NUMERIC(6,3) NOT NULL,
  interest_method TEXT NOT NULL CHECK (interest_method IN ('reducing_balance','flat')),
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','recommended','approved','declined','disbursed','withdrawn')),
  officer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recommended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recommended_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  declined_reason TEXT,
  -- affordability snapshot
  monthly_income NUMERIC(14,2),
  monthly_expenses NUMERIC(14,2),
  existing_debt NUMERIC(14,2),
  affordability_verdict TEXT,
  affordability_ratio NUMERIC(6,3),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_applications TO authenticated;
GRANT ALL ON public.loan_applications TO service_role;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read applications" ON public.loan_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'loan_officer') OR public.has_role(auth.uid(),'finance_officer'));
CREATE POLICY "officers create applications" ON public.loan_applications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'loan_officer'));
CREATE POLICY "officers update applications" ON public.loan_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'loan_officer'))
  WITH CHECK (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'loan_officer'));
CREATE POLICY "admins delete applications" ON public.loan_applications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrator'));
CREATE TRIGGER trg_loan_applications_updated BEFORE UPDATE ON public.loan_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- loans
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_number TEXT NOT NULL UNIQUE DEFAULT public.next_loan_number(),
  application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.loan_products(id) ON DELETE RESTRICT,
  principal NUMERIC(14,2) NOT NULL,
  interest_rate_percent NUMERIC(6,3) NOT NULL,
  interest_method TEXT NOT NULL,
  term_months INT NOT NULL,
  repayment_frequency TEXT NOT NULL,
  processing_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  insurance_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_interest NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_repayable NUMERIC(14,2) NOT NULL DEFAULT 0,
  outstanding_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  disbursed_at DATE NOT NULL,
  first_due_date DATE NOT NULL,
  maturity_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','written_off')),
  closed_at TIMESTAMPTZ,
  disbursed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read loans" ON public.loans FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'loan_officer') OR public.has_role(auth.uid(),'finance_officer'));
CREATE POLICY "staff insert loans" ON public.loans FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'loan_officer') OR public.has_role(auth.uid(),'finance_officer'));
CREATE POLICY "staff update loans" ON public.loans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'finance_officer'))
  WITH CHECK (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'finance_officer'));
CREATE POLICY "admins delete loans" ON public.loans FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrator'));
CREATE TRIGGER trg_loans_updated BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- repayment_schedule
CREATE TABLE public.repayment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  seq INT NOT NULL,
  due_date DATE NOT NULL,
  principal NUMERIC(14,2) NOT NULL,
  interest NUMERIC(14,2) NOT NULL,
  instalment NUMERIC(14,2) NOT NULL,
  balance_after NUMERIC(14,2) NOT NULL,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(loan_id, seq)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repayment_schedule TO authenticated;
GRANT ALL ON public.repayment_schedule TO service_role;
ALTER TABLE public.repayment_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read schedule" ON public.repayment_schedule FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'loan_officer') OR public.has_role(auth.uid(),'finance_officer'));
CREATE POLICY "staff write schedule" ON public.repayment_schedule FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'loan_officer') OR public.has_role(auth.uid(),'finance_officer'));
CREATE POLICY "staff update schedule" ON public.repayment_schedule FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'finance_officer'))
  WITH CHECK (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'finance_officer'));
CREATE POLICY "admins delete schedule" ON public.repayment_schedule FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrator'));

-- repayments
CREATE TABLE public.repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE DEFAULT public.next_receipt_number(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  penalty NUMERIC(14,2) NOT NULL DEFAULT 0,
  method TEXT NOT NULL CHECK (method IN ('cash','eft','mobile','cheque')),
  reference TEXT,
  notes TEXT,
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repayments TO authenticated;
GRANT ALL ON public.repayments TO service_role;
ALTER TABLE public.repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read repayments" ON public.repayments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'loan_officer') OR public.has_role(auth.uid(),'finance_officer'));
CREATE POLICY "finance record repayments" ON public.repayments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'finance_officer'));
CREATE POLICY "admins update repayments" ON public.repayments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'administrator'))
  WITH CHECK (public.has_role(auth.uid(),'administrator'));
CREATE POLICY "admins delete repayments" ON public.repayments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrator'));

-- arrears_notes
CREATE TABLE public.arrears_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  follow_up_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arrears_notes TO authenticated;
GRANT ALL ON public.arrears_notes TO service_role;
ALTER TABLE public.arrears_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read arrears" ON public.arrears_notes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'loan_officer') OR public.has_role(auth.uid(),'finance_officer'));
CREATE POLICY "staff write arrears" ON public.arrears_notes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'loan_officer') OR public.has_role(auth.uid(),'finance_officer'));
CREATE POLICY "admins delete arrears" ON public.arrears_notes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrator'));

CREATE INDEX idx_applications_customer ON public.loan_applications(customer_id);
CREATE INDEX idx_applications_status ON public.loan_applications(status);
CREATE INDEX idx_loans_customer ON public.loans(customer_id);
CREATE INDEX idx_loans_status ON public.loans(status);
CREATE INDEX idx_schedule_loan ON public.repayment_schedule(loan_id, seq);
CREATE INDEX idx_schedule_due ON public.repayment_schedule(due_date) WHERE status <> 'paid';
CREATE INDEX idx_repayments_loan ON public.repayments(loan_id);
CREATE INDEX idx_repayments_paid_on ON public.repayments(paid_on);
