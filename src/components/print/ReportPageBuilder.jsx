/**
 * Builds HTML page strings for each report type.
 * Each exported function returns a ready <div class="page">...</div> string.
 */
import { fc, fd, fdh } from '@/lib/printReport';
import { getHallLogoUrl, cleanCustomerNotes, DEFAULT_HALL_NAME } from '@/lib/branding';
import moment from 'moment-hijri';

function toHijri(dateStr) {
  if (!dateStr) return '';
  try { return moment(dateStr, 'YYYY-MM-DD').format('iYYYY/iMM/iDD'); } catch { return ''; }
}

function header(hallSettings, title, dateFrom, dateTo) {
  const hs = hallSettings || {};
  const hallName = hs.hall_name || DEFAULT_HALL_NAME;
  const logoSrc = getHallLogoUrl(hs);
  const logo = `<img class="rpt-logo" src="${logoSrc}" alt="شعار القاعة" style="width:75px;height:75px;object-fit:contain;margin:0 auto 3mm;display:block;border-radius:6px;background:#fff;padding:2px;" onerror="this.style.display='none'"/>`;
  const fromHijri = toHijri(dateFrom);
  const toHijri2 = toHijri(dateTo);
  return `
    <div class="rpt-header" style="border-bottom: 2.5px solid #0f382a; padding-bottom: 5mm; margin-bottom: 6mm;">
      ${logo}
      <div class="rpt-hall-name" style="font-size: 20px; font-weight: 900; color: #0f382a; margin-bottom: 2px;">${hallName}</div>
      <div class="rpt-title" style="font-size: 15px; font-weight: 800; color: #c8972e; letter-spacing: 0.5px; margin-bottom: 3px;">${title}</div>
      <div class="rpt-period" style="font-size: 10px; color: #4b5563;">
        الفترة من: <strong>${fromHijri}</strong> هـ (${fd(dateFrom)} م)
        &nbsp;—&nbsp;
        إلى: <strong>${toHijri2}</strong> هـ (${fd(dateTo)} م)
      </div>
      ${hs.phone ? `<div class="rpt-contact" style="font-size: 9px; color: #6b7280; margin-top: 2mm;">📞 ${hs.phone}${hs.address ? ' | 📍 ' + hs.address : ''}${hs.tax_number ? ' | الرقم الضريبي: ' + hs.tax_number : ''}</div>` : ''}
    </div>`;
}

function footer(hallSettings) {
  const hs = hallSettings || {};
  const hallName = hs.hall_name || DEFAULT_HALL_NAME;
  return `<div class="rpt-footer" style="margin-top: 8mm; padding-top: 4mm; border-top: 1px solid #e5dcc8; font-size: 8.5pt; color: #64748b; text-align: center;">
    تم إنشاء هذا التقرير آلياً بتاريخ ${new Date().toLocaleDateString('ar-SA')} • <strong>${hallName}</strong>
    ${hs.commercial_register ? ' • س.ت: ' + hs.commercial_register : ''}
    ${hs.tax_number ? ' • الرقم الضريبي: ' + hs.tax_number : ''}
  </div>`;
}

export function buildFinancialPage(hallSettings, data, dateFrom, dateTo) {
  const { totalRevenue, totalExpenses, netProfit, cashBalance, bankBalance } = data;
  return `<div class="page">
    ${header(hallSettings, 'التقرير المالي العام', dateFrom, dateTo)}
    <div class="summary-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-bottom:6mm;">
      <div class="sum-box accent" style="background:#0f382a;color:#fff;border:1px solid #0f382a;border-radius:3mm;padding:4mm;text-align:center;">
        <div class="lbl" style="font-size:9px;opacity:0.85;margin-bottom:1mm;">إجمالي الإيرادات</div>
        <div class="val" style="font-size:16px;font-weight:900;">${fc(totalRevenue)}</div>
      </div>
      <div class="sum-box red" style="background:#fff5f5;border:1px solid #fecaca;border-radius:3mm;padding:4mm;text-align:center;">
        <div class="lbl" style="font-size:9px;color:#991b1b;margin-bottom:1mm;">إجمالي المصروفات</div>
        <div class="val" style="font-size:16px;font-weight:900;color:#dc2626;">${fc(totalExpenses)}</div>
      </div>
      <div class="sum-box green" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:3mm;padding:4mm;text-align:center;">
        <div class="lbl" style="font-size:9px;color:#166534;margin-bottom:1mm;">صافي الربح</div>
        <div class="val" style="font-size:16px;font-weight:900;color:#15803d;">${fc(netProfit)}</div>
      </div>
    </div>
    <div class="summary-grid summary-grid-2" style="display:grid;grid-template-columns:repeat(2,1fr);gap:4mm;margin-bottom:6mm;">
      <div class="sum-box" style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:3mm;padding:4mm;text-align:center;">
        <div class="lbl" style="font-size:9px;color:#64748b;margin-bottom:1mm;">رصيد الخزينة النقدي (الكاش)</div>
        <div class="val" style="font-size:15px;font-weight:800;color:#0f2b1d;">${fc(cashBalance)}</div>
      </div>
      <div class="sum-box" style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:3mm;padding:4mm;text-align:center;">
        <div class="lbl" style="font-size:9px;color:#64748b;margin-bottom:1mm;">رصيد الحساب البنكي والشبكات</div>
        <div class="val" style="font-size:15px;font-weight:800;color:#0f2b1d;">${fc(bankBalance)}</div>
      </div>
    </div>
    ${footer(hallSettings)}
  </div>`;
}

