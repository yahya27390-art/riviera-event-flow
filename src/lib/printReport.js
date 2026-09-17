/**
 * Universal print function — opens a styled A4 window and triggers browser print.
 * @param {string} htmlContent  - the inner HTML to print
 * @param {string} title        - window / document title
 */
export function openPrintWindow(htmlContent, title = 'تقرير') {
  const win = window.open('', '_blank', 'width=900,height=1200');
  win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Cairo',Arial,sans-serif;direction:rtl;background:#f1f5f9;color:#111827;}
    @page{size:A4 portrait;margin:12mm 12mm 12mm 12mm;}
    @media print{
      html,body{width:210mm;background:#fff!important;}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .no-print{display:none!important;}
      .page{box-shadow:none!important;margin:0!important;padding:0!important;width:100%!important;}
    }
    .page{
      width:186mm;background:#fff;margin:10mm auto;
      box-shadow:0 4px 30px rgba(0,0,0,.12);
      padding:12mm 14mm 10mm 14mm;
      page-break-after:always;
      border-radius:4px;
    }
    .page:last-child{page-break-after:auto;}

    /* ── Header ── */
    .rpt-header{text-align:center;margin-bottom:6mm;padding-bottom:5mm;border-bottom:2.5px solid #0f382a;}
    .rpt-logo{width:75px;height:75px;object-fit:contain;margin:0 auto 3mm;display:block;}
    .rpt-logo-placeholder{
      width:75px;height:75px;border-radius:50%;background:#0f382a;
      display:flex;align-items:center;justify-content:center;
      margin:0 auto 3mm;color:#fff;font-size:22px;font-weight:800;
    }
    .rpt-hall-name{font-size:20px;font-weight:900;color:#0f382a;margin-bottom:2px;}
    .rpt-title{font-size:15px;font-weight:800;color:#c8972e;letter-spacing:.5px;margin-bottom:2px;}
    .rpt-period{font-size:10.5px;color:#4b5563;}
    .rpt-contact{font-size:9.5px;color:#6b7280;margin-top:2mm;}

    /* ── Summary boxes ── */
    .summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-bottom:6mm;}
    .summary-grid-2{grid-template-columns:repeat(2,1fr);}
    .sum-box{background:#f8fafc;border:1px solid #cbd5e1;border-radius:3mm;padding:4mm;text-align:center;}
    .sum-box.accent{background:#0f382a;color:#fff;border-color:#0f382a;}
    .sum-box.green{background:#f0fdf4;border-color:#bbf7d0;}
    .sum-box.red{background:#fff5f5;border-color:#fecaca;}
    .sum-box .lbl{font-size:9px;color:inherit;opacity:.8;margin-bottom:1mm;}
    .sum-box.accent .lbl{color:#fff;}
    .sum-box .val{font-size:15px;font-weight:800;}

    /* ── Section title ── */
    .sec-title{
      font-size:12px;font-weight:800;color:#0f382a;
      border-right:4px solid #c8972e;padding-right:3mm;
      margin-bottom:3mm;
    }

    /* ── Table ── */
    table{width:100%;border-collapse:collapse;font-size:9.5px;margin-bottom:5mm;}
    thead tr{background:#0f382a;color:#fff;}
    thead th{padding:2.5mm 2.5mm;text-align:right;font-weight:700;}
    tbody tr:nth-child(even){background:#f8fafc;}
    tbody tr:hover{background:#f1f5f9;}
    tbody td{padding:2.5mm 2.5mm;border-bottom:1px solid #e2e8f0;vertical-align:top;}
    tfoot tr{background:#f8fafc;font-weight:800;border-top:2px solid #0f382a;}
    tfoot td{padding:3mm 2.5mm;}

    /* ── Balance row ── */
    .balance-row{display:flex;justify-content:space-between;align-items:center;padding:3mm 4mm;border-radius:2mm;margin-bottom:2mm;}
    .balance-row.opening{background:#f8fafc;border:1px solid #cbd5e1;}
    .balance-row.income{background:#f0fdf4;border:1px solid #bbf7d0;}
    .balance-row.expense{background:#fff5f5;border:1px solid #fecaca;}
    .balance-row.closing{background:#0f382a;color:#fff;margin-top:3mm;}
    .balance-row .bl{font-size:11px;}
    .balance-row .bv{font-size:13px;font-weight:800;}

    /* ── Footer ── */
    .rpt-footer{
      margin-top:8mm;padding-top:4mm;border-top:1px solid #cbd5e1;
      font-size:8.5pt;color:#64748b;text-align:center;
    }
    .rpt-footer strong{color:#0f382a;}

    /* ── Print button ── */
    .print-btn-bar{
      position:fixed;top:14px;left:50%;transform:translateX(-50%);
      display:flex;gap:10px;z-index:999;
    }
    .print-btn{
      background:#0f382a;color:#fff;border:1px solid #c8972e;border-radius:8px;
      padding:10px 26px;font-family:'Cairo',sans-serif;font-size:14px;
      font-weight:700;cursor:pointer;
    }
    .close-btn{
      background:#fff;color:#333;border:1px solid #cbd5e1;border-radius:8px;
      padding:10px 20px;font-family:'Cairo',sans-serif;font-size:14px;cursor:pointer;
    }
  </style>
</head>
<body>
  <div class="print-btn-bar no-print">
    <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
    <button class="close-btn" onclick="window.close()">✕ إغلاق</button>
  </div>
  ${htmlContent}
  <script>
    // auto-focus for keyboard shortcut Ctrl+P
    window.onload = () => window.focus();
  </script>
</body>
</html>`);
  win.document.close();
}

/** Format number as currency string */
export function fc(n) {
  const num = parseFloat(n) || 0;
  return num.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ر.س';
}

/** Format date dd/MM/yyyy */
export function fd(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

/** Format date as both Hijri and Gregorian */
export function fdh(dateStr, hijriStr) {
  if (!dateStr) return '-';
  try {
    const greg = new Date(dateStr).toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hijri = hijriStr || '';
    return hijri ? `${hijri}<br/><span style="font-size:9px;color:#888">${greg}</span>` : greg;
  } catch { return dateStr; }
}