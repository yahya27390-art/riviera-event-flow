/**
 * Builds HTML page strings for each report type.
 * Each exported function returns a ready <div class="page">...</div> string.
 */
import { fc, fd, fdh } from '@/lib/printReport';
import moment from 'moment-hijri';

function toHijri(dateStr) {
  if (!dateStr) return '';
  try { return moment(dateStr, 'YYYY-MM-DD').format('iYYYY/iMM/iDD'); } catch { return ''; }
}

function header(hallSettings, title, dateFrom, dateTo) {
  const logo = hallSettings.logo_url
    ? `<img class="rpt-logo" src="${hallSettings.logo_url}" alt="logo"/>`
    : `<div class="rpt-logo-placeholder">${(hallSettings.hall_name || 'Q').charAt(0)}</div>`;
  const fromHijri = toHijri(dateFrom);
  const toHijri2 = toHijri(dateTo);
  return `
    <div class="rpt-header">
      ${logo}
      <div class="rpt-hall-name">${hallSettings.hall_name || 'القاعة'}</div>
      <div class="rpt-title">${title}</div>
      <div class="rpt-period">
        الفترة من: <strong>${fromHijri}</strong> هـ — ${fd(dateFrom)} م
        <br/>إلى: <strong>${toHijri2}</strong> هـ — ${fd(dateTo)} م
      </div>
      ${hallSettings.phone ? `<div class="rpt-contact">📞 ${hallSettings.phone}${hallSettings.address ? ' | ' + hallSettings.address : ''}</div>` : ''}
    </div>`;
}

function footer(hallSettings) {
  return `<div class="rpt-footer">
    تم إنشاء هذا التقرير بتاريخ ${new Date().toLocaleDateString('ar-SA')} • <strong>${hallSettings.hall_name || ''}</strong>
    ${hallSettings.commercial_register ? ' • س.ت: ' + hallSettings.commercial_register : ''}
  </div>`;
}

export function buildFinancialPage(hallSettings, data, dateFrom, dateTo) {
  const { totalRevenue, totalExpenses, netProfit, cashBalance, bankBalance } = data;
  return `<div class="page">
    ${header(hallSettings, 'التقرير المالي', dateFrom, dateTo)}
    <div class="summary-grid">
      <div class="sum-box accent">
        <div class="lbl">إجمالي الإيرادات</div>
        <div class="val">${fc(totalRevenue)}</div>
      </div>
      <div class="sum-box red">
        <div class="lbl">إجمالي المصروفات</div>
        <div class="val">${fc(totalExpenses)}</div>
      </div>
      <div class="sum-box green">
        <div class="lbl">صافي الربح</div>
        <div class="val">${fc(netProfit)}</div>
      </div>
    </div>
    <div class="summary-grid summary-grid-2">
      <div class="sum-box">
        <div class="lbl">رصيد الخزينة النقدي</div>
        <div class="val">${fc(cashBalance)}</div>
      </div>
      <div class="sum-box">
        <div class="lbl">رصيد الحساب البنكي</div>
        <div class="val">${fc(bankBalance)}</div>
      </div>
    </div>
    ${footer(hallSettings)}
  </div>`;
}