export function buildBookingsPage(hallSettings, bookings, dateFrom, dateTo) {
  const rows = bookings.map((b, i) => {
    const remaining = b.remaining_amount || 0;
    const hijri = b.event_date_hijri || toHijri(b.event_date);
    const statusStyle = b.status === 'مؤكد' ? 'color:#065f46;font-weight:700' : b.status === 'ملغي' ? 'color:#b91c1c' : 'color:#92400e';
    return `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="font-family:monospace;font-weight:600;">${b.booking_number || '-'}${b.voucher_number ? `<br/><span style="font-size:8px;color:#b45309">سند: ${b.voucher_number}</span>` : ''}</td>
      <td><strong>${b.customer_name || '-'}</strong><br/><span style="font-size:8px;color:#64748b" dir="ltr">${b.customer_phone || ''}</span></td>
      <td style="font-size:9px">${hijri}<br/><span style="color:#64748b">${fd(b.event_date)}</span></td>
      <td>${b.event_type || '-'}</td>
      <td style="text-align:left;font-weight:600;">${fc(b.final_amount)}</td>
      <td style="text-align:left;${remaining > 0 ? 'color:#b91c1c;font-weight:800' : 'color:#065f46;font-weight:700'}">${fc(remaining)}</td>
      <td style="${statusStyle}">${b.status}</td>
    </tr>`;
  }).join('');

  const totalFinal = bookings.reduce((s, b) => s + (b.final_amount || 0), 0);
  const totalRemaining = bookings.reduce((s, b) => s + (b.remaining_amount || 0), 0);

  return `<div class="page">
    ${header(hallSettings, 'تقرير الحجوزات الرسمية', dateFrom, dateTo)}
    <div class="sec-title" style="font-size:12px;font-weight:800;color:#0f382a;border-right:4px solid #c8972e;padding-right:3mm;margin-bottom:3mm;">قائمة الحجوزات (${bookings.length} حجز)</div>
    <table style="width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:5mm;">
      <thead><tr style="background:#0f382a;color:#fff;">
        <th style="width:8mm;padding:2.5mm;">#</th>
        <th style="padding:2.5mm;">رقم الحجز</th>
        <th style="padding:2.5mm;">العميل / الجوال</th>
        <th style="padding:2.5mm;">تاريخ المناسبة</th>
        <th style="padding:2.5mm;">النوع</th>
        <th style="text-align:left;padding:2.5mm;">المبلغ</th>
        <th style="text-align:left;padding:2.5mm;">المتبقي</th>
        <th style="padding:2.5mm;">الحالة</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:6mm;color:#999">لا توجد حجوزات في هذه الفترة</td></tr>'}</tbody>
      <tfoot><tr style="background:#f8fafc;font-weight:800;border-top:2px solid #0f382a;">
        <td colspan="5" style="padding:3mm;">الإجمالي</td>
        <td style="text-align:left;padding:3mm;color:#0f382a;">${fc(totalFinal)}</td>
        <td style="text-align:left;padding:3mm;color:#b91c1c;">${fc(totalRemaining)}</td>
        <td></td>
      </tr></tfoot>
    </table>
    ${footer(hallSettings)}
  </div>`;
}

