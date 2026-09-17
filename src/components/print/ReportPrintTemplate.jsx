import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils/bookingNumber';

export default function ReportPrintTemplate({ type, data, hallSettings, dateFrom, dateTo }) {
  const hall = hallSettings || {};
  const hallName = hall.hall_name || 'قاعة قمة الريف';
  const logoSrc = hall.logo_url && hall.logo_url.trim() ? hall.logo_url : './logo-gold.jpg';
  const now = format(new Date(), 'dd/MM/yyyy HH:mm');

  const titles = {
    financial: 'التقرير المالي',
    bookings: 'تقرير الحجوزات',
    expenses: 'تقرير المصروفات',
    occupancy: 'تقرير نسبة التشغيل',
  };

  const statusColor = (status) => {
    if (status === 'مؤكد') return '#065f46';
    if (status === 'معلق') return '#92400e';
    return '#991b1b';
  };
  const statusBg = (status) => {
    if (status === 'مؤكد') return '#d1fae5';
    if (status === 'معلق') return '#fef9c3';
    return '#fee2e2';
  };

  const tableHeaderStyle = { background: '#1a2e5a', color: '#fff', padding: '7px 10px', textAlign: 'right', fontWeight: '600', fontSize: '9.5pt' };
  const tdStyle = { padding: '7px 10px', borderBottom: '1px solid #e5e7eb', fontSize: '9.5pt', textAlign: 'right' };

  return (
    <div id="report-print-area" style={{ fontFamily: 'Cairo, Arial, sans-serif', direction: 'rtl', background: '#fff', color: '#1a1a2e', maxWidth: '210mm', margin: '0 auto', padding: '12mm 14mm', fontSize: '10pt', lineHeight: 1.6 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1a2e5a', paddingBottom: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={logoSrc} alt="شعار قاعة قمة الريف" style={{ maxHeight: '60px', maxWidth: '140px', objectFit: 'contain' }} onError={(e) => { e.target.src = './logo.png'; }} />
          <div style={{ fontSize: '16pt', fontWeight: '800', color: '#1a2e5a' }}>{hallName}</div>
        </div>
        <div style={{ textAlign: 'left', fontSize: '8.5pt', color: '#666' }}>
          <div style={{ fontWeight: '700', fontSize: '14pt', color: '#1a2e5a', marginBottom: '2px' }}>{titles[type]}</div>
          <div>الفترة: {dateFrom} إلى {dateTo}</div>
          <div>تاريخ الطباعة: {now}</div>
        </div>
      </div>

      {/* Financial Report */}
      {type === 'financial' && data.financial && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'إجمالي الإيرادات', value: formatCurrency(data.financial.totalRevenue), color: '#059669' },
              { label: 'إجمالي المصروفات', value: formatCurrency(data.financial.totalExpenses), color: '#dc2626' },
              { label: 'صافي الربح', value: formatCurrency(data.financial.netProfit), color: data.financial.netProfit >= 0 ? '#059669' : '#dc2626' },
            ].map((item, i) => (
              <div key={i} style={{ border: '1px solid #d0daea', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '8.5pt', color: '#888', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '13pt', fontWeight: '800', color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'رصيد الخزينة', value: formatCurrency(data.financial.cashBalance) },
              { label: 'رصيد البنك', value: formatCurrency(data.financial.bankBalance) },
            ].map((item, i) => (
              <div key={i} style={{ border: '1px solid #d0daea', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '8.5pt', color: '#888', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '13pt', fontWeight: '800', color: '#1a2e5a' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bookings Report */}
      {type === 'bookings' && data.bookings && (
        <>
          <div style={{ marginBottom: '10px', fontSize: '9.5pt', color: '#555' }}>إجمالي الحجوزات: <strong>{data.bookings.length}</strong></div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>رقم الحجز</th>
                <th style={tableHeaderStyle}>العميل</th>
                <th style={tableHeaderStyle}>الجوال</th>
                <th style={tableHeaderStyle}>تاريخ المناسبة</th>
                <th style={tableHeaderStyle}>النوع</th>
                <th style={tableHeaderStyle}>المبلغ</th>
                <th style={tableHeaderStyle}>المتبقي</th>
                <th style={tableHeaderStyle}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data.bookings.map((b, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={tdStyle}>{b.booking_number}</td>
                  <td style={tdStyle}>{b.customer_name}</td>
                  <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'right' }}>{b.customer_phone}</td>
                  <td style={tdStyle}>{b.event_date ? format(new Date(b.event_date), 'dd/MM/yyyy') : '-'}</td>
                  <td style={tdStyle}>{b.event_type}</td>
                  <td style={{ ...tdStyle, fontWeight: '600' }}>{formatCurrency(b.final_amount)}</td>
                  <td style={{ ...tdStyle, fontWeight: '600', color: (b.remaining_amount || 0) > 0 ? '#dc2626' : '#059669' }}>{formatCurrency(b.remaining_amount)}</td>
                  <td style={tdStyle}><span style={{ padding: '2px 8px', borderRadius: '12px', background: statusBg(b.status), color: statusColor(b.status), fontWeight: '600', fontSize: '8.5pt' }}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f4f7fb', borderTop: '2px solid #d0daea' }}>
                <td colSpan={5} style={{ ...tdStyle, fontWeight: '700' }}>الإجمالي</td>
                <td style={{ ...tdStyle, fontWeight: '800', color: '#1a2e5a' }}>{formatCurrency(data.bookings.reduce((s, b) => s + (b.final_amount || 0), 0))}</td>
                <td style={{ ...tdStyle, fontWeight: '800', color: '#dc2626' }}>{formatCurrency(data.bookings.reduce((s, b) => s + (b.remaining_amount || 0), 0))}</td>
                <td style={tdStyle}></td>
              </tr>
            </tfoot>
          </table>
        </>
      )}

      {/* Expenses Report */}
      {type === 'expenses' && data.expenses && (
        <>
          <div style={{ marginBottom: '10px', fontSize: '9.5pt', color: '#555' }}>
            إجمالي المصروفات: <strong style={{ color: '#dc2626' }}>{formatCurrency(data.expenses.reduce((s, e) => s + (e.amount || 0), 0))}</strong>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>التاريخ</th>
                <th style={tableHeaderStyle}>النوع</th>
                <th style={tableHeaderStyle}>الوصف</th>
                <th style={tableHeaderStyle}>وسيلة الدفع</th>
                <th style={tableHeaderStyle}>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {data.expenses.map((e, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={tdStyle}>{e.expense_date ? format(new Date(e.expense_date), 'dd/MM/yyyy') : '-'}</td>
                  <td style={tdStyle}>{e.expense_type}</td>
                  <td style={tdStyle}>{e.description || '-'}</td>
                  <td style={tdStyle}>{e.payment_method}</td>
                  <td style={{ ...tdStyle, fontWeight: '600' }}>{formatCurrency(e.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#fef2f2', borderTop: '2px solid #d0daea' }}>
                <td colSpan={4} style={{ ...tdStyle, fontWeight: '700' }}>الإجمالي</td>
                <td style={{ ...tdStyle, fontWeight: '800', color: '#dc2626' }}>{formatCurrency(data.expenses.reduce((s, e) => s + (e.amount || 0), 0))}</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}

      {/* Occupancy Report */}
      {type === 'occupancy' && data.occupancy && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'إجمالي الأيام', value: data.occupancy.total },
              { label: 'أيام مشغولة', value: data.occupancy.busy, color: '#1a2e5a' },
              { label: 'أيام فارغة', value: data.occupancy.free, color: '#888' },
              { label: 'نسبة التشغيل', value: `${data.occupancy.rate}%`, color: '#d97706' },
            ].map((item, i) => (
              <div key={i} style={{ border: '1px solid #d0daea', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '8.5pt', color: '#888', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '18pt', fontWeight: '800', color: item.color || '#1a2e5a' }}>{item.value}</div>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ background: '#e5e7eb', borderRadius: '10px', height: '22px', overflow: 'hidden' }}>
              <div style={{ width: `${data.occupancy.rate}%`, background: '#1a2e5a', height: '100%', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9pt', fontWeight: '700' }}>
                {data.occupancy.rate}%
              </div>
            </div>
          </div>
          {/* Booked days list */}
          {data.occupancy.bookedList && data.occupancy.bookedList.length > 0 && (
            <>
              <div style={{ fontSize: '10pt', fontWeight: '700', color: '#1a2e5a', marginBottom: '8px' }}>الأيام المحجوزة</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>التاريخ</th>
                    <th style={tableHeaderStyle}>العميل</th>
                    <th style={tableHeaderStyle}>نوع المناسبة</th>
                    <th style={tableHeaderStyle}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.occupancy.bookedList.map((b, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={tdStyle}>{b.event_date ? format(new Date(b.event_date), 'dd/MM/yyyy') : '-'}</td>
                      <td style={tdStyle}>{b.customer_name}</td>
                      <td style={tdStyle}>{b.event_type}</td>
                      <td style={tdStyle}><span style={{ padding: '2px 8px', borderRadius: '12px', background: statusBg(b.status), color: statusColor(b.status), fontWeight: '600', fontSize: '8.5pt' }}>{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '8pt', color: '#aaa', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
        {hallName} — {titles[type]} — طُبع في: {now}
      </div>
    </div>
  );
}