export function buildBookingsPage(hallSettings, bookings, dateFrom, dateTo) {
  const rows = bookings.map((b, i) => {
    const remaining = b.remaining_amount || 0;
    const hijri = b.event_date_hijri || toHijri(b.event_date);
    const statusStyle = b.status === 'مؤكد' ? 'color:#1a7a4a;font-weight:700' : b.status === 'ملغي' ? 'color:#c0392b' : 'color:#b8860b';
    return `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${b.booking_number || '-'}${b.voucher_number ? `<br/><span style="font-size:8px;color:#888">سند: ${b.voucher_number}</span>` : ''}</td>
      <td>${b.customer_name || '-'}<br/><span style="font-size:8px;color:#888" dir="ltr">${b.customer_phone || ''}</span></td>
      <td style="font-size:9px">${hijri}<br/><span style="color:#888">${fd(b.event_date)}</span></td>
      <td>${b.event_type || '-'}</td>
      <td style="text-align:left">${fc(b.final_amount)}</td>
      <td style="text-align:left;${remaining > 0 ? 'color:#c0392b;font-weight:700' : 'color:#1a7a4a'}">${fc(remaining)}</td>
      <td style="${statusStyle}">${b.status}</td>
    </tr>`;
  }).join('');

  const totalFinal = bookings.reduce((s, b) => s + (b.final_amount || 0), 0);
  const totalRemaining = bookings.reduce((s, b) => s + (b.remaining_amount || 0), 0);

  return `<div class="page">
    ${header(hallSettings, 'تقرير الحجوزات', dateFrom, dateTo)}
    <div class="sec-title">الحجوزات (${bookings.length} حجز)</div>
    <table>
      <thead><tr>
        <th style="width:8mm">#</th>
        <th>رقم الحجز</th><th>العميل / الجوال</th>
        <th>تاريخ المناسبة</th><th>النوع</th>
        <th style="text-align:left">المبلغ</th>
        <th style="text-align:left">المتبقي</th>
        <th>الحالة</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:6mm;color:#999">لا توجد حجوزات في هذه الفترة</td></tr>'}</tbody>
      <tfoot><tr>
        <td colspan="5">الإجمالي</td>
        <td style="text-align:left">${fc(totalFinal)}</td>
        <td style="text-align:left;color:#c0392b">${fc(totalRemaining)}</td>
        <td></td>
      </tr></tfoot>
    </table>
    ${footer(hallSettings)}
  </div>`;
}

export function buildExpensesPage(hallSettings, expenses, dateFrom, dateTo) {
  const rows = expenses.map((e, i) => `<tr>
    <td style="text-align:center">${i + 1}</td>
    <td style="font-size:9px">${toHijri(e.expense_date)}<br/><span style="color:#888">${fd(e.expense_date)}</span></td>
    <td>${e.expense_type || '-'}</td>
    <td>${e.description || '-'}</td>
    <td>${e.payment_method || '-'}</td>
    <td style="text-align:left;font-weight:600">${fc(e.amount)}</td>
  </tr>`).join('');

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return `<div class="page">
    ${header(hallSettings, 'تقرير المصروفات', dateFrom, dateTo)}
    <div class="sec-title">المصروفات (${expenses.length} بند) — الإجمالي: ${fc(total)}</div>
    <table>
      <thead><tr>
        <th style="width:8mm">#</th>
        <th>التاريخ</th><th>النوع</th><th>الوصف</th><th>الطريقة</th>
        <th style="text-align:left">المبلغ</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:6mm;color:#999">لا توجد مصروفات</td></tr>'}</tbody>
      <tfoot><tr><td colspan="5">الإجمالي</td><td style="text-align:left">${fc(total)}</td></tr></tfoot>
    </table>
    ${footer(hallSettings)}
  </div>`;
}

export function buildOccupancyPage(hallSettings, occupancyData, bookings, dateFrom, dateTo) {
  const { total, busy, free, rate, bookedList } = occupancyData;
  const barW = Math.max(parseFloat(rate), 3);
  const rows = bookedList.map((b, i) => `<tr>
    <td style="text-align:center">${i + 1}</td>
    <td style="font-size:9px">${b.event_date_hijri || toHijri(b.event_date)}<br/><span style="color:#888">${fd(b.event_date)}</span></td>
    <td>${b.customer_name || '-'}</td>
    <td>${b.event_type || '-'}</td>
    <td>${b.hall_section || '-'}</td>
    <td style="text-align:left">${fc(b.final_amount)}</td>
  </tr>`).join('');

  return `<div class="page">
    ${header(hallSettings, 'تقرير نسبة التشغيل', dateFrom, dateTo)}
    <div class="summary-grid">
      <div class="sum-box"><div class="lbl">إجمالي الأيام</div><div class="val">${total}</div></div>
      <div class="sum-box accent"><div class="lbl">أيام مشغولة</div><div class="val">${busy}</div></div>
      <div class="sum-box green"><div class="lbl">أيام فارغة</div><div class="val">${free}</div></div>
    </div>
    <div style="margin-bottom:6mm">
      <div style="font-size:11px;color:#666;margin-bottom:2mm">نسبة التشغيل: <strong style="color:#1a2e5a;font-size:15px">${rate}%</strong></div>
      <div style="background:#e5e5e5;border-radius:3mm;overflow:hidden;height:8mm">
        <div style="width:${barW}%;height:100%;background:#1a2e5a;border-radius:3mm;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">${rate}%</div>
      </div>
    </div>
    <div class="sec-title">الأيام المحجوزة (${bookedList.length})</div>
    <table>
      <thead><tr>
        <th style="width:8mm">#</th>
        <th>التاريخ</th><th>العميل</th><th>النوع</th><th>القسم</th>
        <th style="text-align:left">المبلغ</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:6mm;color:#999">لا توجد حجوزات</td></tr>'}</tbody>
    </table>
    ${footer(hallSettings)}
  </div>`;
}