export function buildExpensesPage(hallSettings, expenses, dateFrom, dateTo) {
  const rows = expenses.map((e, i) => `<tr>
    <td style="text-align:center">${i + 1}</td>
    <td style="font-size:9px">${toHijri(e.expense_date)}<br/><span style="color:#64748b">${fd(e.expense_date)}</span></td>
    <td><strong>${e.expense_type || '-'}</strong></td>
    <td>${e.description || '-'}</td>
    <td>${e.payment_method || '-'}</td>
    <td style="text-align:left;font-weight:700;color:#dc2626;">${fc(e.amount)}</td>
  </tr>`).join('');

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return `<div class="page">
    ${header(hallSettings, 'تقرير المصروفات التفصيلي', dateFrom, dateTo)}
    <div class="sec-title" style="font-size:12px;font-weight:800;color:#0f382a;border-right:4px solid #c8972e;padding-right:3mm;margin-bottom:3mm;">المصروفات (${expenses.length} بند) — الإجمالي: ${fc(total)}</div>
    <table style="width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:5mm;">
      <thead><tr style="background:#0f382a;color:#fff;">
        <th style="width:8mm;padding:2.5mm;">#</th>
        <th style="padding:2.5mm;">التاريخ</th>
        <th style="padding:2.5mm;">النوع</th>
        <th style="padding:2.5mm;">الوصف</th>
        <th style="padding:2.5mm;">الطريقة</th>
        <th style="text-align:left;padding:2.5mm;">المبلغ</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:6mm;color:#999">لا توجد مصروفات</td></tr>'}</tbody>
      <tfoot><tr style="background:#fff5f5;font-weight:800;border-top:2px solid #0f382a;"><td colspan="5" style="padding:3mm;">الإجمالي</td><td style="text-align:left;padding:3mm;color:#dc2626;">${fc(total)}</td></tr></tfoot>
    </table>
    ${footer(hallSettings)}
  </div>`;
}

export function buildOccupancyPage(hallSettings, occupancyData, bookings, dateFrom, dateTo) {
  const { total, busy, free, rate, bookedList } = occupancyData;
  const barW = Math.max(parseFloat(rate), 3);
  const rows = bookedList.map((b, i) => `<tr>
    <td style="text-align:center">${i + 1}</td>
    <td style="font-size:9px">${b.event_date_hijri || toHijri(b.event_date)}<br/><span style="color:#64748b">${fd(b.event_date)}</span></td>
    <td><strong>${b.customer_name || '-'}</strong></td>
    <td>${b.event_type || '-'}</td>
    <td>${b.hall_section || '-'}</td>
    <td style="text-align:left;font-weight:600;">${fc(b.final_amount)}</td>
  </tr>`).join('');

  return `<div class="page">
    ${header(hallSettings, 'تقرير نسبة التشغيل والإشغال', dateFrom, dateTo)}
    <div class="summary-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-bottom:6mm;">
      <div class="sum-box" style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:3mm;padding:4mm;text-align:center;"><div class="lbl" style="font-size:9px;color:#64748b;margin-bottom:1mm;">إجمالي الأيام</div><div class="val" style="font-size:16px;font-weight:800;">${total}</div></div>
      <div class="sum-box accent" style="background:#0f382a;color:#fff;border-radius:3mm;padding:4mm;text-align:center;"><div class="lbl" style="font-size:9px;opacity:0.85;margin-bottom:1mm;">أيام مشغولة</div><div class="val" style="font-size:16px;font-weight:800;">${busy}</div></div>
      <div class="sum-box green" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:3mm;padding:4mm;text-align:center;"><div class="lbl" style="font-size:9px;color:#166534;margin-bottom:1mm;">أيام فارغة</div><div class="val" style="font-size:16px;font-weight:800;color:#15803d;">${free}</div></div>
    </div>
    <div style="margin-bottom:6mm;background:#f8fafc;padding:3mm 4mm;border-radius:3mm;border:1px solid #e2e8f0;">
      <div style="font-size:11px;color:#475569;margin-bottom:2mm">نسبة التشغيل: <strong style="color:#0f382a;font-size:15px">${rate}%</strong></div>
      <div style="background:#e2e8f0;border-radius:3mm;overflow:hidden;height:7mm">
        <div style="width:${barW}%;height:100%;background:#0f382a;border-radius:3mm;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">${rate}%</div>
      </div>
    </div>
    <div class="sec-title" style="font-size:12px;font-weight:800;color:#0f382a;border-right:4px solid #c8972e;padding-right:3mm;margin-bottom:3mm;">الأيام المحجوزة (${bookedList.length})</div>
    <table style="width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:5mm;">
      <thead><tr style="background:#0f382a;color:#fff;">
        <th style="width:8mm;padding:2.5mm;">#</th>
        <th style="padding:2.5mm;">التاريخ</th>
        <th style="padding:2.5mm;">العميل</th>
        <th style="padding:2.5mm;">النوع</th>
        <th style="padding:2.5mm;">القسم</th>
        <th style="text-align:left;padding:2.5mm;">المبلغ</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:6mm;color:#999">لا توجد حجوزات</td></tr>'}</tbody>
    </table>
    ${footer(hallSettings)}
  </div>`;
}

