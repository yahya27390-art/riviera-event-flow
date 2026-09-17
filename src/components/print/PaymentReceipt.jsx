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
  const amountWords = numberToArabicWords(payment.amount);
  const isBank = source === 'bank' || payment.payment_method?.includes('بنك') || payment.payment_method?.includes('تحويل') || payment.payment_method?.includes('شبكة');
  const receiptNum = `${booking.booking_number || 'RIV'}-${isBank ? 'BANK' : 'CASH'}-${(payment.id || '').substring(0, 4) || '01'}`;
  const sourceLabel = isBank ? 'تحويل بنكي / شبكة' : 'سداد نقدي (الخزينة)';

  const hallName = hs.hall_name || DEFAULT_HALL_NAME;
  const logoSrc = getHallLogoUrl(hs);
  const cleanNote = cleanCustomerNotes(payment.notes);

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<title>سند قبض مالي - ${esc(receiptNum)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Cairo',Arial,sans-serif;direction:rtl;background:#f1f5f9;color:#111;}

  @page { size: A5 landscape; margin: 6mm; }
  @media print {
    html,body{background:#fff!important;width:100%;}
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .no-print{display:none!important;}
    .page{box-shadow:none!important;margin:0!important;border-radius:0!important;width:100%!important;max-width:100%!important;}
  }

  .no-print{
    position:fixed;top:10px;left:50%;transform:translateX(-50%);
    display:flex;gap:10px;z-index:999;background:rgba(0,0,0,.8);padding:8px 16px;border-radius:12px;
  }
  .btn-print{background:#0f382a;color:#fff;border:1px solid #c8972e;border-radius:8px;padding:8px 22px;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;cursor:pointer;}
  .btn-close{background:#fff;color:#333;border:none;border-radius:8px;padding:8px 16px;font-family:Cairo,sans-serif;font-size:13px;cursor:pointer;}

  /* Main page - A5 landscape = 210mm x 148mm */
  .page{
    width:196mm;min-height:136mm;
    background:#fff;
    margin:12mm auto;
    box-shadow:0 6px 30px rgba(0,0,0,.15);
    border:2px solid #0f382a;
    border-radius:3mm;
    overflow:hidden;
    display:flex;
    flex-direction:column;
  }

  /* === TOP HEADER BAR === */
  .header{
    background:#0f382a;
    color:#fff;
    padding:4mm 6mm;
    display:flex;
    align-items:center;
    justify-content:space-between;
    border-bottom:2px solid #c8972e;
  }
  .header-hall-info{
    text-align:right;
    min-width:45mm;
  }
  .hall-name-big{font-size:16px;font-weight:900;letter-spacing:.3px;color:#fff;}
  .hall-subtitle{font-size:9.5px;color:#c8972e;margin-top:1mm;font-weight:700;}
  .hall-contact{font-size:8.5px;opacity:.8;margin-top:1mm;}

  .header-center{
    text-align:center;
    flex:1;
    display:flex;
    flex-direction:column;
    align-items:center;
  }
  .header-logo-img{
    height:50px;
    max-width:110px;
    object-fit:contain;
    display:block;
    margin-bottom:2px;
  }
  .receipt-type-ar{font-size:18px;font-weight:900;letter-spacing:.5px;color:#ffffff;}
  .receipt-type-en{font-size:8.5px;color:#c8972e;letter-spacing:1.5px;font-weight:700;}

  .header-right{
    text-align:left;
    min-width:45mm;
  }
  .rec-num-label{font-size:8.5px;opacity:.8;margin-bottom:1mm;}
  .rec-num-val{
    font-size:13px;font-weight:900;letter-spacing:1px;
    background:rgba(255,255,255,.15);
    border:1px solid #c8972e;
    padding:1.5mm 3mm;border-radius:2mm;
    display:inline-block;
  }
  .source-badge{
    margin-top:2mm;
    font-size:8.5px;
    background:#c8972e;
    color:#0f382a;
    font-weight:800;
    border-radius:4px;
    padding:1mm 3mm;
    display:inline-block;
  }

  /* Date Bar */
  .date-bar{
    background:#f8fafc;
    border-bottom:1px solid #e2e8f0;
    padding:2mm 6mm;
    display:flex;
    justify-content:space-between;
    font-size:9px;
    color:#334155;
  }

  /* === BODY === */
  .body{
    flex:1;
    display:flex;
    gap:0;
  }

  /* Left column — client & booking info */
  .col-left{
    flex:1;
    padding:3.5mm 5mm;
    border-left:1px solid #e2e8f0;
  }
  /* Right column — amount & payment */
  .col-right{
    width:70mm;
    padding:3.5mm;
    display:flex;
    flex-direction:column;
    gap:2.5mm;
    background:#f0fdf4;
  }

  .section-title{
    font-size:8.5px;
    font-weight:800;
    color:#0f382a;
    text-transform:uppercase;
    margin-bottom:2mm;
    padding-bottom:1mm;
    border-bottom:1.5px solid #c8972e;
  }

  .info-grid{
    display:grid;
    grid-template-columns:auto 1fr;
    gap:1.5mm 3mm;
    font-size:9.5px;
  }
  .ig-label{color:#64748b;white-space:nowrap;font-size:8.5px;}
  .ig-val{font-weight:700;color:#0f172a;}

  /* Amount block */
  .amount-box{
    background:#0f382a;
    color:#fff;
    border:1px solid #c8972e;
    border-radius:3mm;
    padding:3mm;
    text-align:center;
  }
  .am-label{font-size:8.5px;color:#c8972e;font-weight:700;margin-bottom:1mm;}
  .am-val{font-size:22px;font-weight:900;letter-spacing:.5px;line-height:1;color:#fff;}
  .am-currency{font-size:11px;opacity:.9;margin-top:.5mm;}
  .am-words{font-size:8.5px;color:#fef08a;margin-top:2mm;line-height:1.4;font-weight:600;}

  /* Payment method badge */
  .pay-method-box{
    border:1px solid #cbd5e1;
    border-radius:2mm;
    padding:2.5mm;
    text-align:center;
    background:#fff;
  }
  .pm-label{font-size:8px;color:#64748b;margin-bottom:.5mm;}
  .pm-val{font-size:11.5px;font-weight:800;color:#0f382a;}

  /* Totals mini */
  .totals-mini{font-size:9px;background:#fff;border:1px solid #cbd5e1;border-radius:2mm;padding:2mm 3mm;}
  .totals-row{display:flex;justify-content:space-between;padding:.8mm 0;border-bottom:1px dashed #e2e8f0;}
  .totals-row:last-child{border-bottom:none;font-weight:800;padding-top:1.5mm;}
  .tr-label{color:#64748b;}
  .tr-val{font-weight:700;}
  .tr-val.green{color:#15803d;}
  .tr-val.red{color:#b91c1c;}

  /* === FOOTER === */
  .footer{
    border-top:1.5px solid #cbd5e1;
    padding:2.5mm 6mm;
    display:flex;
    justify-content:space-between;
    align-items:center;
    background:#fafafa;
  }
  .sign-area{display:flex;gap:6mm;}
  .sign-box{text-align:center;}
  .sign-label{font-size:8px;color:#64748b;margin-bottom:1mm;font-weight:700;}
  .sign-line{border-bottom:1px dashed #94a3b8;width:30mm;height:6mm;margin-bottom:1mm;}
  .stamp-circle{
    width:15mm;height:15mm;border-radius:50%;
    border:1.5px dashed #c8972e;
    display:flex;align-items:center;justify-content:center;
    font-size:7px;color:#c8972e;font-weight:700;
  }
  .footer-note{font-size:7.5px;color:#64748b;text-align:center;max-width:55mm;line-height:1.4;}

  .gold-strip{background:#0f382a;height:2mm;border-top:1px solid #c8972e;}
</style>
</head>
<body>
<div class="no-print">
  <button class="btn-print" onclick="window.print()">🖨️ طباعة السند / PDF</button>
  <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
</div>

<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-hall-info">
      <div class="hall-name-big">${esc(hallName)}</div>
      <div class="hall-subtitle">${esc(hs.city || 'القصيم - بريدة')}</div>
      ${hs.phone ? `<div class="hall-contact">هاتف: ${esc(hs.phone)}</div>` : ''}
    </div>

    <div class="header-center">
      <img src="${esc(logoSrc)}" alt="شعار القاعة" class="header-logo-img"/>
      <div class="receipt-type-ar">سند قبض مالي معتمد</div>
      <div class="receipt-type-en">OFFICIAL PAYMENT RECEIPT</div>
    </div>

    <div class="header-right">
      <div class="rec-num-label">رقم السند</div>
      <div class="rec-num-val">${esc(receiptNum)}</div>
      <div><span class="source-badge">${esc(sourceLabel)}</span></div>
    </div>
  </div>

  <!-- DATE BAR -->
  <div class="date-bar">
    <span>تاريخ السند: <strong>${esc(payDateHijri)} هـ</strong> (${esc(fd(payDateGreg))} م)</span>
    ${hs.commercial_register ? `<span>س.ت: <strong>${esc(hs.commercial_register)}</strong></span>` : ''}
    ${hs.tax_number ? `<span>الرقم الضريبي: <strong>${esc(hs.tax_number)}</strong></span>` : ''}
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- Left: Client & booking info -->
    <div class="col-left">
      <div class="section-title">بيانات العميل والحجز</div>
      <div class="info-grid">
        <span class="ig-label">اسم العميل:</span>
        <span class="ig-val">${esc(booking.customer_name || '-')}</span>

        <span class="ig-label">رقم الجوال:</span>
        <span class="ig-val" dir="ltr">${esc(booking.customer_phone || '-')}</span>

        <span class="ig-label">رقم الحجز:</span>
        <span class="ig-val">${esc(booking.booking_number || '-')}</span>

        <span class="ig-label">نوع المناسبة:</span>
        <span class="ig-val">${esc(booking.event_type || '-')}${booking.hall_section ? ` — ${esc(booking.hall_section)}` : ''}</span>

        <span class="ig-label">موعد المناسبة:</span>
        <span class="ig-val">${esc(booking.event_date_hijri || '')} (${esc(fd(booking.event_date))})</span>
      </div>

      <div style="margin-top:2.5mm;">
        <div class="section-title">بيانات العملية</div>
        <div class="info-grid">
          <span class="ig-label">طريقة التحصيل:</span>
          <span class="ig-val">${esc(payment.payment_method || '-')}</span>

          ${payment.reference_number ? `
          <span class="ig-label">رقم المرجع:</span>
          <span class="ig-val">${esc(payment.reference_number)}</span>` : ''}

          ${cleanNote ? `
          <span class="ig-label">البيان / ملاحظات:</span>
          <span class="ig-val">${esc(cleanNote)}</span>` : ''}
        </div>
      </div>
    </div>

    <!-- Right: Amount & payment method -->
    <div class="col-right">
      <div class="amount-box">
        <div class="am-label">المبلغ المقبوض</div>
        <div class="am-val">${fc(payment.amount)}</div>
        <div class="am-currency">ريال سعودي</div>
        <div class="am-words">${esc(amountWords)}</div>
      </div>

      <div class="totals-mini">
        <div class="totals-row">
          <span class="tr-label">إجمالي العقد:</span>
          <span class="tr-val">${fc(booking.final_amount)} ر.س</span>
        </div>
        <div class="totals-row">
          <span class="tr-label">إجمالي المسدد:</span>
          <span class="tr-val green">${fc(booking.paid_amount)} ر.س</span>
        </div>
        <div class="totals-row">
          <span class="tr-label">المتبقي:</span>
          <span class="tr-val ${(booking.remaining_amount || 0) > 0 ? 'red' : 'green'}">${fc(booking.remaining_amount)} ر.س</span>
        </div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="sign-area">
      <div class="sign-box">
        <div class="sign-label">المحاسب المستلم</div>
        <div class="sign-line"></div>
      </div>
      <div class="sign-box">
        <div class="stamp-circle">ختم المنشأة</div>
      </div>
    </div>

    <div class="footer-note">
      ${hs.address ? `${esc(hs.address)}` : ''}
      ${hs.phone ? ` • هاتف: ${esc(hs.phone)}` : ''}
      <br/>يعتبر هذا السند وثيقة قبض مالية رسمية
    </div>

    <div style="text-align:center;">
      <div class="sign-label">توقيع العميل / المودع</div>
      <div class="sign-line"></div>
    </div>
  </div>

  <div class="gold-strip"></div>
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