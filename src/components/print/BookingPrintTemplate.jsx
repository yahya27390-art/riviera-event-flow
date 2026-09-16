import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils/bookingNumber';

export default function BookingPrintTemplate({ booking, payments, hallSettings }) {
  const hall = hallSettings || {};
  const hallName = hall.hall_name || 'ريفيرا';

  return (
    <div id="booking-print-area" style={{ fontFamily: 'Cairo, Arial, sans-serif', direction: 'rtl', background: '#fff', color: '#1a1a2e', width: '210mm', minHeight: '297mm', margin: '0 auto', padding: '12mm 14mm', fontSize: '11pt', lineHeight: 1.6, boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #1a2e5a', paddingBottom: '10px', marginBottom: '18px' }}>
        <div style={{ flex: 1 }}>
          {hall.logo_url ? (
            <img src={hall.logo_url} alt="شعار القاعة" style={{ maxHeight: '70px', maxWidth: '160px', objectFit: 'contain' }} />
          ) : (
            <div style={{ fontSize: '22pt', fontWeight: '800', color: '#1a2e5a' }}>{hallName}</div>
          )}
          {hall.logo_url && <div style={{ fontSize: '14pt', fontWeight: '700', color: '#1a2e5a', marginTop: '4px' }}>{hallName}</div>}
        </div>
        <div style={{ textAlign: 'left', fontSize: '9pt', color: '#555' }}>
          {hall.phone && <div>هاتف: {hall.phone}</div>}
          {hall.address && <div>العنوان: {hall.address}</div>}
          {hall.city && <div>المدينة: {hall.city}</div>}
          {hall.email && <div>البريد: {hall.email}</div>}
          {hall.commercial_register && <div>السجل التجاري: {hall.commercial_register}</div>}
          {hall.tax_number && <div>الرقم الضريبي: {hall.tax_number}</div>}
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <div style={{ display: 'inline-block', background: '#1a2e5a', color: '#fff', padding: '6px 32px', borderRadius: '6px', fontSize: '13pt', fontWeight: '700', letterSpacing: '1px' }}>
          عقد حجز قاعة
        </div>
        <div style={{ marginTop: '6px', fontSize: '9pt', color: '#777' }}>
          تاريخ الإصدار: {format(new Date(), 'dd/MM/yyyy')}
        </div>
      </div>

      {/* Booking Number Banner */}
      <div style={{ background: '#f4f7fb', border: '1px solid #d0daea', borderRadius: '8px', padding: '8px 16px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '9pt', color: '#888' }}>رقم الحجز: </span>
            <span style={{ fontSize: '13pt', fontWeight: '800', color: '#1a2e5a' }}>{booking.booking_number || '-'}</span>
          </div>
          {booking.voucher_number && (
            <div>
              <span style={{ fontSize: '9pt', color: '#888' }}>رقم السند الدفتري: </span>
              <span style={{ fontSize: '13pt', fontWeight: '800', color: '#b45309', direction: 'ltr', display: 'inline-block' }}>{booking.voucher_number}</span>
            </div>
          )}
        </div>
        <div style={{ padding: '3px 14px', borderRadius: '20px', fontSize: '10pt', fontWeight: '600', background: booking.status === 'مؤكد' ? '#d1fae5' : booking.status === 'معلق' ? '#fef9c3' : '#fee2e2', color: booking.status === 'مؤكد' ? '#065f46' : booking.status === 'معلق' ? '#92400e' : '#991b1b' }}>
          {booking.status}
        </div>
      </div>

      {/* Client & Event Info - Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10pt', fontWeight: '700', color: '#1a2e5a', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px', marginBottom: '10px' }}>بيانات العميل</div>
          <table style={{ width: '100%', fontSize: '10pt', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={{ color: '#888', paddingBottom: '5px', width: '40%' }}>الاسم</td><td style={{ fontWeight: '600' }}>{booking.customer_name}</td></tr>
              <tr><td style={{ color: '#888', paddingBottom: '5px' }}>الجوال</td><td style={{ fontWeight: '600', direction: 'ltr', textAlign: 'right' }}>{booking.customer_phone}</td></tr>
            </tbody>
          </table>
        </div>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10pt', fontWeight: '700', color: '#1a2e5a', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px', marginBottom: '10px' }}>بيانات المناسبة</div>
          <table style={{ width: '100%', fontSize: '10pt', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={{ color: '#888', paddingBottom: '5px', width: '40%' }}>نوع المناسبة</td><td style={{ fontWeight: '600' }}>{booking.event_type}</td></tr>
              <tr><td style={{ color: '#888', paddingBottom: '5px' }}>التاريخ الميلادي</td><td style={{ fontWeight: '600' }}>{booking.event_date ? format(new Date(booking.event_date), 'EEEE dd MMMM yyyy', { locale: ar }) : '-'}</td></tr>
              {booking.event_date_hijri && <tr><td style={{ color: '#888', paddingBottom: '5px' }}>التاريخ الهجري</td><td style={{ fontWeight: '600' }}>{booking.event_date_hijri}</td></tr>}
              {booking.hall_section && <tr><td style={{ color: '#888', paddingBottom: '5px' }}>القسم</td><td style={{ fontWeight: '600' }}>{booking.hall_section}</td></tr>}
              {booking.service_type && <tr><td style={{ color: '#888', paddingBottom: '5px' }}>نوع الخدمات</td><td style={{ fontWeight: '600' }}>{booking.service_type}</td></tr>}
              {booking.booking_method && <tr><td style={{ color: '#888', paddingBottom: '5px' }}>طريقة الحجز</td><td style={{ fontWeight: '600' }}>{booking.booking_method}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Items Table */}
      {(booking.items || []).length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '10pt', fontWeight: '700', color: '#1a2e5a', marginBottom: '8px' }}>بنود الخدمات المتفق عليها</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <thead>
              <tr style={{ background: '#1a2e5a', color: '#fff' }}>
                <th style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600' }}>#</th>
                <th style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600' }}>البند</th>
                <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '600' }}>الكمية</th>
                <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '600' }}>سعر الوحدة</th>
                <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '600' }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {booking.items.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#888' }}>{i + 1}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>{item.item_name}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'center' }}>{formatCurrency(item.price)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '600' }}>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Financial Summary */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '18px' }}>
        <div style={{ width: '260px', border: '1px solid #d0daea', borderRadius: '8px', overflow: 'hidden', fontSize: '10pt' }}>
          <div style={{ background: '#f4f7fb', padding: '8px 14px', borderBottom: '1px solid #d0daea', fontWeight: '700', color: '#1a2e5a' }}>الملخص المالي</div>
          <div style={{ padding: '0 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ color: '#888' }}>إجمالي البنود</span>
              <span>{formatCurrency(booking.total_amount)}</span>
            </div>
            {(booking.discount || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f0f0f0', color: '#d97706' }}>
                <span>الخصم</span>
                <span>- {formatCurrency(booking.discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #d0daea', fontWeight: '700', fontSize: '11pt' }}>
              <span>المبلغ الإجمالي</span>
              <span>{formatCurrency(booking.final_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f0f0f0', color: '#059669' }}>
              <span>المدفوع</span>
              <span>{formatCurrency(booking.paid_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: '800', fontSize: '12pt', color: (booking.remaining_amount || 0) > 0 ? '#dc2626' : '#059669' }}>
              <span>المبلغ المتبقي</span>
              <span>{formatCurrency(booking.remaining_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments History */}
      {(payments || []).length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '10pt', fontWeight: '700', color: '#1a2e5a', marginBottom: '8px' }}>سجل المدفوعات</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
            <thead>
              <tr style={{ background: '#f4f7fb', borderBottom: '2px solid #d0daea' }}>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600', color: '#555' }}>التاريخ</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600', color: '#555' }}>طريقة الدفع</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600', color: '#555' }}>المرجع</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600', color: '#555' }}>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '6px 10px' }}>{p.payment_date ? format(new Date(p.payment_date), 'dd/MM/yyyy') : '-'}</td>
                  <td style={{ padding: '6px 10px' }}>{p.payment_method}</td>
                  <td style={{ padding: '6px 10px' }}>{p.reference_number || '-'}</td>
                  <td style={{ padding: '6px 10px', fontWeight: '600', color: '#059669' }}>{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {booking.notes && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', fontSize: '9.5pt', color: '#78350f' }}>
          <strong>ملاحظات:</strong> {booking.notes}
        </div>
      )}

      {/* Hall Notes */}
      {hall.notes && (
        <div style={{ background: '#f4f7fb', border: '1px solid #d0daea', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', fontSize: '9pt', color: '#555' }}>
          {hall.notes}
        </div>
      )}

      {/* Bank Info */}
      {(hall.bank_name || hall.iban) && (
        <div style={{ marginBottom: '14px', fontSize: '9pt', color: '#555', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 14px' }}>
          <strong>بيانات التحويل البنكي:</strong>
          {hall.bank_name && <span style={{ marginRight: '10px' }}>البنك: {hall.bank_name}</span>}
          {hall.iban && <span style={{ marginRight: '10px' }}>IBAN: {hall.iban}</span>}
        </div>
      )}

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '18px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '9pt', color: '#888', marginBottom: '30px' }}>توقيع العميل</div>
          <div style={{ borderTop: '1px dashed #aaa', paddingTop: '4px', fontSize: '9pt', color: '#555' }}>{booking.customer_name}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '9pt', color: '#888', marginBottom: '30px' }}>توقيع الإدارة</div>
          <div style={{ borderTop: '1px dashed #aaa', paddingTop: '4px', fontSize: '9pt', color: '#555' }}>{hallName}</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '8pt', color: '#aaa', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
        {hallName} {hall.phone && `• هاتف: ${hall.phone}`} {hall.address && `• ${hall.address}`}
      </div>
    </div>
  );
}