export function buildPendingPage(hallSettings, pendingBookings, printDate) {
  const hs = hallSettings || {};
  const hallName = hs.hall_name || DEFAULT_HALL_NAME;
  const logoSrc = getHallLogoUrl(hs);
  const logo = `<img class="rpt-logo" src="${logoSrc}" alt="شعار القاعة" style="width:75px;height:75px;object-fit:contain;margin:0 auto 3mm;display:block;border-radius:6px;background:#fff;padding:2px;" onerror="this.style.display='none'"/>`;

  const total = pendingBookings.reduce((s, b) => s + (b.remaining_amount || 0), 0);
  const totalPaid = pendingBookings.reduce((s, b) => s + (b.paid_amount || 0), 0);
  const totalFinal = pendingBookings.reduce((s, b) => s + (b.final_amount || 0), 0);

  const rows = pendingBookings.map((b, i) => `<tr>
    <td style="text-align:center">${i + 1}</td>
    <td style="font-family:monospace;font-weight:600;">${b.booking_number || '-'}${b.voucher_number ? `<br/><span style="font-size:8px;color:#b45309">سند: ${b.voucher_number}</span>` : ''}</td>
    <td><strong>${b.customer_name || '-'}</strong><br/><span style="font-size:8px;color:#64748b" dir="ltr">${b.customer_phone || ''}</span></td>
    <td style="font-size:9px">${b.event_date_hijri || toHijri(b.event_date)}<br/><span style="color:#64748b">${fd(b.event_date)}</span></td>
    <td>${b.event_type || '-'}</td>
    <td style="text-align:left;font-weight:600;">${fc(b.final_amount)}</td>
    <td style="text-align:left;color:#065f46;font-weight:700">${fc(b.paid_amount)}</td>
    <td style="text-align:left;color:#b91c1c;font-weight:800">${fc(b.remaining_amount)}</td>
  </tr>`).join('');

  return `<div class="page">
    <div class="rpt-header" style="border-bottom: 2.5px solid #0f382a; padding-bottom: 5mm; margin-bottom: 6mm;">
      ${logo}
      <div class="rpt-hall-name" style="font-size: 20px; font-weight: 900; color: #0f382a; margin-bottom: 2px;">${hallName}</div>
      <div class="rpt-title" style="font-size: 15px; font-weight: 800; color: #c8972e; letter-spacing: 0.5px; margin-bottom: 3px;">تقرير المطالبات والتحصيلات المعلقة</div>
      <div class="rpt-period" style="font-size: 10px; color: #4b5563;">تاريخ إصدار التقرير: <strong>${fd(printDate)}</strong> (${toHijri(printDate)} هـ)</div>
      ${hs.phone ? `<div class="rpt-contact" style="font-size: 9px; color: #6b7280; margin-top: 2mm;">📞 ${hs.phone}${hs.address ? ' | 📍 ' + hs.address : ''}</div>` : ''}
    </div>
    <div class="summary-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-bottom:6mm;">
      <div class="sum-box" style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:3mm;padding:4mm;text-align:center;"><div class="lbl" style="font-size:9px;color:#64748b;margin-bottom:1mm;">إجمالي المبالغ الكلية</div><div class="val" style="font-size:15px;font-weight:800;color:#0f2b1d;">${fc(totalFinal)}</div></div>
      <div class="sum-box green" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:3mm;padding:4mm;text-align:center;"><div class="lbl" style="font-size:9px;color:#166534;margin-bottom:1mm;">إجمالي المسدد</div><div class="val" style="font-size:15px;font-weight:800;color:#15803d;">${fc(totalPaid)}</div></div>
      <div class="sum-box red" style="background:#fff5f5;border:1.5px solid #fca5a5;border-radius:3mm;padding:4mm;text-align:center;"><div class="lbl" style="font-size:9px;color:#991b1b;margin-bottom:1mm;">إجمالي المتبقي للتحصيل</div><div class="val" style="font-size:16px;font-weight:900;color:#b91c1c;">${fc(total)}</div></div>
    </div>
    <div class="sec-title" style="font-size:12px;font-weight:800;color:#0f382a;border-right:4px solid #c8972e;padding-right:3mm;margin-bottom:3mm;">قائمة المطالبات (${pendingBookings.length} عميل)</div>
    <table style="width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:5mm;">
      <thead><tr style="background:#0f382a;color:#fff;">
        <th style="width:8mm;padding:2.5mm;">#</th>
        <th style="padding:2.5mm;">رقم الحجز</th>
        <th style="padding:2.5mm;">العميل / الجوال</th>
        <th style="padding:2.5mm;">موعد المناسبة</th>
        <th style="padding:2.5mm;">النوع</th>
        <th style="text-align:left;padding:2.5mm;">المبلغ الكلي</th>
        <th style="text-align:left;padding:2.5mm;">المسدد</th>
        <th style="text-align:left;padding:2.5mm;">المتبقي</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:6mm;color:#999">لا توجد مطالبات معلقة</td></tr>'}</tbody>
      <tfoot><tr style="background:#f8fafc;font-weight:800;border-top:2px solid #0f382a;">
        <td colspan="5" style="padding:3mm;">الإجمالي</td>
        <td style="text-align:left;padding:3mm;color:#0f382a;">${fc(totalFinal)}</td>
        <td style="text-align:left;padding:3mm;color:#065f46;">${fc(totalPaid)}</td>
        <td style="text-align:left;padding:3mm;color:#b91c1c;">${fc(total)}</td>
      </tr></tfoot>
    </table>
    <div style="margin-top:4mm;padding:3mm 4mm;background:#fffbeb;border:1px solid #fde68a;border-radius:2mm;font-size:8.5pt;color:#78350f">
      ⚠️ هذا التقرير يعكس الوضع المالي للمطالبات المعلقة في تاريخ إصداره.
    </div>
    ${footer(hallSettings)}
  </div>`;
}

