
ALTER FUNCTION public.next_customer_number() SECURITY DEFINER;
ALTER FUNCTION public.next_application_number() SECURITY DEFINER;
ALTER FUNCTION public.next_loan_number() SECURITY DEFINER;
ALTER FUNCTION public.next_receipt_number() SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.next_customer_number(), public.next_application_number(), public.next_loan_number(), public.next_receipt_number() FROM PUBLIC, anon, authenticated;
