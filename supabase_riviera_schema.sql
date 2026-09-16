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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

-- ==============================================================================
-- 3. TABLE: hall_settings (إعدادات وبنود القاعة والأسعار الافتراضية)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.hall_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_name TEXT NOT NULL DEFAULT 'قاعة قمة الريف',
    capacity INT DEFAULT 500,
    morning_price NUMERIC(12, 2) DEFAULT 5000.00,
    evening_price NUMERIC(12, 2) DEFAULT 12000.00,
    full_day_price NUMERIC(12, 2) DEFAULT 15000.00,
    deposit_percentage NUMERIC(5, 2) DEFAULT 30.00,
    insurance_amount NUMERIC(12, 2) DEFAULT 1000.00,
    terms_and_conditions TEXT DEFAULT 'شروط العقد: يتم دفع العربون لتأكيد الحجز، والمبلغ المتبقي قبل موعد الحفل بأسبوع على الأقل.',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Hall Settings if empty
INSERT INTO public.hall_settings (hall_name, capacity, morning_price, evening_price, full_day_price)
SELECT 'قاعة قمة الريف ( ريفييرا سابقا )', 500, 5000.00, 12000.00, 15000.00
WHERE NOT EXISTS (SELECT 1 FROM public.hall_settings);

-- ==============================================================================
-- 4. TABLE: bookings (سجل حجوزات القاعة والعقود)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_period TEXT NOT NULL CHECK (event_period IN ('morning', 'evening', 'full_day')),
    event_type TEXT NOT NULL DEFAULT 'wedding',
    guests_count INT DEFAULT 0,
    hall_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    additional_services_price NUMERIC(12, 2) DEFAULT 0.00,
    insurance_amount NUMERIC(12, 2) DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'tentative' CHECK (status IN ('tentative', 'confirmed', 'completed', 'cancelled')),
    services_details JSONB DEFAULT '[]'::JSONB,
    contract_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
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
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    receipt_number TEXT UNIQUE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_type TEXT NOT NULL DEFAULT 'deposit' CHECK (payment_type IN ('deposit', 'installment', 'final_payment', 'insurance', 'other')),
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'pos', 'cheque')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

-- ==============================================================================
-- 6. TABLE: cash_transactions (حركة الخزينة النقدية - كاش)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number TEXT UNIQUE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'custody_settlement', 'transfer')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    related_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    related_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    performed_by TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_tx_date ON public.cash_transactions(transaction_date);

-- ==============================================================================
-- 7. TABLE: bank_transactions (سجل الحسابات والتحويلات البنكية)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reference_number TEXT,
    description TEXT,
    related_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_matched BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_tx_date ON public.bank_transactions(transaction_date);

-- ==============================================================================
-- 8. TABLE: expenses (مصروفات تشغيل وصيانة القاعة)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number TEXT UNIQUE,
    category TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'cash',
    vendor_name TEXT,
    invoice_number TEXT,
    description TEXT,
    related_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

-- ==============================================================================
-- 9. AUTOMATED TRIGGERS & BUSINESS LOGIC
-- ==============================================================================

-- A. Update timestamps trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_hall_settings_updated_at BEFORE UPDATE ON public.hall_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- B. Calculate Booking Balance Trigger on Payments
CREATE OR REPLACE FUNCTION public.sync_booking_payment_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_booking_id UUID;
    v_total_paid NUMERIC(12, 2);
    v_total_amount NUMERIC(12, 2);
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_booking_id := OLD.booking_id;
    ELSE
        v_booking_id := NEW.booking_id;
    END IF;

    IF v_booking_id IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0.00) INTO v_total_paid
        FROM public.payments
        WHERE booking_id = v_booking_id;

        SELECT total_amount INTO v_total_amount
        FROM public.bookings
        WHERE id = v_booking_id;

        UPDATE public.bookings
        SET 
            paid_amount = v_total_paid,
            remaining_amount = GREATEST(0.00, v_total_amount - v_total_paid),
            status = CASE 
                WHEN status = 'cancelled' THEN 'cancelled'
                WHEN v_total_paid >= v_total_amount AND v_total_amount > 0 THEN 'confirmed'
                WHEN v_total_paid > 0 THEN 'confirmed'
                ELSE status
            END
        WHERE id = v_booking_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_booking_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_booking_payment_totals();

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Allow read and write for authenticated & anon client with valid api key
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
        'customers', 'hall_settings', 'bookings', 'payments', 'cash_transactions', 'bank_transactions', 'expenses'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Enable all access for app operations" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Enable all access for app operations" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- SCHEMA CREATION COMPLETED SUCCESSFULLY ✓
-- ==============================================================================