/** Professional B&W payment receipt - bank-style, laser printer optimized */
export function buildPaymentReceiptBW(hallSettings, booking, payment, receiptNum) {
  const hs = hallSettings || {};
  const hallName = hs.hall_name || DEFAULT_HALL_NAME;
  const payDateGreg = payment.payment_date || new Date().toISOString().split('T')[0];
  const payHijri = payment.payment_date_hijri || toHijri(payDateGreg);
  const eventHijri = booking.event_date_hijri || toHijri(booking.event_date);
  const logoSrc = getHallLogoUrl(hs);
  const logo = `<img src="${logoSrc}" alt="logo" style="max-height:55px;max-width:100px;object-fit:contain;background:#fff;border-radius:4px;padding:2px;" onerror="this.style.display='none'"/>`;
  const cleanNote = cleanCustomerNotes(payment.notes);

  return `<div class="page" style="font-family:'Cairo',Arial,sans-serif;direction:rtl;width:182mm;min-height:120mm;background:#fff;border:2px solid #0f382a;padding:0;page-break-after:always;">
    <!-- TOP BAR -->
    <div style="background:#0f382a;color:#fff;padding:4mm 6mm;display:flex;justify-content:space-between;align-items:center;">
      <div style="display:flex;align-items:center;gap:3mm;">
        ${logo}
        <div>
          <div style="font-size:16px;font-weight:900;letter-spacing:.5px;">${hallName}</div>
          ${hs.city ? `<div style="font-size:9px;opacity:.8;">${hs.city}</div>` : ''}
        </div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:20px;font-weight:900;letter-spacing:1.5px;">سند قبض مالي</div>
        <div style="font-size:8.5px;letter-spacing:2px;opacity:.8;color:#c8972e;">OFFICIAL PAYMENT RECEIPT</div>
      </div>
      <div style="text-align:left;border:1.5px solid #c8972e;border-radius:2mm;padding:2mm 4mm;background:rgba(255,255,255,0.1);">
        <div style="font-size:8px;opacity:.8;">رقم السند</div>
        <div style="font-size:13px;font-weight:900;letter-spacing:1px;">${receiptNum}</div>
      </div>
    </div>

    <!-- DATE ROW -->
    <div style="background:#f8fafc;border-bottom:1px solid #cbd5e1;padding:2mm 6mm;display:flex;gap:8mm;font-size:9.5px;color:#334155;">
      <span>تاريخ السند: <strong>${payHijri}</strong> هـ</span>
      <span>الموافق: <strong>${fd(payDateGreg)}</strong> م</span>
      ${hs.commercial_register ? `<span style="margin-right:auto;">س.ت: <strong>${hs.commercial_register}</strong></span>` : ''}
      ${hs.tax_number ? `<span>الرقم الضريبي: <strong>${hs.tax_number}</strong></span>` : ''}
    </div>

    <!-- BODY -->
    <div style="padding:4mm 6mm;">
      <!-- Client & Booking row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;border:1px solid #cbd5e1;border-radius:1mm;padding:3mm 4mm;margin-bottom:3mm;font-size:9.5px;">
        <div>
          <div style="font-size:8px;color:#64748b;border-bottom:1px dotted #cbd5e1;padding-bottom:1mm;margin-bottom:1mm;font-weight:700;">بيانات العميل</div>
          <div style="margin-bottom:1.5mm;"><strong>الاسم:</strong> ${booking.customer_name || '-'}</div>
          <div><strong>الجوال:</strong> <span dir="ltr">${booking.customer_phone || '-'}</span></div>
        </div>
        <div>
          <div style="font-size:8px;color:#64748b;border-bottom:1px dotted #cbd5e1;padding-bottom:1mm;margin-bottom:1mm;font-weight:700;">بيانات الحجز</div>
          <div style="margin-bottom:1.5mm;"><strong>رقم الحجز:</strong> ${booking.booking_number || '-'}${booking.voucher_number ? ` | سند: ${booking.voucher_number}` : ''}</div>
          <div style="margin-bottom:1.5mm;"><strong>المناسبة:</strong> ${booking.event_type || '-'} — ${booking.hall_section || '-'}</div>
          <div><strong>موعد المناسبة:</strong> ${eventHijri} هـ (${fd(booking.event_date)} م)</div>
        </div>
      </div>

      <!-- Payment details row -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:4mm;margin-bottom:3mm;">
        <div style="border:1px solid #cbd5e1;border-radius:1mm;padding:3mm 4mm;font-size:9.5px;">
          <div style="font-size:8px;color:#64748b;border-bottom:1px dotted #cbd5e1;padding-bottom:1mm;margin-bottom:2mm;font-weight:700;">تفاصيل السداد</div>
          <div style="margin-bottom:1.5mm;"><strong>طريقة الدفع:</strong> ${payment.payment_method || '-'}</div>
          ${payment.reference_number ? `<div style="margin-bottom:1.5mm;"><strong>رقم المرجع:</strong> ${payment.reference_number}</div>` : ''}
          ${cleanNote ? `<div><strong>ملاحظات:</strong> ${cleanNote}</div>` : ''}
        </div>
        <div style="border:2px solid #0f382a;border-radius:1mm;padding:3mm 4mm;text-align:center;display:flex;flex-direction:column;justify-content:center;background:#f0fdf4;">
          <div style="font-size:8px;color:#166534;margin-bottom:1mm;font-weight:700;">المبلغ المسدد</div>
          <div style="font-size:20px;font-weight:900;color:#0f382a;line-height:1;">${fc(payment.amount)}</div>
        </div>
      </div>

      <!-- Account summary -->
      <div style="border:1px solid #cbd5e1;border-radius:1mm;padding:3mm 4mm;font-size:9.5px;margin-bottom:3mm;">
        <div style="font-size:8px;color:#64748b;border-bottom:1px dotted #cbd5e1;padding-bottom:1mm;margin-bottom:2mm;font-weight:700;">ملخص الحساب المالي</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2mm;text-align:center;">
          <div style="border:1px solid #e2e8f0;border-radius:1mm;padding:2mm;background:#f8fafc;">
            <div style="font-size:8px;color:#64748b;">المبلغ الإجمالي</div>
            <div style="font-weight:700;">${fc(booking.final_amount)}</div>
          </div>
          <div style="border:1px solid #e2e8f0;border-radius:1mm;padding:2mm;background:#f0fdf4;">
            <div style="font-size:8px;color:#166534;">إجمالي المسدد</div>
            <div style="font-weight:700;color:#15803d;">${fc(booking.paid_amount)}</div>
          </div>
          <div style="border:${(booking.remaining_amount||0)>0?'1.5px solid #dc2626':'1px solid #bbf7d0'};border-radius:1mm;padding:2mm;background:${(booking.remaining_amount||0)>0?'#fef2f2':'#f0fdf4'}">
            <div style="font-size:8px;color:${(booking.remaining_amount||0)>0?'#991b1b':'#166534'};">المتبقي بعد السداد</div>
            <div style="font-weight:900;font-size:11px;color:${(booking.remaining_amount||0)>0?'#b91c1c':'#15803d'};">${fc(booking.remaining_amount)}</div>
          </div>
        </div>
      </div>

      <!-- Signatures -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6mm;font-size:8.5px;text-align:center;padding-top:2mm;">
        <div>
          <div style="color:#64748b;margin-bottom:5mm;">مستلم المبلغ</div>
          <div style="border-bottom:1px dashed #64748b;height:7mm;"></div>
          <div style="margin-top:1mm;">الاسم والتوقيع</div>
        </div>
        <div>
          <div style="color:#64748b;margin-bottom:3mm;">ختم المنشأة</div>
          <div style="border:1.5px dashed #c8972e;height:12mm;border-radius:50%;width:12mm;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:6px;color:#c8972e;font-weight:bold;">الختم الرسمي</div>
        </div>
        <div>
          <div style="color:#64748b;margin-bottom:5mm;">توقيع العميل / المستلم</div>
          <div style="border-bottom:1px dashed #64748b;height:7mm;"></div>
          <div style="margin-top:1mm;">${booking.customer_name || 'الاسم والتوقيع'}</div>
        </div>
      </div>
    </div>

    <!-- FOOTER STRIP -->
    <div style="border-top:1.5px solid #0f382a;padding:1.5mm 6mm;font-size:7.5px;color:#475569;display:flex;justify-content:space-between;background:#f8fafc;">
      <span>${hallName} ${hs.phone ? '| ☎ ' + hs.phone : ''}</span>
      <span style="font-weight:bold;color:#0f382a;">هذا الإيصال وثيقة رسمية معتمدة للسداد</span>
      <span>${hs.iban ? 'IBAN: ' + hs.iban : ''}</span>
    </div>
  </div>`;
}

