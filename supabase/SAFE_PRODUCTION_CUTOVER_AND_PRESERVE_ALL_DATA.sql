-- ============================================================================
-- ترحيل وتأمين نظام ريفيرا (قاعة قمة الريف) مع الحفاظ الكامل على الأرصدة والسجلات
-- نفّذ هذا الكود في Supabase SQL Editor (مشروع ylrgnvlyzouhbvtznnam) واضغط Run
-- الضمان التام: لا يوجد أي حذف، لا يوجد أي تعديل على مبالغ أو أرصدة سابقة
-- ============================================================================

BEGIN;

-- 1. تفعيل ملحق التشفير
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. ترقية وتأكيد حسابات الإدارة المعتمدة في Supabase Auth مع منح صلاحية المحاسبة المشفرة
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'accounting_access', true,
      'role', 'admin',
      'must_change_password', false,
      'disabled', false
    ),
    encrypted_password = CASE 
      WHEN email = 'sqq00100@gmail.com' THEN crypt('Riviera@2026', gen_salt('bf'))
      WHEN email = 'yahya9031@gmail.com' THEN crypt('Dell2020KoKa', gen_salt('bf'))
      ELSE encrypted_password
    END,
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
WHERE email IN ('sqq00100@gmail.com', 'yahya9031@gmail.com');

-- التحقق من وجود حساب مدير مؤهل قبل تطبيق القيود لضمان عدم قفل النظام
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE raw_app_meta_data->>'accounting_access'='true'
    AND raw_app_meta_data->>'role'='admin'
    AND coalesce(raw_app_meta_data->>'must_change_password','false') <> 'true'
    AND coalesce(raw_app_meta_data->>'disabled','false') <> 'true') THEN
    RAISE EXCEPTION 'يجب تجهيز حساب مدير Supabase Auth واختبار دخوله قبل الترحيل';
  END IF;
END $$;

-- 3. إضافة أعمدة الحجز الجديدة (قابلة للقيمة الفارغة، دون المساس بالحجوزات السابقة)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS base_price numeric(12,2);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS national_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS shift_time text;
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'مؤكد';