export function buildPendingPage(hallSettings, pendingBookings, printDate) {
  const total = pendingBookings.reduce((s, b) => s + (b.remaining_amount || 0), 0);
  const totalPaid = pendingBookings.reduce((s, b) => s + (b.paid_amount || 0), 0);
  const totalFinal = pendingBookings.reduce((s, b) => s + (b.final_amount || 0), 0);

  const rows = pendingBookings.map((b, i) => `<tr>
    <td style="text-align:center">${i + 1}</td>
    <td>${b.booking_number || '-'}</td>
    <td>${b.customer_name || '-'}<br/><span style="font-size:8px;color:#888" dir="ltr">${b.customer_phone || ''}</span></td>
    <td style="font-size:9px">${b.event_date_hijri || toHijri(b.event_date)}<br/><span style="color:#888">${fd(b.event_date)}</span></td>
    <td>${b.event_type || '-'}</td>
    <td style="text-align:left">${fc(b.final_amount)}</td>
    <td style="text-align:left;color:#1a7a4a;font-weight:600">${fc(b.paid_amount)}</td>
    <td style="text-align:left;color:#c0392b;font-weight:700">${fc(b.remaining_amount)}</td>
  </tr>`).join('');

  const logo = hallSettings.logo_url
    ? `<img class="rpt-logo" src="${hallSettings.logo_url}" alt="logo"/>`
    : `<div class="rpt-logo-placeholder">${(hallSettings.hall_name || 'Q').charAt(0)}</div>`;

  return `<div class="page">
    <div class="rpt-header">
      ${logo}
      <div class="rpt-hall-name">${hallSettings.hall_name || 'القاعة'}</div>
      <div class="rpt-title">تقرير المطالبات المعلقة</div>
      <div class="rpt-period">بتاريخ: ${fd(printDate)}</div>
      ${hallSettings.phone ? `<div class="rpt-contact">📞 ${hallSettings.phone}</div>` : ''}
    </div>
    <div class="summary-grid">
      <div class="sum-box"><div class="lbl">إجمالي المبالغ الكلية</div><div class="val">${fc(totalFinal)}</div></div>
      <div class="sum-box green"><div class="lbl">إجمالي المسدد</div><div class="val">${fc(totalPaid)}</div></div>
      <div class="sum-box red"><div class="lbl">إجمالي المتبقي</div><div class="val">${fc(total)}</div></div>
    </div>
    <div class="sec-title">قائمة المطالبات (${pendingBookings.length} عميل)</div>
    <table>
      <thead><tr>
        <th style="width:8mm">#</th>
        <th>رقم الحجز</th><th>العميل / الجوال</th>
        <th>موعد المناسبة</th><th>النوع</th>
        <th style="text-align:left">المبلغ الكلي</th>
        <th style="text-align:left">المسدد</th>
        <th style="text-align:left">المتبقي</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:6mm;color:#999">لا توجد مطالبات</td></tr>'}</tbody>
      <tfoot><tr>
        <td colspan="5">الإجمالي</td>
        <td style="text-align:left">${fc(totalFinal)}</td>
        <td style="text-align:left;color:#1a7a4a">${fc(totalPaid)}</td>
        <td style="text-align:left;color:#c0392b">${fc(total)}</td>
      </tr></tfoot>
    </table>
    <div style="margin-top:6mm;padding:3mm 4mm;background:#fff8e1;border:1px solid #ffe082;border-radius:2mm;font-size:10px;color:#7a5c00">
      ⚠️ هذا التقرير يعكس الوضع المالي في تاريخ إصداره فقط.
    </div>
    <div class="rpt-footer">
      تم إنشاء هذا التقرير بتاريخ ${new Date().toLocaleDateString('ar-SA')} • <strong>${hallSettings.hall_name || ''}</strong>
    </div>
  </div>`;
}

