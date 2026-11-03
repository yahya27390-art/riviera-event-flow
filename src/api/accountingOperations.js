import { supabase } from '@/lib/supabase';

// Persist only an opaque payload hash and request ID, never customer details.
// A retry after a lost response or page reload reuses its request ID.
const requests = new Map();
const inFlight = new Map();
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])]),
  );
  return value;
}
function operation(name, payload) {
  const identity = name + JSON.stringify(canonical(payload));
  if (inFlight.has(identity)) return inFlight.get(identity);
  const pending = submit(name, payload, identity);
  inFlight.set(identity, pending);
  pending.then(() => inFlight.delete(identity), () => inFlight.delete(identity));
  return pending;
}
async function submit(name, payload, identity) {
  const bytes = new TextEncoder().encode(identity);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const key = 'riviera_pending_' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  let requestId = requests.get(key) || sessionStorage.getItem(key);
  if (!requestId) {
    requestId = crypto.randomUUID();
    requests.set(key, requestId);
    sessionStorage.setItem(key, requestId);
  }
  const { data, error } = await supabase.rpc(name, {
    p_request_id: requestId, p_payload: payload,
  });
  if (error) throw new Error(error.message);
  requests.delete(key);
  sessionStorage.removeItem(key);
  return data;
}

export const recordBookingPayment = payload => operation('record_booking_payment', payload);
export const createBookingWithDeposit = payload => operation('create_booking_with_deposit', payload);
export const recordLedgerOperation = payload => operation('record_ledger_operation', payload);
export async function updateBookingSafely(id, payload) {
  const validCols = new Set([
    'customer_name',
    'customer_phone',
    'national_id',
    'voucher_number',
    'event_date',
    'event_date_hijri',
    'hall_section',
    'section_id',
    'package_id',
    'event_type',
    'shift_time',
    'service_type',
    'status',
    'items',
    'base_price',
    'total_amount',
    'discount',
    'final_amount',
    'paid_amount',
    'remaining_amount',
    'initial_payment_amount',
    'initial_payment_method',
    'notes',
    'updated_at'
  ]);

  const cleanPayload = {};
  for (const [key, val] of Object.entries(payload || {})) {
    if (validCols.has(key) && val !== undefined) {
      cleanPayload[key] = val;
    }
  }
  cleanPayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('bookings')
    .update(cleanPayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update booking in Supabase:', error);
    throw new Error(error.message);
  }

  return data;
}
