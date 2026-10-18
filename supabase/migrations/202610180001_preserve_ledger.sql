-- PREPARED ONLY. Run first on an isolated copy, then during a planned cutover.
-- No UPDATE, DELETE, TRUNCATE or backfill of existing financial records.
BEGIN;

-- Fail before changing permissions if the replacement administrator has not
-- been provisioned. Never lock out a production system by accident.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE raw_app_meta_data->>'accounting_access'='true'
    AND raw_app_meta_data->>'role'='admin'
    AND coalesce(raw_app_meta_data->>'must_change_password','false') <> 'true'
    AND coalesce(raw_app_meta_data->>'disabled','false') <> 'true') THEN
    RAISE EXCEPTION 'يجب تجهيز حساب مدير Supabase Auth واختبار دخوله قبل الترحيل';
  END IF;
END $$;

-- NULL for historical contracts: the UI derives their base from the saved total.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS base_price numeric(12,2);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS national_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS shift_time text;

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

-- Roles are read from Auth's protected metadata, never from browser storage or
-- the legacy editable public.users.role. Revocations take effect immediately.
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
  -- Preserve historical paid balances; only add this explicitly requested receipt.
  IF amount > least(b.remaining_amount, b.final_amount - b.paid_amount) THEN
    RAISE EXCEPTION 'المبلغ يتجاوز المتبقي؛ حدّث الحجز أولاً';
  END IF;
  INSERT INTO public.payments (booking_id, booking_number, customer_name, customer_phone,
    receipt_number, amount, payment_method, reference_number, payment_date, notes)
  VALUES (b.id, b.booking_number, b.customer_name, b.customer_phone,
    'REC-' || p_request_id::text, amount, method, p_payload->>'reference_number', payment_day, p_payload->>'notes')
  RETURNING * INTO p;
  IF method = 'نقدي' THEN
    INSERT INTO public.cash_transactions (type,source,reference_id,reference_label,amount,transaction_date)
    VALUES ('إيراد','حجز',b.id::text,'دفعة حجز ' || b.booking_number,amount,payment_day);
  ELSE
    INSERT INTO public.bank_transactions (type,source,reference_id,reference_label,amount,transaction_date,payment_method)
    VALUES ('إيراد','حجز',b.id::text,'دفعة حجز ' || b.booking_number,amount,payment_day,method);
  END IF;
  UPDATE public.bookings SET paid_amount = b.paid_amount + amount,
    remaining_amount = b.remaining_amount - amount WHERE id = b.id RETURNING * INTO b;
  result := jsonb_build_object('payment',to_jsonb(p),'booking',to_jsonb(b));
  INSERT INTO public.accounting_requests VALUES (p_request_id,auth.uid(),'payment',p_payload,result,now());
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking_with_deposit(p_request_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE b public.bookings%ROWTYPE; result jsonb; deposit numeric := coalesce(nullif(p_payload->>'initial_payment_amount','')::numeric,0);
  gross numeric := (p_payload->>'total_amount')::numeric;
  discount_value numeric := coalesce(nullif(p_payload->>'discount','')::numeric,0);
BEGIN
  result := public.accounting_previous(p_request_id, 'booking', p_payload);
  IF result IS NOT NULL THEN RETURN result; END IF;
  IF coalesce(trim(p_payload->>'customer_name'),'')='' OR coalesce(trim(p_payload->>'customer_phone'),'')='' THEN
    RAISE EXCEPTION 'اسم العميل ورقم الهاتف مطلوبان';
  END IF;
  IF coalesce(p_payload->>'event_date','') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'تاريخ المناسبة غير صالح'; END IF;
  PERFORM (p_payload->>'event_date')::date;
  IF gross IS NULL OR gross::text IN ('NaN','Infinity','-Infinity') OR gross < 0 OR round(gross,2) <> gross OR
    discount_value::text IN ('NaN','Infinity','-Infinity') OR discount_value < 0 OR discount_value > gross OR round(discount_value,2) <> discount_value OR
    deposit::text IN ('NaN','Infinity','-Infinity') OR deposit < 0 OR deposit > gross - discount_value OR round(deposit,2) <> deposit THEN
    RAISE EXCEPTION 'قيمة العقد أو الخصم أو العربون غير صالحة';
  END IF;
  -- Insert only a new contract. No adjustment of historical rows.
  INSERT INTO public.bookings (booking_number,customer_id,customer_name,customer_phone,national_id,voucher_number,
    event_date,event_date_hijri,hall_section,event_type,shift_time,service_type,status,items,
    base_price,total_amount,discount,final_amount,paid_amount,remaining_amount,initial_payment_amount,initial_payment_method,notes)
  VALUES (p_payload->>'booking_number',nullif(p_payload->>'customer_id','')::uuid,p_payload->>'customer_name',
    p_payload->>'customer_phone',p_payload->>'national_id',p_payload->>'voucher_number',p_payload->>'event_date',
    p_payload->>'event_date_hijri',p_payload->>'hall_section',coalesce(p_payload->>'event_type','زواج'),
    p_payload->>'shift_time',coalesce(p_payload->>'service_type','خدمات كاملة'),coalesce(p_payload->>'status','معلق'),
    coalesce(p_payload->'items','[]'::jsonb),nullif(p_payload->>'base_price','')::numeric,gross,discount_value,gross-discount_value,
    0,gross-discount_value,deposit,coalesce(p_payload->>'initial_payment_method','نقدي'),p_payload->>'notes') RETURNING * INTO b;
  IF p_payload->>'auto_create_customer'='true' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(regexp_replace(b.customer_phone,'\D','','g'),1));
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE regexp_replace(phone,'\D','','g')=regexp_replace(b.customer_phone,'\D','','g')) THEN
      INSERT INTO public.customers(name,phone,notes) VALUES(b.customer_name,b.customer_phone,'عميل حجز سريع');
    END IF;
  END IF;
  IF deposit > 0 THEN
    result := public.record_booking_payment(gen_random_uuid(),jsonb_build_object('booking_id',b.id,'amount',deposit,
      'payment_method',b.initial_payment_method,'payment_date',to_char(current_timestamp AT TIME ZONE 'Asia/Riyadh','YYYY-MM-DD'),'notes','دفعة الحجز الأولى'));
    SELECT * INTO b FROM public.bookings WHERE id = b.id;
  END IF;
  result := to_jsonb(b);
  INSERT INTO public.accounting_requests VALUES (p_request_id,auth.uid(),'booking',p_payload,result,now());
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_booking_safely(p_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE b public.bookings%ROWTYPE; merged public.bookings%ROWTYPE; financial_change boolean;
BEGIN
  PERFORM public.accounting_require_access();
  SELECT * INTO STRICT b FROM public.bookings WHERE id = p_id FOR UPDATE;
  SELECT * INTO merged FROM jsonb_populate_record(b, p_payload - ARRAY[
    'id','booking_number','paid_amount','remaining_amount','created_at','created_date','updated_at','customer_id']);
  financial_change := merged.total_amount IS DISTINCT FROM b.total_amount OR merged.discount IS DISTINCT FROM b.discount
    OR merged.final_amount IS DISTINCT FROM b.final_amount OR merged.items IS DISTINCT FROM b.items OR merged.base_price IS DISTINCT FROM b.base_price;
  IF financial_change THEN
    IF coalesce(p_payload->>'expected_updated_at',p_payload->>'updated_at') IS NULL OR
      coalesce(p_payload->>'expected_updated_at',p_payload->>'updated_at')::timestamptz IS DISTINCT FROM b.updated_at THEN
      RAISE EXCEPTION 'الحجز تغيّر منذ فتحه؛ حدّث الصفحة قبل تعديل قيمة العقد';
    END IF;
    IF merged.total_amount IS NULL OR merged.final_amount IS NULL OR merged.discount IS NULL OR
      merged.total_amount::text IN ('NaN','Infinity','-Infinity') OR merged.discount::text IN ('NaN','Infinity','-Infinity') OR
      merged.total_amount < 0 OR merged.discount < 0 OR merged.discount > merged.total_amount OR
      merged.final_amount <> merged.total_amount - merged.discount OR merged.final_amount < b.paid_amount THEN
      RAISE EXCEPTION 'قيمة العقد لا تتطابق مع الخصم أو تقل عن المبلغ المسدد';
    END IF;
  END IF;
  UPDATE public.bookings SET customer_name=merged.customer_name,customer_phone=merged.customer_phone,
    national_id=merged.national_id,voucher_number=merged.voucher_number,event_date=merged.event_date,
    event_date_hijri=merged.event_date_hijri,hall_section=merged.hall_section,event_type=merged.event_type,
    shift_time=merged.shift_time,service_type=merged.service_type,status=merged.status,notes=merged.notes,
    items=merged.items,base_price=merged.base_price,total_amount=merged.total_amount,discount=merged.discount,
    final_amount=merged.final_amount,
    remaining_amount=CASE WHEN merged.final_amount IS DISTINCT FROM b.final_amount
      THEN b.remaining_amount + merged.final_amount - b.final_amount ELSE b.remaining_amount END
  WHERE id=p_id RETURNING * INTO b;
  RETURN to_jsonb(b);
END;
$$;

-- Prevent old clients from removing contracts or rewriting financial history.
CREATE OR REPLACE FUNCTION public.reject_ledger_rewrite()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN RAISE EXCEPTION 'السجلات المالية محفوظة؛ التعديل والحذف المباشر محظور'; END;
$$;
DO $$ DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['payments','expenses','cash_transactions','bank_transactions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS preserve_financial_history ON public.%I',table_name);
    EXECUTE format('CREATE TRIGGER preserve_financial_history BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.reject_ledger_rewrite()',table_name);
  END LOOP;
END $$;
DROP TRIGGER IF EXISTS preserve_booking_history ON public.bookings;
CREATE TRIGGER preserve_booking_history BEFORE DELETE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.reject_ledger_rewrite();

-- Remove all permissive legacy policies, rather than adding restrictive ones
-- alongside them (permissive policies combine using OR).
DO $$ DECLARE item record; table_name text;
BEGIN
  FOR item IN SELECT schemaname,tablename,policyname FROM pg_policies WHERE schemaname='public' AND
    tablename IN ('customers','hall_settings','bookings','payments','expenses','cash_transactions','bank_transactions','users') LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I',item.policyname,item.schemaname,item.tablename);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['customers','hall_settings','bookings','payments','expenses','cash_transactions','bank_transactions','users'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',table_name);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',table_name);
    EXECUTE format('CREATE POLICY accounting_read ON public.%I FOR SELECT TO authenticated USING (public.accounting_access(false))',table_name);
  END LOOP;
END $$;
GRANT INSERT,UPDATE ON public.customers TO authenticated;
CREATE POLICY accounting_customers ON public.customers FOR ALL TO authenticated USING (public.accounting_access(false)) WITH CHECK (public.accounting_access(false));
GRANT UPDATE ON public.hall_settings TO authenticated;
CREATE POLICY accounting_settings ON public.hall_settings FOR UPDATE TO authenticated USING (public.accounting_access(true)) WITH CHECK (public.accounting_access(true));

REVOKE ALL ON FUNCTION public.record_booking_payment(uuid,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_booking_with_deposit(uuid,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.update_booking_safely(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_booking_payment(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_with_deposit(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_booking_safely(uuid,jsonb) TO authenticated;
COMMIT;
