import { numberToArabicWords } from '@/lib/arabicWords';
import { gregorianToHijri } from '@/lib/hijri';
import { getHallLogoUrl, cleanCustomerNotes, DEFAULT_HALL_NAME } from '@/lib/branding';

function fc(n) {
  return (parseFloat(n) || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fd(dateStr) {
  if (!dateStr) return '-';
  try { return new Date(dateStr).toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return dateStr; }
}

const esc = (s) => {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export function buildPaymentReceipt(hallSettings, booking, payment, source = 'cash') {
  const hs = hallSettings || {};
  const payDateGreg = payment.payment_date || new Date().toISOString().split('T')[0];
  const payDateHijri = payment.payment_date_hijri || gregorianToHijri(payDateGreg);
  const eventDateHijri = booking.event_date_hijri || (booking.event_date ? gregorianToHijri(booking.event_date) : '-');
  const amountWords = numberToArabicWords(payment.amount);
  const isBank = source === 'bank' || payment.payment_method?.includes('بنك') || payment.payment_method?.includes('تحويل') || payment.payment_method?.includes('شبكة');
  const receiptNum = `${booking.booking_number || 'RIV'}-${isBank ? 'BANK' : 'CASH'}-${(payment.id || '').substring(0, 4) || '01'}`;
  const sourceLabel = isBank ? 'تحويل بنكي / شبكة (POS)' : 'سداد نقدي معتمد (الخزينة)';

  const hallName = hs.hall_name || DEFAULT_HALL_NAME;
  const logoSrc = getHallLogoUrl(hs);
  const cleanNote = cleanCustomerNotes(payment.notes);

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<title>سند قبض مالي معتمد - ${esc(receiptNum)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Cairo', Arial, sans-serif; direction:rtl; background:#f1f5f9; color:#111827; }

  @page {
    size: A4 portrait;
    margin: 0;
  }

  @media print {
    html, body {
      width: 210mm !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print {
      display: none !important;
    }
    .page {
      box-shadow: none !important;
      margin: 0 !important;
      width: 210mm !important;
      height: 296.5mm !important;
      max-height: 296.5mm !important;
      box-sizing: border-box !important;
      padding: 8mm 10mm !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      overflow: hidden !important;
    }
    .page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
  }

  .no-print {
    position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
    display: flex; gap: 10px; z-index: 9999; background: rgba(0,0,0,.85); padding: 8px 18px; border-radius: 12px;
  }
  .btn-print { background: #0f382a; color: #fff; border: 1px solid #c8972e; border-radius: 8px; padding: 9px 24px; font-family: Cairo, sans-serif; font-size: 13.5px; font-weight: 700; cursor: pointer; }
  .btn-close { background: #fff; color: #333; border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 18px; font-family: Cairo, sans-serif; font-size: 13.5px; cursor: pointer; }

  .page {
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    background: #fff;
    margin: 10mm auto;
    box-shadow: 0 6px 35px rgba(0,0,0,.15);
    padding: 8mm 10mm;
    box-sizing: border-box;
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  }
  .page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .page-inner-frame {
    border: 2.5px solid #0f382a;
    outline: 1px solid #c8972e;
    outline-offset: -4.5px;
    border-radius: 4px;
    padding: 6mm 7mm;
    width: 100%;
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
  }

  .page-content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  /* Header */
  .header {
    background: #0f382a;
    color: #fff;
    padding: 3.5mm 5mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 4px;
    border: 1px solid #c8972e;
    margin-bottom: 3.5mm;
  }
  .hall-name-big { font-size: 16px; font-weight: 900; letter-spacing: .3px; color: #fff; }
  .hall-subtitle { font-size: 9.5px; color: #c8972e; margin-top: 1mm; font-weight: 700; }
  .hall-contact { font-size: 8.5px; opacity: .8; margin-top: 1mm; }

  .receipt-type-ar { font-size: 17px; font-weight: 900; letter-spacing: .5px; color: #ffffff; }
  .receipt-type-en { font-size: 8px; color: #c8972e; letter-spacing: 1.5px; font-weight: 700; }

  .rec-num-val {
    font-size: 13px; font-weight: 900; letter-spacing: 1px;
    background: rgba(255,255,255,.15);
    border: 1px solid #c8972e;
    padding: 1.5mm 3mm; border-radius: 2mm;
    display: inline-block;
  }
  .source-badge {
    margin-top: 1.5mm;
    font-size: 8.5px;
    background: #c8972e;
    color: #0f382a;
    font-weight: 800;
    border-radius: 4px;
    padding: 1mm 3mm;
    display: inline-block;
  }

  /* Date Bar */
  .date-bar {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 2mm 5mm;
    display: flex;
    justify-content: space-between;
    font-size: 9.5px;
    color: #334155;
    margin-bottom: 3.5mm;
  }

  .section-title {
    font-size: 9pt;
    font-weight: 800;
    color: #0f382a;
    margin-bottom: 2mm;
    padding-bottom: 1mm;
    border-bottom: 1.5px solid #c8972e;
  }

  .info-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1.5mm 3mm;
    font-size: 9pt;
  }
  .ig-label { color: #64748b; white-space: nowrap; font-size: 8.5pt; }
  .ig-val { font-weight: 700; color: #0f172a; }

  .amount-box {
    background: #0f382a;
    color: #fff;
    border: 1px solid #c8972e;
    border-radius: 4px;
    padding: 3.5mm;
    text-align: center;
  }
  .am-label { font-size: 9pt; color: #c8972e; font-weight: 800; margin-bottom: 1mm; }
  .am-val { font-size: 24px; font-weight: 900; letter-spacing: .5px; line-height: 1; color: #fff; }
  .am-currency { font-size: 11px; opacity: .9; margin-top: 1mm; }
  .am-words { font-size: 9pt; color: #fef08a; margin-top: 2mm; line-height: 1.4; font-weight: 700; }

  .totals-mini {
    font-size: 9pt;
    background: #fff;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 2.5mm 3.5mm;
  }
  .totals-row { display: flex; justify-content: space-between; padding: 1mm 0; border-bottom: 1px dashed #e2e8f0; }
  .totals-row:last-child { border-bottom: none; font-weight: 900; padding-top: 1.5mm; }
  .tr-val.green { color: #15803d; font-weight: 800; }
  .tr-val.red { color: #b91c1c; font-weight: 800; }

  /* Signatures */
  .sign-area {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin-top: auto;
    padding-top: 3.5mm;
    border-top: 1px solid #cbd5e1;
    text-align: center;
    font-size: 8.5pt;
  }
  .sign-label { font-size: 8.5pt; color: #0f382a; margin-bottom: 20px; font-weight: 800; }
  .sign-line { border-top: 1px dashed #94a3b8; padding-top: 3px; color: #64748b; font-size: 8pt; }
  .stamp-circle {
    width: 48px; height: 48px; border-radius: 50%;
    border: 1.5px dashed #c8972e;
    margin: 0 auto;
    display: flex; align-items: center; justify-content: center;
    font-size: 7pt; color: #c8972e; font-weight: 800;
  }

  /* Pinned Footer */
  .rpt-footer {
    margin-top: auto;
    padding-top: 3mm;
    border-top: 1.5px solid #cbd5e1;
    font-size: 8.5pt;
    color: #64748b;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
</style>
</head>
<body>
<div class="no-print">
  <button class="btn-print" onclick="window.print()">🖨️ طباعة السند / حفظ PDF</button>
  <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
</div>

<div class="page">
  <div class="page-inner-frame">
    <div class="page-content-area">

      <!-- HEADER -->
      <div class="header">
        <div style="text-align: right; min-width: 45mm;">
          <div class="hall-name-big">${esc(hallName)}</div>
          <div class="hall-subtitle">${esc(hs.city || 'القصيم - بريدة')}</div>
          ${hs.phone ? `<div class="hall-contact">هاتف: <span dir="ltr">${esc(hs.phone)}</span></div>` : ''}
        </div>

        <div style="text-align: center; flex: 1;">
          <img src="${esc(logoSrc)}" alt="شعار القاعة" style="height: 52px; max-width: 110px; object-fit: contain; display: block; margin: 0 auto 3px; background: #fff; border-radius: 4px; padding: 2px;" />
          <div class="receipt-type-ar">سند قبض مالي معتمد</div>
          <div class="receipt-type-en">OFFICIAL PAYMENT RECEIPT</div>
        </div>

        <div style="text-align: left; min-width: 45mm;">
          <div style="font-size: 8pt; opacity: .8; margin-bottom: 1mm;">رقم السند</div>
          <div class="rec-num-val">${esc(receiptNum)}</div>
          <div><span class="source-badge">${esc(sourceLabel)}</span></div>
        </div>
      </div>

      <!-- DATE BAR -->
      <div class="date-bar">
        <span>تاريخ السند (الهجري أساسي): <strong style="color: #0f382a; font-size: 10pt;">${esc(payDateHijri)} هـ</strong> <span style="color: #64748b;">(الموافق ${esc(fd(payDateGreg))} م)</span></span>
        ${hs.commercial_register ? `<span>س.ت: <strong>${esc(hs.commercial_register)}</strong></span>` : ''}
        ${hs.tax_number ? `<span>الرقم الضريبي: <strong>${esc(hs.tax_number)}</strong></span>` : ''}
      </div>

      <!-- BODY GRID -->
      <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 4mm; margin-bottom: 4mm;">

        <!-- Left: Client & booking info -->
        <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 3.5mm 4.5mm; background: #ffffff;">
          <div class="section-title">بيانات العميل والحجز</div>
          <div class="info-grid" style="margin-bottom: 3.5mm;">
            <span class="ig-label">اسم العميل المكرم:</span>
            <span class="ig-val" style="color: #0f382a; font-size: 10pt;">${esc(booking.customer_name || '-')}</span>

            <span class="ig-label">رقم الجوال:</span>
            <span class="ig-val" dir="ltr">${esc(booking.customer_phone || '-')}</span>

            <span class="ig-label">رقم الحجز:</span>
            <span class="ig-val" style="font-family: monospace; color: #0f382a;">${esc(booking.booking_number || '-')}${booking.voucher_number ? ` (سند: ${esc(booking.voucher_number)})` : ''}</span>

            <span class="ig-label">نوع المناسبة والقسم:</span>
            <span class="ig-val">${esc(booking.event_type || '-')}${booking.hall_section ? ` — ${esc(booking.hall_section)}` : ''}</span>

            <span class="ig-label">موعد المناسبة:</span>
            <span class="ig-val">
              <strong style="color: #0f382a;">${esc(eventDateHijri)} هـ</strong>
              <span style="font-size: 8pt; color: #64748b;">(${esc(fd(booking.event_date))} م)</span>
            </span>
          </div>

          <div class="section-title">بيانات عملية السداد</div>
          <div class="info-grid">
            <span class="ig-label">طريقة التحصيل:</span>
            <span class="ig-val">${esc(payment.payment_method || '-')}</span>

            ${payment.reference_number ? `
            <span class="ig-label">رقم المرجع:</span>
            <span class="ig-val" style="font-family: monospace;">${esc(payment.reference_number)}</span>` : ''}

            ${cleanNote ? `
            <span class="ig-label">البيان / ملاحظات:</span>
            <span class="ig-val">${esc(cleanNote)}</span>` : ''}
          </div>
        </div>

        <!-- Right: Amount & Totals -->
        <div style="display: flex; flex-direction: column; gap: 3mm;">
          <div class="amount-box">
            <div class="am-label">المبلغ المقبوض الفعلي</div>
            <div class="am-val">${fc(payment.amount)}</div>
            <div class="am-currency">ريال سعودي</div>
            <div class="am-words">${esc(amountWords)}</div>
          </div>

          <div class="totals-mini">
            <div class="totals-row">
              <span class="tr-label">إجمالي قيمة العقد:</span>
              <span class="tr-val">${fc(booking.final_amount)} ر.س</span>
            </div>
            <div class="totals-row">
              <span class="tr-label">إجمالي المسدد حتى الآن:</span>
              <span class="tr-val green">${fc(booking.paid_amount)} ر.س</span>
            </div>
            <div class="totals-row">
              <span class="tr-label">المتبقي بعد هذا السداد:</span>
              <span class="tr-val ${(booking.remaining_amount || 0) > 0 ? 'red' : 'green'}">${fc(booking.remaining_amount)} ر.س</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Legal declaration note -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2.5mm 4mm; font-size: 8pt; color: #475569; line-height: 1.5; margin-bottom: 4mm;">
        <strong>إقرار استلام:</strong> تم استلام هذا المبلغ وقيده في الحساب المالي الرسمي الخاص بالقاعة مقابل خدمات المناسبات المحددة أعلاه، ويعد هذا السند لاغياً في حال إلغاء الشيك أو رجوع التحويل البنكي.
      </div>

      <!-- SIGNATURES -->
      <div class="sign-area">
        <div>
          <div class="sign-label">المحاسب المستلم</div>
          <div class="sign-line">الاسم والتوقيع</div>
        </div>
        <div>
          <div style="font-size: 8.5pt; color: #0f382a; font-weight: 800; margin-bottom: 4px;">الختم الرسمي للمنشأة</div>
          <div class="stamp-circle">الختم الرسمي</div>
        </div>
        <div>
          <div class="sign-label">توقيع العميل / المودع</div>
          <div class="sign-line">${esc(booking.customer_name || 'الاسم والتوقيع')}</div>
        </div>
      </div>

    </div>

    <!-- Pinned Footer -->
    <div class="rpt-footer">
      <div>
        <span>تاريخ الإصدار: <strong>${esc(payDateHijri)} هـ</strong> (${esc(fd(payDateGreg))} م)</span>
        <span> • ${esc(hallName)} • وثيقة قبض رسمية معتمدة</span>
      </div>
      <div>
        <span class="rpt-page-badge" style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #0f382a; padding: 1.5px 8px; border-radius: 4px; font-weight: 700;">صفحة 1 من 1</span>
      </div>
    </div>
  </div>
</div>

<script>
  window.onload = function() {
    window.focus();
    setTimeout(function() { window.print(); }, 400);
  };
</script>
</body>
</html>`;
}