import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import { getHallLogoUrl, cleanCustomerNotes, DEFAULT_TERMS, DEFAULT_HALL_NAME, DEFAULT_CITY, DEFAULT_ADDRESS } from '@/lib/branding';
import { gregorianToHijri } from '@/lib/hijri';

export default function BookingPrintTemplate({ booking, payments, hallSettings }) {
  const hall = hallSettings || {};
  const hallName = hall.hall_name || DEFAULT_HALL_NAME;
  const city = hall.city || DEFAULT_CITY;
  const address = hall.address || DEFAULT_ADDRESS;
  const logoUrl = getHallLogoUrl(hall);
  const cleanedNotes = cleanCustomerNotes(booking?.notes);
  const nowGreg = format(new Date(), 'dd/MM/yyyy');
  const nowHijri = gregorianToHijri(format(new Date(), 'yyyy-MM-dd'));

  const eventDateGreg = booking.event_date
    ? format(new Date(booking.event_date), 'EEEE dd MMMM yyyy', { locale: ar })
    : '-';
  const eventDateHijri = booking.event_date_hijri || (booking.event_date ? gregorianToHijri(booking.event_date) : '-');

  const terms = (hall.terms && Array.isArray(hall.terms) && hall.terms.length > 0)
    ? hall.terms
    : DEFAULT_TERMS;

  return (
    <div
      id="booking-print-area"
      style={{
        fontFamily: "'Cairo', 'Segoe UI', Arial, sans-serif",
        direction: 'rtl',
        background: '#ffffff',
        color: '#111827',
        width: '210mm',
        height: '297mm',
        maxHeight: '297mm',
        margin: '0 auto',
        padding: '8mm 10mm',
        fontSize: '9pt',
        lineHeight: 1.45,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {/* Outer Royal Frame */}
      <div
        style={{
          border: '2.5px solid #0f382a',
          outline: '1px solid #c8972e',
          outlineOffset: '-4.5px',
          padding: '5mm 6mm',
          borderRadius: '4px',
          background: '#ffffff',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header: Hall Info / Centered Crest Logo / Contract Meta */}
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
                boxShadow: '0 2px 4px rgba(15, 56, 42, 0.2)',
              }}
            >
              عقد إيجار وتقديم خدمات المناسبات
            </div>
            <div style={{ fontSize: '7.5pt', color: '#c8972e', fontWeight: '800', marginTop: '2px', letterSpacing: '1px' }}>
              EVENT VENUE & SERVICES CONTRACT
            </div>
          </div>

          {/* Left: Contract Reference & Meta */}
          <div style={{ textAlign: 'left', fontSize: '8.5pt', color: '#374151', lineHeight: 1.6 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', display: 'inline-block', textAlign: 'right' }}>
              <div style={{ fontSize: '8pt', color: '#64748b' }}>رقم العقد / الحجز:</div>
              <div style={{ fontSize: '12pt', fontWeight: '900', color: '#0f382a', letterSpacing: '1px' }}>
                {booking.booking_number || '-'}
              </div>
              {booking.voucher_number && (
                <div style={{ fontSize: '8.5pt', color: '#b45309', fontWeight: '700' }}>
                  سند دفتري: <span dir="ltr">{booking.voucher_number}</span>
                </div>
              )}
              <div style={{ fontSize: '7.5pt', color: '#64748b', marginTop: '2px' }}>
                تاريخ الإصدار: <strong style={{ color: '#0f382a' }}>{nowHijri} هـ</strong> ({nowGreg} م)
              </div>
            </div>
          </div>
        </div>

        {/* Contract Parties Banner (طرفا العقد) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          {/* First Party (Venue) */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px' }}>
            <div style={{ fontSize: '9pt', fontWeight: '800', color: '#0f382a', borderBottom: '1.5px solid #0f382a', paddingBottom: '3px', marginBottom: '5px' }}>
              الطرف الأول (المؤجر):
            </div>
            <div style={{ fontSize: '8.5pt', lineHeight: 1.5 }}>
              <div><strong>المنشأة:</strong> إدارة {hallName}</div>
              <div><strong>الموقع:</strong> {city} — {address}</div>
              {hall.phone && <div><strong>الهاتف:</strong> <span dir="ltr">{hall.phone}</span></div>}
            </div>
          </div>

          {/* Second Party (Client) */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px' }}>
            <div style={{ fontSize: '9pt', fontWeight: '800', color: '#0f382a', borderBottom: '1.5px solid #0f382a', paddingBottom: '3px', marginBottom: '5px' }}>
              الطرف الثاني (المستأجر):
            </div>
            <div style={{ fontSize: '8.5pt', lineHeight: 1.5 }}>
              <div><strong>الاسم الكريم:</strong> <span style={{ fontWeight: '800', color: '#0f172a' }}>{booking.customer_name || '-'}</span></div>
              <div><strong>رقم الجوال:</strong> <span style={{ fontWeight: '800', direction: 'ltr', display: 'inline-block' }}>{booking.customer_phone || '-'}</span></div>
              <div><strong>حالة الحجز:</strong> <span style={{ fontWeight: '700', color: booking.status === 'مؤكد' ? '#065f46' : '#92400e' }}>{booking.status}</span></div>
            </div>
          </div>
        </div>

        {/* Event Specifications (بيانات ومواصفات المناسبة) */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '9pt', fontWeight: '800', color: '#0f382a', marginBottom: '4px', borderRight: '3px solid #c8972e', paddingRight: '6px' }}>
            بيانات ومواصفات المناسبة المحجوزة
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', border: '1px solid #cbd5e1' }}>
            <tbody>
              <tr style={{ background: '#f1f5f9' }}>
                <td style={{ padding: '5px 8px', fontWeight: '700', color: '#475569', width: '18%', border: '1px solid #cbd5e1' }}>نوع المناسبة:</td>
                <td style={{ padding: '5px 8px', fontWeight: '800', color: '#0f172a', width: '32%', border: '1px solid #cbd5e1' }}>{booking.event_type || '-'}</td>
                <td style={{ padding: '5px 8px', fontWeight: '700', color: '#475569', width: '18%', border: '1px solid #cbd5e1' }}>القسم المحجوز:</td>
                <td style={{ padding: '5px 8px', fontWeight: '800', color: '#0f172a', width: '32%', border: '1px solid #cbd5e1' }}>{booking.hall_section || 'كامل القاعة'}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 8px', fontWeight: '700', color: '#0f382a', border: '1px solid #cbd5e1', background: '#f0fdf4' }}>تاريخ المناسبة (الهجري أساسي):</td>
                <td style={{ padding: '5px 8px', fontWeight: '900', color: '#0f382a', border: '1px solid #cbd5e1', background: '#f0fdf4', fontSize: '9.5pt' }}>{eventDateHijri} هـ</td>
                <td style={{ padding: '5px 8px', fontWeight: '700', color: '#64748b', border: '1px solid #cbd5e1' }}>الموافق بالميلادي:</td>
                <td style={{ padding: '5px 8px', fontWeight: '600', color: '#64748b', border: '1px solid #cbd5e1' }}>{eventDateGreg} م</td>
              </tr>
              <tr style={{ background: '#f1f5f9' }}>
                <td style={{ padding: '5px 8px', fontWeight: '700', color: '#475569', border: '1px solid #cbd5e1' }}>نوع الخدمات:</td>
                <td style={{ padding: '5px 8px', fontWeight: '600', color: '#0f172a', border: '1px solid #cbd5e1' }}>{booking.service_type || 'شامل الخدمات والتجهيزات'}</td>
                <td style={{ padding: '5px 8px', fontWeight: '700', color: '#475569', border: '1px solid #cbd5e1' }}>طريقة الحجز:</td>
                <td style={{ padding: '5px 8px', fontWeight: '600', color: '#0f172a', border: '1px solid #cbd5e1' }}>{booking.booking_method || 'مباشر عبر الإدارة'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Agreed Items & Services (if any items exist) */}
        {(booking.items || []).length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '9pt', fontWeight: '800', color: '#0f382a', marginBottom: '4px', borderRight: '3px solid #c8972e', paddingRight: '6px' }}>
              جدول البنود والخدمات المتفق عليها
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt', border: '1px solid #cbd5e1' }}>
              <thead>
                <tr style={{ background: '#0f382a', color: '#ffffff' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'right', width: '30px' }}>#</th>
                  <th style={{ padding: '4px 8px', textAlign: 'right' }}>بيان الخدمة / التجهيز</th>
                  <th style={{ padding: '4px 8px', textAlign: 'center', width: '60px' }}>الكمية</th>
                  <th style={{ padding: '4px 8px', textAlign: 'center', width: '100px' }}>سعر الوحدة</th>
                  <th style={{ padding: '4px 8px', textAlign: 'center', width: '110px' }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {booking.items.map((item, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '4px 8px', textAlign: 'right', color: '#64748b' }}>{i + 1}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: '600' }}>{item.item_name}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>{formatCurrency(item.price)}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: '700' }}>{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Financial Summary & Payment Record Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: (payments || []).length > 0 ? '1.3fr 1fr' : '1fr', gap: '10px', marginBottom: '10px' }}>
          {/* Payments Record (if payments exist) */}
          {(payments || []).length > 0 && (
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ background: '#f1f5f9', padding: '5px 10px', fontWeight: '800', color: '#0f382a', fontSize: '8.5pt', borderBottom: '1px solid #cbd5e1' }}>
                سجل الدفعات والمقبوضات المسددة
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '4px 6px', textAlign: 'right', color: '#475569' }}>التاريخ</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', color: '#475569' }}>الطريقة</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', color: '#475569' }}>المرجع</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center', color: '#475569' }}>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ padding: '4px 6px' }}>{p.payment_date ? format(new Date(p.payment_date), 'dd/MM/yyyy') : '-'}</td>
                      <td style={{ padding: '4px 6px' }}>{p.payment_method}</td>
                      <td style={{ padding: '4px 6px' }}>{p.reference_number || '-'}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: '700', color: '#059669' }}>{formatCurrency(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Financial Breakdown Table */}
          <div style={{ border: '1.5px solid #0f382a', borderRadius: '6px', overflow: 'hidden', background: '#fdfefe' }}>
            <div style={{ background: '#0f382a', color: '#ffffff', padding: '5px 10px', fontWeight: '800', fontSize: '8.5pt', textAlign: 'center' }}>
              الملخص المالي ومستحقات العقد
            </div>
            <div style={{ padding: '6px 12px', fontSize: '8.5pt' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#475569' }}>إجمالي قيمة البنود:</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(booking.total_amount)}</span>
              </div>
              {(booking.discount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dashed #e2e8f0', color: '#d97706' }}>
                  <span>الخصم الممنوح:</span>
                  <span style={{ fontWeight: '700' }}>- {formatCurrency(booking.discount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1.5px solid #0f382a', fontWeight: '800', color: '#0f172a' }}>
                <span>إجمالي قيمة العقد النهائية:</span>
                <span style={{ color: '#0f382a', fontSize: '9.5pt' }}>{formatCurrency(booking.final_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dashed #e2e8f0', color: '#059669' }}>
                <span style={{ fontWeight: '600' }}>المسدد حتى تاريخه:</span>
                <span style={{ fontWeight: '800' }}>{formatCurrency(booking.paid_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontWeight: '900', fontSize: '10.5pt', color: (booking.remaining_amount || 0) > 0 ? '#b91c1c' : '#059669' }}>
                <span>صافي المبلغ المتبقي:</span>
                <span>{formatCurrency(booking.remaining_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clean Customer Notes (Displayed ONLY if legitimate notes exist) */}
        {cleanedNotes && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '6px',
              padding: '6px 10px',
              marginBottom: '10px',
              fontSize: '8.5pt',
              color: '#78350f',
            }}
          >
            <strong>ملاحظات العقد والاتفاق الخاص:</strong> {cleanedNotes}
          </div>
        )}

        {/* Terms & Conditions (الشروط والأحكام الرسمية) */}
        <div style={{ marginBottom: '12px', background: '#fafaf9', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '8px 10px' }}>
          <div style={{ fontSize: '8.5pt', fontWeight: '800', color: '#0f382a', marginBottom: '4px' }}>
            الشروط والأحكام العامة للعقد:
          </div>
          <ol style={{ margin: 0, paddingRight: '18px', fontSize: '7.5pt', color: '#44403c', lineHeight: 1.5 }}>
            {terms.map((term, idx) => (
              <li key={idx} style={{ marginBottom: '2px' }}>{term}</li>
            ))}
          </ol>
        </div>

        {/* Bank Details Strip (if provided) */}
        {(hall.bank_name || hall.iban) && (
          <div
            style={{
              marginBottom: '12px',
              fontSize: '7.5pt',
              color: '#334155',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '5px 10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div><strong>بيانات الحساب البنكي المعتمد:</strong> {hall.bank_name && <span>البنك: {hall.bank_name}</span>}</div>
            {hall.iban && <div><strong>IBAN:</strong> <span style={{ direction: 'ltr', display: 'inline-block', fontWeight: '700' }}>{hall.iban}</span></div>}
          </div>
        )}
        </div>

        {/* Signatures & Official Stamp Section (Pinned to Bottom) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr 1.2fr',
            gap: '15px',
            marginTop: 'auto',
            borderTop: '1.5px solid #0f382a',
            paddingTop: '8px',
            textAlign: 'center',
            fontSize: '8.5pt',
          }}
        >
          {/* First Party Signature */}
          <div>
            <div style={{ fontWeight: '800', color: '#0f382a', marginBottom: '25px' }}>الطرف الأول (إدارة القاعة)</div>
            <div style={{ borderTop: '1px dashed #64748b', paddingTop: '4px', fontSize: '8pt', color: '#475569' }}>
              الاسم والتوقيع: {hallName}
            </div>
          </div>

          {/* Official Stamp Box */}
          <div>
            <div style={{ fontWeight: '800', color: '#0f382a', marginBottom: '4px' }}>الختم الرسمي للمنشأة</div>
            <div
              style={{
                width: '55px',
                height: '55px',
                border: '1.5px dashed #c8972e',
                borderRadius: '50%',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '7pt',
                color: '#c8972e',
                fontWeight: '700',
              }}
            >
              الختم الرسمي
            </div>
          </div>

          {/* Second Party Signature */}
          <div>
            <div style={{ fontWeight: '800', color: '#0f382a', marginBottom: '25px' }}>الطرف الثاني (المستأجر)</div>
            <div style={{ borderTop: '1px dashed #64748b', paddingTop: '4px', fontSize: '8pt', color: '#475569' }}>
              الاسم والتوقيع: {booking.customer_name || '................................'}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '7pt', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
          تم إصدار هذا العقد آلياً من نظام إدارة {hallName} • القصيم - بريدة • {hall.phone ? `هاتف: ${hall.phone}` : ''}
        </div>
      </div>
    </div>
  );
}