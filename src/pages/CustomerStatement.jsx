import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Printer, User, Phone, Eye, ArrowRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import PageHeader from '@/components/shared/PageHeader';
import { openPrintWindow } from '@/lib/printReport';
import CustomerStatementPrintTemplate, { buildCustomerStatementHTML } from '@/components/print/CustomerStatementPrintTemplate';
import { gregorianToHijri } from '@/lib/hijri';

export default function CustomerStatement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

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
      label: `حجز - ${b.event_type || 'مناسبة'}${b.hall_section ? ` (${b.hall_section})` : ''}`,
      booking_number: b.booking_number,
      amount: b.final_amount || 0,
      method: b.booking_method || '-',
      status: b.status,
      id: b.id,
      hijri: b.event_date_hijri || gregorianToHijri(b.event_date),
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
      hijri: p.payment_date_hijri || gregorianToHijri(p.payment_date),
    })),
  ].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

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
    const html = buildCustomerStatementHTML(selectedCustomer, bookings, payments, hallSettings);
    openPrintWindow(html, `كشف حساب عميل - ${selectedCustomer.name}`);
  };

  return (
    <div>
      <PageHeader
        title="كشف حساب العملاء"
        description="عرض كل عمليات العميل من حجوزات ومدفوعات مع طباعة رسمية معتمدة"
        actions={
          selectedCustomer && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowPreview(true)}>
                <Eye className="w-4 h-4 ml-1" /> معاينة كشف الحساب
              </Button>
              <Button onClick={handlePrint} className="bg-emerald-700 hover:bg-emerald-800 text-white">
                <Printer className="w-4 h-4 ml-1" /> طباعة كشف الحساب
              </Button>
            </div>
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
                <p className="text-sm text-muted-foreground text-center py-8">لا يوجد عملاء مطابقة للبحث</p>
              ) : (
                <div className="divide-y max-h-[550px] overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.phone}
                      className={`w-full text-right px-4 py-3 hover:bg-muted/50 transition-colors ${selectedCustomer?.phone === c.phone ? 'bg-primary/10 border-r-4 border-emerald-600' : ''}`}
                      onClick={() => setSelectedCustomer(c)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-emerald-800" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-sm text-gray-900 truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground font-mono" dir="ltr">{c.phone}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Statement View */}
        <div className="lg:col-span-2">
          {!selectedCustomer ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center h-72 text-muted-foreground text-sm">
                <User className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-base font-semibold text-gray-600">اختر عميلاً من القائمة لعرض كشف حسابه وطباعته</p>
                <p className="text-xs text-gray-400 mt-1">يتم احتساب إجمالي الحجوزات، المدفوعات المسددة، والمتبقي آلياً</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Customer Header */}
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        <User className="w-6 h-6 text-emerald-800" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-gray-900">{selectedCustomer.name}</h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 font-mono" dir="ltr">
                          <Phone className="w-3.5 h-3.5 text-emerald-700" /> {selectedCustomer.phone}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="text-center p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <p className="text-xs text-muted-foreground">عدد الحجوزات</p>
                        <p className="font-bold text-base text-gray-800">{customerBookings.length}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-blue-50 border border-blue-100">
                        <p className="text-xs text-blue-700">إجمالي الحجوزات</p>
                        <p className="font-bold text-base text-blue-900">{formatCurrency(totalBooked)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                        <p className="text-xs text-emerald-700">المدفوع</p>
                        <p className="font-bold text-base text-emerald-800">{formatCurrency(totalPaid)}</p>
                      </div>
                      <div className={`text-center p-2 rounded-lg border ${totalRemaining > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                        <p className={`text-xs ${totalRemaining > 0 ? 'text-red-600' : 'text-emerald-700'}`}>المتبقي</p>
                        <p className={`font-bold text-base ${totalRemaining > 0 ? 'text-red-700' : 'text-emerald-800'}`}>
                          {formatCurrency(totalRemaining)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline Table */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-bold text-emerald-950">سجل العمليات والمدفوعات</CardTitle>
                  <Button size="sm" variant="outline" onClick={handlePrint}>
                    <Printer className="w-3.5 h-3.5 ml-1" /> طباعة
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">لا توجد عمليات مسجلة لهذا العميل</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-right">التاريخ</TableHead>
                            <TableHead className="text-right">رقم الحجز</TableHead>
                            <TableHead className="text-right">العملية / البيان</TableHead>
                            <TableHead className="text-right">طريقة الدفع</TableHead>
                            <TableHead className="text-right">المبلغ</TableHead>
                            <TableHead className="text-right">النوع</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {timeline.map((item, i) => (
                            <TableRow key={item.id || i} className={item.type === 'payment' ? 'bg-emerald-50/40' : ''}>
                              <TableCell className="text-sm">
                                <div>
                                  <p className="font-bold text-xs text-foreground">{item.hijri ? `${item.hijri} هـ` : '-'}</p>
                                  <p className="text-[11px] text-muted-foreground font-mono">({item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-'} م)</p>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm font-semibold text-emerald-900">{item.booking_number || '-'}</TableCell>
                              <TableCell className="text-sm font-medium">{item.label}</TableCell>
                              <TableCell className="text-sm text-gray-600">{item.method}</TableCell>
                              <TableCell className={`text-sm font-bold ${item.type === 'payment' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                {item.type === 'payment' ? '+' : ''}{formatCurrency(item.amount)}
                              </TableCell>
                              <TableCell>
                                {item.type === 'booking' ? (
                                  <Badge variant="outline" className={statusColor(item.status)}>{item.status || 'حجز'}</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">سداد مالي</Badge>
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
                <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-50/50 to-white">
                  <CardContent className="pt-4">
                    <div className="flex justify-end">
                      <div className="w-72 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">إجمالي الحجوزات التعاقدية</span>
                          <span className="font-bold text-gray-900">{formatCurrency(totalBooked)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">إجمالي المدفوعات المسددة</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(totalPaid)}</span>
                        </div>
                        <div className="flex justify-between font-black text-base border-t border-gray-200 pt-2">
                          <span className="text-gray-900">صافي الرصيد المتبقي</span>
                          <span className={totalRemaining > 0 ? 'text-red-600' : 'text-emerald-700'}>
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

      {/* Hidden container with the print template always ready in DOM */}
      {selectedCustomer && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <CustomerStatementPrintTemplate
            customer={selectedCustomer}
            bookings={bookings}
            payments={payments}
            hallSettings={hallSettings}
          />
        </div>
      )}

      {/* Print Preview Modal */}
      {showPreview && selectedCustomer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowY: 'auto',
            padding: '24px 16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPreview(false); }}
        >
          {/* Floating Action Toolbar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#0f382a',
                color: '#fff',
                border: '1px solid #c8972e',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '14px',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
                fontWeight: '700',
              }}
            >
              <Printer style={{ width: '16px', height: '16px' }} /> طباعة كشف الحساب / حفظ PDF
            </button>
            <button
              onClick={() => setShowPreview(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#fff',
                color: '#333',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
              }}
            >
              <X style={{ width: '16px', height: '16px' }} /> إغلاق المعاينة
            </button>
          </div>

          {/* A4 Paper Container */}
          <div
            style={{
              width: '210mm',
              minHeight: '297mm',
              background: '#fff',
              boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
              borderRadius: '4px',
              flexShrink: 0,
            }}
          >
            <CustomerStatementPrintTemplate
              customer={selectedCustomer}
              bookings={bookings}
              payments={payments}
              hallSettings={hallSettings}
            />
          </div>
        </div>
      )}
    </div>
  );
}