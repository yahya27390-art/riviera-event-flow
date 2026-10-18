BEGIN;
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
COMMIT;