/** Professional B&W payment receipt - bank-style, laser printer optimized */
export function buildPaymentReceiptBW(hallSettings, booking, payment, receiptNum) {
  const hs = hallSettings || {};
  const payDateGreg = payment.payment_date || new Date().toISOString().split('T')[0];
  const payHijri = payment.payment_date_hijri || toHijri(payDateGreg);
  const eventHijri = booking.event_date_hijri || toHijri(booking.event_date);

  const logo = hs.logo_url
    ? `<img src="${hs.logo_url}" alt="logo" style="max-height:55px;max-width:100px;object-fit:contain;"/>`
    : '';

  return `<div class="page" style="font-family:'Cairo',Arial,sans-serif;direction:rtl;width:182mm;min-height:120mm;background:#fff;border:2px solid #000;padding:0;page-break-after:always;">
    <!-- TOP BAR -->
    <div style="background:#000;color:#fff;padding:4mm 6mm;display:flex;justify-content:space-between;align-items:center;">
      <div>
        ${logo}
        <div style="font-size:16px;font-weight:900;letter-spacing:.5px;">${hs.hall_name || 'القاعة'}</div>
        ${hs.city ? `<div style="font-size:9px;opacity:.7;">${hs.city}</div>` : ''}
      </div>
      <div style="text-align:center;">
        <div style="font-size:20px;font-weight:900;letter-spacing:2px;">سند قبض</div>
        <div style="font-size:9px;letter-spacing:3px;opacity:.8;">PAYMENT RECEIPT</div>
      </div>
      <div style="text-align:left;border:1.5px solid #fff;border-radius:2mm;padding:2mm 4mm;">
        <div style="font-size:8px;opacity:.7;">رقم السند</div>
        <div style="font-size:14px;font-weight:900;letter-spacing:2px;">${receiptNum}</div>
      </div>
    </div>

    <!-- DATE ROW -->
    <div style="background:#f0f0f0;border-bottom:1px solid #000;padding:2mm 6mm;display:flex;gap:10mm;font-size:10px;">
      <span>تاريخ السند: <strong>${payHijri}</strong> هـ</span>
      <span>الموافق: <strong>${fd(payDateGreg)}</strong> م</span>
      ${hs.commercial_register ? `<span style="margin-right:auto;">س.ت: ${hs.commercial_register}</span>` : ''}
    </div>

    <!-- BODY -->
    <div style="padding:4mm 6mm;">
      <!-- Client & Booking row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;border:1px solid #000;border-radius:1mm;padding:3mm 4mm;margin-bottom:3mm;font-size:10px;">
        <div>
          <div style="font-size:8px;color:#555;border-bottom:1px dotted #ccc;padding-bottom:1mm;margin-bottom:1mm;">بيانات العميل</div>
          <div style="margin-bottom:1.5mm;"><strong>الاسم:</strong> ${booking.customer_name || '-'}</div>
          <div><strong>الجوال:</strong> <span dir="ltr">${booking.customer_phone || '-'}</span></div>
        </div>
        <div>
          <div style="font-size:8px;color:#555;border-bottom:1px dotted #ccc;padding-bottom:1mm;margin-bottom:1mm;">بيانات الحجز</div>
          <div style="margin-bottom:1.5mm;"><strong>رقم الحجز:</strong> ${booking.booking_number || '-'}${booking.voucher_number ? ` | سند: ${booking.voucher_number}` : ''}</div>
          <div style="margin-bottom:1.5mm;"><strong>المناسبة:</strong> ${booking.event_type || '-'} — ${booking.hall_section || '-'}</div>
          <div><strong>موعد المناسبة:</strong> ${eventHijri} هـ | ${fd(booking.event_date)} م</div>
        </div>
      </div>

      <!-- Payment details row -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:4mm;margin-bottom:3mm;">
        <div style="border:1px solid #000;border-radius:1mm;padding:3mm 4mm;font-size:10px;">
          <div style="font-size:8px;color:#555;border-bottom:1px dotted #ccc;padding-bottom:1mm;margin-bottom:2mm;">تفاصيل السداد</div>
          <div style="margin-bottom:1.5mm;"><strong>طريقة الدفع:</strong> ${payment.payment_method || '-'}</div>
          ${payment.reference_number ? `<div style="margin-bottom:1.5mm;"><strong>رقم المرجع:</strong> ${payment.reference_number}</div>` : ''}
          ${payment.notes ? `<div><strong>ملاحظات:</strong> ${payment.notes}</div>` : ''}
        </div>
        <div style="border:2px solid #000;border-radius:1mm;padding:3mm 4mm;text-align:center;display:flex;flex-direction:column;justify-content:center;">
          <div style="font-size:8px;color:#555;margin-bottom:1mm;">المبلغ المسدد</div>
          <div style="font-size:22px;font-weight:900;line-height:1;">${fc(payment.amount)}</div>
        </div>
      </div>

      <!-- Account summary -->
      <div style="border:1px solid #000;border-radius:1mm;padding:3mm 4mm;font-size:10px;margin-bottom:3mm;">
        <div style="font-size:8px;color:#555;border-bottom:1px dotted #ccc;padding-bottom:1mm;margin-bottom:2mm;">ملخص الحساب</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2mm;text-align:center;">
          <div style="border:1px solid #ddd;border-radius:1mm;padding:2mm;">
            <div style="font-size:8px;color:#555;">المبلغ الإجمالي</div>
            <div style="font-weight:700;">${fc(booking.final_amount)}</div>
          </div>
          <div style="border:1px solid #ddd;border-radius:1mm;padding:2mm;">
            <div style="font-size:8px;color:#555;">إجمالي المسدد</div>
            <div style="font-weight:700;">${fc(booking.paid_amount)}</div>
          </div>
          <div style="border:${(booking.remaining_amount||0)>0?'2px solid #000':'1px solid #ddd'};border-radius:1mm;padding:2mm;background:${(booking.remaining_amount||0)>0?'#f5f5f5':'#fff'}">
            <div style="font-size:8px;color:#555;">المتبقي بعد السداد</div>
            <div style="font-weight:900;font-size:12px;">${fc(booking.remaining_amount)}</div>
          </div>
        </div>
      </div>

      <!-- Signatures -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6mm;font-size:9px;text-align:center;padding-top:2mm;">
        <div>
          <div style="color:#555;margin-bottom:6mm;">مستلم المبلغ</div>
          <div style="border-bottom:1px solid #000;height:8mm;"></div>
          <div style="margin-top:1mm;">الاسم والتوقيع</div>
        </div>
        <div>
          <div style="color:#555;margin-bottom:6mm;">ختم المؤسسة</div>
          <div style="border:1px dashed #999;height:14mm;border-radius:50%;width:14mm;margin:0 auto;"></div>
        </div>
        <div>
          <div style="color:#555;margin-bottom:6mm;">توقيع العميل</div>
          <div style="border-bottom:1px solid #000;height:8mm;"></div>
          <div style="margin-top:1mm;">الاسم والتوقيع</div>
        </div>
      </div>
    </div>

    <!-- FOOTER STRIP -->
    <div style="border-top:1px solid #000;padding:1.5mm 6mm;font-size:8px;color:#333;display:flex;justify-content:space-between;background:#f8f8f8;">
      <span>${hs.hall_name || ''} ${hs.phone ? '| ☎ ' + hs.phone : ''}</span>
      <span>هذا الإيصال وثيقة رسمية للسداد</span>
      <span>${hs.iban ? 'IBAN: ' + hs.iban : ''}</span>
    </div>
  </div>`;
}

