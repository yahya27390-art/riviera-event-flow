import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, CheckCircle2, AlertTriangle, Clock, Search, Printer, Receipt, MessageSquare } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { openPrintWindow } from '@/lib/printReport';
import { buildPendingPage } from '@/components/print/ReportPageBuilder';
import { gregorianToHijri } from '@/lib/hijri';
import { buildPaymentReceipt } from '@/components/print/PaymentReceipt';
import HijriDatePicker from '@/components/shared/HijriDatePicker';

export default function PendingPayments() {
  const [paymentDialog, setPaymentDialog] = useState(null);
  const todayGreg = new Date().toISOString().split('T')[0];
  const [payment, setPayment] = useState({ amount: '', payment_method: 'نقدي', reference_number: '', payment_date: todayGreg, payment_date_hijri: gregorianToHijri(todayGreg) });
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-event_date', 300),
  });
  const { data: settingsList = [] } = useQuery({ queryKey: ['hallSettings'], queryFn: () => base44.entities.HallSettings.list() });
  const hallSettings = settingsList[0] || {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pendingBookings = useMemo(() => bookings.filter(b =>
    b.status !== 'ملغي' && (b.remaining_amount || 0) > 0
  ).sort((a, b) => {
    const dA = a.event_date ? differenceInDays(new Date(a.event_date), today) : 9999;
    const dB = b.event_date ? differenceInDays(new Date(b.event_date), today) : 9999;
    return dA - dB;
  }), [bookings]);

  const filtered = useMemo(() => {
    if (!search.trim()) return pendingBookings;
    const q = search.toLowerCase();
    return pendingBookings.filter(b =>
      (b.customer_name || '').toLowerCase().includes(q) ||
      (b.customer_phone || '').includes(q) ||
      (b.booking_number || '').includes(q)
    );
  }, [pendingBookings, search]);

  const createPayment = useMutation({
    mutationFn: async (paymentData) => {
      await base44.entities.Payment.create(paymentData);
      const booking = bookings.find(b => b.id === paymentData.booking_id);
      const newPaid = (booking.paid_amount || 0) + paymentData.amount;
      const newRemaining = (booking.final_amount || 0) - newPaid;
      await base44.entities.Booking.update(booking.id, { paid_amount: newPaid, remaining_amount: newRemaining });
      if (paymentData.payment_method === 'نقدي') {
        await base44.entities.CashTransaction.create({
          type: 'إيراد', source: 'حجز', reference_id: booking.id,
          reference_label: `دفعة حجز ${booking.booking_number}`,
          amount: paymentData.amount, transaction_date: paymentData.payment_date,
        });
      } else {
        await base44.entities.BankTransaction.create({
          type: 'إيراد', source: 'حجز', reference_id: booking.id,
          reference_label: `دفعة حجز ${booking.booking_number}`,
          amount: paymentData.amount, transaction_date: paymentData.payment_date, payment_method: 'تحويل بنكي',
        });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries(); setPaymentDialog(null); toast.success('تم تسجيل الدفعة بنجاح'); },
  });

  const openPayment = (booking) => {
    const g = new Date().toISOString().split('T')[0];
    setPayment({ amount: (booking.remaining_amount || '').toString(), payment_method: 'نقدي', reference_number: '', payment_date: g, payment_date_hijri: gregorianToHijri(g) });
    setPaymentDialog(booking);
  };

  const handlePaySubmit = (e) => {
    e.preventDefault();
    createPayment.mutate({ ...payment, amount: parseFloat(payment.amount), booking_id: paymentDialog.id, booking_number: paymentDialog.booking_number });
  };

  const handlePrint = () => {
    const html = buildPendingPage(hallSettings, filtered, new Date().toISOString().split('T')[0]);
    openPrintWindow(html, 'تقرير المطالبات المعلقة');
  };

  const getUrgencyStyle = (booking) => {
    if (!booking.event_date) return { badge: 'bg-gray-100 text-gray-600', row: '' };
    const d = differenceInDays(new Date(booking.event_date), today);
    if (d < 0) return { badge: 'bg-gray-100 text-gray-500', row: 'opacity-60', label: 'منتهي' };
    if (d === 0) return { badge: 'bg-red-100 text-red-700', label: 'اليوم', row: 'bg-red-50' };
    if (d <= 3) return { badge: 'bg-red-100 text-red-700', label: `${d} أيام`, row: 'bg-red-50/50' };
    if (d <= 7) return { badge: 'bg-amber-100 text-amber-700', label: `${d} أيام`, row: 'bg-amber-50/30' };
    return { badge: 'bg-blue-100 text-blue-700', label: `${d} يوم`, row: '' };
  };

  const totalPending = filtered.reduce((s, b) => s + (b.remaining_amount || 0), 0);

  return (
    <div>
      <PageHeader
        title="المطالبات المعلقة"
        description={`${pendingBookings.length} عميل لديهم مبالغ متبقية`}
        actions={
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="w-4 h-4" /> طباعة التقرير
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-400 text-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs mb-1">إجمالي المبالغ المتبقية</p>
              <p className="text-xl font-bold">{formatCurrency(totalPending)}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-white/30" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs mb-1">عدد العملاء المعلقين</p>
              <p className="text-xl font-bold">{pendingBookings.length}</p>
            </div>
            <Clock className="w-8 h-8 text-muted-foreground/30" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs mb-1">مستحقة خلال 7 أيام</p>
              <p className="text-xl font-bold text-red-600">
                {pendingBookings.filter(b => {
                  if (!b.event_date) return false;
                  const d = differenceInDays(new Date(b.event_date), today);
                  return d >= 0 && d <= 7;
                }).length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-300" />
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الجوال أو رقم الحجز..."
          className="pr-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CheckCircle2} title={search ? 'لا توجد نتائج' : 'لا توجد مطالبات معلقة'} description={search ? 'جرب بحثاً آخر' : 'جميع الحجوزات مسددة بالكامل'} />
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">رقم الحجز</TableHead>
                  <TableHead className="text-right">موعد المناسبة</TableHead>
                  <TableHead className="text-right">المبلغ الكلي</TableHead>
                  <TableHead className="text-right">المسدد</TableHead>
                  <TableHead className="text-right">المتبقي</TableHead>
                  <TableHead className="text-right">الموعد</TableHead>
                  <TableHead className="text-right">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(booking => {
                  const style = getUrgencyStyle(booking);
                  return (
                    <TableRow key={booking.id} className={style.row}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{booking.customer_name}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{booking.customer_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{booking.booking_number}</TableCell>
                      <TableCell className="text-sm">{booking.event_date ? format(new Date(booking.event_date), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(booking.final_amount)}</TableCell>
                      <TableCell className="text-sm text-green-700 font-medium">{formatCurrency(booking.paid_amount)}</TableCell>
                      <TableCell className="text-sm font-bold text-red-600">{formatCurrency(booking.remaining_amount)}</TableCell>
                      <TableCell>
                        {style.label && (
                          <span className={`text-xs px-2 py-1 rounded-lg font-medium ${style.badge}`}>{style.label}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {booking.customer_phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                              onClick={() => {
                                const cleanPhone = booking.customer_phone.replace(/\D/g, '');
                                const phone = cleanPhone.startsWith('966') ? cleanPhone : `966${cleanPhone.replace(/^0/, '')}`;
                                const hallName = hallSettings.hall_name || 'قاعة قمة الريف';
                                const ibanText = hallSettings.iban ? `\nرقم الحساب البنكي (IBAN):\n${hallSettings.iban}` : '';
                                const message = encodeURIComponent(
                                  `السلام عليكم ورحمة الله وبركاته\nالأستاذ/ة: ${booking.customer_name}\nنود تذكيركم بموعد مناسبتكم في ${hallName} بتاريخ ${booking.event_date}.\nالمبلغ المتبقي للتحصيل: ${formatCurrency(booking.remaining_amount)}${ibanText}\n\nيرجى التكرم بتسديد المبلغ وتزويدنا بصورة الإيصال. شاكرين لكم تعاونكم!`
                                );
                                window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                              }}
                              title="إرسال تذكير واتساب"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> واتساب
                            </Button>
                          )}
                          <Button size="sm" onClick={() => openPayment(booking)} className="h-8 gap-1 text-xs bg-primary text-primary-foreground font-bold">
                            <CreditCard className="w-3.5 h-3.5" /> تسديد
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Payment Dialog */}
      {paymentDialog && (
        <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>تسديد المبلغ المتبقي</DialogTitle></DialogHeader>
            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 space-y-2 text-sm">
                <div className="font-semibold text-base mb-2">{paymentDialog.customer_name}</div>
                <div className="flex justify-between"><span>المبلغ الكلي:</span><span className="font-semibold">{formatCurrency(paymentDialog.final_amount)}</span></div>
                <div className="flex justify-between"><span>المسدد:</span><span className="text-green-700 font-semibold">{formatCurrency(paymentDialog.paid_amount)}</span></div>
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>المتبقي:</span><span className="text-red-600">{formatCurrency(paymentDialog.remaining_amount)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>المبلغ المراد تسديده *</Label>
                <Input type="number" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} required dir="ltr" max={paymentDialog.remaining_amount} />
                <p className="text-xs text-muted-foreground">أقصى مبلغ: {formatCurrency(paymentDialog.remaining_amount)}</p>
              </div>
              <div className="space-y-2">
                <Label>طريقة السداد</Label>
                <Select value={payment.payment_method} onValueChange={v => setPayment({ ...payment, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="نقدي">نقدي</SelectItem>
                    <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <HijriDatePicker
                label="تاريخ الدفع"
                value={{ hijri: payment.payment_date_hijri, gregorian: payment.payment_date }}
                onChange={({ hijri, gregorian }) => setPayment(p => ({ ...p, payment_date: gregorian, payment_date_hijri: hijri }))}
              />
              {payment.payment_method !== 'نقدي' && (
                <div className="space-y-2">
                  <Label>رقم المرجع / التحويل</Label>
                  <Input value={payment.reference_number} onChange={e => setPayment({ ...payment, reference_number: e.target.value })} />
                </div>
              )}
              {parseFloat(payment.amount) >= (paymentDialog.remaining_amount || 0) && parseFloat(payment.amount) > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> سيتم تصفير الحساب بالكامل بعد هذا التسديد
                </div>
              )}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setPaymentDialog(null)}>إلغاء</Button>
                {parseFloat(payment.amount) > 0 && (
                  <Button type="button" variant="outline" className="gap-1" onClick={() => {
                    const paidAfter = (paymentDialog.paid_amount || 0) + parseFloat(payment.amount || 0);
                    const updatedBooking = { ...paymentDialog, paid_amount: paidAfter, remaining_amount: (paymentDialog.final_amount || 0) - paidAfter };
                    const html = buildPaymentReceipt(hallSettings, updatedBooking, payment);
                    openPrintWindow(html, `إيصال قبض ${paymentDialog.booking_number}`);
                  }}>
                    <Receipt className="w-4 h-4" /> معاينة الإيصال
                  </Button>
                )}
                <Button type="submit" disabled={createPayment.isPending}>
                  {createPayment.isPending ? 'جاري التسجيل...' : 'تأكيد التسديد'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}