export function generateBookingNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RIV-${year}-${random}`;
}

export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '0 ر.س';
  return new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount) + ' ر.س';
}