-- Starter loan products for Faima Cash Solutions.
-- These are placeholder rates/terms to get the app usable end-to-end —
-- replace them with your actual licensed rates and fee structure before
-- going live with real customers (see the compliance notes flagged
-- earlier for the loan agreement template: NAMFISA / Microlending Act
-- rate and fee caps apply).

INSERT INTO public.loan_products
  (code, name, description, interest_rate_percent, interest_method,
   min_amount, max_amount, min_term_months, max_term_months,
   repayment_frequency, processing_fee_percent, insurance_fee_percent,
   late_fee_percent, active)
VALUES
  ('PAYDAY1', 'Payday Advance',
   'Short-term cash advance repaid on the customer''s next payday.',
   22.000, 'flat',
   500.00, 5000.00, 1, 1,
   'monthly', 5.000, 1.000, 10.000, true),

  ('EMERGENCY3', 'Emergency Cash Loan',
   'Small, fast-turnaround loan for unexpected expenses.',
   26.000, 'reducing_balance',
   500.00, 3000.00, 1, 3,
   'monthly', 5.000, 1.500, 10.000, true),

  ('PERSONAL12', 'Personal Loan',
   'General-purpose instalment loan for salaried customers.',
   24.000, 'reducing_balance',
   1000.00, 30000.00, 3, 12,
   'monthly', 5.000, 2.000, 10.000, true),

  ('SALARY24', 'Salary-Backed Loan',
   'Longer-term loan for verified salaried employees, lower rate for larger amounts.',
   18.000, 'reducing_balance',
   2000.00, 50000.00, 6, 24,
   'monthly', 3.000, 2.000, 8.000, true)

ON CONFLICT (code) DO NOTHING;
