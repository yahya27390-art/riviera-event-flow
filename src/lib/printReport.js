/**
 * Universal print function — opens a styled A4 window and triggers browser print.
 * Standardized to international A4 dimensions (210mm x 297mm) with pinned footers.
 * @param {string} htmlContent  - the inner HTML to print
 * @param {string} title        - window / document title
 */
export function openPrintWindow(htmlContent, title = 'تقرير') {
  const fullHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
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

    /* ── Header ── */
    .rpt-header {
      text-align: center;
      margin-bottom: 5mm;
      padding-bottom: 4mm;
      border-bottom: 2.5px solid #0f382a;
    }
    .rpt-logo {
      width: 75px;
      height: 75px;
      object-fit: contain;
      margin: 0 auto 3mm;
      display: block;
    }
    .rpt-hall-name {
      font-size: 20px;
      font-weight: 900;
      color: #0f382a;
      margin-bottom: 2px;
    }
    .rpt-title {
      font-size: 15px;
      font-weight: 800;
      color: #c8972e;
      letter-spacing: .5px;
      margin-bottom: 2px;
    }
    .rpt-period {
      font-size: 10.5px;
      color: #4b5563;
    }
    .rpt-contact {
      font-size: 9px;
      color: #6b7280;
      margin-top: 2mm;
    }

    /* ── Summary boxes ── */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3,1fr);
      gap: 3.5mm;
      margin-bottom: 5mm;
    }
    .summary-grid-2 { grid-template-columns: repeat(2,1fr); }
    .summary-grid-4 { grid-template-columns: repeat(4,1fr); }
    .sum-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 3mm;
      padding: 3mm;
      text-align: center;
    }
    .sum-box.accent { background: #0f382a; color: #fff; border-color: #0f382a; }
    .sum-box.green { background: #f0fdf4; border-color: #bbf7d0; }
    .sum-box.red { background: #fff5f5; border-color: #fecaca; }
    .sum-box .lbl { font-size: 9px; color: inherit; opacity: .85; margin-bottom: 1mm; }
    .sum-box.accent .lbl { color: #fff; }
    .sum-box .val { font-size: 14.5px; font-weight: 800; }

    /* ── Section title ── */
    .sec-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f382a;
      border-right: 4px solid #c8972e;
      padding-right: 3mm;
      margin-bottom: 3mm;
    }

    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 4mm; }
    thead tr { background: #0f382a; color: #fff; }
    thead th { padding: 2.5mm 2.5mm; text-align: right; font-weight: 700; font-size: 9pt; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #f1f5f9; }
    tbody td { padding: 2.5mm 2.5mm; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    tfoot tr { background: #f0fdf4; font-weight: 800; border-top: 2px solid #0f382a; }
    tfoot td { padding: 3mm 2.5mm; }

    /* ── Footer ── */
    .rpt-footer {
      margin-top: auto;
      padding-top: 3.5mm;
      border-top: 1.5px solid #cbd5e1;
      font-size: 8.5pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .rpt-footer strong { color: #0f382a; }
    .rpt-page-badge {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0f382a;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 1.5px 8px;
      border-radius: 4px;
    }

    /* ── Print button bar ── */
    .print-btn-bar {
      position: fixed;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      z-index: 9999;
      background: rgba(0,0,0,0.85);
      padding: 8px 18px;
      border-radius: 12px;
    }
    .print-btn {
      background: #0f382a;
      color: #fff;
      border: 1px solid #c8972e;
      border-radius: 8px;
      padding: 9px 24px;
      font-family: 'Cairo', sans-serif;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
    }
    .close-btn {
      background: #fff;
      color: #333;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 9px 18px;
      font-family: 'Cairo', sans-serif;
      font-size: 13.5px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="print-btn-bar no-print">
    <button class="print-btn" onclick="window.print()">🖨️ طباعة التقرير / حفظ PDF</button>
    <button class="close-btn" onclick="window.close()">✕ إغلاق</button>
  </div>
  ${htmlContent}
  <script>
    window.onload = () => {
      window.focus();
      setTimeout(() => { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

  // Try popup window first
  try {
    const win = window.open('', '_blank', 'width=950,height=1200');
    if (win && !win.closed) {
      win.document.open();
      win.document.write(fullHtml);
      win.document.close();
      return;
    }
  } catch (e) {
    console.warn('Popup window blocked, fallback to iframe:', e);
  }

  // Fallback: Invisible iframe printing
  try {
    let iframe = document.getElementById('app-print-iframe');
    if (iframe) {
      iframe.remove();
    }
    iframe = document.createElement('iframe');
    iframe.id = 'app-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(fullHtml);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Iframe print error:', err);
        window.print();
      }
    }, 500);
  } catch (err) {
    console.error('Printing iframe fallback failed:', err);
    window.print();
  }
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

/** 
 * Format date with Hijri PRIMARY (prominent/bold) and Gregorian SECONDARY (underneath in brackets)
 */
export function fdh(dateStr, hijriStr) {
  if (!dateStr) return '-';
  const hijri = hijriStr || '';
  let greg = '';
  try {
    const d = new Date(dateStr);
    greg = d.toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    greg = dateStr;
  }
  return `
    <div style="line-height: 1.35;">
      <strong style="color: #0f382a; font-size: 9.5pt; display: block;">${hijri ? hijri + ' هـ' : greg + ' م'}</strong>
      ${hijri ? `<span style="font-size: 8pt; color: #64748b;">(${greg} م)</span>` : ''}
    </div>
  `;
}