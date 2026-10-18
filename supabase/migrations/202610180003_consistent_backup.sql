BEGIN;
CREATE OR REPLACE FUNCTION public.accounting_snapshot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.accounting_access(true) THEN RAISE EXCEPTION 'صلاحية المدير مطلوبة' USING ERRCODE='42501'; END IF;
  -- One SQL statement = one MVCC snapshot across all tables, with no REST row
  -- limit. No partial pages or mismatched booking/payment snapshots.
  SELECT jsonb_build_object(
    'customers',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.customers t),'[]'::jsonb),
    'bookings',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.bookings t),'[]'::jsonb),
    'payments',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.payments t),'[]'::jsonb),
    'expenses',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.expenses t),'[]'::jsonb),
    'cash_transactions',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.cash_transactions t),'[]'::jsonb),
    'bank_transactions',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.bank_transactions t),'[]'::jsonb),
    'hall_settings',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.hall_settings t),'[]'::jsonb),
    'users',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.users t),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.accounting_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.accounting_snapshot() TO authenticated;
COMMIT;
