/**
 * Builds HTML page strings for each report type.
 * Standardized to international A4 dimensions (210mm x 297mm).
 * Features:
 * - Full-page Royal Double Frame (Emerald #0f382a & Gold #c8972e)
 * - Pinned Footer at the bottom of the A4 page
 * - Automatic Multi-page Pagination with sequential page numbering (صفحة 1 من 2، صفحة 2 من 2)
 * - Primary Hijri calendar throughout (التقويم الهجري أساسي والميلادي ثانوي)
 */
import { fc, fd, fdh } from '@/lib/printReport';
import { getHallLogoUrl, cleanCustomerNotes, DEFAULT_HALL_NAME } from '@/lib/branding';
import moment from 'moment-hijri';

function toHijri(dateStr) {
  if (!dateStr) return '';
  try { return moment(dateStr, 'YYYY-MM-DD').format('iYYYY/iMM/iDD'); } catch { return ''; }
}

function getNowDates() {
  const now = new Date();
  const greg = now.toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hijri = toHijri(now.toISOString().split('T')[0]);
  return { greg, hijri };
}

function header(hallSettings, title, dateFrom, dateTo, pageNum = 1, totalPages = 1) {
  const hs = hallSettings || {};
  const hallName = hs.hall_name || DEFAULT_HALL_NAME;
  const logoSrc = getHallLogoUrl(hs);
  const fromHijri = toHijri(dateFrom);
  const toHijri2 = toHijri(dateTo);

  if (pageNum > 1) {
    // Compact Header for Page 2+
    return `
      <div class="rpt-header" style="border-bottom: 2px solid #0f382a; padding-bottom: 3mm; margin-bottom: 4mm; display: flex; justify-content: space-between; align-items: center;">
        <div style="text-align: right;">
          <div style="font-size: 13pt; font-weight: 900; color: #0f382a;">${hallName}</div>
          <div style="font-size: 10pt; font-weight: 800; color: #c8972e;">${title} (تابع)</div>
        </div>
        <div style="text-align: center; font-size: 9pt; color: #4b5563;">
          ${fromHijri ? `الفترة: <strong>${fromHijri} هـ</strong> إلى <strong>${toHijri2} هـ</strong>` : ''}
        </div>
        <div style="text-align: left;">
          <span class="rpt-page-badge">صفحة ${pageNum} من ${totalPages}</span>
        </div>
      </div>
    `;
  }

  // Full Royal Header for Page 1
  return `
    <div class="rpt-header">
      <img class="rpt-logo" src="${logoSrc}" alt="شعار القاعة" style="max-height: 65px; max-width: 120px; object-fit: contain; margin: 0 auto 3mm; display: block;" />
      <div class="rpt-hall-name">${hallName}</div>
      <div class="rpt-title">${title}</div>
      ${dateFrom && dateTo ? `
      <div class="rpt-period" style="margin-top: 2px;">
        الفترة من: <strong style="color: #0f382a; font-size: 10.5pt;">${fromHijri} هـ</strong> <span style="color: #64748b;">(${fd(dateFrom)} م)</span>
        &nbsp;—&nbsp;
        إلى: <strong style="color: #0f382a; font-size: 10.5pt;">${toHijri2} هـ</strong> <span style="color: #64748b;">(${fd(dateTo)} م)</span>
      </div>` : ''}
      <div class="rpt-contact">
        ${hs.city || 'المملكة العربية السعودية'}
        ${hs.phone ? ` • هاتف: <span dir="ltr">${hs.phone}</span>` : ''}
        ${hs.commercial_register ? ` • س.ت: ${hs.commercial_register}` : ''}
        ${hs.tax_number ? ` • الرقم الضريبي: ${hs.tax_number}` : ''}
      </div>
    </div>
  `;
}

