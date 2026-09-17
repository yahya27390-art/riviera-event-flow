import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Pencil, CreditCard, Printer, X, Eye, Receipt } from 'lucide-react';
import { buildPaymentReceipt } from '@/components/print/PaymentReceipt';
import { buildPaymentReceiptBW } from '@/components/print/ReportPageBuilder';
import { openPrintWindow } from '@/lib/printReport';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import PageHeader from '@/components/shared/PageHeader';
import BookingPrintTemplate from '@/components/print/BookingPrintTemplate';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

import { cleanCustomerNotes } from '@/lib/branding';
import { gregorianToHijri } from '@/lib/hijri';

export default function BookingDetails({ booking, payments, onBack, onEdit, onAddPayment }) {
  const [printing, setPrinting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['hallSettings'],
    queryFn: () => base44.entities.HallSettings.list(),
  });
  const hallSettings = settingsList[0] || {};
  const cleanedNotes = cleanCustomerNotes(booking?.notes);

  const statusColor = (status) => {
    if (status === 'مؤكد') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'معلق') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const handlePrint = () => {
    setPrinting(true);
    const printArea = document.getElementById('booking-print-area');
    if (!printArea) {
      setPrinting(false);
      return;
    }

    const printWindow = window.open('', '_blank', 'width=950,height=1200');
    if (!printWindow) {
      window.print();
      setPrinting(false);
      return;
    }

    const printHTML = printArea.outerHTML;

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>عقد حجز - ${booking.booking_number}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Cairo', Arial, sans-serif;
      direction: rtl;
      background: #f1f5f9;
      color: #111827;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
    @media print {
      html, body { width: 210mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      #booking-print-area {
        width: 210mm !important;
        height: 296.5mm !important;
        max-height: 296.5mm !important;
        padding: 8mm 10mm !important;
        margin: 0 !important;
        box-shadow: none !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        overflow: hidden !important;
      }
      .no-print { display: none !important; }
    }
    .no-print {
      position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 10px; z-index: 999; background: rgba(0,0,0,0.85); padding: 8px 16px; border-radius: 12px;
    }
    .btn-print { background: #0f382a; color: #fff; border: 1px solid #c8972e; border-radius: 8px; padding: 8px 22px; font-family: Cairo, sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; }
    .btn-close { background: #fff; color: #333; border: none; border-radius: 8px; padding: 8px 16px; font-family: Cairo, sans-serif; font-size: 13px; cursor: pointer; }
    #booking-print-area {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      margin: 15mm auto;
      background: #fff;
      box-shadow: 0 4px 30px rgba(0,0,0,0.15);
      box-sizing: border-box;
      padding: 8mm 10mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ طباعة العقد / حفظ PDF</button>
    <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
  </div>
  ${printHTML}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
    setPrinting(false);
  };

  return (
    <div>
      <PageHeader
        title={`تفاصيل الحجز ${booking.booking_number}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={onBack}><ArrowRight className="w-4 h-4 ml-1" /> رجوع</Button>
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="w-4 h-4 ml-1" /> معاينة وطباعة
            </Button>
            <Button variant="outline" onClick={onEdit}><Pencil className="w-4 h-4 ml-1" /> تعديل</Button>
            <Button onClick={onAddPayment}><CreditCard className="w-4 h-4 ml-1" /> تسجيل دفعة</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">بيانات الحجز</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><p className="text-muted-foreground mb-1">العميل</p><p className="font-medium">{booking.customer_name}</p></div>
              <div><p className="text-muted-foreground mb-1">الجوال</p><p className="font-medium" dir="ltr">{booking.customer_phone}</p></div>
              <div>
                <p className="text-muted-foreground mb-1">تاريخ المناسبة (الهجري أساسي)</p>
                <p className="font-bold text-amber-600 dark:text-amber-400 text-base">{booking.event_date_hijri || gregorianToHijri(booking.event_date)} هـ</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">الموافق بالميلادي (ثانوي)</p>
                <p className="font-medium text-muted-foreground">{booking.event_date ? format(new Date(booking.event_date), 'dd MMMM yyyy', { locale: ar }) : '-'}</p>
              </div>
              <div><p className="text-muted-foreground mb-1">نوع المناسبة</p><p className="font-medium">{booking.event_type}</p></div>
              {booking.hall_section && <div><p className="text-muted-foreground mb-1">القسم</p><p className="font-medium">{booking.hall_section}</p></div>}
              {booking.service_type && <div><p className="text-muted-foreground mb-1">نوع الخدمات</p><p className="font-medium">{booking.service_type}</p></div>}
              {booking.booking_method && <div><p className="text-muted-foreground mb-1">طريقة الحجز</p><p className="font-medium">{booking.booking_method}</p></div>}
              {booking.voucher_number && (
                <div>
                  <p className="text-muted-foreground mb-1">رقم السند الدفتري</p>
                  <p className="font-bold text-primary" dir="ltr">{booking.voucher_number}</p>
                </div>
              )}
              <div><p className="text-muted-foreground mb-1">الحالة</p><Badge variant="outline" className={statusColor(booking.status)}>{booking.status}</Badge></div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">بنود الحجز</CardTitle></CardHeader>
            <CardContent>
              {(booking.items || []).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">البند</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {booking.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{formatCurrency(item.price)}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد بنود</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">سجل المدفوعات</CardTitle></CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الطريقة</TableHead>
                      <TableHead className="text-right">المرجع</TableHead>
                      <TableHead className="text-right">إيصال</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{p.payment_date ? format(new Date(p.payment_date), 'dd/MM/yyyy') : '-'}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>{p.payment_method}</TableCell>
                        <TableCell>{p.reference_number || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const src = (p.payment_method === 'تحويل بنكي' || p.payment_method === 'مدى') ? 'bank' : 'cash';
                                const html = buildPaymentReceipt(hallSettings, booking, p, src);
                                const win = window.open('', '_blank', 'width=900,height=700');
                                win.document.write(html);
                                win.document.close();
                              }}
                              className="text-xs flex items-center gap-1 text-primary hover:underline"
                            >
                              <Receipt className="w-3 h-3" /> ملوّن
                            </button>
                            <button
                              onClick={() => {
                                const receiptNum = `${booking.booking_number || 'N/A'}-${p.id?.slice(-4) || 'P'}`;
                                const html = buildPaymentReceiptBW(hallSettings, booking, p, receiptNum);
                                openPrintWindow(html, `إيصال - ${receiptNum}`);
                              }}
                              className="text-xs flex items-center gap-1 text-muted-foreground hover:underline"
                            >
                              <Receipt className="w-3 h-3" /> أ/أ
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد مدفوعات</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-0 shadow-sm sticky top-8">
            <CardHeader><CardTitle className="text-base">الملخص المالي</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">إجمالي البنود</span><span>{formatCurrency(booking.total_amount)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">الخصم</span><span>{formatCurrency(booking.discount)}</span></div>
              <div className="flex justify-between text-sm font-semibold border-t pt-3"><span>المبلغ النهائي</span><span>{formatCurrency(booking.final_amount)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">المدفوع</span><span className="text-green-600">{formatCurrency(booking.paid_amount)}</span></div>
              <div className="flex justify-between text-lg font-bold border-t pt-3"><span className="text-accent">المتبقي</span><span className="text-accent">{formatCurrency(booking.remaining_amount)}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>

      {cleanedNotes && (
        <Card className="border-0 shadow-sm mt-6">
          <CardHeader><CardTitle className="text-base">ملاحظات الاتفاق</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{cleanedNotes}</p></CardContent>
        </Card>
      )}

      {/* Hidden print template */}
      <div style={{ display: 'none' }}>
        <BookingPrintTemplate booking={booking} payments={payments} hallSettings={hallSettings} />
      </div>

      {/* Print Preview Modal */}
      {showPreview && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '20px 16px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPreview(false); }}
        >
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1a2e5a', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontFamily: 'Cairo, sans-serif', cursor: 'pointer', fontWeight: '600' }}
            >
              🖨️ طباعة / حفظ PDF
            </button>
            <button
              onClick={() => setShowPreview(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#333', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' }}
            >
              ✕ إغلاق
            </button>
          </div>

          {/* A4 Paper Preview */}
          <div style={{
            width: '210mm',
            minHeight: '297mm',
            background: '#fff',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            borderRadius: '4px',
            flexShrink: 0,
          }}>
            <BookingPrintTemplate booking={booking} payments={payments} hallSettings={hallSettings} />
          </div>
        </div>
      )}
    </div>
  );
}