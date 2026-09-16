import { supabase } from '@/lib/supabase';

/**
 * Supabase Entity Client Adapter
 * Bridges Base44 SDK calls (list, create, update, delete, deleteMany) directly to Supabase PostgreSQL
 */
function createEntityClient(tableName) {
  return {
    async list(sort = '-created_at', limit = 1000) {
      try {
        let query = supabase.from(tableName).select('*');
        
        if (sort && typeof sort === 'string') {
          const isDesc = sort.startsWith('-');
          let col = isDesc ? sort.substring(1) : sort;
          if (col === 'created_date') col = 'created_at';
          query = query.order(col, { ascending: !isDesc });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        if (limit && typeof limit === 'number') {
          query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) {
          console.warn(`Supabase query warning for table '${tableName}':`, error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.error(`Error listing from ${tableName}:`, err);
        return [];
      }
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
      try {
        const payload = { ...record };
        if (!payload.created_at) payload.created_at = new Date().toISOString();
        if (!payload.created_date) payload.created_date = new Date().toISOString();
        
        // Remove empty ID so Postgres generates default UUID
        if (!payload.id) {
          delete payload.id;
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
      try {
        const payload = { ...updates };
        delete payload.id;
        if (payload.created_at) delete payload.created_at;

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
      try {
        let query = supabase.from(tableName).select('*');
        for (const [key, val] of Object.entries(criteria)) {
          query = query.eq(key, val);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error(`Error in filter for ${tableName}:`, err);
        return [];
      }
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
      const savedUser = localStorage.getItem('qemat_alreef_user');
      if (savedUser) {
        try {
          return JSON.parse(savedUser);
        } catch {
          // ignore
        }
      }
      return {
        id: 'admin-1',
        full_name: 'مدير النظام',
        email: 'admin@qemat-alreef.com',
        role: 'admin'
      };
    },
    logout(redirectUrl) {
      localStorage.removeItem('qemat_alreef_user');
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    redirectToLogin() {
      // Local fallback
    }
  }
};
