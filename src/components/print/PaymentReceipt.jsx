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
  const receiptNum = `${booking.booking_number || 'N/A'}-${source === 'bank' ? 'B' : 'C'}`;
  const sourceLabel = source === 'bank' ? 'البنك' : 'الخزينة';
  const sourceColor = source === 'bank' ? '#1a3560' : '#0f382a';
  const sourceLightColor = source === 'bank' ? '#e8eef7' : '#f0f7f0';
  const sourceBorderColor = source === 'bank' ? '#b0c4e8' : '#c5dfc5';

  const hallName = hs.hall_name || DEFAULT_HALL_NAME;
  const logoSrc = getHallLogoUrl(hs);
  const logoHtml = `<img src="${esc(logoSrc)}" alt="logo" style="width:65px;height:65px;object-fit:contain;display:block;border-radius:6px;background:#fff;padding:2px;" onerror="this.style.display='none'"/>`;
  const cleanNote = cleanCustomerNotes(payment.notes);

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<title>إيصال سداد - ${esc(receiptNum)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Cairo',Arial,sans-serif;direction:rtl;background:#eee;color:#111;}

  @page { size: A5 landscape; margin: 8mm; }
  @media print {
    html,body{background:#fff;}
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .no-print{display:none!important;}
    .page{box-shadow:none!important;margin:0!important;border-radius:0!important;width:100%;max-width:100%;}
  }

  .no-print{
    position:fixed;top:10px;left:50%;transform:translateX(-50%);
    display:flex;gap:10px;z-index:999;background:rgba(0,0,0,.05);padding:8px 14px;border-radius:12px;
  }
  .btn-print{background:${sourceColor};color:#fff;border:none;border-radius:8px;padding:8px 20px;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;cursor:pointer;}
  .btn-close{background:#fff;color:#555;border:1px solid #ccc;border-radius:8px;padding:8px 16px;font-family:Cairo,sans-serif;font-size:13px;cursor:pointer;}

  /* Main page - A5 landscape = 210mm x 148mm */
  .page{
    width:194mm;min-height:132mm;
    background:#fff;
    margin:18mm auto;
    box-shadow:0 6px 30px rgba(0,0,0,.18);
    border-radius:5mm;
    overflow:hidden;
    display:flex;
    flex-direction:column;
  }

  /* === TOP HEADER BAR === */
  .header{
    background:${sourceColor};
    color:#fff;
    padding:5mm 7mm;
    display:flex;
    align-items:center;
    justify-content:space-between;
  }
  .header-logo{
    display:flex;
    align-items:center;
    gap:4mm;
  }
  .header-logo-img{
    width:55px;height:55px;
    background:#fff;
    border-radius:3mm;
    display:flex;align-items:center;justify-content:center;
    overflow:hidden;padding:2px;
  }
  .header-hall-info{
    text-align:right;
  }
  .hall-name-big{font-size:18px;font-weight:900;letter-spacing:.3px;}
  .hall-subtitle{font-size:10px;opacity:.75;margin-top:1mm;}
  .hall-contact{font-size:9px;opacity:.65;margin-top:1mm;direction:ltr;text-align:right;}

  .header-center{
    text-align:center;
    flex:1;
  }
  .receipt-type-ar{font-size:22px;font-weight:900;letter-spacing:1px;}
  .receipt-type-en{font-size:10px;opacity:.7;margin-top:1mm;letter-spacing:2px;text-transform:uppercase;}

  .header-right{
    text-align:left;
    min-width:50mm;
  }
  .rec-num-label{font-size:9px;opacity:.7;margin-bottom:1mm;}
  .rec-num-val{
    font-size:15px;font-weight:800;letter-spacing:1.5px;
    background:rgba(255,255,255,.18);
    padding:1.5mm 3mm;border-radius:2mm;
    display:inline-block;
  }
  .source-badge{
    margin-top:2mm;
    font-size:9px;
    background:rgba(255,255,255,.15);
    border:1px solid rgba(255,255,255,.3);
    border-radius:10px;
    padding:1mm 3mm;
    display:inline-block;
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
    padding:5mm 5mm 4mm 5mm;
    border-left:1px solid #eee;
  }
  /* Right column — amount & payment */
  .col-right{
    width:72mm;
    padding:5mm;
    display:flex;
    flex-direction:column;
    gap:3mm;
    background:${sourceLightColor};
  }

  .section-title{
    font-size:9px;
    font-weight:700;
    color:${sourceColor};
    text-transform:uppercase;
    letter-spacing:.5px;
    margin-bottom:2mm;
    padding-bottom:1mm;
    border-bottom:1.5px solid ${sourceBorderColor};
  }

  .info-grid{
    display:grid;
    grid-template-columns:auto 1fr;
    gap:1mm 3mm;
    font-size:10px;
  }
  .ig-label{color:#888;white-space:nowrap;}
  .ig-val{font-weight:600;color:#111;}

  /* Amount block */
  .amount-box{
    background:${sourceColor};
    color:#fff;
    border-radius:3mm;
    padding:4mm;
    text-align:center;
  }
  .am-label{font-size:9px;opacity:.75;margin-bottom:1.5mm;}
  .am-val{font-size:26px;font-weight:900;letter-spacing:.5px;line-height:1;}
  .am-currency{font-size:13px;opacity:.85;margin-top:.5mm;}
  .am-words{font-size:9px;opacity:.8;margin-top:2mm;line-height:1.5;}

  /* Payment method badge */
  .pay-method-box{
    border:1.5px solid ${sourceBorderColor};
    border-radius:2mm;
    padding:3mm;
    text-align:center;
    background:#fff;
  }
  .pm-label{font-size:8px;color:#888;margin-bottom:1mm;}
  .pm-val{font-size:13px;font-weight:800;color:${sourceColor};}

  /* Totals mini */
  .totals-mini{font-size:9.5px;}
  .totals-row{display:flex;justify-content:space-between;padding:1mm 0;border-bottom:1px dashed #ddd;}
  .totals-row:last-child{border-bottom:none;font-weight:700;}
  .tr-label{color:#666;}
  .tr-val{font-weight:600;}
  .tr-val.green{color:#1a7a3c;}
  .tr-val.red{color:#c0392b;}

  /* === FOOTER === */
  .footer{
    border-top:2px dashed ${sourceBorderColor};
    padding:3mm 7mm;
    display:flex;
    justify-content:space-between;
    align-items:center;
    background:#fafafa;
  }
  .sign-area{display:flex;gap:8mm;}
  .sign-box{text-align:center;}
  .sign-label{font-size:8px;color:#888;margin-bottom:1mm;}
  .sign-line{border-bottom:1.5px solid #333;width:35mm;height:8mm;margin-bottom:1mm;}
  .stamp-circle{
    width:18mm;height:18mm;border-radius:50%;
    border:1.5px dashed #bbb;
    display:flex;align-items:center;justify-content:center;
    font-size:7px;color:#bbb;
  }
  .footer-note{font-size:8px;color:#aaa;text-align:center;max-width:60mm;line-height:1.5;}

  /* gold bottom strip */
  .gold-strip{background:#c8972e;height:2.5mm;}
</style>
</head>
<body>
<div class="no-print">
  <button class="btn-print" onclick="window.print()">🖨️ طباعة / PDF</button>
  <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
</div>

<div class="page">

  <!-- HEADER -->
  <div class="header">
    <!-- Hall info (right side in RTL) -->
    <div class="header-hall-info">
      <div class="hall-name-big">${esc(hs.hall_name || 'قاعة الأفراح')}</div>
      ${hs.city ? `<div class="hall-subtitle">${esc(hs.city)}</div>` : '<div class="hall-subtitle">قاعة أفراح ومناسبات</div>'}
      ${hs.phone ? `<div class="hall-contact">📞 ${esc(hs.phone)}</div>` : ''}
    </div>

    <!-- Center: logo + title -->
    <div class="header-center">
      <div class="header-logo-img" style="margin:0 auto 3mm;">
        ${logoHtml}
      </div>
      <div class="receipt-type-ar">إيصال سداد</div>
      <div class="receipt-type-en">Payment Receipt</div>
    </div>

    <!-- Receipt number (left side in RTL) -->
    <div class="header-right">
      <div class="rec-num-label">رقم الإيصال</div>
      <div class="rec-num-val">${esc(receiptNum)}</div>
      <div class="source-badge">📦 ${sourceLabel}</div>
      ${hs.commercial_register ? `<div style="font-size:8px;opacity:.6;margin-top:2mm;">س.ت: ${esc(hs.commercial_register)}</div>` : ''}
    </div>
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
        <span class="ig-val">${esc(booking.event_type || '-')}</span>

        <span class="ig-label">قسم القاعة:</span>
        <span class="ig-val">${esc(booking.hall_section || '-')}</span>

        <span class="ig-label">موعد المناسبة (هجري):</span>
        <span class="ig-val">${esc(booking.event_date_hijri || '-')}</span>

        <span class="ig-label">موعد المناسبة (ميلادي):</span>
        <span class="ig-val">${esc(fd(booking.event_date))}</span>
      </div>

      <div style="margin-top:3mm;">
        <div class="section-title">بيانات السداد</div>
        <div class="info-grid">
          <span class="ig-label">تاريخ السداد (هجري):</span>
          <span class="ig-val">${esc(payDateHijri)}</span>

          <span class="ig-label">تاريخ السداد (ميلادي):</span>
          <span class="ig-val">${esc(fd(payDateGreg))}</span>

          ${payment.reference_number ? `
          <span class="ig-label">رقم المرجع:</span>
          <span class="ig-val">${esc(payment.reference_number)}</span>` : ''}

          ${cleanNote ? `
          <span class="ig-label">ملاحظات:</span>
          <span class="ig-val">${esc(cleanNote)}</span>` : ''}
        </div>
      </div>
    </div>

    <!-- Right: Amount & payment method -->
    <div class="col-right">
      <div class="amount-box">
        <div class="am-label">المبلغ المسدد</div>
        <div class="am-val">${fc(payment.amount)}</div>
        <div class="am-currency">ريال سعودي</div>
        <div class="am-words">${esc(amountWords)}</div>
      </div>

      <div class="pay-method-box">
        <div class="pm-label">طريقة الدفع</div>
        <div class="pm-val">${esc(payment.payment_method || '-')}</div>
      </div>

      <div class="totals-mini">
        <div class="section-title">ملخص الحساب</div>
        <div class="totals-row">
          <span class="tr-label">المبلغ الكلي:</span>
          <span class="tr-val">${fc(booking.final_amount)} ر.س</span>
        </div>
        <div class="totals-row">
          <span class="tr-label">المسدد:</span>
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
        <div class="sign-label">مستلم المبلغ</div>
        <div class="sign-line"></div>
        <div class="sign-label">الاسم والتوقيع</div>
      </div>
      <div class="sign-box">
        <div class="sign-label">ختم المؤسسة</div>
        <div class="stamp-circle">الختم الرسمي</div>
      </div>
    </div>

    <div class="footer-note">
      ${hs.address ? `📍 ${esc(hs.address)}` : ''}
      ${hs.iban ? `<br/>IBAN: ${esc(hs.iban)}` : ''}
      ${hs.bank_name ? `<br/>${esc(hs.bank_name)}` : ''}
    </div>

    <div style="text-align:center;">
      <div class="sign-label" style="margin-bottom:1mm;">توقيع العميل</div>
      <div class="sign-line"></div>
      <div class="sign-label">الاسم والتوقيع</div>
    </div>
  </div>

  <div class="gold-strip"></div>
</div>
</body>
</html>`;
}