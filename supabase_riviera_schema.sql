-- ==============================================================================
-- 🏛️ RIVIERA EVENT FLOW - MASTER SUPABASE (POSTGRESQL) SCHEMA
-- نظام إدارة قاعة قمة الريف (ريفييرا سابقاً) للحفلات والمناسبات
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLE: customers (سجل العملاء)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    national_id TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

-- ==============================================================================
-- 3. TABLE: hall_settings (إعدادات وبنود القاعة والأسعار الافتراضية)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.hall_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_name TEXT NOT NULL DEFAULT 'قاعة قمة الريف ( ريفييرا سابقا )',
    logo_url TEXT,
    commercial_register TEXT,
    tax_number TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    email TEXT,
    website TEXT,
    bank_name TEXT,
    iban TEXT,
    morning_price NUMERIC(12, 2) DEFAULT 5000.00,
    evening_price NUMERIC(12, 2) DEFAULT 12000.00,
    deposit_amount NUMERIC(12, 2) DEFAULT 3000.00,
    insurance_amount NUMERIC(12, 2) DEFAULT 1000.00,
    terms_conditions TEXT DEFAULT 'شروط العقد: يتم دفع العربون لتأكيد الحجز، والمبلغ المتبقي قبل موعد الحفل بأسبوع على الأقل.',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Hall Settings if empty
INSERT INTO public.hall_settings (hall_name, morning_price, evening_price)
SELECT 'قاعة قمة الريف ( ريفييرا سابقا )', 5000.00, 12000.00
WHERE NOT EXISTS (SELECT 1 FROM public.hall_settings);

-- ==============================================================================
-- 4. TABLE: bookings (سجل حجوزات القاعة والعقود)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number TEXT UNIQUE NOT NULL,
    voucher_number TEXT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_date_hijri TEXT,
    hall_section TEXT DEFAULT 'رجال ونساء',
    event_type TEXT NOT NULL DEFAULT 'زواج',
    service_type TEXT DEFAULT 'خدمات كاملة',
    status TEXT NOT NULL DEFAULT 'معلق',
    items JSONB DEFAULT '[]'::JSONB,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    final_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    initial_payment_amount NUMERIC(12, 2) DEFAULT 0.00,
    initial_payment_method TEXT DEFAULT 'نقدي',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON public.bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON public.bookings(customer_phone);

-- ==============================================================================
-- 5. TABLE: payments (سندات القبض والدفعات)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    booking_number TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    receipt_number TEXT,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'نقدي',
    reference_number TEXT,
    payment_date TEXT NOT NULL DEFAULT CURRENT_DATE::TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

-- ==============================================================================
-- 6. TABLE: cash_transactions (حركة الخزينة النقدية - كاش)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    reference_id TEXT,
    reference_label TEXT,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    transaction_date TEXT NOT NULL DEFAULT CURRENT_DATE::TEXT,
    description TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_tx_date ON public.cash_transactions(transaction_date);

-- ==============================================================================
-- 7. TABLE: bank_transactions (سجل الحسابات والتحويلات البنكية)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    reference_id TEXT,
    reference_label TEXT,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT DEFAULT 'تحويل بنكي',
    bank_name TEXT,
    transaction_date TEXT NOT NULL DEFAULT CURRENT_DATE::TEXT,
    description TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_tx_date ON public.bank_transactions(transaction_date);

-- ==============================================================================
-- 8. TABLE: expenses (مصروفات تشغيل وصيانة القاعة)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number TEXT,
    expense_type TEXT NOT NULL DEFAULT 'أخرى',
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'نقدي',
    description TEXT,
    expense_date TEXT NOT NULL DEFAULT CURRENT_DATE::TEXT,
    edited_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON public.expenses(expense_type);

-- ==============================================================================
-- 9. TABLE: users (مستخدمي النظام والصلاحيات)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'accountant',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. AUTOMATED TRIGGERS & BUSINESS LOGIC
-- ==============================================================================

-- A. Update timestamps trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_hall_settings_updated_at ON public.hall_settings;
CREATE TRIGGER trg_hall_settings_updated_at BEFORE UPDATE ON public.hall_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow read and write for authenticated & anon client with valid api key
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
        'customers', 'hall_settings', 'bookings', 'payments', 'cash_transactions', 'bank_transactions', 'expenses', 'users'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Enable all access for app operations" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Enable all access for app operations" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- SCHEMA CREATION COMPLETED SUCCESSFULLY ✓
-- ==============================================================================
