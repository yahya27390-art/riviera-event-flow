-- READ ONLY. Capture before migration and immediately after, before new entries.
-- Compare the entire output. Never UPDATE records to force matching totals.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT 'bookings' AS table_name, count(*) AS records,
  md5(coalesce(string_agg(md5(jsonb_strip_nulls(to_jsonb(t))::text),'|' ORDER BY id),'')) AS fingerprint,
  coalesce(sum(paid_amount),0) AS paid_amount, coalesce(sum(remaining_amount),0) AS remaining_amount,
  coalesce(sum(final_amount),0) AS final_amount FROM public.bookings t;
SELECT 'payments' AS table_name,count(*) AS records,coalesce(sum(amount),0) AS total,
  md5(coalesce(string_agg(md5(jsonb_strip_nulls(to_jsonb(t))::text),'|' ORDER BY id),'')) AS fingerprint FROM public.payments t;
SELECT 'cash_transactions' AS table_name,count(*) AS records,
  coalesce(sum(CASE WHEN type='إيراد' THEN amount ELSE -amount END),0) AS balance,
  md5(coalesce(string_agg(md5(jsonb_strip_nulls(to_jsonb(t))::text),'|' ORDER BY id),'')) AS fingerprint FROM public.cash_transactions t;
SELECT 'bank_transactions' AS table_name,count(*) AS records,
  coalesce(sum(CASE WHEN type='إيراد' THEN amount ELSE -amount END),0) AS balance,
  md5(coalesce(string_agg(md5(jsonb_strip_nulls(to_jsonb(t))::text),'|' ORDER BY id),'')) AS fingerprint FROM public.bank_transactions t;
SELECT 'expenses' AS table_name,count(*) AS records,coalesce(sum(amount),0) AS total,
  md5(coalesce(string_agg(md5(jsonb_strip_nulls(to_jsonb(t))::text),'|' ORDER BY id),'')) AS fingerprint FROM public.expenses t;
COMMIT;