function footer(hallSettings, pageNum = 1, totalPages = 1) {
  const hs = hallSettings || {};
  const hallName = hs.hall_name || DEFAULT_HALL_NAME;
  const { greg, hijri } = getNowDates();

  return `
    <div class="rpt-footer">
      <div>
        <span>تاريخ الإصدار: <strong>${hijri} هـ</strong> (${greg} م)</span>
        <span> • ${hallName}</span>
      </div>
      <div>
        <span class="rpt-page-badge">صفحة ${pageNum} من ${totalPages}</span>
      </div>
    </div>
  `;
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

// ──────────────────────────────────────────────────────────
// 1. التقرير المالي العام (A4 Single Page)
// ──────────────────────────────────────────────────────────
export function buildFinancialPage(hallSettings, data, dateFrom, dateTo) {
  const { totalRevenue, totalExpenses, netProfit, cashBalance, bankBalance } = data;

  return `
    <div class="page">
      <div class="page-inner-frame">
        <div class="page-content-area">
          ${header(hallSettings, 'التقرير المالي العام والحسابات الختامية', dateFrom, dateTo, 1, 1)}

          <div class="summary-grid" style="margin-bottom: 5mm;">
            <div class="sum-box accent">
              <div class="lbl">إجمالي الإيرادات التعاقدية والمقبوضة</div>
              <div class="val">${fc(totalRevenue)}</div>
            </div>
            <div class="sum-box red">
              <div class="lbl" style="color:#991b1b;">إجمالي المصروفات التشغيلية</div>
              <div class="val" style="color:#dc2626;">${fc(totalExpenses)}</div>
            </div>
            <div class="sum-box green">
              <div class="lbl" style="color:#166534;">صافي الأرباح التشغيلية</div>
              <div class="val" style="color:#15803d;">${fc(netProfit)}</div>
            </div>
          </div>

          <div class="summary-grid summary-grid-2" style="margin-bottom: 5mm;">
            <div class="sum-box">
              <div class="lbl">رصيد الخزينة النقدي الفعلي (الكاش)</div>
              <div class="val" style="color:#0f382a;">${fc(cashBalance)}</div>
            </div>
            <div class="sum-box">
              <div class="lbl">رصيد الحسابات البنكية والشبكات (POS)</div>
              <div class="val" style="color:#0f382a;">${fc(bankBalance)}</div>
            </div>
          </div>

          <div class="sec-title">الملخص المالي والسيولة المتاحة</div>
          <table style="margin-bottom: 5mm;">
            <thead>
              <tr>
                <th>البيان المالي</th>
                <th style="text-align: left; width: 140px;">المبلغ (ر.س)</th>
                <th style="text-align: center; width: 100px;">النسبة</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>إجمالي الإيرادات المحصلة</strong></td>
                <td style="text-align: left; font-weight: 800; color: #0f382a;">${fc(totalRevenue)}</td>
                <td style="text-align: center;">100%</td>
              </tr>
              <tr>
                <td><strong>إجمالي النفقات والمصروفات</strong></td>
                <td style="text-align: left; font-weight: 800; color: #dc2626;">${fc(totalExpenses)}</td>
                <td style="text-align: center;">${totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr style="background: #f0fdf4;">
                <td><strong>صافي الربح / الفائض المالي</strong></td>
                <td style="text-align: left; font-weight: 900; color: ${netProfit >= 0 ? '#15803d' : '#dc2626'}; font-size: 11pt;">${fc(netProfit)}</td>
                <td style="text-align: center; font-weight: 700;">${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td><strong>إجمالي السيولة النقدية والبنكية الحالية</strong></td>
                <td style="text-align: left; font-weight: 900; color: #0f382a; font-size: 11pt;">${fc(cashBalance + bankBalance)}</td>
                <td style="text-align: center; font-weight: 700;">-</td>
              </tr>
            </tbody>
          </table>

          <!-- Signatures Section (Pinned to Bottom) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; font-size: 8.5pt; margin-top: auto; padding-top: 5mm; border-top: 1px solid #cbd5e1;">
            <div>
              <div style="color: #0f382a; font-weight: 800; margin-bottom: 25px;">المحاسب المالي</div>
              <div style="border-top: 1px dashed #94a3b8; padding-top: 3px; color: #64748b;">الاسم والتوقيع</div>
            </div>
            <div>
              <div style="color: #0f382a; font-weight: 800; margin-bottom: 8px;">ختم المنشأة الرسمي</div>
              <div style="width: 50px; height: 50px; border: 1.5px dashed #c8972e; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #c8972e; font-size: 7pt; font-weight: 800;">الختم</div>
            </div>
            <div>
              <div style="color: #0f382a; font-weight: 800; margin-bottom: 25px;">مدير القاعة / المعتمد</div>
              <div style="border-top: 1px dashed #94a3b8; padding-top: 3px; color: #64748b;">الاسم والاعتماد</div>
            </div>
          </div>
        </div>

        ${footer(hallSettings, 1, 1)}
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────
// 2. تقرير الحجوزات مع الترقيم والتقسيم على صفحات A4
// ──────────────────────────────────────────────────────────
export function buildBookingsPage(hallSettings, bookings, dateFrom, dateTo) {
  const totalFinal = bookings.reduce((s, b) => s + (b.final_amount || 0), 0);
  const totalPaid = bookings.reduce((s, b) => s + (b.paid_amount || 0), 0);
  const totalRemaining = bookings.reduce((s, b) => s + (b.remaining_amount || 0), 0);

  const FIRST_PAGE_ROWS = 10;
  const SUBSEQUENT_ROWS = 16;
  const chunked = chunkRows(bookings, FIRST_PAGE_ROWS, SUBSEQUENT_ROWS);
  const totalPages = chunked.length;

  let globalIdx = 1;

  return chunked.map((pageBookings, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;

    const rowsHtml = pageBookings.map((b) => {
      const idx = globalIdx++;
      const remaining = b.remaining_amount || 0;
      const hijri = b.event_date_hijri || toHijri(b.event_date);
      const statusStyle = b.status === 'مؤكد' ? 'color:#065f46;font-weight:700' : b.status === 'ملغي' ? 'color:#b91c1c' : 'color:#92400e';

      return `
        <tr>
          <td style="text-align: center; width: 25px;">${idx}</td>
          <td style="font-family: monospace; font-weight: 700; color: #0f382a;">
            ${b.booking_number || '-'}
            ${b.voucher_number ? `<br/><span style="font-size:7.5pt; color:#b45309;">سند: ${b.voucher_number}</span>` : ''}
          </td>
          <td>
            <strong>${b.customer_name || '-'}</strong>
            ${b.customer_phone ? `<br/><span style="font-size:7.5pt; color:#64748b;" dir="ltr">${b.customer_phone}</span>` : ''}
          </td>
          <td>
            <strong style="color: #0f382a; font-size: 9pt; display: block;">${hijri} هـ</strong>
            <span style="font-size: 7.5pt; color: #64748b;">(${fd(b.event_date)} م)</span>
          </td>
          <td>${b.event_type || '-'}${b.hall_section ? ` — ${b.hall_section}` : ''}</td>
          <td style="text-align: left; font-weight: 700;">${fc(b.final_amount)}</td>
          <td style="text-align: left; font-weight: 800; ${remaining > 0 ? 'color: #b91c1c;' : 'color: #15803d;'}">
            ${fc(remaining)}
          </td>
          <td style="text-align: center; ${statusStyle}">${b.status || 'معلق'}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="page">
        <div class="page-inner-frame">
          <div class="page-content-area">
            ${header(hallSettings, 'تقرير الحجوزات والعقود الرسمية', dateFrom, dateTo, pageNum, totalPages)}

            ${isFirstPage ? `
              <div class="summary-grid" style="margin-bottom: 4mm;">
                <div class="sum-box">
                  <div class="lbl">إجمالي عدد الحجوزات</div>
                  <div class="val" style="color: #0f382a;">${bookings.length} حجز</div>
                </div>
                <div class="sum-box accent">
                  <div class="lbl">إجمالي قيمة العقود</div>
                  <div class="val">${fc(totalFinal)}</div>
                </div>
                <div class="sum-box ${totalRemaining > 0 ? 'red' : 'green'}">
                  <div class="lbl" style="${totalRemaining > 0 ? 'color:#991b1b;' : 'color:#166534;'}">صافي الرصيد المتبقي للتحصيل</div>
                  <div class="val" style="${totalRemaining > 0 ? 'color:#dc2626;' : 'color:#15803d;'}">${fc(totalRemaining)}</div>
                </div>
              </div>
            ` : ''}

            <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">#</th>
                  <th style="width: 100px;">رقم الحجز</th>
                  <th>العميل المكرم</th>
                  <th style="width: 120px;">موعد المناسبة</th>
                  <th>نوع المناسبة والقسم</th>
                  <th style="text-align: left; width: 85px;">المبلغ</th>
                  <th style="text-align: left; width: 85px;">المتبقي</th>
                  <th style="text-align: center; width: 60px;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="8" style="text-align:center; padding: 20px; color:#999;">لا توجد حجوزات مسجلة</td></tr>'}
              </tbody>
              ${isLastPage ? `
                <tfoot>
                  <tr style="background: #f0fdf4; font-weight: 800; border-top: 2px solid #0f382a;">
                    <td colspan="5" style="padding: 3mm; text-align: right; color: #0f382a;">الإجمالي الكلي لجميع الحجوزات:</td>
                    <td style="text-align: left; padding: 3mm; color: #0f382a;">${fc(totalFinal)}</td>
                    <td style="text-align: left; padding: 3mm; color: #b91c1c;">${fc(totalRemaining)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              ` : ''}
            </table>
          </div>

          ${footer(hallSettings, pageNum, totalPages)}
        </div>
      </div>
    `;
  }).join('');
}

// ──────────────────────────────────────────────────────────
// 3. تقرير المصروفات مع الترقيم والتقسيم على صفحات A4
// ──────────────────────────────────────────────────────────
export function buildExpensesPage(hallSettings, expenses, dateFrom, dateTo) {
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const FIRST_PAGE_ROWS = 11;
  const SUBSEQUENT_ROWS = 17;
  const chunked = chunkRows(expenses, FIRST_PAGE_ROWS, SUBSEQUENT_ROWS);
  const totalPages = chunked.length;

  let globalIdx = 1;

  return chunked.map((pageExpenses, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;

    const rowsHtml = pageExpenses.map((e) => {
      const idx = globalIdx++;
      const hijri = toHijri(e.expense_date);

      return `
        <tr>
          <td style="text-align: center; width: 25px;">${idx}</td>
          <td>
            <strong style="color: #0f382a; font-size: 9pt; display: block;">${hijri} هـ</strong>
            <span style="font-size: 7.5pt; color: #64748b;">(${fd(e.expense_date)} م)</span>
          </td>
          <td><strong>${e.expense_type || '-'}</strong></td>
          <td>${e.description || '-'}</td>
          <td>${e.payment_method || '-'}</td>
          <td style="text-align: left; font-weight: 800; color: #dc2626;">${fc(e.amount)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="page">
        <div class="page-inner-frame">
          <div class="page-content-area">
            ${header(hallSettings, 'تقرير المصروفات والنفقات التشغيلية', dateFrom, dateTo, pageNum, totalPages)}

            ${isFirstPage ? `
              <div class="summary-grid summary-grid-2" style="margin-bottom: 4mm;">
                <div class="sum-box">
                  <div class="lbl">عدد بنود المصروفات</div>
                  <div class="val" style="color: #0f382a;">${expenses.length} سند</div>
                </div>
                <div class="sum-box red">
                  <div class="lbl" style="color:#991b1b;">إجمالي المصروفات</div>
                  <div class="val" style="color:#dc2626;">${fc(total)}</div>
                </div>
              </div>
            ` : ''}

            <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">#</th>
                  <th style="width: 130px;">التاريخ</th>
                  <th style="width: 120px;">تصنيف المصروف</th>
                  <th>البيان والتفاصيل</th>
                  <th style="width: 100px;">طريقة الصرف</th>
                  <th style="text-align: left; width: 100px;">المبلغ (ر.س)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="6" style="text-align:center; padding: 20px; color:#999;">لا توجد مصروفات مسجلة</td></tr>'}
              </tbody>
              ${isLastPage ? `
                <tfoot>
                  <tr style="background: #fff5f5; font-weight: 800; border-top: 2px solid #0f382a;">
                    <td colspan="5" style="padding: 3mm; text-align: right; color: #991b1b;">إجمالي المصروفات الكلي:</td>
                    <td style="text-align: left; padding: 3mm; color: #dc2626; font-size: 11pt;">${fc(total)}</td>
                  </tr>
                </tfoot>
              ` : ''}
            </table>
          </div>

          ${footer(hallSettings, pageNum, totalPages)}
        </div>
      </div>
    `;
  }).join('');
}

// ──────────────────────────────────────────────────────────
// 4. تقرير نسبة التشغيل والإشغال (A4)
// ──────────────────────────────────────────────────────────
export function buildOccupancyPage(hallSettings, occupancyData, bookings, dateFrom, dateTo) {
  const { total, busy, free, rate, bookedList } = occupancyData;
  const barW = Math.max(parseFloat(rate) || 0, 3);

  const FIRST_PAGE_ROWS = 8;
  const SUBSEQUENT_ROWS = 16;
  const chunked = chunkRows(bookedList, FIRST_PAGE_ROWS, SUBSEQUENT_ROWS);
  const totalPages = chunked.length;

  let globalIdx = 1;

  return chunked.map((pageList, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;

    const rowsHtml = pageList.map((b) => {
      const idx = globalIdx++;
      const hijri = b.event_date_hijri || toHijri(b.event_date);

      return `
        <tr>
          <td style="text-align: center; width: 25px;">${idx}</td>
          <td>
            <strong style="color: #0f382a; font-size: 9pt; display: block;">${hijri} هـ</strong>
            <span style="font-size: 7.5pt; color: #64748b;">(${fd(b.event_date)} م)</span>
          </td>
          <td><strong>${b.customer_name || '-'}</strong></td>
          <td>${b.event_type || '-'}</td>
          <td>${b.hall_section || '-'}</td>
          <td style="text-align: left; font-weight: 700;">${fc(b.final_amount)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="page">
        <div class="page-inner-frame">
          <div class="page-content-area">
            ${header(hallSettings, 'تقرير نسبة التشغيل وإشغال القاعة', dateFrom, dateTo, pageNum, totalPages)}

            ${isFirstPage ? `
              <div class="summary-grid" style="margin-bottom: 4mm;">
                <div class="sum-box">
                  <div class="lbl">إجمالي أيام الفترة</div>
                  <div class="val" style="color: #0f382a;">${total} يوم</div>
                </div>
                <div class="sum-box accent">
                  <div class="lbl">أيام محجوزة ومشغولة</div>
                  <div class="val">${busy} يوم</div>
                </div>
                <div class="sum-box green">
                  <div class="lbl" style="color:#166534;">أيام متاحة وشاغرة</div>
                  <div class="val" style="color:#15803d;">${free} يوم</div>
                </div>
              </div>

              <div style="margin-bottom: 4mm; background: #f8fafc; padding: 3mm 4mm; border-radius: 4px; border: 1px solid #cbd5e1;">
                <div style="display: flex; justify-content: space-between; font-size: 10pt; font-weight: 800; color: #0f382a; margin-bottom: 2mm;">
                  <span>معدل نسبة التشغيل الفعلي:</span>
                  <span style="color: #0f382a; font-size: 13pt;">${rate}%</span>
                </div>
                <div style="background: #e2e8f0; border-radius: 4px; overflow: hidden; height: 6mm;">
                  <div style="width: ${barW}%; height: 100%; background: #0f382a; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 9pt; font-weight: 800;">
                    ${rate}%
                  </div>
                </div>
              </div>
            ` : ''}

            <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">#</th>
                  <th style="width: 130px;">تاريخ اليوم المحجوز</th>
                  <th>العميل</th>
                  <th>المناسبة</th>
                  <th>القسم</th>
                  <th style="text-align: left; width: 100px;">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="6" style="text-align:center; padding: 20px; color:#999;">لا توجد حجوزات</td></tr>'}
              </tbody>
            </table>
          </div>

          ${footer(hallSettings, pageNum, totalPages)}
        </div>
      </div>
    `;
  }).join('');
}

// ──────────────────────────────────────────────────────────
// 5. تقرير المطالبات المعلقة (A4)
// ──────────────────────────────────────────────────────────
export function buildPendingPage(hallSettings, pendingBookings, printDate) {
  const total = pendingBookings.reduce((s, b) => s + (b.remaining_amount || 0), 0);
  const totalPaid = pendingBookings.reduce((s, b) => s + (b.paid_amount || 0), 0);
  const totalFinal = pendingBookings.reduce((s, b) => s + (b.final_amount || 0), 0);

  const FIRST_PAGE_ROWS = 10;
  const SUBSEQUENT_ROWS = 16;
  const chunked = chunkRows(pendingBookings, FIRST_PAGE_ROWS, SUBSEQUENT_ROWS);
  const totalPages = chunked.length;

  let globalIdx = 1;

  return chunked.map((pageList, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;

    const rowsHtml = pageList.map((b) => {
      const idx = globalIdx++;
      const hijri = b.event_date_hijri || toHijri(b.event_date);

      return `
        <tr>
          <td style="text-align: center; width: 25px;">${idx}</td>
          <td style="font-family: monospace; font-weight: 700; color: #0f382a;">${b.booking_number || '-'}</td>
          <td>
            <strong>${b.customer_name || '-'}</strong>
            ${b.customer_phone ? `<br/><span style="font-size:7.5pt; color:#64748b;" dir="ltr">${b.customer_phone}</span>` : ''}
          </td>
          <td>
            <strong style="color: #0f382a; font-size: 9pt; display: block;">${hijri} هـ</strong>
            <span style="font-size: 7.5pt; color: #64748b;">(${fd(b.event_date)} م)</span>
          </td>
          <td>${b.event_type || '-'}</td>
          <td style="text-align: left; font-weight: 700;">${fc(b.final_amount)}</td>
          <td style="text-align: left; color: #065f46; font-weight: 700;">${fc(b.paid_amount)}</td>
          <td style="text-align: left; color: #b91c1c; font-weight: 900;">${fc(b.remaining_amount)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="page">
        <div class="page-inner-frame">
          <div class="page-content-area">
            ${header(hallSettings, 'تقرير المطالبات والذمم المدينة المعلقة للتحصيل', null, null, pageNum, totalPages)}

            ${isFirstPage ? `
              <div class="summary-grid" style="margin-bottom: 4mm;">
                <div class="sum-box">
                  <div class="lbl">إجمالي العقود</div>
                  <div class="val" style="color: #0f382a;">${fc(totalFinal)}</div>
                </div>
                <div class="sum-box green">
                  <div class="lbl" style="color:#166534;">إجمالي المسدد</div>
                  <div class="val" style="color:#15803d;">${fc(totalPaid)}</div>
                </div>
                <div class="sum-box red">
                  <div class="lbl" style="color:#991b1b;">المتبقي للتحصيل</div>
                  <div class="val" style="color:#dc2626;">${fc(total)}</div>
                </div>
              </div>
            ` : ''}

            <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">#</th>
                  <th style="width: 100px;">رقم الحجز</th>
                  <th>العميل المكرم</th>
                  <th style="width: 120px;">موعد المناسبة</th>
                  <th>النوع</th>
                  <th style="text-align: left; width: 85px;">المبلغ الكلي</th>
                  <th style="text-align: left; width: 85px;">المسدد</th>
                  <th style="text-align: left; width: 85px;">المتبقي</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="8" style="text-align:center; padding: 20px; color:#999;">لا توجد مطالبات معلقة</td></tr>'}
              </tbody>
              ${isLastPage ? `
                <tfoot>
                  <tr style="background: #f0fdf4; font-weight: 800; border-top: 2px solid #0f382a;">
                    <td colspan="5" style="padding: 3mm; text-align: right; color: #0f382a;">الإجمالي الكلي للمطالبات:</td>
                    <td style="text-align: left; padding: 3mm; color: #0f382a;">${fc(totalFinal)}</td>
                    <td style="text-align: left; padding: 3mm; color: #065f46;">${fc(totalPaid)}</td>
                    <td style="text-align: left; padding: 3mm; color: #b91c1c; font-size: 10pt;">${fc(total)}</td>
                  </tr>
                </tfoot>
              ` : ''}
            </table>
          </div>

          ${footer(hallSettings, pageNum, totalPages)}
        </div>
      </div>
    `;
  }).join('');
}

// ──────────────────────────────────────────────────────────
// 6. كشف حساب الخزينة النقدية (الكاش) (A4)
// ──────────────────────────────────────────────────────────
export function buildCashPage(hallSettings, cashTxns, allCashTxns, dateFrom, dateTo) {
  const opening = allCashTxns
    .filter(t => t.transaction_date < dateFrom)
    .reduce((s, t) => t.type === 'إيراد' ? s + (t.amount || 0) : s - (t.amount || 0), 0);

  const periodIncome = cashTxns.filter(t => t.type === 'إيراد').reduce((s, t) => s + (t.amount || 0), 0);
  const periodExpense = cashTxns.filter(t => t.type === 'مصروف').reduce((s, t) => s + (t.amount || 0), 0);
  const closing = opening + periodIncome - periodExpense;

  const FIRST_PAGE_ROWS = 10;
  const SUBSEQUENT_ROWS = 16;
  const chunked = chunkRows(cashTxns, FIRST_PAGE_ROWS, SUBSEQUENT_ROWS);
  const totalPages = chunked.length;

  let globalIdx = 1;

  return chunked.map((pageTxns, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;

    const rowsHtml = pageTxns.map((t) => {
      const idx = globalIdx++;
      const isIncome = t.type === 'إيراد';
      const hijri = toHijri(t.transaction_date);

      return `
        <tr>
          <td style="text-align: center; width: 25px;">${idx}</td>
          <td>
            <strong style="color: #0f382a; font-size: 9pt; display: block;">${hijri} هـ</strong>
            <span style="font-size: 7.5pt; color: #64748b;">(${fd(t.transaction_date)} م)</span>
          </td>
          <td><strong>${t.reference_label || t.source || '-'}</strong></td>
          <td style="color: #065f46; text-align: left; font-weight: 700;">${isIncome ? fc(t.amount) : '-'}</td>
          <td style="color: #b91c1c; text-align: left; font-weight: 700;">${!isIncome ? fc(t.amount) : '-'}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="page">
        <div class="page-inner-frame">
          <div class="page-content-area">
            ${header(hallSettings, 'كشف حساب حركة الخزينة النقدية (الكاش)', dateFrom, dateTo, pageNum, totalPages)}

            ${isFirstPage ? `
              <div class="summary-grid summary-grid-4" style="margin-bottom: 4mm;">
                <div class="sum-box">
                  <div class="lbl">الرصيد الافتتاحي</div>
                  <div class="val" style="color: #0f382a;">${fc(opening)}</div>
                </div>
                <div class="sum-box green">
                  <div class="lbl" style="color:#166534;">إجمالي المقبوضات</div>
                  <div class="val" style="color:#15803d;">${fc(periodIncome)}</div>
                </div>
                <div class="sum-box red">
                  <div class="lbl" style="color:#991b1b;">إجمالي المدفوعات</div>
                  <div class="val" style="color:#dc2626;">${fc(periodExpense)}</div>
                </div>
                <div class="sum-box accent">
                  <div class="lbl">الرصيد الختامي</div>
                  <div class="val">${fc(closing)}</div>
                </div>
              </div>
            ` : ''}

            <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">#</th>
                  <th style="width: 130px;">التاريخ</th>
                  <th>البيان والتفاصيل</th>
                  <th style="text-align: left; width: 100px;">إيراد (+)</th>
                  <th style="text-align: left; width: 100px;">مصروف (-)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#999;">لا توجد حركات نقدية</td></tr>'}
              </tbody>
              ${isLastPage ? `
                <tfoot>
                  <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid #0f382a;">
                    <td colspan="3" style="padding: 3mm; text-align: right; color: #0f382a;">مجموع حركات الفترة:</td>
                    <td style="text-align: left; padding: 3mm; color: #065f46;">${fc(periodIncome)}</td>
                    <td style="text-align: left; padding: 3mm; color: #b91c1c;">${fc(periodExpense)}</td>
                  </tr>
                </tfoot>
              ` : ''}
            </table>
          </div>

          ${footer(hallSettings, pageNum, totalPages)}
        </div>
      </div>
    `;
  }).join('');
}

// ──────────────────────────────────────────────────────────
// 7. كشف حساب البنك والشبكات (A4)
// ──────────────────────────────────────────────────────────
export function buildBankPage(hallSettings, bankTxns, allBankTxns, dateFrom, dateTo) {
  const opening = allBankTxns
    .filter(t => t.transaction_date < dateFrom)
    .reduce((s, t) => t.type === 'إيراد' ? s + (t.amount || 0) : s - (t.amount || 0), 0);

  const periodIncome = bankTxns.filter(t => t.type === 'إيراد').reduce((s, t) => s + (t.amount || 0), 0);
  const periodExpense = bankTxns.filter(t => t.type === 'مصروف').reduce((s, t) => s + (t.amount || 0), 0);
  const closing = opening + periodIncome - periodExpense;

  const FIRST_PAGE_ROWS = 10;
  const SUBSEQUENT_ROWS = 16;
  const chunked = chunkRows(bankTxns, FIRST_PAGE_ROWS, SUBSEQUENT_ROWS);
  const totalPages = chunked.length;

  let globalIdx = 1;

  return chunked.map((pageTxns, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;

    const rowsHtml = pageTxns.map((t) => {
      const idx = globalIdx++;
      const isIncome = t.type === 'إيراد';
      const hijri = toHijri(t.transaction_date);

      return `
        <tr>
          <td style="text-align: center; width: 25px;">${idx}</td>
          <td>
            <strong style="color: #0f382a; font-size: 9pt; display: block;">${hijri} هـ</strong>
            <span style="font-size: 7.5pt; color: #64748b;">(${fd(t.transaction_date)} م)</span>
          </td>
          <td><strong>${t.reference_label || t.source || '-'}</strong></td>
          <td>${t.payment_method || '-'}</td>
          <td style="color: #065f46; text-align: left; font-weight: 700;">${isIncome ? fc(t.amount) : '-'}</td>
          <td style="color: #b91c1c; text-align: left; font-weight: 700;">${!isIncome ? fc(t.amount) : '-'}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="page">
        <div class="page-inner-frame">
          <div class="page-content-area">
            ${header(hallSettings, 'كشف حساب الحسابات البنكية والشبكات', dateFrom, dateTo, pageNum, totalPages)}

            ${isFirstPage ? `
              <div class="summary-grid summary-grid-4" style="margin-bottom: 4mm;">
                <div class="sum-box">
                  <div class="lbl">الرصيد الافتتاحي</div>
                  <div class="val" style="color: #0f382a;">${fc(opening)}</div>
                </div>
                <div class="sum-box green">
                  <div class="lbl" style="color:#166534;">إجمالي المقبوضات</div>
                  <div class="val" style="color:#15803d;">${fc(periodIncome)}</div>
                </div>
                <div class="sum-box red">
                  <div class="lbl" style="color:#991b1b;">إجمالي المدفوعات</div>
                  <div class="val" style="color:#dc2626;">${fc(periodExpense)}</div>
                </div>
                <div class="sum-box accent">
                  <div class="lbl">الرصيد الختامي</div>
                  <div class="val">${fc(closing)}</div>
                </div>
              </div>
            ` : ''}

            <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">#</th>
                  <th style="width: 130px;">التاريخ</th>
                  <th>البيان والتفاصيل</th>
                  <th style="width: 110px;">طريقة التحصيل</th>
                  <th style="text-align: left; width: 90px;">إيراد (+)</th>
                  <th style="text-align: left; width: 90px;">مصروف (-)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="6" style="text-align:center; padding: 20px; color:#999;">لا توجد حركات بنكية</td></tr>'}
              </tbody>
              ${isLastPage ? `
                <tfoot>
                  <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid #0f382a;">
                    <td colspan="4" style="padding: 3mm; text-align: right; color: #0f382a;">مجموع حركات الفترة:</td>
                    <td style="text-align: left; padding: 3mm; color: #065f46;">${fc(periodIncome)}</td>
                    <td style="text-align: left; padding: 3mm; color: #b91c1c;">${fc(periodExpense)}</td>
                  </tr>
                </tfoot>
              ` : ''}
            </table>
          </div>

          ${footer(hallSettings, pageNum, totalPages)}
        </div>
      </div>
    `;
  }).join('');
}

// ──────────────────────────────────────────────────────────
// 8. سند قبض مالي رسمي A4
// ──────────────────────────────────────────────────────────
export function buildPaymentReceiptBW(hallSettings, booking, payment, receiptNum) {
  const hs = hallSettings || {};
  const hallName = hs.hall_name || DEFAULT_HALL_NAME;
  const payDateGreg = payment.payment_date || new Date().toISOString().split('T')[0];
  const payHijri = payment.payment_date_hijri || toHijri(payDateGreg);
  const eventHijri = booking.event_date_hijri || toHijri(booking.event_date);
  const logoSrc = getHallLogoUrl(hs);
  const cleanNote = cleanCustomerNotes(payment.notes);

  return `
    <div class="page">
      <div class="page-inner-frame">
        <div class="page-content-area">
          <!-- TOP BAR -->
          <div style="background: #0f382a; color: #fff; padding: 4mm 6mm; display: flex; justify-content: space-between; align-items: center; border-radius: 4px; border: 1px solid #c8972e; margin-bottom: 3mm;">
            <div style="display: flex; align-items: center; gap: 3mm;">
              <img src="${logoSrc}" alt="شعار القاعة" style="max-height: 55px; max-width: 100px; object-fit: contain; background: #fff; border-radius: 4px; padding: 2px;" />
              <div>
                <div style="font-size: 16px; font-weight: 900; letter-spacing: .5px;">${hallName}</div>
                <div style="font-size: 9px; color: #c8972e; font-weight: 700;">${hs.city || 'القصيم - بريدة'}</div>
              </div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #fff;">سند قبض مالي معتمد</div>
              <div style="font-size: 8.5px; letter-spacing: 2px; color: #c8972e; font-weight: 700;">OFFICIAL PAYMENT RECEIPT</div>
            </div>
            <div style="text-align: left; border: 1.5px solid #c8972e; border-radius: 4px; padding: 2mm 4mm; background: rgba(255,255,255,0.15);">
              <div style="font-size: 8px; opacity: .8;">رقم السند</div>
              <div style="font-size: 13px; font-weight: 900; letter-spacing: 1px;">${receiptNum}</div>
            </div>
          </div>

          <!-- DATE ROW -->
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2mm 6mm; display: flex; justify-content: space-between; font-size: 9.5px; color: #334155; margin-bottom: 4mm;">
            <span>تاريخ السند: <strong style="color: #0f382a;">${payHijri} هـ</strong> (${fd(payDateGreg)} م)</span>
            ${hs.commercial_register ? `<span>س.ت: <strong>${hs.commercial_register}</strong></span>` : ''}
            ${hs.tax_number ? `<span>الرقم الضريبي: <strong>${hs.tax_number}</strong></span>` : ''}
          </div>

          <!-- Client & Booking row -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3mm 4mm; margin-bottom: 4mm; font-size: 9.5px;">
            <div>
              <div style="font-size: 8.5px; color: #0f382a; border-bottom: 1px dashed #cbd5e1; padding-bottom: 1mm; margin-bottom: 1.5mm; font-weight: 800;">بيانات العميل</div>
              <div style="margin-bottom: 1.5mm;"><strong>الاسم:</strong> ${booking.customer_name || '-'}</div>
              <div><strong>الجوال:</strong> <span dir="ltr">${booking.customer_phone || '-'}</span></div>
            </div>
            <div>
              <div style="font-size: 8.5px; color: #0f382a; border-bottom: 1px dashed #cbd5e1; padding-bottom: 1mm; margin-bottom: 1.5mm; font-weight: 800;">بيانات الحجز</div>
              <div style="margin-bottom: 1.5mm;"><strong>رقم الحجز:</strong> ${booking.booking_number || '-'}${booking.voucher_number ? ` | سند: ${booking.voucher_number}` : ''}</div>
              <div style="margin-bottom: 1.5mm;"><strong>المناسبة:</strong> ${booking.event_type || '-'}${booking.hall_section ? ` — ${booking.hall_section}` : ''}</div>
              <div><strong>موعد المناسبة:</strong> <strong style="color: #0f382a;">${eventHijri} هـ</strong> (${fd(booking.event_date)} م)</div>
            </div>
          </div>

          <!-- Payment details row -->
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 4mm; margin-bottom: 4mm;">
            <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 3mm 4mm; font-size: 9.5px;">
              <div style="font-size: 8.5px; color: #0f382a; border-bottom: 1px dashed #cbd5e1; padding-bottom: 1mm; margin-bottom: 2mm; font-weight: 800;">تفاصيل السداد</div>
              <div style="margin-bottom: 1.5mm;"><strong>طريقة الدفع:</strong> ${payment.payment_method || '-'}</div>
              ${payment.reference_number ? `<div style="margin-bottom: 1.5mm;"><strong>رقم المرجع:</strong> ${payment.reference_number}</div>` : ''}
              ${cleanNote ? `<div><strong>ملاحظات:</strong> ${cleanNote}</div>` : ''}
            </div>
            <div style="border: 2px solid #0f382a; border-radius: 4px; padding: 3mm 4mm; text-align: center; display: flex; flex-direction: column; justify-content: center; background: #f0fdf4;">
              <div style="font-size: 8.5px; color: #166534; margin-bottom: 1mm; font-weight: 800;">المبلغ المسدد المقبوض</div>
              <div style="font-size: 20px; font-weight: 900; color: #0f382a; line-height: 1;">${fc(payment.amount)}</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 1mm;">ريال سعودي</div>
            </div>
          </div>

          <!-- Account summary -->
          <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 3mm 4mm; font-size: 9.5px; margin-bottom: 4mm;">
            <div style="font-size: 8.5px; color: #0f382a; border-bottom: 1px dashed #cbd5e1; padding-bottom: 1mm; margin-bottom: 2mm; font-weight: 800;">ملخص الحساب المالي</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm; text-align: center;">
              <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 2mm; background: #f8fafc;">
                <div style="font-size: 8px; color: #64748b;">المبلغ الإجمالي</div>
                <div style="font-weight: 800;">${fc(booking.final_amount)}</div>
              </div>
              <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 2mm; background: #f0fdf4;">
                <div style="font-size: 8px; color: #166534;">إجمالي المسدد</div>
                <div style="font-weight: 800; color: #15803d;">${fc(booking.paid_amount)}</div>
              </div>
              <div style="border: ${(booking.remaining_amount||0)>0?'1.5px solid #fca5a5':'1px solid #bbf7d0'}; border-radius: 4px; padding: 2mm; background: ${(booking.remaining_amount||0)>0?'#fef2f2':'#f0fdf4'}">
                <div style="font-size: 8px; color: ${(booking.remaining_amount||0)>0?'#991b1b':'#166534'};">المتبقي بعد السداد</div>
                <div style="font-weight: 900; font-size: 11px; color: ${(booking.remaining_amount||0)>0?'#b91c1c':'#15803d'};">${fc(booking.remaining_amount)}</div>
              </div>
            </div>
          </div>

          <!-- Signatures -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6mm; font-size: 8.5px; text-align: center; margin-top: auto; padding-top: 5mm; border-top: 1px solid #cbd5e1;">
            <div>
              <div style="color: #0f382a; font-weight: 800; margin-bottom: 25px;">المحاسب المستلم</div>
              <div style="border-top: 1px dashed #64748b; padding-top: 2px;">الاسم والتوقيع</div>
            </div>
            <div>
              <div style="color: #0f382a; font-weight: 800; margin-bottom: 6px;">ختم المنشأة الرسمي</div>
              <div style="border: 1.5px dashed #c8972e; border-radius: 50%; width: 45px; height: 45px; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 7pt; color: #c8972e; font-weight: bold;">الختم</div>
            </div>
            <div>
              <div style="color: #0f382a; font-weight: 800; margin-bottom: 25px;">توقيع العميل / المودع</div>
              <div style="border-top: 1px dashed #64748b; padding-top: 2px;">${booking.customer_name || 'الاسم والتوقيع'}</div>
            </div>
          </div>
        </div>

        ${footer(hallSettings, 1, 1)}
      </div>
    </div>
  `;
}