-- ============================================================================
-- حل مشكلة تثبيت الحجز وسندات القبض (Payments & Booking Schema Fix)
-- انسخ هذا الكود بالكامل ونفذه في Supabase SQL Editor
-- ============================================================================

-- 1. إضافة وتحديث أعمدة جدول سندات القبض payments لتفادي أي نقص
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_number text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_number text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS recipient_name text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS edited_by text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS booking_number text;

-- 2. تحديث دالة تسجيل الدفعات لتتعامل مع الأعمدة بدقة وأمان
CREATE OR REPLACE FUNCTION public.record_booking_payment(p_request_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  b public.bookings%ROWTYPE;
  p public.payments%ROWTYPE;
  result jsonb;
  amount numeric := (p_payload->>'amount')::numeric;
  method text := p_payload->>'payment_method';
  payment_day text := p_payload->>'payment_date';
  rec_num text := coalesce(p_payload->>'receipt_number', p_payload->>'payment_number', 'REC-' || substring(p_request_id::text from 1 for 8));
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
    booking_id, booking_number, customer_name, customer_phone,
    receipt_number, payment_number, amount, payment_method, payment_date,
    notes, recipient_name, created_at, edited_by
  ) VALUES (
    b.id, b.booking_number, b.customer_name, b.customer_phone,
    rec_num, rec_num, amount, method, payment_day,
    p_payload->>'notes', coalesce(p_payload->>'recipient_name', 'النظام'),
    now(), auth.uid()::text
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

-- 3. تحديث دالة إنشاء الحجز السريع وتثبيت العربون
CREATE OR REPLACE FUNCTION public.create_booking_with_deposit(p_request_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  b public.bookings%ROWTYPE;
  deposit numeric := coalesce(nullif(p_payload->>'initial_payment_amount','')::numeric, 0);
  deposit_method text := coalesce(p_payload->>'initial_payment_method', 'نقدي');
  event_day text := p_payload->>'event_date';
  total numeric := (p_payload->>'total_amount')::numeric;
  final_val numeric := coalesce((p_payload->>'final_amount')::numeric, total);
  discount numeric := coalesce(nullif(p_payload->>'discount','')::numeric, 0);
  sec_name text := coalesce(p_payload->>'hall_section', 'كامل القاعة (قسمين)');
  result jsonb;
BEGIN
  result := public.accounting_previous(p_request_id, 'booking', p_payload);
  IF result IS NOT NULL THEN RETURN result; END IF;
  IF event_day IS NULL OR event_day !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'تاريخ المناسبة مطلوب'; END IF;
  PERFORM event_day::date;
  IF total IS NULL OR total <= 0 OR final_val <= 0 THEN RAISE EXCEPTION 'المبلغ الإجمالي غير صالح'; END IF;
  IF deposit < 0 OR deposit > final_val THEN RAISE EXCEPTION 'مبلغ العربون غير صالح'; END IF;

  INSERT INTO public.bookings (
    booking_number, customer_id, customer_name, customer_phone, national_id, voucher_number,
    event_date, event_date_hijri, hall_section, section_id, package_id, event_type,
    shift_time, service_type, status, items, base_price, total_amount, discount,
    final_amount, paid_amount, remaining_amount, initial_payment_amount, initial_payment_method, notes
  ) VALUES (
    coalesce(p_payload->>'booking_number', 'BK-' || substring(p_request_id::text from 1 for 8)),
    nullif(p_payload->>'customer_id','')::uuid,
    p_payload->>'customer_name',
    coalesce(p_payload->>'customer_phone',''),
    p_payload->>'national_id',
    p_payload->>'voucher_number',
    event_day,
    p_payload->>'event_date_hijri',
    sec_name,
    nullif(p_payload->>'section_id','')::uuid,
    nullif(p_payload->>'package_id','')::uuid,
    coalesce(p_payload->>'event_type','زواج'),
    p_payload->>'shift_time',
    coalesce(p_payload->>'service_type','خدمات كاملة'),
    coalesce(p_payload->>'status','مؤكد'),
    coalesce(p_payload->'items','[]'::jsonb),
    nullif(p_payload->>'base_price','')::numeric,
    total,
    discount,
    final_val,
    0,
    final_val,
    deposit,
    deposit_method,
    p_payload->>'notes'
  ) RETURNING * INTO b;

  IF p_payload->>'auto_create_customer'='true' AND coalesce(trim(b.customer_phone),'') <> '' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(regexp_replace(b.customer_phone,'\D','','g'),1));
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE regexp_replace(phone,'\D','','g')=regexp_replace(b.customer_phone,'\D','','g')) THEN
      INSERT INTO public.customers(name, phone, notes) VALUES(b.customer_name, b.customer_phone, 'عميل حجز سريع');
    END IF;
  END IF;

  IF deposit > 0 THEN
    result := public.record_booking_payment(
      gen_random_uuid(),
      jsonb_build_object(
        'booking_id', b.id,
        'amount', deposit,
        'payment_method', deposit_method,
        'payment_date', coalesce(p_payload->>'deposit_date', to_char(current_timestamp AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD')),
        'notes', 'عربون حجز جديد'
      )
    );
    SELECT * INTO b FROM public.bookings WHERE id = b.id;
  END IF;

  result := to_jsonb(b);
  INSERT INTO public.accounting_requests VALUES (p_request_id, auth.uid(), 'booking', p_payload, result, now());
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.create_booking_with_deposit(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_with_deposit(uuid,jsonb) TO authenticated;
