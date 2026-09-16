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
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Cairo',Arial,sans-serif;direction:rtl;background:#f0f0f0;color:#1a1a2e;}
    @page{size:A4 portrait;margin:14mm 14mm 14mm 14mm;}
    @media print{
      html,body{width:210mm;}
      body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .no-print{display:none!important;}
      .page{box-shadow:none!important;margin:0!important;}
    }
    .page{
      width:182mm;background:#fff;margin:10mm auto;
      box-shadow:0 4px 32px rgba(0,0,0,.15);
      padding:14mm 14mm 10mm 14mm;
      page-break-after:always;
    }
    .page:last-child{page-break-after:auto;}

    /* ── Header ── */
    .rpt-header{text-align:center;margin-bottom:8mm;padding-bottom:6mm;border-bottom:3px solid #1a2e5a;}
    .rpt-logo{width:70px;height:70px;object-fit:contain;margin:0 auto 4mm;display:block;}
    .rpt-logo-placeholder{
      width:70px;height:70px;border-radius:50%;background:#1a2e5a;
      display:flex;align-items:center;justify-content:center;
      margin:0 auto 4mm;color:#fff;font-size:22px;font-weight:800;
    }
    .rpt-hall-name{font-size:20px;font-weight:800;color:#1a2e5a;margin-bottom:1mm;}
    .rpt-title{font-size:15px;font-weight:700;color:#c8972e;letter-spacing:.5px;margin-bottom:1mm;}
    .rpt-period{font-size:11px;color:#666;}
    .rpt-contact{font-size:10px;color:#888;margin-top:2mm;}

    /* ── Summary boxes ── */
    .summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-bottom:7mm;}
    .summary-grid-2{grid-template-columns:repeat(2,1fr);}
    .sum-box{background:#f8f6f2;border:1px solid #e5dcc8;border-radius:3mm;padding:4mm;text-align:center;}
    .sum-box.accent{background:#1a2e5a;color:#fff;border-color:#1a2e5a;}
    .sum-box.green{background:#f0faf4;border-color:#b2dfdb;}
    .sum-box.red{background:#fff5f5;border-color:#ffcccc;}
    .sum-box .lbl{font-size:9px;color:inherit;opacity:.7;margin-bottom:1mm;}
    .sum-box.accent .lbl{color:#fff;}
    .sum-box .val{font-size:15px;font-weight:800;}

    /* ── Section title ── */
    .sec-title{
      font-size:12px;font-weight:700;color:#1a2e5a;
      border-right:4px solid #c8972e;padding-right:3mm;
      margin-bottom:3mm;
    }

    /* ── Table ── */
    table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:5mm;}
    thead tr{background:#1a2e5a;color:#fff;}
    thead th{padding:3mm 2.5mm;text-align:right;font-weight:600;}
    tbody tr:nth-child(even){background:#f8f6f2;}
    tbody tr:hover{background:#f0ece0;}
    tbody td{padding:2.5mm 2.5mm;border-bottom:1px solid #ede8d8;vertical-align:top;}
    tfoot tr{background:#f0ece0;font-weight:700;}
    tfoot td{padding:3mm 2.5mm;border-top:2px solid #1a2e5a;}

    /* ── Balance row ── */
    .balance-row{display:flex;justify-content:space-between;align-items:center;padding:3mm 4mm;border-radius:2mm;margin-bottom:2mm;}
    .balance-row.opening{background:#e8f0fe;border:1px solid #c5d8f6;}
    .balance-row.income{background:#f0faf4;border:1px solid #b2dfdb;}
    .balance-row.expense{background:#fff5f5;border:1px solid #ffcccc;}
    .balance-row.closing{background:#1a2e5a;color:#fff;margin-top:3mm;}
    .balance-row .bl{font-size:11px;}
    .balance-row .bv{font-size:13px;font-weight:800;}

    /* ── Footer ── */
    .rpt-footer{
      margin-top:8mm;padding-top:4mm;border-top:1px solid #e5dcc8;
      font-size:9px;color:#aaa;text-align:center;
    }
    .rpt-footer strong{color:#1a2e5a;}

    /* ── Print button ── */
    .print-btn-bar{
      position:fixed;top:14px;left:50%;transform:translateX(-50%);
      display:flex;gap:10px;z-index:999;
    }
    .print-btn{
      background:#1a2e5a;color:#fff;border:none;border-radius:8px;
      padding:10px 26px;font-family:'Cairo',sans-serif;font-size:14px;
      font-weight:700;cursor:pointer;
    }
    .close-btn{
      background:#fff;color:#333;border:1px solid #ccc;border-radius:8px;
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