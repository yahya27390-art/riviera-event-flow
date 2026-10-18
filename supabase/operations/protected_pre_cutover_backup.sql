-- Operator-only backup inside the same Supabase database. Never exports rows.
-- No permissions are granted to browser users, anon or authenticated.
BEGIN;
CREATE SCHEMA IF NOT EXISTS accounting_backup;
REVOKE ALL ON SCHEMA accounting_backup FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS accounting_backup.snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  label text NOT NULL,
  tables jsonb NOT NULL
);
REVOKE ALL ON accounting_backup.snapshots FROM PUBLIC,anon,authenticated;
ALTER TABLE accounting_backup.snapshots ENABLE ROW LEVEL SECURITY;
LOCK TABLE public.bookings,public.payments,public.expenses,public.cash_transactions,
  public.bank_transactions,public.customers,public.hall_settings,public.users IN SHARE MODE;
INSERT INTO accounting_backup.snapshots(label,tables)
SELECT 'before_accounting_cutover_20261018',jsonb_build_object(
  'bookings',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.bookings t),'[]'::jsonb),
  'payments',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.payments t),'[]'::jsonb),
  'expenses',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.expenses t),'[]'::jsonb),
  'cash_transactions',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.cash_transactions t),'[]'::jsonb),
  'bank_transactions',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.bank_transactions t),'[]'::jsonb),
  'customers',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.customers t),'[]'::jsonb),
  'hall_settings',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.hall_settings t),'[]'::jsonb),
  'users',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.users t),'[]'::jsonb)
);
COMMIT;