export function buildCashPage(hallSettings, cashTxns, allCashTxns, dateFrom, dateTo) {
  const hs = hallSettings || {};
  const hallName = hs.hall_name || DEFAULT_HALL_NAME;
  const logoSrc = getHallLogoUrl(hs);
  const logo = `<img class="rpt-logo" src="${logoSrc}" alt="شعار القاعة" style="width:75px;height:75px;object-fit:contain;margin:0 auto 3mm;display:block;border-radius:6px;background:#fff;padding:2px;" onerror="this.style.display='none'"/>`;

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
      <td style="font-size:9px">${toHijri(t.transaction_date)}<br/><span style="color:#64748b">${fd(t.transaction_date)}</span></td>
      <td><strong>${t.reference_label || t.source || '-'}</strong></td>
      <td style="color:#065f46;text-align:left;font-weight:700">${isIncome ? fc(t.amount) : '-'}</td>
      <td style="color:#b91c1c;text-align:left;font-weight:700">${!isIncome ? fc(t.amount) : '-'}</td>
    </tr>`;
  }).join('');

  return `<div class="page">
    <div class="rpt-header" style="border-bottom: 2.5px solid #0f382a; padding-bottom: 5mm; margin-bottom: 6mm;">
      ${logo}
      <div class="rpt-hall-name" style="font-size: 20px; font-weight: 900; color: #0f382a; margin-bottom: 2px;">${hallName}</div>
      <div class="rpt-title" style="font-size: 15px; font-weight: 800; color: #c8972e; letter-spacing: 0.5px; margin-bottom: 3px;">كشف حساب الخزينة النقدية (الكاش)</div>
      <div class="rpt-period" style="font-size: 10px; color: #4b5563;">الفترة من ${fd(dateFrom)} إلى ${fd(dateTo)}</div>
      ${hs.phone ? `<div class="rpt-contact" style="font-size: 9px; color: #6b7280; margin-top: 2mm;">📞 ${hs.phone}${hs.address ? ' | 📍 ' + hs.address : ''}</div>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-bottom:5mm;">
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:2mm;padding:3mm;text-align:center;">
        <div style="font-size:8.5px;color:#64748b;margin-bottom:1mm;">الرصيد الافتتاحي قبل الفترة</div>
        <div style="font-size:13px;font-weight:800;color:#0f2b1d;">${fc(opening)}</div>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:2mm;padding:3mm;text-align:center;">
        <div style="font-size:8.5px;color:#166534;margin-bottom:1mm;">إجمالي الإيرادات خلال الفترة</div>
        <div style="font-size:13px;font-weight:800;color:#15803d;">${fc(periodIncome)}</div>
      </div>
      <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:2mm;padding:3mm;text-align:center;">
        <div style="font-size:8.5px;color:#991b1b;margin-bottom:1mm;">إجمالي المصروفات خلال الفترة</div>
        <div style="font-size:13px;font-weight:800;color:#dc2626;">${fc(periodExpense)}</div>
      </div>
      <div style="background:#0f382a;color:#fff;border-radius:2mm;padding:3mm;text-align:center;">
        <div style="font-size:8.5px;opacity:0.85;margin-bottom:1mm;">الرصيد الختامي بنهاية الفترة</div>
        <div style="font-size:14px;font-weight:900;">${fc(closing)}</div>
      </div>
    </div>
    <div style="margin:4mm 0 2mm">
      <div class="sec-title" style="font-size:12px;font-weight:800;color:#0f382a;border-right:4px solid #c8972e;padding-right:3mm;margin-bottom:3mm;">تفاصيل حركات الخزينة (${cashTxns.length} حركة)</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:5mm;">
      <thead><tr style="background:#0f382a;color:#fff;">
        <th style="width:8mm;padding:2.5mm;">#</th>
        <th style="padding:2.5mm;">التاريخ</th>
        <th style="padding:2.5mm;">البيان</th>
        <th style="text-align:left;padding:2.5mm;">إيراد</th>
        <th style="text-align:left;padding:2.5mm;">مصروف</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:6mm;color:#999">لا توجد حركات في هذه الفترة</td></tr>'}</tbody>
      <tfoot><tr style="background:#f8fafc;font-weight:800;border-top:2px solid #0f382a;">
        <td colspan="3" style="padding:3mm;">الإجمالي</td>
        <td style="text-align:left;padding:3mm;color:#065f46;">${fc(periodIncome)}</td>
        <td style="text-align:left;padding:3mm;color:#b91c1c;">${fc(periodExpense)}</td>
      </tr></tfoot>
    </table>
    ${footer(hallSettings)}
  </div>`;
}

export function buildBankPage(hallSettings, bankTxns, allBankTxns, dateFrom, dateTo) {
  const hs = hallSettings || {};
  const hallName = hs.hall_name || DEFAULT_HALL_NAME;
  const logoSrc = getHallLogoUrl(hs);
  const logo = `<img class="rpt-logo" src="${logoSrc}" alt="شعار القاعة" style="width:75px;height:75px;object-fit:contain;margin:0 auto 3mm;display:block;border-radius:6px;background:#fff;padding:2px;" onerror="this.style.display='none'"/>`;

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
      <td style="font-size:9px">${toHijri(t.transaction_date)}<br/><span style="color:#64748b">${fd(t.transaction_date)}</span></td>
      <td><strong>${t.reference_label || t.source || '-'}</strong></td>
      <td>${t.payment_method || '-'}</td>
      <td style="color:#065f46;text-align:left;font-weight:700">${isIncome ? fc(t.amount) : '-'}</td>
      <td style="color:#b91c1c;text-align:left;font-weight:700">${!isIncome ? fc(t.amount) : '-'}</td>
    </tr>`;
  }).join('');

  return `<div class="page">
    <div class="rpt-header" style="border-bottom: 2.5px solid #0f382a; padding-bottom: 5mm; margin-bottom: 6mm;">
      ${logo}
      <div class="rpt-hall-name" style="font-size: 20px; font-weight: 900; color: #0f382a; margin-bottom: 2px;">${hallName}</div>
      <div class="rpt-title" style="font-size: 15px; font-weight: 800; color: #c8972e; letter-spacing: 0.5px; margin-bottom: 3px;">كشف حساب البنك والشبكات الإلكترونية</div>
      <div class="rpt-period" style="font-size: 10px; color: #4b5563;">الفترة من ${fd(dateFrom)} إلى ${fd(dateTo)}</div>
      ${hs.phone ? `<div class="rpt-contact" style="font-size: 9px; color: #6b7280; margin-top: 2mm;">📞 ${hs.phone}${hs.address ? ' | 📍 ' + hs.address : ''}</div>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-bottom:5mm;">
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:2mm;padding:3mm;text-align:center;">
        <div style="font-size:8.5px;color:#64748b;margin-bottom:1mm;">الرصيد الافتتاحي قبل الفترة</div>
        <div style="font-size:13px;font-weight:800;color:#0f2b1d;">${fc(opening)}</div>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:2mm;padding:3mm;text-align:center;">
        <div style="font-size:8.5px;color:#166534;margin-bottom:1mm;">إجمالي الإيرادات خلال الفترة</div>
        <div style="font-size:13px;font-weight:800;color:#15803d;">${fc(periodIncome)}</div>
      </div>
      <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:2mm;padding:3mm;text-align:center;">
        <div style="font-size:8.5px;color:#991b1b;margin-bottom:1mm;">إجمالي المصروفات خلال الفترة</div>
        <div style="font-size:13px;font-weight:800;color:#dc2626;">${fc(periodExpense)}</div>
      </div>
      <div style="background:#0f382a;color:#fff;border-radius:2mm;padding:3mm;text-align:center;">
        <div style="font-size:8.5px;opacity:0.85;margin-bottom:1mm;">الرصيد الختامي بنهاية الفترة</div>
        <div style="font-size:14px;font-weight:900;">${fc(closing)}</div>
      </div>
    </div>
    <div style="margin:4mm 0 2mm">
      <div class="sec-title" style="font-size:12px;font-weight:800;color:#0f382a;border-right:4px solid #c8972e;padding-right:3mm;margin-bottom:3mm;">تفاصيل حركات البنك (${bankTxns.length} حركة)</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:5mm;">
      <thead><tr style="background:#0f382a;color:#fff;">
        <th style="width:8mm;padding:2.5mm;">#</th>
        <th style="padding:2.5mm;">التاريخ</th>
        <th style="padding:2.5mm;">البيان</th>
        <th style="padding:2.5mm;">الطريقة</th>
        <th style="text-align:left;padding:2.5mm;">إيراد</th>
        <th style="text-align:left;padding:2.5mm;">مصروف</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:6mm;color:#999">لا توجد حركات في هذه الفترة</td></tr>'}</tbody>
      <tfoot><tr style="background:#f8fafc;font-weight:800;border-top:2px solid #0f382a;">
        <td colspan="4" style="padding:3mm;">الإجمالي</td>
        <td style="text-align:left;padding:3mm;color:#065f46;">${fc(periodIncome)}</td>
        <td style="text-align:left;padding:3mm;color:#b91c1c;">${fc(periodExpense)}</td>
      </tr></tfoot>
    </table>
    ${footer(hallSettings)}
  </div>`;
}