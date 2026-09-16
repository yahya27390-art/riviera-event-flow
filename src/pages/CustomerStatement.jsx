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
    const printContent = document.getElementById('statement-print-area');
    if (!printContent) return;
    const printHTML = printContent.outerHTML;
    const printWindow = window.open('', '_blank', 'width=794,height=1123');
    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>كشف حساب - ${selectedCustomer?.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; background: #fff; color: #1a1a2e; }
    @page { size: A4 portrait; margin: 15mm 14mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 7px 10px; text-align: right; font-size: 10pt; }
    thead tr { background: #1a2e5a; color: #fff; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr { border-bottom: 1px solid #e5e7eb; }
  </style>
</head>
<body>${printHTML}<script>window.onload=function(){setTimeout(function(){window.print();window.close();},500);}<\/script></body>
</html>`);
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