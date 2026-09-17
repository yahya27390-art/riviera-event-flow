import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import { getHallLogoUrl, DEFAULT_HALL_NAME, DEFAULT_CITY, DEFAULT_ADDRESS } from '@/lib/branding';
import { gregorianToHijri } from '@/lib/hijri';
import moment from 'moment-hijri';

function toHijri(dateStr) {
  if (!dateStr) return '';
  try { return moment(dateStr, 'YYYY-MM-DD').format('iYYYY/iMM/iDD'); } catch { return ''; }
}

function chunkRows(rows, firstPageCount, subsequentPageCount) {
  if (!rows || rows.length === 0) return [[]];
  const pages = [];
  pages.push(rows.slice(0, firstPageCount));
  let i = firstPageCount;
  while (i < rows.length) {
    pages.push(rows.slice(i, i + subsequentPageCount));
    i += subsequentPageCount;
  }
  return pages;
}

/**
 * Builds printable HTML string for Customer Statement with strict A4 pagination,
 * pinned footer, database sequential page numbers, and primary Hijri dates.
 */
export function buildCustomerStatementHTML(customer, bookings = [], payments = [], hallSettings = {}) {
  if (!customer) return '';

  const hall = hallSettings || {};
  const hallName = hall.hall_name || DEFAULT_HALL_NAME;
  const city = hall.city || DEFAULT_CITY;
  const address = hall.address || DEFAULT_ADDRESS;
  const logoUrl = getHallLogoUrl(hall);
  const now = new Date();
  const nowGreg = format(now, 'dd/MM/yyyy');
  const nowHijri = toHijri(now.toISOString().split('T')[0]) || gregorianToHijri(format(now, 'yyyy-MM-dd'));

  const customerBookings = bookings.filter(b => b.customer_phone === customer.phone);
  const customerPayments = payments.filter(p => customerBookings.some(b => b.id === p.booking_id));

  // Build unified timeline sorted by date
  const timeline = [
    ...customerBookings.map(b => ({
      date: b.event_date,
      type: 'booking',
      label: `حجز - ${b.event_type || 'مناسبة'}${b.hall_section ? ` (${b.hall_section})` : ''}`,
      booking_number: b.booking_number,
      amount: b.final_amount || 0,
      method: b.booking_method || '-',
      status: b.status,
      id: b.id,
      hijri: b.event_date_hijri || toHijri(b.event_date),
    })),
    ...customerPayments.map(p => ({
      date: p.payment_date,
      type: 'payment',
      label: `سداد - حجز ${p.booking_number || ''}`,
      booking_number: p.booking_number,
      amount: p.amount || 0,
      method: p.payment_method || 'سداد مالي',
      status: null,
      id: p.id,
      hijri: p.payment_date_hijri || toHijri(p.payment_date),
    })),
  ].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  const totalBooked = customerBookings.reduce((s, b) => s + (b.final_amount || 0), 0);
  const totalPaid = customerPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalRemaining = totalBooked - totalPaid;

  const FIRST_PAGE_ROWS = 8;
  const SUBSEQUENT_ROWS = 15;
  const chunked = chunkRows(timeline, FIRST_PAGE_ROWS, SUBSEQUENT_ROWS);
  const totalPages = chunked.length;

  let globalIdx = 1;

  const pagesHtml = chunked.map((pageItems, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;

    const rowsHtml = pageItems.map((item) => {
      const idx = globalIdx++;
      const isPay = item.type === 'payment';
      const gregFormatted = item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-';
      const hijriFormatted = item.hijri || toHijri(item.date);

      return `
        <tr style="background: ${idx % 2 === 0 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 2.5mm 2mm; text-align: center; color: #64748b; font-size: 8pt;">${idx}</td>
          <td style="padding: 2.5mm 2.5mm;">
            <strong style="color: #0f382a; font-size: 9pt; display: block;">${hijriFormatted ? hijriFormatted + ' هـ' : '-'}</strong>
            <span style="font-size: 7.5pt; color: #64748b;">(${gregFormatted} م)</span>
          </td>
          <td style="padding: 2.5mm 2.5mm; font-family: monospace; font-weight: 700; color: #0f382a;">
            ${item.booking_number || '-'}
          </td>
          <td style="padding: 2.5mm 2.5mm; font-weight: 600;">${item.label}</td>
          <td style="padding: 2.5mm 2.5mm; color: #4b5563;">${item.method || '-'}</td>
          <td style="padding: 2.5mm 2.5mm; text-align: left; font-weight: 800; color: ${isPay ? '#059669' : '#0f382a'};">
            ${isPay ? '+' : ''}${formatCurrency(item.amount)}
          </td>
          <td style="padding: 2.5mm 2.5mm; text-align: center;">
            <span style="display: inline-block; padding: 1.5px 6px; border-radius: 4px; font-size: 7.5pt; font-weight: 700; background: ${isPay ? '#d1fae5' : item.status === 'مؤكد' ? '#d1fae5' : '#fef9c3'}; color: ${isPay ? '#065f46' : item.status === 'مؤكد' ? '#065f46' : '#92400e'};">
              ${isPay ? 'سداد مالي' : item.status || 'حجز'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="page">
        <div class="page-inner-frame">
          <div class="page-content-area">
            ${isFirstPage ? `
              <!-- Header: Hall Info / Centered Crest Logo / Statement Meta -->
              <div style="display: grid; grid-template-columns: 1.2fr 1.4fr 1.2fr; align-items: center; border-bottom: 2px solid #0f382a; padding-bottom: 3mm; margin-bottom: 4mm;">
                <!-- Right: Official Hall Identification -->
                <div style="text-align: right; font-size: 8.5pt; color: #374151; line-height: 1.5;">
                  <div style="font-size: 9.5pt; font-weight: 800; color: #0f382a;">المملكة العربية السعودية</div>
                  <div style="font-size: 13pt; font-weight: 900; color: #0f382a; margin: 1px 0;">${hallName}</div>
                  <div style="color: #4b5563; font-size: 8pt;">${city} — ${address}</div>
                  ${hall.commercial_register ? `<div style="font-size: 7.5pt;">س.ت: <strong>${hall.commercial_register}</strong></div>` : ''}
                  ${hall.tax_number ? `<div style="font-size: 7.5pt;">الرقم الضريبي: <strong>${hall.tax_number}</strong></div>` : ''}
                </div>

                <!-- Center: Golden Crest Logo & Document Title -->
                <div style="text-align: center;">
                  <img src="${logoUrl}" alt="شعار القاعة" style="height: 55px; max-width: 110px; object-fit: contain; display: block; margin: 0 auto 3px;" />
                  <div style="display: inline-block; background: #0f382a; color: #ffffff; padding: 3px 16px; border-radius: 4px; font-size: 10.5pt; font-weight: 900; letter-spacing: 0.5px; border: 1px solid #c8972e;">
                    كشف حساب عميل معتمد
                  </div>
                  <div style="font-size: 7.5pt; color: #c8972e; font-weight: 700; margin-top: 2px;">
                    سجل العمليات والمدفوعات الرسمية
                  </div>
                </div>

                <!-- Left: Statement Reference & Date -->
                <div style="text-align: left; font-size: 8pt; color: #374151; line-height: 1.5;">
                  <div style="color: #0f382a; font-weight: 800; font-size: 8.5pt;">الإدارة المالية والمحاسبة</div>
                  <div>التاريخ: <strong style="color: #0f382a;">${nowHijri} هـ</strong></div>
                  <div style="color: #64748b; font-size: 7.5pt;">الموافق: (${nowGreg} م)</div>
                  ${hall.phone ? `<div style="font-size: 7.5pt;">هاتف: <span dir="ltr" style="font-weight: 700;">${hall.phone}</span></div>` : ''}
                  <div style="margin-top: 2px;"><span class="rpt-page-badge">صفحة ${pageNum} من ${totalPages}</span></div>
                </div>
              </div>

              <!-- Customer Information Banner -->
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%); border: 1px solid #0f382a; border-right: 4px solid #c8972e; border-radius: 4px; padding: 2.5mm 3.5mm; margin-bottom: 3.5mm; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <span style="font-size: 8pt; color: #64748b;">اسم العميل المكرم: </span>
                  <strong style="font-size: 11pt; color: #0f382a; margin-right: 5px;">${customer.name}</strong>
                </div>
                <div style="display: flex; gap: 15px;">
                  <div>
                    <span style="font-size: 8pt; color: #64748b;">رقم الجوال: </span>
                    <strong style="font-size: 9.5pt; color: #111827; direction: ltr; display: inline-block;">${customer.phone}</strong>
                  </div>
                  <div>
                    <span style="font-size: 8pt; color: #64748b;">حالة الحساب: </span>
                    <strong style="font-size: 9pt; color: ${totalRemaining > 0 ? '#b91c1c' : '#15803d'};">
                      ${totalRemaining > 0 ? 'مستحق السداد' : 'خالص الذمة'}
                    </strong>
                  </div>
                </div>
              </div>

              <!-- Financial Summary 4-Column Cards -->
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.5mm; margin-bottom: 3.5mm;">
                <div class="sum-box">
                  <div class="lbl">عدد الحجوزات</div>
                  <div class="val" style="color: #0f382a;">${customerBookings.length}</div>
                </div>
                <div class="sum-box accent">
                  <div class="lbl">إجمالي الحجوزات</div>
                  <div class="val">${formatCurrency(totalBooked)}</div>
                </div>
                <div class="sum-box green">
                  <div class="lbl" style="color: #166534;">إجمالي المسدد</div>
                  <div class="val" style="color: #15803d;">${formatCurrency(totalPaid)}</div>
                </div>
                <div class="sum-box ${totalRemaining > 0 ? 'red' : 'green'}">
                  <div class="lbl" style="${totalRemaining > 0 ? 'color: #991b1b;' : 'color: #166534;'}">صافي المتبقي للتحصيل</div>
                  <div class="val" style="${totalRemaining > 0 ? 'color: #dc2626;' : 'color: #15803d;'}">${formatCurrency(totalRemaining)}</div>
                </div>
              </div>
            ` : `
              <!-- Compact Header for Page 2+ -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f382a; padding-bottom: 2.5mm; margin-bottom: 3.5mm;">
                <div>
                  <div style="font-size: 11pt; font-weight: 900; color: #0f382a;">${hallName}</div>
                  <div style="font-size: 9pt; font-weight: 800; color: #c8972e;">كشف حساب عميل معتمد (تابع) — ${customer.name}</div>
                </div>
                <div style="text-align: center; font-size: 8pt; color: #4b5563;">
                  <span>التاريخ: <strong>${nowHijri} هـ</strong> (${nowGreg} م)</span>
                </div>
                <div>
                  <span class="rpt-page-badge">صفحة ${pageNum} من ${totalPages}</span>
                </div>
              </div>
            `}

            <!-- Transactions Table Section Title -->
            <div style="font-size: 9pt; font-weight: 800; color: #0f382a; border-right: 3.5px solid #c8972e; padding-right: 2.5mm; margin-bottom: 2.5mm;">
              ${isFirstPage ? 'تفاصيل الحركات وسجل الحساب المالي' : 'متابعة سجل الحركات المالية'}
            </div>

            <!-- Transactions Table -->
            <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 3mm;">
              <thead>
                <tr style="background: #0f382a; color: #ffffff;">
                  <th style="padding: 2.5mm 2mm; text-align: center; width: 25px;">#</th>
                  <th style="padding: 2.5mm 2.5mm; text-align: right; width: 115px;">التاريخ</th>
                  <th style="padding: 2.5mm 2.5mm; text-align: right; width: 95px;">رقم الحجز</th>
                  <th style="padding: 2.5mm 2.5mm; text-align: right;">البيان / العملية</th>
                  <th style="padding: 2.5mm 2.5mm; text-align: right; width: 95px;">طريقة الدفع</th>
                  <th style="padding: 2.5mm 2.5mm; text-align: left; width: 85px;">المبلغ</th>
                  <th style="padding: 2.5mm 2.5mm; text-align: center; width: 65px;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 15px; color: #9ca3af;">لا توجد عمليات مسجلة لهذا العميل</td></tr>'}
              </tbody>
              ${isLastPage ? `
                <tfoot>
                  <tr style="background: #f0fdf4; font-weight: 800; border-top: 2px solid #0f382a;">
                    <td colspan="5" style="padding: 3mm 2.5mm; text-align: right; color: #0f382a; font-size: 9pt;">
                      المجموع الإجمالي للرصيد المتبقي المستحق:
                    </td>
                    <td colspan="2" style="padding: 3mm 2.5mm; text-align: left; font-size: 10.5pt; font-weight: 900; color: ${totalRemaining > 0 ? '#b91c1c' : '#15803d'};">
                      ${formatCurrency(totalRemaining)}
                    </td>
                  </tr>
                </tfoot>
              ` : `
                <tfoot>
                  <tr style="background: #f8fafc; font-size: 7.5pt; color: #64748b;">
                    <td colspan="7" style="padding: 2mm; text-align: center;">(يتبع تفاصيل العمليات في الصفحة التالية...)</td>
                  </tr>
                </tfoot>
              `}
            </table>

            ${isLastPage ? `
              <!-- Official Signatures & Stamp Box (Only on Final Page) -->
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: auto; padding-top: 3mm; border-top: 1px solid #cbd5e1; text-align: center; font-size: 8pt;">
                <div>
                  <div style="color: #0f382a; font-weight: 800; margin-bottom: 20px;">المحاسب المالي المختص</div>
                  <div style="border-top: 1px dashed #94a3b8; padding-top: 3px; color: #64748b;">الاسم والتوقيع</div>
                </div>
                <div>
                  <div style="color: #0f382a; font-weight: 800; margin-bottom: 4px;">ختم المنشأة الرسمي</div>
                  <div style="width: 46px; height: 46px; border: 1.5px dashed #c8972e; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #c8972e; font-size: 6.5pt; font-weight: 700;">
                    الختم
                  </div>
                </div>
                <div>
                  <div style="color: #0f382a; font-weight: 800; margin-bottom: 20px;">توقيع العميل / المستلم</div>
                  <div style="border-top: 1px dashed #94a3b8; padding-top: 3px; color: #111827; font-weight: 700;">
                    ${customer.name}
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Bottom Legal Footer -->
          <div class="rpt-footer">
            <div>
              <span>تاريخ الإصدار: <strong>${nowHijri} هـ</strong> (${nowGreg} م)</span>
              <span> • ${hallName} • هذا الكشف مستخرج آلياً ويعتبر وثيقة رسمية</span>
            </div>
            <div>
              <span class="rpt-page-badge">صفحة ${pageNum} من ${totalPages}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return pagesHtml;
}

export default function CustomerStatementPrintTemplate({ customer, bookings = [], payments = [], hallSettings = {} }) {
  if (!customer) return null;

  const html = buildCustomerStatementHTML(customer, bookings, payments, hallSettings);

  return (
    <div
      id="statement-print-area"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