export function buildCashPage(hallSettings, cashTxns, allCashTxns, dateFrom, dateTo) {
  // Opening balance = all txns BEFORE dateFrom
  const opening = allCashTxns
    .filter(t => t.transaction_date < dateFrom)
    .reduce((s, t) => t.type === 'إيراد' ? s + (t.amount || 0) : s - (t.amount || 0), 0);

  const periodIncome = cashTxns.filter(t => t.type === 'إيراد').reduce((s, t) => s + (t.amount || 0), 0);
  const periodExpense = cashTxns.filter(t => t.type === 'مصروف').reduce((s, t) => s + (t.amount || 0), 0);
  const closing = opening + periodIncome - periodExpense;

  const rows = cashTxns.map((t, i) => {
    const isIncome = t.type === 'إيراد';
    return `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="font-size:9px">${toHijri(t.transaction_date)}<br/><span style="color:#888">${fd(t.transaction_date)}</span></td>
      <td>${t.reference_label || t.source || '-'}</td>
      <td style="color:#1a7a4a;text-align:left;font-weight:600">${isIncome ? fc(t.amount) : '-'}</td>
      <td style="color:#c0392b;text-align:left;font-weight:600">${!isIncome ? fc(t.amount) : '-'}</td>
    </tr>`;
  }).join('');

  const logo = hallSettings.logo_url
    ? `<img class="rpt-logo" src="${hallSettings.logo_url}" alt="logo"/>`
    : `<div class="rpt-logo-placeholder">${(hallSettings.hall_name || 'Q').charAt(0)}</div>`;

  return `<div class="page">
    <div class="rpt-header">
      ${logo}
      <div class="rpt-hall-name">${hallSettings.hall_name || 'القاعة'}</div>
      <div class="rpt-title">كشف حساب الخزينة النقدية</div>
      <div class="rpt-period">الفترة من ${fd(dateFrom)} إلى ${fd(dateTo)}</div>
      ${hallSettings.phone ? `<div class="rpt-contact">📞 ${hallSettings.phone}</div>` : ''}
    </div>
    <div class="balance-row opening">
      <span class="bl">الرصيد الافتتاحي قبل الفترة</span>
      <span class="bv">${fc(opening)}</span>
    </div>
    <div class="balance-row income">
      <span class="bl">إجمالي الإيرادات خلال الفترة</span>
      <span class="bv" style="color:#1a7a4a">${fc(periodIncome)}</span>
    </div>
    <div class="balance-row expense">
      <span class="bl">إجمالي المصروفات خلال الفترة</span>
      <span class="bv" style="color:#c0392b">${fc(periodExpense)}</span>
    </div>
    <div class="balance-row closing">
      <span class="bl">الرصيد الختامي (حتى نهاية الفترة)</span>
      <span class="bv">${fc(closing)}</span>
    </div>
    <div style="margin:5mm 0 3mm">
      <div class="sec-title">تفاصيل الحركات (${cashTxns.length} حركة)</div>
    </div>
    <table>
      <thead><tr>
        <th style="width:8mm">#</th>
        <th>التاريخ</th><th>البيان</th>
        <th style="text-align:left">إيراد</th>
        <th style="text-align:left">مصروف</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:6mm;color:#999">لا توجد حركات في هذه الفترة</td></tr>'}</tbody>
      <tfoot><tr>
        <td colspan="3">الإجمالي</td>
        <td style="text-align:left;color:#1a7a4a">${fc(periodIncome)}</td>
        <td style="text-align:left;color:#c0392b">${fc(periodExpense)}</td>
      </tr></tfoot>
    </table>
    <div class="rpt-footer">
      تم إنشاء هذا التقرير بتاريخ ${new Date().toLocaleDateString('ar-SA')} • <strong>${hallSettings.hall_name || ''}</strong>
    </div>
  </div>`;
}

