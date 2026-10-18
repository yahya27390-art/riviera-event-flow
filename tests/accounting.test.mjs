import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookingBasePrice, financialSummary } from '../src/lib/accounting.js';
import { readAll } from '../src/api/readAll.js';

test('legacy booking retains gross, discount, paid and outstanding when reopened', () => {
  const booking = { total_amount: 15000, final_amount: 14000, discount: 1000,
    paid_amount: 4000, remaining_amount: 10000, items: [{ total: 3000 }] };
  const before = structuredClone(booking);
  const base = bookingBasePrice(booking);
  assert.equal(base, 12000);
  assert.equal(base + booking.items[0].total - booking.discount, booking.final_amount);
  assert.deepEqual(booking, before);
});
test('explicit zero base is retained and numeric strings work', () => {
  assert.equal(bookingBasePrice({ base_price: 0, total_amount: 2000 }), 0);
  assert.equal(bookingBasePrice({ total_amount: '15000.50', items: [{ total: '3000.25' }] }), 12000.25);
});
test('internal transfer changes accounts but never revenue or total holdings', () => {
  const cash = [{ type: 'إيراد', source: 'حجز', amount: 10000, transaction_date: '2026-10-01' },
    { type: 'مصروف', source: 'تحويل', amount: 3000, transaction_date: '2026-10-02' }];
  const bank = [{ type: 'إيراد', source: 'تحويل', amount: 3000, transaction_date: '2026-10-02' }];
  const before = structuredClone({ cash, bank });
  const result = financialSummary(cash, bank, [], '2026-10-01', '2026-10-31');
  assert.equal(result.totalRevenue, 10000);
  assert.equal(result.cashBalance, 7000);
  assert.equal(result.bankBalance, 3000);
  assert.equal(result.cashBalance + result.bankBalance, 10000);
  assert.deepEqual({ cash, bank }, before);
});
test('period income and expense use their dates without altering lifetime balances', () => {
  const cash = [{ type: 'إيراد', source: 'يدوي', amount: '100.25', transaction_date: '2026-09-30' },
    { type: 'إيراد', source: 'حجز', amount: '50.10', transaction_date: '2026-10-01' }];
  const result = financialSummary(cash, [], [
    { amount: 100, expense_date: '2026-09-30' }, { amount: '20.05', expense_date: '2026-10-31' },
  ], '2026-10-01', '2026-10-31');
  assert.equal(result.totalRevenue, 50.1); assert.equal(result.totalExpenses, 20.05);
  assert.equal(result.netProfit, 30.05); assert.equal(result.cashBalance, 150.35);
});
function mockClient(rows, failurePage = -1) {
  let page = 0;
  const client = { from() { return client; }, select() { return client; },
    order() { return client; }, eq() { return client; }, range(start, end) {
      return Promise.resolve(page++ === failurePage ? { error: new Error('read failed') } : { data: rows.slice(start, end + 1) });
    } };
  return client;
}
test('reads every page, including bookings older than former limits', async () => {
  const rows = Array.from({ length: 1251 }, (_, id) => ({ id }));
  assert.deepEqual(await readAll(mockClient(rows), 'bookings'), rows);
});
test('partial read errors fail rather than returning an empty or truncated success', async () => {
  const rows = Array.from({ length: 501 }, (_, id) => ({ id }));
  await assert.rejects(readAll(mockClient(rows, 1), 'bookings'), /read failed/);
});
