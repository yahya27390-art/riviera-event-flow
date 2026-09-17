import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Printer, User, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import PageHeader from '@/components/shared/PageHeader';
import { getHallLogoUrl, DEFAULT_HALL_NAME } from '@/lib/branding';
import { gregorianToHijri } from '@/lib/hijri';

export default function CustomerStatement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-event_date', 500),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-payment_date', 1000),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['hallSettings'],
    queryFn: () => base44.entities.HallSettings.list(),
  });
  const hallSettings = settingsList[0] || {};

  // Get unique customers from bookings
  const customersMap = {};
  bookings.forEach(b => {
    if (!customersMap[b.customer_phone]) {
      customersMap[b.customer_phone] = { name: b.customer_name, phone: b.customer_phone };
    }
  });
  const customers = Object.values(customersMap);

  const filteredCustomers = customers.filter(c =>
    !searchQuery ||
    c.name?.includes(searchQuery) ||
    c.phone?.includes(searchQuery)
  );

  const customerBookings = selectedCustomer
    ? bookings.filter(b => b.customer_phone === selectedCustomer.phone)
    : [];

  const customerPayments = selectedCustomer
    ? payments.filter(p => customerBookings.some(b => b.id === p.booking_id))
    : [];

  // Build unified timeline sorted by date
  const timeline = [
    ...customerBookings.map(b => ({
      date: b.event_date,
      type: 'booking',
      label: `حجز - ${b.event_type}${b.hall_section ? ` (${b.hall_section})` : ''}`,
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
      label: `سداد - حجز ${p.booking_number}`,
      booking_number: p.booking_number,
      amount: p.amount || 0,
      method: p.payment_method,
      status: null,
      id: p.id,
      hijri: '',
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalBooked = customerBookings.reduce((s, b) => s + (b.final_amount || 0), 0);
  const totalPaid = customerPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalRemaining = totalBooked - totalPaid;

  const statusColor = (status) => {
    if (status === 'مؤكد') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'معلق') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const handlePrint = () => {
    if (!selectedCustomer) return;
    const hs = hallSettings || {};
    const hallName = hs.hall_name || DEFAULT_HALL_NAME;
    const logoSrc = getHallLogoUrl(hs);
    const printDate = new Date().toLocaleDateString('ar-SA');
    const hijriDate = gregorianToHijri(new Date().toISOString().split('T')[0]);

    const rowsHtml = timeline.map((item, idx) => {
      const isPay = item.type === 'payment';
      return `
        <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f9fafb'}; border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 6px 10px; font-size: 10pt;">${idx + 1}</td>
          <td style="padding: 6px 10px; font-size: 10pt;">
            ${item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-'}
            ${item.hijri ? `<div style="font-size: 8pt; color: #888;">${item.hijri}</div>` : ''}
          </td>
          <td style="padding: 6px 10px; font-size: 10pt; font-family: monospace;">${item.booking_number || '-'}</td>
          <td style="padding: 6px 10px; font-size: 10pt; font-weight: 600;">${item.label}</td>
          <td style="padding: 6px 10px; font-size: 10pt;">${item.method || '-'}</td>
          <td style="padding: 6px 10px; font-size: 10pt; text-align: left; font-weight: 700; color: ${isPay ? '#059669' : '#1e3a8a'};">
            ${isPay ? '+' : ''}${formatCurrency(item.amount)}
          </td>
          <td style="padding: 6px 10px; font-size: 9pt; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-weight: bold; background: ${isPay ? '#d1fae5; color: #065f46' : item.status === 'مؤكد' ? '#d1fae5; color: #065f46' : '#fef9c3; color: #92400e'};">
              ${isPay ? 'سداد مالي' : item.status || 'حجز'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>كشف حساب عميل - ${selectedCustomer.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; background: #f3f4f6; color: #111827; }
    @page { size: A4 portrait; margin: 10mm 12mm; }
    @media print {
      body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-container { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; }
    }
    .no-print {
      position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 10px; z-index: 999; background: rgba(0,0,0,0.85); padding: 8px 16px; border-radius: 12px;
    }
    .btn-print { background: #059669; color: #fff; border: none; border-radius: 8px; padding: 8px 20px; font-family: Cairo, sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; }
    .btn-close { background: #fff; color: #333; border: none; border-radius: 8px; padding: 8px 16px; font-family: Cairo, sans-serif; font-size: 13px; cursor: pointer; }
    .page-container {
      width: 210mm; min-height: 297mm; background: #fff; margin: 15mm auto;
      box-shadow: 0 4px 25px rgba(0,0,0,0.12); padding: 14mm 16mm;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #0f2b1d; color: #fff; padding: 8px 10px; font-size: 10pt; font-weight: 700; text-align: right; }
    td { vertical-align: middle; }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ طباعة كشف الحساب</button>
    <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
  </div>

  <div class="page-container">
    {/* Header */}
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0f2b1d; padding-bottom: 12px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <img src="${logoSrc}" alt="Logo" style="width: 75px; height: 75px; object-fit: contain; border-radius: 8px;" onerror="this.src='./logo.png'"/>
        <div>
          <h1 style="font-size: 18pt; font-weight: 900; color: #0f2b1d;">${hallName}</h1>
          <p style="font-size: 9pt; color: #6b7280; margin-top: 2px;">نظام إدارة الحجوزات والحسابات الرسمية</p>
        </div>
      </div>
      <div style="text-align: left; font-size: 9pt; color: #4b5563; line-height: 1.5;">
        <div style="font-size: 14pt; font-weight: 900; color: #059669;">كشف حساب عميل</div>
        <div>تاريخ الإصدار: <strong>${printDate}</strong> (${hijriDate} هـ)</div>
        ${hs.phone ? `<div>هاتف: ${hs.phone}</div>` : ''}
        ${hs.commercial_register ? `<div>س.ت: ${hs.commercial_register}</div>` : ''}
        ${hs.tax_number ? `<div>الرقم الضريبي: ${hs.tax_number}</div>` : ''}
      </div>
    </div>

    {/* Customer Banner */}
    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 9pt; color: #64748b;">اسم العميل:</div>
        <div style="font-size: 14pt; font-weight: 900; color: #0f172a;">${selectedCustomer.name}</div>
      </div>
      <div style="text-align: left;">
        <div style="font-size: 9pt; color: #64748b;">رقم الجوال:</div>
        <div style="font-size: 12pt; font-weight: 800; color: #0f172a; direction: ltr;">${selectedCustomer.phone}</div>
      </div>
    </div>

    {/* Financial Summary Grid */}
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
      <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 8.5pt; color: #64748b; margin-bottom: 2px;">عدد الحجوزات</div>
        <div style="font-size: 13pt; font-weight: 800; color: #0f172a;">${customerBookings.length}</div>
      </div>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 8.5pt; color: #3b82f6; margin-bottom: 2px;">إجمالي الحجوزات</div>
        <div style="font-size: 13pt; font-weight: 800; color: #1e3a8a;">${formatCurrency(totalBooked)}</div>
      </div>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 8.5pt; color: #16a34a; margin-bottom: 2px;">إجمالي المسدد</div>
        <div style="font-size: 13pt; font-weight: 800; color: #15803d;">${formatCurrency(totalPaid)}</div>
      </div>
      <div style="background: ${totalRemaining > 0 ? '#fef2f2; border: 1.5px solid #fca5a5;' : '#f0fdf4; border: 1.5px solid #86efac;'} border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 8.5pt; color: ${totalRemaining > 0 ? '#dc2626' : '#16a34a'}; margin-bottom: 2px;">صافي المتبقي للتحصيل</div>
        <div style="font-size: 13pt; font-weight: 900; color: ${totalRemaining > 0 ? '#b91c1c' : '#15803d'};">${formatCurrency(totalRemaining)}</div>
      </div>
    </div>

    {/* Transactions Timeline Table */}
    <div style="font-size: 11pt; font-weight: 800; color: #0f2b1d; margin-bottom: 6px; border-right: 4px solid #059669; padding-right: 8px;">
      تفاصيل الحركات المالية وسجل الحجوزات
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 25px;">#</th>
          <th>التاريخ</th>
          <th>رقم الحجز</th>
          <th>البيان / العملية</th>
          <th>طريقة الدفع</th>
          <th style="text-align: left;">المبلغ</th>
          <th style="text-align: center;">الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #9ca3af;">لا توجد عمليات مسجلة لهذا العميل</td></tr>'}
      </tbody>
      <tfoot>
        <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid #0f2b1d;">
          <td colspan="5" style="padding: 10px; text-align: right;">المجموع الإجمالي للرصيد المتبقي:</td>
          <td colspan="2" style="padding: 10px; text-align: left; font-size: 12pt; color: ${totalRemaining > 0 ? '#dc2626' : '#059669'};">
            ${formatCurrency(totalRemaining)}
          </td>
        </tr>
      </tfoot>
    </table>

    {/* Signatures */}
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9pt;">
      <div>
        <div style="color: #64748b; margin-bottom: 30px;">المحاسب المالي</div>
        <div style="border-top: 1px dashed #94a3b8; padding-top: 4px;">الاسم والتوقيع</div>
      </div>
      <div>
        <div style="color: #64748b; margin-bottom: 30px;">ختم المنشأة</div>
        <div style="width: 50px; height: 50px; border: 1px dashed #cbd5e1; border-radius: 50%; margin: -10px auto 0;"></div>
      </div>
      <div>
        <div style="color: #64748b; margin-bottom: 30px;">توقيع العميل / المستلم</div>
        <div style="border-top: 1px dashed #94a3b8; padding-top: 4px;">${selectedCustomer.name}</div>
      </div>
    </div>

    {/* Footer */}
    <div style="margin-top: 30px; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px;">
      ${hallName} • ${hs.address || 'المملكة العربية السعودية'} ${hs.phone ? `• هاتف: ${hs.phone}` : ''}
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div>
      <PageHeader
        title="كشف حساب العملاء"
        description="عرض كل عمليات العميل من حجوزات ومدفوعات"
        actions={
          selectedCustomer && (
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 ml-1" /> طباعة كشف الحساب
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customers List */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">قائمة العملاء</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو الجوال..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">لا يوجد عملاء</p>
              ) : (
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.phone}
                      className={`w-full text-right px-4 py-3 hover:bg-muted/50 transition-colors ${selectedCustomer?.phone === c.phone ? 'bg-primary/10 border-r-2 border-primary' : ''}`}
                      onClick={() => setSelectedCustomer(c)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{c.phone}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Statement */}
        <div className="lg:col-span-2">
          {!selectedCustomer ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              اختر عميلاً لعرض كشف حسابه
            </div>
          ) : (
            <div id="statement-print-area" style={{ fontFamily: 'Cairo, Arial, sans-serif', direction: 'rtl' }}>
              {/* Customer Header */}
              <Card className="border-0 shadow-sm mb-4">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg">{selectedCustomer.name}</h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-1" dir="ltr">
                          <Phone className="w-3 h-3" /> {selectedCustomer.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground">عدد الحجوزات</p>
                        <p className="font-bold text-lg">{customerBookings.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">إجمالي الحجوزات</p>
                        <p className="font-bold text-lg">{formatCurrency(totalBooked)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">المدفوع</p>
                        <p className="font-bold text-lg text-green-600">{formatCurrency(totalPaid)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">المتبقي</p>
                        <p className={`font-bold text-lg ${totalRemaining > 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {formatCurrency(totalRemaining)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline Table */}
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-base">سجل العمليات</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">لا توجد عمليات</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-right">التاريخ</TableHead>
                            <TableHead className="text-right">رقم الحجز</TableHead>
                            <TableHead className="text-right">العملية</TableHead>
                            <TableHead className="text-right">طريقة الدفع</TableHead>
                            <TableHead className="text-right">المبلغ</TableHead>
                            <TableHead className="text-right">النوع</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {timeline.map((item, i) => (
                            <TableRow key={i} className={item.type === 'payment' ? 'bg-green-50/50' : ''}>
                              <TableCell className="text-sm">
                                <div>
                                  <p>{item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-'}</p>
                                  {item.hijri && <p className="text-xs text-muted-foreground">{item.hijri}</p>}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{item.booking_number || '-'}</TableCell>
                              <TableCell className="text-sm">{item.label}</TableCell>
                              <TableCell className="text-sm">{item.method}</TableCell>
                              <TableCell className={`text-sm font-semibold ${item.type === 'payment' ? 'text-green-600' : 'text-primary'}`}>
                                {item.type === 'payment' ? '+' : ''}{formatCurrency(item.amount)}
                              </TableCell>
                              <TableCell>
                                {item.type === 'booking' ? (
                                  <Badge variant="outline" className={statusColor(item.status)}>{item.status}</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">سداد</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary Footer */}
              {timeline.length > 0 && (
                <Card className="border-0 shadow-sm mt-4">
                  <CardContent className="pt-4">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">إجمالي الحجوزات</span>
                          <span className="font-medium">{formatCurrency(totalBooked)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">إجمالي المدفوع</span>
                          <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-base border-t pt-2">
                          <span>صافي المتبقي</span>
                          <span className={totalRemaining > 0 ? 'text-red-500' : 'text-green-600'}>
                            {formatCurrency(totalRemaining)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}