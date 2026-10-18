import { readAll } from './readAll';
import { updateBookingSafely } from './accountingOperations';
import { supabase } from '@/lib/supabase';

/**
 * Supabase Entity Client Adapter
 * Bridges Base44 SDK calls (list, create, update, delete, deleteMany) directly to Supabase PostgreSQL
 */
function createEntityClient(tableName) {
  return {
    async list(sort = '-created_at') {
      const descending = sort.startsWith('-');
      let column = descending ? sort.slice(1) : sort;
      if (column === 'created_date') column = 'created_at';
      return readAll(supabase, tableName, { sort: column, ascending: !descending });
    },

    async get(id) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error(`Error getting record ${id} from ${tableName}:`, err);
        throw err;
      }
    },

    async create(record) {
      if (['bookings', 'payments', 'cash_transactions', 'bank_transactions', 'expenses'].includes(tableName)) {
        throw new Error('يجب تسجيل العملية المالية من المسار الموحد لضمان اكتمال جميع القيود');
      }
      try {
        const payload = { ...record };
        if (!payload.created_at) payload.created_at = new Date().toISOString();
        if (!payload.created_date) payload.created_date = new Date().toISOString();

        // Remove empty ID so Postgres generates default UUID
        if (!payload.id) {
          delete payload.id;
        }

        // Remove virtual or non-existent columns from bookings table


        // Sanitize columns for expenses to prevent Supabase schema errors
        if (tableName === 'expenses') {
          if (payload.created_by) {
            if (!payload.edited_by) payload.edited_by = payload.created_by;
            delete payload.created_by;
          }
          const validCols = new Set([
            'id', 'expense_number', 'expense_type', 'amount', 'payment_method',
            'description', 'expense_date', 'edited_by', 'notes', 'created_at', 'created_date'
          ]);
          for (const k of Object.keys(payload)) {
            if (!validCols.has(k)) delete payload[k];
          }
        }

        // Sanitize columns for cash_transactions
        if (tableName === 'cash_transactions') {
          const validCols = new Set([
            'id', 'type', 'source', 'reference_id', 'reference_label',
            'amount', 'transaction_date', 'description', 'notes', 'created_at', 'created_date'
          ]);
          for (const k of Object.keys(payload)) {
            if (!validCols.has(k)) delete payload[k];
          }
        }

        // Sanitize columns for bank_transactions
        if (tableName === 'bank_transactions') {
          const validCols = new Set([
            'id', 'type', 'source', 'reference_id', 'reference_label',
            'amount', 'payment_method', 'bank_name', 'transaction_date',
            'description', 'notes', 'created_at', 'created_date'
          ]);
          for (const k of Object.keys(payload)) {
            if (!validCols.has(k)) delete payload[k];
          }
        }

        const { data, error } = await supabase
          .from(tableName)
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error(`Error inserting into ${tableName}:`, err);
        throw err;
      }
    },

    async update(id, updates) {
      if (['payments', 'cash_transactions', 'bank_transactions', 'expenses'].includes(tableName)) {
        throw new Error('السجلات المالية محفوظة ولا تقبل التعديل المباشر');
      }
      if (tableName === 'bookings') return updateBookingSafely(id, updates);
      try {
        const payload = { ...updates };
        delete payload.id;
        if (payload.created_at) delete payload.created_at;
        if (tableName === 'bookings') {
          delete payload.base_price;
        }

        if (tableName === 'expenses') {
          if (payload.created_by) {
            if (!payload.edited_by) payload.edited_by = payload.created_by;
            delete payload.created_by;
          }
          const validCols = new Set([
            'expense_number', 'expense_type', 'amount', 'payment_method',
            'description', 'expense_date', 'edited_by', 'notes', 'updated_at'
          ]);
          for (const k of Object.keys(payload)) {
            if (!validCols.has(k)) delete payload[k];
          }
        }

        if (tableName === 'cash_transactions') {
          const validCols = new Set([
            'type', 'source', 'reference_id', 'reference_label',
            'amount', 'transaction_date', 'description', 'notes', 'updated_at'
          ]);
          for (const k of Object.keys(payload)) {
            if (!validCols.has(k)) delete payload[k];
          }
        }

        if (tableName === 'bank_transactions') {
          const validCols = new Set([
            'type', 'source', 'reference_id', 'reference_label',
            'amount', 'payment_method', 'bank_name', 'transaction_date',
            'description', 'notes', 'updated_at'
          ]);
          for (const k of Object.keys(payload)) {
            if (!validCols.has(k)) delete payload[k];
          }
        }

        const { data, error } = await supabase
          .from(tableName)
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error(`Error updating record ${id} in ${tableName}:`, err);
        throw err;
      }
    },

    async delete(id) {
      if (['bookings', 'payments', 'cash_transactions', 'bank_transactions', 'expenses'].includes(tableName)) {
        throw new Error('لا يمكن حذف الحجوزات أو السجلات المالية؛ استخدم إلغاء الحجز مع الاحتفاظ بسنداته');
      }
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error(`Error deleting record ${id} from ${tableName}:`, err);
        throw err;
      }
    },

    async deleteMany(filter = {}) {
      if (['bookings', 'payments', 'cash_transactions', 'bank_transactions', 'expenses'].includes(tableName)) {
        throw new Error('حذف السجلات المالية محظور لحماية الأرصدة');
      }
      if (!Object.keys(filter).length) throw new Error('يلزم تحديد السجلات');
      try {
        let query = supabase.from(tableName).delete();
        for (const [key, val] of Object.entries(filter)) {
          query = query.eq(key, val);
        }
        const { error } = await query;
        if (error) throw error;
        return true;
      } catch (err) {
        console.error(`Error in deleteMany for ${tableName}:`, err);
        throw err;
      }
    },

    async filter(criteria = {}) {
      return readAll(supabase, tableName, { criteria });
    }
  };
}

export const base44 = {
  entities: {
    Booking: createEntityClient('bookings'),
    Customer: createEntityClient('customers'),
    Payment: createEntityClient('payments'),
    CashTransaction: createEntityClient('cash_transactions'),
    BankTransaction: createEntityClient('bank_transactions'),
    Expense: createEntityClient('expenses'),
    HallSettings: createEntityClient('hall_settings'),
    User: createEntityClient('users')
  },
  auth: {
    async me() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error('يلزم تسجيل الدخول');
      return { id: user.id, email: user.email, full_name: user.user_metadata?.full_name,
        role: user.app_metadata?.role || 'accountant' };
    },
    async logout(redirectUrl) {
      await supabase.auth.signOut();
      if (redirectUrl) window.location.href = redirectUrl;
    },
    redirectToLogin() { window.location.href = '/'; }
  }
};
