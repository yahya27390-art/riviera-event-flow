import { format } from 'date-fns';

const formatMoney = (n) => {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatDate = (d) => {
  if (!d) return '-';
  try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return String(d); }
};

const esc = (s) => {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export function buildBookingEditReceiptContent(hallSettings, booking, addedItems = []) {
  const items = booking.items || [];
  const addedKeys = new Set((addedItems || []).map(a => `${a.item_name}_${a.price}`));
  const hijriDate = booking.event_date_hijri || '';

  return `
  <style>
    .edt-receipt { width: 800px; padding: 36px; background: #fff; font-family: 'Cairo', Arial, sans-serif; color: #2d2418; direction: rtl; }
    .edt-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 18px; border-bottom: 3px solid #8b5e3c; margin-bottom: 22px; }
    .edt-hall { display: flex; align-items: center; gap: 12px; }
    .edt-logo { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; }
    .edt-hall-name { font-size: 22px; font-weight: 800; color: #5c3d1e; }
    .edt-hall-sub { font-size: 11px; color: #8b7355; margin-top: 3px; }
    .edt-badge { background: #8b5e3c; color: #fff; padding: 7px 18px; border-radius: 8px; font-size: 13px; font-weight: 700; white-space: nowrap; }
    .edt-sec { margin-bottom: 18px; }
    .edt-sec-title { font-size: 13px; font-weight: 700; color: #8b5e3c; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #e8ddd0; }
    .edt-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .edt-item { font-size: 12px; }
    .edt-lbl { color: #8b7355; font-size: 10px; margin-bottom: 2px; }
    .edt-val { font-weight: 600; font-size: 13px; }
    .edt-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
    .edt-tbl th { background: #f5ede0; padding: 7px; text-align: right; font-weight: 700; color: #5c3d1e; border: 1px solid #e8ddd0; }
    .edt-tbl td { padding: 7px; border: 1px solid #e8ddd0; }
    .edt-tbl tr.edt-new { background: #e8f5e9; }
    .edt-tbl tr.edt-new td:first-child::before { content: '➕ '; }
    .edt-sum { display: flex; gap: 24px; margin-top: 14px; padding: 14px; background: #faf5ed; border-radius: 8px; }
    .edt-sum-item { text-align: center; }
    .edt-sum-lbl { font-size: 10px; color: #8b7355; }
    .edt-sum-val { font-size: 17px; font-weight: 800; }
    .edt-sum-total .edt-sum-val { color: #8b5e3c; }
    .edt-sum-paid .edt-sum-val { color: #2e7d32; }
    .edt-sum-rem .edt-sum-val { color: #c62828; }
    .edt-changes { margin-top: 14px; padding: 10px 12px; background: #e8f5e9; border: 1px dashed #4caf50; border-radius: 8px; font-size: 12px; }
    .edt-changes-t { font-weight: 700; color: #2e7d32; margin-bottom: 4px; }
    .edt-sig { display: flex; justify-content: space-between; margin-top: 36px; padding-top: 18px; }
    .edt-sig-box { text-align: center; }
    .edt-sig-line { width: 180px; border-top: 1px solid #8b7355; margin-bottom: 5px; }
    .edt-sig-lbl { font-size: 10px; color: #8b7355; }
    .edt-footer { margin-top: 16px; text-align: center; font-size: 9px; color: #b0a090; }
  </style>
  <div class="edt-receipt">
    <div class="edt-header">
      <div class="edt-hall">
        ${hallSettings?.logo_url ? `<img src="${esc(hallSettings.logo_url)}" class="edt-logo" crossorigin="anonymous"/>` : ''}
        <div>
          <div class="edt-hall-name">${esc(hallSettings?.hall_name || 'قاعة المناسبات')}</div>
          ${hallSettings?.phone ? `<div class="edt-hall-sub">📞 ${esc(hallSettings.phone)}</div>` : ''}
          ${hallSettings?.address ? `<div class="edt-hall-sub">📍 ${esc(hallSettings.address)}</div>` : ''}
        </div>
      </div>
      <div class="edt-badge">نموذج تحديث حجز</div>
    </div>

    <div class="edt-sec">
      <div class="edt-sec-title">بيانات الحجز</div>
      <div class="edt-grid">
        <div class="edt-item"><div class="edt-lbl">رقم الحجز</div><div class="edt-val" dir="ltr">${esc(booking.booking_number || '-')}</div></div>
        <div class="edt-item"><div class="edt-lbl">العميل</div><div class="edt-val">${esc(booking.customer_name || '-')}</div></div>
        <div class="edt-item"><div class="edt-lbl">الجوال</div><div class="edt-val" dir="ltr">${esc(booking.customer_phone || '-')}</div></div>
        <div class="edt-item"><div class="edt-lbl">تاريخ المناسبة</div><div class="edt-val">${esc(formatDate(booking.event_date))}</div></div>
        ${hijriDate ? `<div class="edt-item"><div class="edt-lbl">التاريخ الهجري</div><div class="edt-val">${esc(hijriDate)}</div></div>` : ''}
        <div class="edt-item"><div class="edt-lbl">القسم</div><div class="edt-val">${esc(booking.hall_section || '-')}</div></div>
        <div class="edt-item"><div class="edt-lbl">نوع المناسبة</div><div class="edt-val">${esc(booking.event_type || '-')}</div></div>
        <div class="edt-item"><div class="edt-lbl">نوع الخدمات</div><div class="edt-val">${esc(booking.service_type || '-')}</div></div>
        <div class="edt-item"><div class="edt-lbl">الحالة</div><div class="edt-val">${esc(booking.status || '-')}</div></div>
      </div>
    </div>

    ${items.length > 0 ? `
    <div class="edt-sec">
      <div class="edt-sec-title">بنود الحجز</div>
      <table class="edt-tbl">
        <thead><tr><th>البند</th><th>السعر</th><th>الكمية</th><th>الإجمالي</th></tr></thead>
        <tbody>
          ${items.map(item => {
            const isNew = addedKeys.has(`${item.item_name}_${item.price}`);
            return `<tr class="${isNew ? 'edt-new' : ''}"><td>${esc(item.item_name)}</td><td>${formatMoney(item.price)}</td><td>${item.quantity}</td><td><strong>${formatMoney(item.total)}</strong></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <div class="edt-sum">
      <div class="edt-sum-item edt-sum-total"><div class="edt-sum-lbl">الإجمالي</div><div class="edt-sum-val">${formatMoney(booking.total_amount)}</div></div>
      <div class="edt-sum-item"><div class="edt-sum-lbl">الخصم</div><div class="edt-sum-val">${formatMoney(booking.discount)}</div></div>
      <div class="edt-sum-item"><div class="edt-sum-lbl">المبلغ النهائي</div><div class="edt-sum-val">${formatMoney(booking.final_amount)}</div></div>
      <div class="edt-sum-item edt-sum-paid"><div class="edt-sum-lbl">المدفوع</div><div class="edt-sum-val">${formatMoney(booking.paid_amount)}</div></div>
      <div class="edt-sum-item edt-sum-rem"><div class="edt-sum-lbl">المتبقي</div><div class="edt-sum-val">${formatMoney(booking.remaining_amount)}</div></div>
    </div>

    ${(addedItems || []).length > 0 ? `
    <div class="edt-changes">
      <div class="edt-changes-t">✓ البنود المضافة في هذا التحديث</div>
      ${addedItems.map(item => `<div>• ${esc(item.item_name)} — ${formatMoney(item.price)} × ${item.quantity} = ${formatMoney(item.price * item.quantity)} ريال</div>`).join('')}
    </div>` : ''}

    ${booking.notes ? `<div class="edt-sec" style="margin-top:14px;"><div class="edt-sec-title">ملاحظات</div><div style="font-size:12px;color:#5c4a32;">${esc(booking.notes)}</div></div>` : ''}

    <div class="edt-sig">
      <div class="edt-sig-box"><div class="edt-sig-line"></div><div class="edt-sig-lbl">مسؤول الحجوزات</div></div>
      <div class="edt-sig-box"><div class="edt-sig-line"></div><div class="edt-sig-lbl">العميل</div></div>
    </div>
    <div class="edt-footer">تاريخ التحديث: ${format(new Date(), 'dd/MM/yyyy HH:mm')} — ${esc(hallSettings?.hall_name || '')}</div>
  </div>`;
}

export function buildBookingEditReceipt(hallSettings, booking, addedItems = []) {
  const content = buildBookingEditReceiptContent(hallSettings, booking, addedItems);
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet"/><title>تحديث حجز ${esc(booking.booking_number || '')}</title></head><body style="margin:0;">${content}<script>window.onload=function(){setTimeout(function(){window.print();},500);};</script></body></html>`;
}