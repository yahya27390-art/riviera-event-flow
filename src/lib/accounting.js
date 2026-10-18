// Pure calculations. Never writes to the database or reconciles historical rows.
export function money(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) throw new Error('قيمة مالية غير صالحة');
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

export function bookingBasePrice(booking) {
  if (booking.base_price != null) return money(booking.base_price);
  // Legacy contracts did not persist base_price. Recover it from the saved gross
  // total, without changing the contract, discount, payments or ledger.
  return money(money(booking.total_amount) -
    (booking.items || []).reduce((sum, item) => sum + money(item.total), 0));
}

export function financialSummary(cash, bank, expenses, from, to) {
  const inPeriod = date => date && date >= from && date <= to;
  const ledger = [...cash, ...bank];
  const balance = rows => money(rows.reduce((sum, row) =>
    sum + (row.type === 'إيراد' ? money(row.amount) : -money(row.amount)), 0));
  const totalRevenue = money(ledger.filter(row => row.type === 'إيراد' &&
    row.source !== 'تحويل' && inPeriod(row.transaction_date))
    .reduce((sum, row) => sum + money(row.amount), 0));
  const totalExpenses = money(expenses.filter(row => inPeriod(row.expense_date))
    .reduce((sum, row) => sum + money(row.amount), 0));
  return {
    totalRevenue, totalExpenses, netProfit: money(totalRevenue - totalExpenses),
    // Actual current balances include every ledger row, including transfers.
    cashBalance: balance(cash), bankBalance: balance(bank),
  };
}
