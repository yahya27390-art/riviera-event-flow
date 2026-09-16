import { supabase } from '@/lib/supabase';

// ─── 1. CUSTOMERS API ────────────────────────────────────────────────────────
export const customersApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(customer) {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ─── 2. BOOKINGS API ─────────────────────────────────────────────────────────
export const bookingsApi = {
  async getAll(filter = {}) {
    let query = supabase
      .from('bookings')
      .select('*, payments(*)')
      .order('event_date', { ascending: false });

    if (filter.status) query = query.eq('status', filter.status);
    if (filter.event_date) query = query.eq('event_date', filter.event_date);
    if (filter.startDate && filter.endDate) {
      query = query.gte('event_date', filter.startDate).lte('event_date', filter.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, customers(*), payments(*), expenses(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async checkAvailability(eventDate, eventPeriod, excludeBookingId = null) {
    let query = supabase
      .from('bookings')
      .select('id, booking_number, event_period, status')
      .eq('event_date', eventDate)
      .neq('status', 'cancelled');

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) return { available: true };

    const hasFullDay = data.some(b => b.event_period === 'full_day');
    if (hasFullDay) return { available: false, conflict: 'محجوز بالكامل طوال اليوم' };

    if (eventPeriod === 'full_day' && data.length > 0) {
      return { available: false, conflict: 'يوجد حجز في إحدى الفترات بهذا اليوم' };
    }

    const hasSamePeriod = data.some(b => b.event_period === eventPeriod);
    if (hasSamePeriod) {
      return { available: false, conflict: `الفترة (${eventPeriod === 'morning' ? 'صباحي' : 'مسائي'}) محجوزة بالفعل` };
    }

    return { available: true };
  },

  async create(booking) {
    // Generate Booking Number if not provided
    if (!booking.booking_number) {
      const year = new Date(booking.event_date || new Date()).getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      booking.booking_number = `BK-${year}-${rand}`;
    }

    // Ensure numeric calculations
    booking.hall_price = Number(booking.hall_price || 0);
    booking.additional_services_price = Number(booking.additional_services_price || 0);
    booking.discount_amount = Number(booking.discount_amount || 0);
    booking.insurance_amount = Number(booking.insurance_amount || 0);
    booking.total_amount = Number(booking.total_amount || (booking.hall_price + booking.additional_services_price - booking.discount_amount));
    booking.paid_amount = Number(booking.paid_amount || 0);
    booking.remaining_amount = Math.max(0, booking.total_amount - booking.paid_amount);

    const { data, error } = await supabase
      .from('bookings')
      .insert([booking])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    if (updates.hall_price !== undefined || updates.additional_services_price !== undefined || updates.discount_amount !== undefined) {
      const hallPrice = Number(updates.hall_price ?? 0);
      const addPrice = Number(updates.additional_services_price ?? 0);
      const discount = Number(updates.discount_amount ?? 0);
      updates.total_amount = Math.max(0, hallPrice + addPrice - discount);
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ─── 3. PAYMENTS API ─────────────────────────────────────────────────────────
export const paymentsApi = {
  async getAll(filter = {}) {
    let query = supabase
      .from('payments')
      .select('*, bookings(booking_number, customer_name, event_date)')
      .order('payment_date', { ascending: false });

    if (filter.booking_id) query = query.eq('booking_id', filter.booking_id);
    if (filter.payment_type) query = query.eq('payment_type', filter.payment_type);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async create(payment) {
    if (!payment.receipt_number) {
      payment.receipt_number = `REC-${Date.now().toString().slice(-6)}`;
    }

    const { data, error } = await supabase
      .from('payments')
      .insert([payment])
      .select()
      .single();
    if (error) throw error;

    // Automatically register a cash/bank transaction
    if (payment.payment_method === 'cash') {
      await cashApi.create({
        transaction_type: 'income',
        amount: payment.amount,
        category: 'عربون / دفعة حجز',
        description: `سند قبض رقم ${payment.receipt_number} لحجز ${payment.booking_id || ''}`,
        related_booking_id: payment.booking_id,
        related_payment_id: data.id,
        performed_by: payment.created_by || 'المشرف',
        transaction_date: payment.payment_date || new Date().toISOString().split('T')[0]
      });
    }

    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ─── 4. CASH MANAGEMENT API (الخزينة) ─────────────────────────────────────────
export const cashApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('cash_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(tx) {
    if (!tx.transaction_number) {
      tx.transaction_number = `CSH-${Date.now().toString().slice(-6)}`;
    }
    const { data, error } = await supabase
      .from('cash_transactions')
      .insert([tx])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getBalance() {
    const { data, error } = await supabase
      .from('cash_transactions')
      .select('transaction_type, amount');
    if (error) throw error;

    let income = 0;
    let expense = 0;
    (data || []).forEach(t => {
      if (t.transaction_type === 'income') income += Number(t.amount || 0);
      else if (t.transaction_type === 'expense') expense += Number(t.amount || 0);
    });

    return {
      totalIncome: income,
      totalExpense: expense,
      currentBalance: income - expense
    };
  }
};

// ─── 5. BANK MANAGEMENT API (البنوك) ──────────────────────────────────────────
export const bankApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(tx) {
    const { data, error } = await supabase
      .from('bank_transactions')
      .insert([tx])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ─── 6. EXPENSES API (المصروفات) ─────────────────────────────────────────────
export const expensesApi = {
  async getAll(filter = {}) {
    let query = supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });

    if (filter.category) query = query.eq('category', filter.category);
    if (filter.related_booking_id) query = query.eq('related_booking_id', filter.related_booking_id);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async create(expense) {
    if (!expense.expense_number) {
      expense.expense_number = `EXP-${Date.now().toString().slice(-6)}`;
    }
    const { data, error } = await supabase
      .from('expenses')
      .insert([expense])
      .select()
      .single();
    if (error) throw error;

    if (expense.payment_method === 'cash') {
      await cashApi.create({
        transaction_type: 'expense',
        amount: expense.amount,
        category: expense.category,
        description: `صرف مصروفات: ${expense.description || expense.category} (سند ${expense.expense_number})`,
        related_booking_id: expense.related_booking_id,
        transaction_date: expense.expense_date || new Date().toISOString().split('T')[0]
      });
    }

    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ─── 7. HALL SETTINGS API ────────────────────────────────────────────────────
export const hallSettingsApi = {
  async get() {
    const { data, error } = await supabase
      .from('hall_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('hall_settings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ─── 8. DASHBOARD STATS API ──────────────────────────────────────────────────
export const dashboardApi = {
  async getStats() {
    const [bookingsRes, paymentsRes, expensesRes, cashRes] = await Promise.all([
      supabase.from('bookings').select('id, event_date, status, total_amount, paid_amount, remaining_amount'),
      supabase.from('payments').select('amount, payment_date'),
      supabase.from('expenses').select('amount, expense_date'),
      cashApi.getBalance()
    ]);

    const bookings = bookingsRes.data || [];
    const payments = paymentsRes.data || [];
    const expenses = expensesRes.data || [];

    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    const tentativeBookings = bookings.filter(b => b.status === 'tentative').length;

    let totalRevenue = 0;
    let totalPendingPayments = 0;
    bookings.forEach(b => {
      if (b.status !== 'cancelled') {
        totalRevenue += Number(b.paid_amount || 0);
        totalPendingPayments += Number(b.remaining_amount || 0);
      }
    });

    let totalExpenses = 0;
    expenses.forEach(e => {
      totalExpenses += Number(e.amount || 0);
    });

    const netProfit = totalRevenue - totalExpenses;

    return {
      totalBookings,
      confirmedBookings,
      tentativeBookings,
      totalRevenue,
      totalPendingPayments,
      totalExpenses,
      netProfit,
      cashBalance: cashRes.currentBalance,
      bookingsList: bookings
    };
  }
};