export function buildBankPage(hallSettings, bankTxns, allBankTxns, dateFrom, dateTo) {
  const opening = allBankTxns
    .filter(t => t.transaction_date < dateFrom)
    .reduce((s, t) => t.type === 'إيراد' ? s + (t.amount || 0) : s - (t.amount || 0), 0);

  const periodIncome = bankTxns.filter(t => t.type === 'إيراد').reduce((s, t) => s + (t.amount || 0), 0);
  const periodExpense = bankTxns.filter(t => t.type === 'مصروف').reduce((s, t) => s + (t.amount || 0), 0);
  const closing = opening + periodIncome - periodExpense;

  const rows = bankTxns.map((t, i) => {
    const isIncome = t.type === 'إيراد';
    return `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="font-size:9px">${toHijri(t.transaction_date)}<br/><span style="color:#888">${fd(t.transaction_date)}</span></td>
      <td>${t.reference_label || t.source || '-'}</td>
      <td>${t.payment_method || '-'}</td>
      <td style="color:#1a7a4a;text-align:left;font-weight:600">${isIncome ? fc(t.amount) : '-'}</td>
      <td style="color:#c0392b;text-align:left;font-weight:600">${!isIncome ? fc(t.amount) : '-'}</td>
    </tr>`;
  }).join('');

  const logo = hallSettings.logo_url
    ? `<img class="rpt-logo" src="${hallSettings.logo_url}" alt="logo"/>`
    : `<div class="rpt-logo-placeholder">${(hallSettings.hall_name || 'Q').charAt(0)}</div>`;

  return `<div class="page">
    <div class="rpt-header">
      ${logo}
      <div class="rpt-hall-name">${hallSettings.hall_name || 'القاعة'}</div>
      <div class="rpt-title">كشف حساب البنك</div>
      <div class="rpt-period">الفترة من ${fd(dateFrom)} إلى ${fd(dateTo)}</div>
      ${hallSettings.phone ? `<div class="rpt-contact">📞 ${hallSettings.phone}</div>` : ''}
    </div>
    <div class="balance-row opening">
      <span class="bl">الرصيد الافتتاحي قبل الفترة</span>
      <span class="bv">${fc(opening)}</span>
    </div>
    <div class="balance-row income">
      <span class="bl">إجمالي الإيرادات خلال الفترة</span>
      <span class="bv" style="color:#1a7a4a">${fc(periodIncome)}</span>
    </div>
    <div class="balance-row expense">
      <span class="bl">إجمالي المصروفات خلال الفترة</span>
      <span class="bv" style="color:#c0392b">${fc(periodExpense)}</span>
    </div>
    <div class="balance-row closing">
      <span class="bl">الرصيد الختامي (حتى نهاية الفترة)</span>
      <span class="bv">${fc(closing)}</span>
    </div>
    <div style="margin:5mm 0 3mm">
      <div class="sec-title">تفاصيل الحركات (${bankTxns.length} حركة)</div>
    </div>
    <table>
      <thead><tr>
        <th style="width:8mm">#</th>
        <th>التاريخ</th><th>البيان</th><th>الطريقة</th>
        <th style="text-align:left">إيراد</th>
        <th style="text-align:left">مصروف</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:6mm;color:#999">لا توجد حركات في هذه الفترة</td></tr>'}</tbody>
      <tfoot><tr>
        <td colspan="4">الإجمالي</td>
        <td style="text-align:left;color:#1a7a4a">${fc(periodIncome)}</td>
        <td style="text-align:left;color:#c0392b">${fc(periodExpense)}</td>
      </tr></tfoot>
    </table>
    <div class="rpt-footer">
      تم إنشاء هذا التقرير بتاريخ ${new Date().toLocaleDateString('ar-SA')} • <strong>${hallSettings.hall_name || ''}</strong>
    </div>
  </div>`;
}