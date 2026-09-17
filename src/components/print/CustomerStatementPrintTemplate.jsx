import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import { getHallLogoUrl, DEFAULT_HALL_NAME, DEFAULT_CITY, DEFAULT_ADDRESS } from '@/lib/branding';
import { gregorianToHijri } from '@/lib/hijri';

export default function CustomerStatementPrintTemplate({ customer, bookings = [], payments = [], hallSettings = {} }) {
  if (!customer) return null;

  const hall = hallSettings || {};
  const hallName = hall.hall_name || DEFAULT_HALL_NAME;
  const city = hall.city || DEFAULT_CITY;
  const address = hall.address || DEFAULT_ADDRESS;
  const logoUrl = getHallLogoUrl(hall);
  const nowGreg = format(new Date(), 'dd/MM/yyyy');
  const nowHijri = gregorianToHijri(format(new Date(), 'yyyy-MM-dd'));

  const customerBookings = bookings.filter(b => b.customer_phone === customer.phone);
  const customerPayments = payments.filter(p => customerBookings.some(b => b.id === p.booking_id));

  // Build unified timeline
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
      hijri: b.event_date_hijri || '',
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
      hijri: '',
    })),
  ].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  const totalBooked = customerBookings.reduce((s, b) => s + (b.final_amount || 0), 0);
  const totalPaid = customerPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalRemaining = totalBooked - totalPaid;

  return (
    <div
      id="statement-print-area"
      style={{
        fontFamily: "'Cairo', 'Segoe UI', Arial, sans-serif",
        direction: 'rtl',
        background: '#ffffff',
        color: '#111827',
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        padding: '10mm 12mm',
        fontSize: '9.5pt',
        lineHeight: 1.5,
        boxSizing: 'border-box',
      }}
    >
      {/* Outer Royal Frame */}
      <div
        style={{
          border: '2.5px solid #0f382a',
          outline: '1px solid #c8972e',
          outlineOffset: '-4.5px',
          padding: '7mm 8mm',
          borderRadius: '4px',
          background: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Header: Hall Info / Centered Crest Logo / Statement Meta */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.4fr 1.2fr',
            alignItems: 'center',
            borderBottom: '2px solid #0f382a',
            paddingBottom: '10px',
            marginBottom: '12px',
          }}
        >
          {/* Right: Official Hall Identification */}
          <div style={{ textAlign: 'right', fontSize: '8.5pt', color: '#374151', lineHeight: 1.6 }}>
            <div style={{ fontSize: '10pt', fontWeight: '800', color: '#0f382a' }}>المملكة العربية السعودية</div>
            <div style={{ fontSize: '13pt', fontWeight: '900', color: '#0f382a', margin: '1px 0' }}>{hallName}</div>
            <div style={{ color: '#4b5563' }}>{city} — {address}</div>
            {hall.commercial_register && <div>س.ت: <span style={{ fontWeight: '700', color: '#111' }}>{hall.commercial_register}</span></div>}
            {hall.tax_number && <div>الرقم الضريبي: <span style={{ fontWeight: '700', color: '#111' }}>{hall.tax_number}</span></div>}
          </div>

          {/* Center: Golden Crest Logo & Document Title */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-block', position: 'relative' }}>
              <img
                src={logoUrl}
                alt="شعار القاعة"
                style={{
                  height: '65px',
                  maxWidth: '120px',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto 4px',
                }}
              />
            </div>
            <div
              style={{
                display: 'inline-block',
                background: '#0f382a',
                color: '#ffffff',
                padding: '4px 18px',
                borderRadius: '4px',
                fontSize: '11pt',
                fontWeight: '900',
                letterSpacing: '0.5px',
                border: '1px solid #c8972e',
              }}
            >
              كشف حساب عميل معتمد
            </div>
            <div style={{ fontSize: '8pt', color: '#c8972e', fontWeight: '700', marginTop: '3px' }}>
              سجل العمليات والمدفوعات الرسمية
            </div>
          </div>

          {/* Left: Statement Reference & Date */}
          <div style={{ textAlign: 'left', fontSize: '8.5pt', color: '#374151', lineHeight: 1.6 }}>
            <div style={{ color: '#0f382a', fontWeight: '800', fontSize: '9pt' }}>الإدارة المالية والمحاسبة</div>
            <div>تاريخ الإصدار: <span style={{ fontWeight: '700' }}>{nowGreg}</span></div>
            <div>الموافق: <span style={{ fontWeight: '700' }}>{nowHijri} هـ</span></div>
            {hall.phone && <div>هاتف الإدارة: <span style={{ fontWeight: '700', direction: 'ltr', display: 'inline-block' }}>{hall.phone}</span></div>}
          </div>
        </div>

        {/* Customer Information Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
            border: '1px solid #0f382a',
            borderRight: '4px solid #c8972e',
            borderRadius: '4px',
            padding: '8px 12px',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '8pt', color: '#64748b' }}>اسم العميل المكرم: </span>
            <strong style={{ fontSize: '12pt', color: '#0f382a', marginRight: '6px' }}>{customer.name}</strong>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '8pt', color: '#64748b' }}>رقم الجوال: </span>
              <strong style={{ fontSize: '10.5pt', color: '#111827', direction: 'ltr', display: 'inline-block' }}>{customer.phone}</strong>
            </div>
            <div>
              <span style={{ fontSize: '8pt', color: '#64748b' }}>حالة الحساب: </span>
              <strong style={{ fontSize: '9.5pt', color: totalRemaining > 0 ? '#b91c1c' : '#15803d' }}>
                {totalRemaining > 0 ? 'مستحق السداد' : 'خالص الذمة'}
              </strong>
            </div>
          </div>
        </div>

        {/* Financial Summary 4-Column Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '14px',
          }}
        >
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '8pt', color: '#64748b', marginBottom: '2px' }}>عدد الحجوزات</div>
            <div style={{ fontSize: '12pt', fontWeight: '900', color: '#0f382a' }}>{customerBookings.length}</div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '8pt', color: '#64748b', marginBottom: '2px' }}>إجمالي الحجوزات</div>
            <div style={{ fontSize: '11.5pt', fontWeight: '900', color: '#0f382a' }}>{formatCurrency(totalBooked)}</div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '8pt', color: '#16a34a', marginBottom: '2px' }}>إجمالي المسدد</div>
            <div style={{ fontSize: '11.5pt', fontWeight: '900', color: '#15803d' }}>{formatCurrency(totalPaid)}</div>
          </div>
          <div
            style={{
              background: totalRemaining > 0 ? '#fef2f2' : '#f0fdf4',
              border: totalRemaining > 0 ? '1.5px solid #fca5a5' : '1.5px solid #86efac',
              borderRadius: '4px',
              padding: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '8pt', color: totalRemaining > 0 ? '#dc2626' : '#16a34a', marginBottom: '2px', fontWeight: '700' }}>
              صافي المتبقي للتحصيل
            </div>
            <div style={{ fontSize: '12pt', fontWeight: '900', color: totalRemaining > 0 ? '#b91c1c' : '#15803d' }}>
              {formatCurrency(totalRemaining)}
            </div>
          </div>
        </div>

        {/* Transactions Table Section Title */}
        <div
          style={{
            fontSize: '9.5pt',
            fontWeight: '800',
            color: '#0f382a',
            borderRight: '3.5px solid #c8972e',
            paddingRight: '6px',
            marginBottom: '6px',
          }}
        >
          تفاصيل الحركات وسجل الحساب المالي
        </div>

        {/* Transactions Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '12px' }}>
          <thead>
            <tr style={{ background: '#0f382a', color: '#ffffff' }}>
              <th style={{ padding: '6px 8px', textAlign: 'center', width: '25px' }}>#</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', width: '100px' }}>التاريخ</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', width: '110px' }}>رقم الحجز</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>البيان / العملية</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', width: '110px' }}>طريقة الدفع</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', width: '90px' }}>المبلغ</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', width: '70px' }}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {timeline.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '16px', color: '#9ca3af' }}>
                  لا توجد عمليات مسجلة لهذا العميل
                </td>
              </tr>
            ) : (
              timeline.map((item, idx) => {
                const isPay = item.type === 'payment';
                return (
                  <tr
                    key={item.id || idx}
                    style={{
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '5px 8px' }}>
                      <div style={{ fontWeight: '600' }}>
                        {item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-'}
                      </div>
                      {item.hijri && <div style={{ fontSize: '7.5pt', color: '#888' }}>{item.hijri}</div>}
                    </td>
                    <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontWeight: '700', color: '#0f382a' }}>
                      {item.booking_number || '-'}
                    </td>
                    <td style={{ padding: '5px 8px', fontWeight: '600' }}>{item.label}</td>
                    <td style={{ padding: '5px 8px', color: '#4b5563' }}>{item.method || '-'}</td>
                    <td
                      style={{
                        padding: '5px 8px',
                        textAlign: 'left',
                        fontWeight: '800',
                        color: isPay ? '#059669' : '#0f382a',
                      }}
                    >
                      {isPay ? '+' : ''}{formatCurrency(item.amount)}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '7.5pt',
                          fontWeight: '700',
                          background: isPay ? '#d1fae5' : item.status === 'مؤكد' ? '#d1fae5' : '#fef9c3',
                          color: isPay ? '#065f46' : item.status === 'مؤكد' ? '#065f46' : '#92400e',
                        }}
                      >
                        {isPay ? 'سداد مالي' : item.status || 'حجز'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f0fdf4', fontWeight: '800', borderTop: '2px solid #0f382a' }}>
              <td colSpan="5" style={{ padding: '8px 10px', textAlign: 'right', color: '#0f382a', fontSize: '9.5pt' }}>
                المجموع الإجمالي للرصيد المتبقي المستحق:
              </td>
              <td
                colSpan="2"
                style={{
                  padding: '8px 10px',
                  textAlign: 'left',
                  fontSize: '11pt',
                  fontWeight: '900',
                  color: totalRemaining > 0 ? '#b91c1c' : '#15803d',
                }}
              >
                {formatCurrency(totalRemaining)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Official Signatures & Stamp Box */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '15px',
            marginTop: '20px',
            paddingTop: '12px',
            borderTop: '1px solid #cbd5e1',
            textAlign: 'center',
            fontSize: '8.5pt',
          }}
        >
          <div>
            <div style={{ color: '#0f382a', fontWeight: '800', marginBottom: '24px' }}>المحاسب المالي المختص</div>
            <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', color: '#64748b' }}>الاسم والتوقيع</div>
          </div>
          <div>
            <div style={{ color: '#0f382a', fontWeight: '800', marginBottom: '6px' }}>ختم المنشأة الرسمي</div>
            <div
              style={{
                width: '52px',
                height: '52px',
                border: '1.5px dashed #c8972e',
                borderRadius: '50%',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c8972e',
                fontSize: '7pt',
                fontWeight: '700',
              }}
            >
              الختم
            </div>
          </div>
          <div>
            <div style={{ color: '#0f382a', fontWeight: '800', marginBottom: '24px' }}>توقيع العميل / المستلم</div>
            <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', color: '#111827', fontWeight: '700' }}>
              {customer.name}
            </div>
          </div>
        </div>

        {/* Bottom Legal Footer */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '8px',
            borderTop: '1px solid #f1f5f9',
            textAlign: 'center',
            fontSize: '7.5pt',
            color: '#64748b',
          }}
        >
          {hallName} • {address} • هاتف: {hall.phone || '-'} • هذا الكشف مستخرج آلياً ويعتبر وثيقة محاسبية رسمية
        </div>
      </div>
    </div>
  );
}
