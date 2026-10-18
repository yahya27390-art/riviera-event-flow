// A missing phone must never combine unrelated customers into one account.
export function statementKey(booking) {
  if (booking.customer_phone?.trim()) return `phone:${booking.customer_phone}`;
  if (booking.customer_id) return `customer:${booking.customer_id}`;
  return `booking:${booking.id}`;
}

export function statementCustomers(bookings) {
  const customers = new Map();
  for (const booking of bookings) {
    const key = statementKey(booking);
    if (!customers.has(key)) customers.set(key, {
      key, name: booking.customer_name, phone: booking.customer_phone || '',
      customerId: booking.customer_id, bookingId: booking.id,
    });
  }
  return [...customers.values()];
}

export function matchesStatementCustomer(booking, customer) {
  if (!customer) return false;
  if (customer.key) return statementKey(booking) === customer.key;
  if (customer.phone?.trim()) return booking.customer_phone === customer.phone;
  if (customer.customerId) return booking.customer_id === customer.customerId;
  return Boolean(customer.bookingId) && booking.id === customer.bookingId;
}