-- 4. جدول منع تكرار العمليات (Idempotency Requests)
CREATE TABLE IF NOT EXISTS public.accounting_requests (
  id uuid PRIMARY KEY,
  actor uuid NOT NULL,
  operation text NOT NULL,
  payload jsonb NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accounting_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.accounting_requests FROM PUBLIC, anon, authenticated;

-- 5. دوال التحقق من الصلاحيات الإدارية والمحاسبية
CREATE OR REPLACE FUNCTION public.accounting_access(p_admin boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = auth.uid()
      AND u.raw_app_meta_data->>'accounting_access' = 'true'
      AND coalesce(u.raw_app_meta_data->>'must_change_password', 'false') <> 'true'
      AND coalesce(u.raw_app_meta_data->>'disabled', 'false') <> 'true'
      AND u.raw_app_meta_data->>'role' IN ('admin', 'accountant')
      AND (NOT p_admin OR u.raw_app_meta_data->>'role' = 'admin')
  );
$$;
REVOKE ALL ON FUNCTION public.accounting_access(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accounting_access(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.accounting_require_access()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT public.accounting_access(false) THEN
    RAISE EXCEPTION 'غير مصرح باستخدام النظام' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.accounting_require_access() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.accounting_previous(p_id uuid, p_operation text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE previous public.accounting_requests%ROWTYPE;
BEGIN
  PERFORM public.accounting_require_access();
  IF p_id IS NULL OR p_payload IS NULL THEN RAISE EXCEPTION 'بيانات العملية غير مكتملة'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  SELECT * INTO previous FROM public.accounting_requests WHERE id = p_id;
  IF FOUND THEN
    IF previous.actor <> auth.uid() OR previous.operation <> p_operation OR previous.payload <> p_payload THEN
      RAISE EXCEPTION 'معرف العملية مستخدم لطلب مختلف';
    END IF;
    RETURN previous.response;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.accounting_previous(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;

-- 6. دالة تسجيل الدفعات الذرية
CREATE OR REPLACE FUNCTION public.record_booking_payment(p_request_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  b public.bookings%ROWTYPE;
  p public.payments%ROWTYPE;
  result jsonb;
  amount numeric := (p_payload->>'amount')::numeric;
  method text := p_payload->>'payment_method';
  payment_day text := p_payload->>'payment_date';
BEGIN
  result := public.accounting_previous(p_request_id, 'payment', p_payload);
  IF result IS NOT NULL THEN RETURN result; END IF;
  IF amount IS NULL OR amount::text IN ('NaN','Infinity','-Infinity') OR amount <= 0 OR round(amount,2) <> amount THEN
    RAISE EXCEPTION 'مبلغ الدفعة يجب أن يكون موجبًا وبمنزلتين عشريتين كحد أقصى';
  END IF;
  IF method IS NULL OR method NOT IN ('نقدي','تحويل بنكي','مدى') THEN RAISE EXCEPTION 'طريقة الدفع غير صالحة'; END IF;
  IF payment_day IS NULL OR payment_day !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'تاريخ الدفع مطلوب'; END IF;
  PERFORM payment_day::date;
  SELECT * INTO STRICT b FROM public.bookings WHERE id = (p_payload->>'booking_id')::uuid FOR UPDATE;
  IF b.status = 'ملغي' THEN RAISE EXCEPTION 'لا يمكن تسجيل دفعة لحجز ملغي'; END IF;
  IF amount > least(b.remaining_amount, b.final_amount - b.paid_amount) THEN
    RAISE EXCEPTION 'مبلغ الدفعة يتجاوز المتبقي من العقد';
  END IF;

  INSERT INTO public.payments (
    booking_id, payment_number, amount, payment_method, payment_date,
    notes, recipient_name, created_at, edited_by
  ) VALUES (
    b.id, coalesce(p_payload->>'payment_number', 'REC-' || p_request_id::text),
    amount, method, payment_day, p_payload->>'notes',
    coalesce(p_payload->>'recipient_name', 'النظام'), now(), auth.uid()::text
  ) RETURNING * INTO p;

  IF method = 'نقدي' THEN
    INSERT INTO public.cash_transactions (type, source, reference_id, reference_label, amount, transaction_date)
    VALUES ('إيراد', 'حجز', p.id::text, 'دفعة حجز: ' || b.customer_name, amount, payment_day);
  ELSE
    INSERT INTO public.bank_transactions (type, source, reference_id, reference_label, amount, transaction_date, payment_method)
    VALUES ('إيراد', 'حجز', p.id::text, 'دفعة حجز: ' || b.customer_name, amount, payment_day, method);
  END IF;

  UPDATE public.bookings
     SET paid_amount = paid_amount + amount,
         remaining_amount = remaining_amount - amount,
         updated_at = now()
   WHERE id = b.id;

  result := to_jsonb(p);
  INSERT INTO public.accounting_requests (id, actor, operation, payload, response, created_at)
  VALUES (p_request_id, auth.uid(), 'payment', p_payload, result, now());
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.record_booking_payment(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_booking_payment(uuid,jsonb) TO authenticated;

-- 7. دالة إنشاء الحجز مع العربون ذرياً
CREATE OR REPLACE FUNCTION public.create_booking_with_deposit(p_request_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  b public.bookings%ROWTYPE;
  deposit numeric := coalesce((p_payload->>'initial_payment_amount')::numeric, 0);
  deposit_method text := coalesce(p_payload->>'initial_payment_method', 'نقدي');
  event_day text := p_payload->>'event_date';
  total numeric := (p_payload->>'total_amount')::numeric;
  final_val numeric := coalesce((p_payload->>'final_amount')::numeric, total);
  discount numeric := coalesce((p_payload->>'discount')::numeric, 0);
  result jsonb;
BEGIN
  result := public.accounting_previous(p_request_id, 'create_booking', p_payload);
  IF result IS NOT NULL THEN RETURN result; END IF;
  IF event_day IS NULL OR event_day !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'تاريخ المناسبة مطلوب'; END IF;
  PERFORM event_day::date;
  IF total IS NULL OR total <= 0 OR final_val <= 0 THEN RAISE EXCEPTION 'المبلغ الإجمالي غير صالح'; END IF;
  IF deposit < 0 OR deposit > final_val THEN RAISE EXCEPTION 'مبلغ العربون غير صالح'; END IF;

  INSERT INTO public.bookings (
    booking_number, customer_name, customer_phone, national_id, event_date,
    event_type, section_id, package_id, total_amount, discount, final_amount,
    paid_amount, remaining_amount, initial_payment_amount, initial_payment_method,
    status, notes, shift_time, base_price, created_at, updated_at
  ) VALUES (
    coalesce(p_payload->>'booking_number', 'BK-' || p_request_id::text),
    p_payload->>'customer_name', p_payload->>'customer_phone', p_payload->>'national_id',
    event_day, coalesce(p_payload->>'event_type','أخرى'),
    NULLIF(p_payload->>'section_id','')::uuid, NULLIF(p_payload->>'package_id','')::uuid,
    total, discount, final_val, deposit, final_val - deposit, deposit, deposit_method,
    coalesce(p_payload->>'status', 'مؤكد'), p_payload->>'notes', p_payload->>'shift_time',
    (p_payload->>'base_price')::numeric, now(), now()
  ) RETURNING * INTO b;

  IF deposit > 0 THEN
    INSERT INTO public.payments (
      booking_id, payment_number, amount, payment_method, payment_date,
      notes, recipient_name, created_at, edited_by
    ) VALUES (
      b.id, 'DEP-' || p_request_id::text, deposit, deposit_method,
      coalesce(p_payload->>'deposit_date', to_char(now(), 'YYYY-MM-DD')),
      'عربون حجز جديد', 'النظام', now(), auth.uid()::text
    );
    IF deposit_method = 'نقدي' THEN
      INSERT INTO public.cash_transactions (type, source, reference_id, reference_label, amount, transaction_date)
      VALUES ('إيراد', 'عربون', b.id::text, 'عربون حجز: ' || b.customer_name, deposit, coalesce(p_payload->>'deposit_date', to_char(now(), 'YYYY-MM-DD')));
    ELSE
      INSERT INTO public.bank_transactions (type, source, reference_id, reference_label, amount, transaction_date, payment_method)
      VALUES ('إيراد', 'عربون', b.id::text, 'عربون حجز: ' || b.customer_name, deposit, coalesce(p_payload->>'deposit_date', to_char(now(), 'YYYY-MM-DD')), deposit_method);
    END IF;
  END IF;

  result := to_jsonb(b);
  INSERT INTO public.accounting_requests (id, actor, operation, payload, response, created_at)
  VALUES (p_request_id, auth.uid(), 'create_booking', p_payload, result, now());
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.create_booking_with_deposit(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_with_deposit(uuid,jsonb) TO authenticated;

-- 8. دالة تعديل الحجز بأمان ومنع التعديل المالي العشوائي
CREATE OR REPLACE FUNCTION public.update_booking_safely(p_id uuid, p_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE b public.bookings%ROWTYPE;
BEGIN
  PERFORM public.accounting_require_access();
  SELECT * INTO STRICT b FROM public.bookings WHERE id = p_id FOR UPDATE;
  IF p_patch ? 'updated_at' AND b.updated_at IS NOT NULL
     AND (p_patch->>'updated_at')::timestamptz <> b.updated_at THEN
    RAISE EXCEPTION 'الحجز تغيّر بواسطة مستخدم آخر، يرجى التحديث';
  END IF;

  UPDATE public.bookings SET
    customer_name = coalesce(p_patch->>'customer_name', customer_name),
    customer_phone = CASE WHEN p_patch ? 'customer_phone' THEN p_patch->>'customer_phone' ELSE customer_phone END,
    national_id = CASE WHEN p_patch ? 'national_id' THEN p_patch->>'national_id' ELSE national_id END,
    event_type = coalesce(p_patch->>'event_type', event_type),
    notes = CASE WHEN p_patch ? 'notes' THEN p_patch->>'notes' ELSE notes END,
    shift_time = CASE WHEN p_patch ? 'shift_time' THEN p_patch->>'shift_time' ELSE shift_time END,
    status = coalesce(p_patch->>'status', status),
    updated_at = now()
  WHERE id = p_id RETURNING * INTO b;

  RETURN to_jsonb(b);
END;
$$;
REVOKE ALL ON FUNCTION public.update_booking_safely(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_booking_safely(uuid,jsonb) TO authenticated;

-- 9. دالة حركات الصندوق والبنك والتحويلات الذرية
CREATE OR REPLACE FUNCTION public.record_ledger_operation(p_request_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb; operation text := p_payload->>'kind';
  amount numeric := (p_payload->>'amount')::numeric;
  entry_day text := p_payload->>'transaction_date';
  method text := coalesce(p_payload->>'payment_method','نقدي');
  account text := p_payload->>'account';
  ref uuid := gen_random_uuid();
  label text := coalesce(p_payload->>'description','');
BEGIN
  result := public.accounting_previous(p_request_id,'ledger',p_payload);
  IF result IS NOT NULL THEN RETURN result; END IF;
  IF amount IS NULL OR amount::text IN ('NaN','Infinity','-Infinity') OR amount <= 0 OR round(amount,2) <> amount THEN RAISE EXCEPTION 'المبلغ غير صالح'; END IF;
  IF entry_day IS NULL OR entry_day !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'التاريخ غير صالح'; END IF;
  PERFORM entry_day::date;
  IF operation IS NULL OR operation NOT IN ('income','expense','transfer') THEN RAISE EXCEPTION 'نوع العملية غير صالح'; END IF;
  IF account IS NULL OR account NOT IN ('cash','bank') THEN RAISE EXCEPTION 'الحساب غير صالح'; END IF;
  IF operation <> 'transfer' AND account='bank' AND method NOT IN ('تحويل بنكي','مدى') THEN RAISE EXCEPTION 'طريقة الدفع البنكية غير صالحة'; END IF;
  IF operation='transfer' THEN
    IF p_payload->>'direction' IS NULL OR p_payload->>'direction' NOT IN ('toBank','toCash') THEN RAISE EXCEPTION 'اتجاه التحويل غير صالح'; END IF;
    INSERT INTO public.cash_transactions(type,source,reference_id,reference_label,amount,transaction_date)
    VALUES (CASE WHEN p_payload->>'direction'='toBank' THEN 'مصروف' ELSE 'إيراد' END,'تحويل',ref::text,'تحويل بين الخزينة والبنك',amount,entry_day);
    INSERT INTO public.bank_transactions(type,source,reference_id,reference_label,amount,transaction_date,payment_method)
    VALUES (CASE WHEN p_payload->>'direction'='toBank' THEN 'إيراد' ELSE 'مصروف' END,'تحويل',ref::text,'تحويل بين الخزينة والبنك',amount,entry_day,'تحويل بنكي');
  ELSE
    IF operation='expense' THEN
      INSERT INTO public.expenses(id,expense_number,expense_type,amount,payment_method,description,expense_date,edited_by)
      VALUES(ref,'EXP-' || p_request_id::text,coalesce(p_payload->>'expense_type','أخرى'),amount,
        CASE WHEN account='cash' THEN 'نقدي' ELSE method END,label,entry_day,auth.uid()::text);
    END IF;
    IF account='cash' THEN
      INSERT INTO public.cash_transactions(type,source,reference_id,reference_label,amount,transaction_date)
      VALUES(CASE WHEN operation='expense' THEN 'مصروف' ELSE 'إيراد' END,
        CASE WHEN operation='expense' THEN 'مصروف' ELSE 'يدوي' END,ref::text,label,amount,entry_day);
    ELSE
      INSERT INTO public.bank_transactions(type,source,reference_id,reference_label,amount,transaction_date,payment_method)
      VALUES(CASE WHEN operation='expense' THEN 'مصروف' ELSE 'إيراد' END,
        CASE WHEN operation='expense' THEN 'مصروف' ELSE 'يدوي' END,ref::text,label,amount,entry_day,method);
    END IF;
  END IF;
  result := jsonb_build_object('id',ref,'amount',amount);
  INSERT INTO public.accounting_requests VALUES(p_request_id,auth.uid(),'ledger',p_payload,result,now());
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.record_ledger_operation(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_ledger_operation(uuid,jsonb) TO authenticated;

-- 10. دالة النسخ الاحتياطي المتسق (Atomic Consistent Snapshot) للمدير
CREATE OR REPLACE FUNCTION public.accounting_snapshot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.accounting_access(true) THEN RAISE EXCEPTION 'صلاحية المدير مطلوبة' USING ERRCODE='42501'; END IF;
  SELECT jsonb_build_object(
    'bookings',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.bookings t),'[]'::jsonb),
    'payments',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.payments t),'[]'::jsonb),
    'expenses',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.expenses t),'[]'::jsonb),
    'cash_transactions',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.cash_transactions t),'[]'::jsonb),
    'bank_transactions',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.bank_transactions t),'[]'::jsonb),
    'hall_settings',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.hall_settings t),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.accounting_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.accounting_snapshot() TO authenticated;

-- 11. مشغلات الحماية الصارمة ضد حذف السجلات التاريخية
CREATE OR REPLACE FUNCTION public.prevent_financial_deletions()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'السجلات المالية والتاريخية محمية وغير قابلة للحذف';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_bookings ON public.bookings;
CREATE TRIGGER trg_protect_bookings BEFORE DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_deletions();

DROP TRIGGER IF EXISTS trg_protect_payments ON public.payments;
CREATE TRIGGER trg_protect_payments BEFORE DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_deletions();

DROP TRIGGER IF EXISTS trg_protect_cash ON public.cash_transactions;
CREATE TRIGGER trg_protect_cash BEFORE DELETE ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_deletions();

DROP TRIGGER IF EXISTS trg_protect_bank ON public.bank_transactions;
CREATE TRIGGER trg_protect_bank BEFORE DELETE ON public.bank_transactions
FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_deletions();

DROP TRIGGER IF EXISTS trg_protect_expenses ON public.expenses;
CREATE TRIGGER trg_protect_expenses BEFORE DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_deletions();

COMMIT;

-- ============================================================================
-- فحص وتطابق خط الأساس المالي (Financial Baseline Verification)
-- ============================================================================
SELECT 'bookings' AS table_name, count(*) AS records,
  coalesce(sum(paid_amount),0) AS paid_sum,
  coalesce(sum(remaining_amount),0) AS remaining_sum,
  coalesce(sum(final_amount),0) AS total_sum
FROM public.bookings
UNION ALL
SELECT 'payments', count(*), coalesce(sum(amount),0), 0, 0 FROM public.payments
UNION ALL
SELECT 'cash_transactions', count(*), coalesce(sum(CASE WHEN type='إيراد' THEN amount ELSE -amount END),0), 0, 0 FROM public.cash_transactions
UNION ALL
SELECT 'bank_transactions', count(*), coalesce(sum(CASE WHEN type='إيراد' THEN amount ELSE -amount END),0), 0, 0 FROM public.bank_transactions
UNION ALL
SELECT 'expenses', count(*), coalesce(sum(amount),0), 0, 0 FROM public.expenses;
