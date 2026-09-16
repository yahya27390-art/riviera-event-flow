import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Wallet, TrendingUp, TrendingDown, Users, Receipt, Pencil, Trash2, ArrowLeftRight, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import HijriDatePicker from '@/components/shared/HijriDatePicker';
import { gregorianToHijri } from '@/lib/hijri';
import { toast } from 'sonner';
import { buildPaymentReceipt } from '@/components/print/PaymentReceipt';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/AuthContext';

export default function CashManagement() {
  const todayGreg = new Date().toISOString().split('T')[0];

  // Dialog modes: null | 'manual' | 'booking'
  const [dialogMode, setDialogMode] = useState(null);

  // Manual transaction form
  const [form, setForm] = useState({
    type: 'إيراد', amount: '', reference_label: '',
    transaction_date: todayGreg,
    transaction_date_hijri: gregorianToHijri(todayGreg),
  });

  // Booking payment form
  const [bookingPayForm, setBookingPayForm] = useState({
    selectedBookingId: '',
    amount: '',
    payment_date: todayGreg,
    payment_date_hijri: gregorianToHijri(todayGreg),
    reference_number: '',
    notes: '',
  });

  // After-save receipt state
  const [savedReceiptData, setSavedReceiptData] = useState(null); // {booking, payment, hallSettings}

  // Edit / delete transaction state
  const [editTransactionId, setEditTransactionId] = useState(null);
  const [deleteTransactionId, setDeleteTransactionId] = useState(null);
  const [confirmEdit, setConfirmEdit] = useState(false);

  // Transfer between cash and bank
  const [transferForm, setTransferForm] = useState({
    amount: '',
    transaction_date: todayGreg,
    transaction_date_hijri: gregorianToHijri(todayGreg),
  });
  const [transferConfirm, setTransferConfirm] = useState(null); // null | 'toBank' | 'toCash'

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: transactions = [] } = useQuery({
    queryKey: ['cashTransactions'],
    queryFn: () => base44.entities.CashTransaction.list('-created_date', 500),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 200),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date', 500),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['hallSettings'],
    queryFn: () => base44.entities.HallSettings.list(),
  });
  const hallSettings = settingsList[0] || {};

  // Bookings with remaining balance (active only)
  const pendingBookings = bookings.filter(b => b.status !== 'ملغي' && (b.remaining_amount || 0) > 0);

  const selectedBooking = pendingBookings.find(b => b.id === bookingPayForm.selectedBookingId) || null;

  // Create manual cash transaction
  const createManual = useMutation({
    mutationFn: (data) => base44.entities.CashTransaction.create({
      ...data,
      source: 'يدوي',
      amount: parseFloat(data.amount),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashTransactions'] });
      setDialogMode(null);
      toast.success('تمت العملية بنجاح');
    },
  });

  // Create booking payment + update booking + create cash transaction
  const createBookingPayment = useMutation({
    mutationFn: async (data) => {
      const { booking, paymentAmount, payDate, payDateHijri, refNum, notes } = data;
      const amount = parseFloat(paymentAmount);

      // 1. Create Payment record
      const payment = await base44.entities.Payment.create({
        booking_id: booking.id,
        booking_number: booking.booking_number,
        amount,
        payment_method: 'نقدي',
        reference_number: refNum || '',
        payment_date: payDate,
        notes: notes || '',
      });

      // 2. Update booking balances
      const newPaid = (booking.paid_amount || 0) + amount;
      const newRemaining = (booking.final_amount || 0) - newPaid;
      await base44.entities.Booking.update(booking.id, {
        paid_amount: newPaid,
        remaining_amount: newRemaining < 0 ? 0 : newRemaining,
        status: newRemaining <= 0 ? 'مؤكد' : booking.status,
      });

      // 3. Create CashTransaction
      await base44.entities.CashTransaction.create({
        type: 'إيراد',
        source: 'حجز',
        reference_id: booking.id,
        reference_label: `سداد حجز - ${booking.customer_name} - ${booking.booking_number}`,
        amount,
        transaction_date: payDate,
      });

      return {
        payment: { ...payment, payment_date: payDate, payment_date_hijri: payDateHijri, payment_method: 'نقدي', reference_number: refNum, notes, amount },
        booking: { ...booking, paid_amount: newPaid, remaining_amount: newRemaining < 0 ? 0 : newRemaining },
      };
    },
    onSuccess: ({ payment, booking }) => {
      queryClient.invalidateQueries({ queryKey: ['cashTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('تم تسجيل السداد بنجاح');
      // Store receipt data for display — do NOT open print window yet
      setSavedReceiptData({ payment, booking, hallSettings });
      setDialogMode(null);
    },
  });

  // Update manual cash transaction
  const updateManual = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CashTransaction.update(id, {
      type: data.type,
      reference_label: data.reference_label,
      amount: parseFloat(data.amount),
      transaction_date: data.transaction_date,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashTransactions'] });
      setDialogMode(null);
      setEditTransactionId(null);
      setConfirmEdit(false);
      toast.success('تم التعديل بنجاح');
    },
  });

  // Delete cash transaction
  const deleteTransaction = useMutation({
    mutationFn: (id) => base44.entities.CashTransaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashTransactions'] });
      setDeleteTransactionId(null);
      toast.success('تم الحذف بنجاح');
    },
  });

  // Transfer between cash and bank
  const transferFunds = useMutation({
    mutationFn: async ({ direction, data }) => {
      const amount = parseFloat(data.amount);
      const userName = user?.full_name || user?.email || '—';
      const date = data.transaction_date;
      if (direction === 'toBank') {
        // من الخزينة إلى البنك: الخزينة تنقص (مصروف)، البنك يزيد (إيراد)
        await base44.entities.CashTransaction.create({
          type: 'مصروف', source: 'تحويل',
          reference_label: `تحويل إلى البنك - بواسطة: ${userName}`,
          amount, transaction_date: date,
        });
        await base44.entities.BankTransaction.create({
          type: 'إيراد', source: 'تحويل',
          reference_label: `تحويل من الخزينة - بواسطة: ${userName}`,
          amount, transaction_date: date,
        });
      } else {
        // من البنك إلى الخزينة: البنك ينقص (مصروف)، الخزينة تزيد (إيراد)
        await base44.entities.BankTransaction.create({
          type: 'مصروف', source: 'تحويل',
          reference_label: `تحويل إلى الخزينة - بواسطة: ${userName}`,
          amount, transaction_date: date,
        });
        await base44.entities.CashTransaction.create({
          type: 'إيراد', source: 'تحويل',
          reference_label: `تحويل من البنك - بواسطة: ${userName}`,
          amount, transaction_date: date,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setTransferConfirm(null);
      setDialogMode(null);
      setTransferForm({ amount: '', transaction_date: todayGreg, transaction_date_hijri: gregorianToHijri(todayGreg) });
      toast.success('تم التحويل بنجاح');
    },
  });

  const income = transactions.filter(t => t.type === 'إيراد').reduce((s, t) => s + (t.amount || 0), 0);
  const expense = transactions.filter(t => t.type === 'مصروف').reduce((s, t) => s + (t.amount || 0), 0);
  const balance = income - expense;

  const openDialog = (mode, transaction = null) => {
    setSavedReceiptData(null);
    if (mode === 'manual') {
      setForm({ type: 'إيراد', amount: '', reference_label: '', transaction_date: todayGreg, transaction_date_hijri: gregorianToHijri(todayGreg) });
      setEditTransactionId(null);
    } else if (mode === 'edit') {
      setForm({
        type: transaction.type,
        amount: String(transaction.amount || ''),
        reference_label: transaction.reference_label || '',
        transaction_date: transaction.transaction_date,
        transaction_date_hijri: gregorianToHijri(transaction.transaction_date),
      });
      setEditTransactionId(transaction.id);
    } else if (mode === 'transfer') {
      setTransferForm({ amount: '', transaction_date: todayGreg, transaction_date_hijri: gregorianToHijri(todayGreg) });
    } else {
      setBookingPayForm({ selectedBookingId: '', amount: '', payment_date: todayGreg, payment_date_hijri: gregorianToHijri(todayGreg), reference_number: '', notes: '' });
    }
    setDialogMode(mode);
  };

  const handlePrintReceipt = () => {
    if (!savedReceiptData) return;
    const { payment, booking, hallSettings: hs } = savedReceiptData;
    const html = buildPaymentReceipt(hs, booking, payment, 'cash');
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
  };

  return (
    <div>
      <PageHeader
        title="الخزينة"
        description="إدارة النقدية"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openDialog('booking')} className="gap-1">
              <Users className="w-4 h-4" /> سداد من عميل
            </Button>
            <Button onClick={() => openDialog('manual')} className="gap-1">
              <Plus className="w-4 h-4" /> عملية يدوية
            </Button>
            <Button variant="secondary" onClick={() => openDialog('transfer')} className="gap-1">
              <ArrowLeftRight className="w-4 h-4" /> تحويل
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard title="إجمالي الإيرادات" value={formatCurrency(income)} icon={TrendingUp} className="bg-card" />
        <StatCard title="إجمالي المصروفات" value={formatCurrency(expense)} icon={TrendingDown} className="bg-card" />
        <StatCard title="الرصيد الحالي" value={formatCurrency(balance)} icon={Wallet} className="bg-card" />
      </div>

      {/* Receipt Preview Banner (shown after booking payment saved) */}
      {savedReceiptData && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="font-semibold text-green-800">تم حفظ السداد بنجاح</p>
              <p className="text-sm text-green-600">
                سداد {formatCurrency(savedReceiptData.payment.amount)} من {savedReceiptData.booking.customer_name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePrintReceipt} className="bg-green-700 hover:bg-green-800 gap-1">
              <Receipt className="w-4 h-4" /> طباعة الإيصال
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSavedReceiptData(null)}>إغلاق</Button>
          </div>
        </div>
      )}

      {transactions.length === 0 ? (
        <EmptyState title="لا توجد عمليات" description="سيتم تسجيل عمليات الخزينة هنا" />
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">المصدر</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">
                      {t.transaction_date ? (
                        <div>
                          <div className="font-medium">{gregorianToHijri(t.transaction_date)} هـ</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(t.transaction_date), 'dd/MM/yyyy')} م</div>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={t.type === 'إيراد' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{t.source}</TableCell>
                    <TableCell className="text-sm">{t.reference_label || '-'}</TableCell>
                    <TableCell className="font-medium text-sm">{formatCurrency(t.amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog('edit', t)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTransactionId(t.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* === Manual Transaction Dialog === */}
      <Dialog open={dialogMode === 'manual' || dialogMode === 'edit'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{dialogMode === 'edit' ? 'تعديل عملية خزينة' : 'عملية خزينة يدوية'}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (dialogMode === 'edit') { setConfirmEdit(true); } else { createManual.mutate(form); } }} className="space-y-4">
            <div className="space-y-2">
              <Label>النوع</Label>
              <div className="flex gap-2">
                <Button type="button" variant={form.type === 'إيراد' ? 'default' : 'outline'} className="flex-1" onClick={() => setForm({ ...form, type: 'إيراد' })}>إيراد</Button>
                <Button type="button" variant={form.type === 'مصروف' ? 'default' : 'outline'} className="flex-1" onClick={() => setForm({ ...form, type: 'مصروف' })}>مصروف</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>المبلغ *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Input value={form.reference_label} onChange={e => setForm({ ...form, reference_label: e.target.value })} />
            </div>
            <HijriDatePicker
              label="التاريخ"
              value={{ hijri: form.transaction_date_hijri, gregorian: form.transaction_date }}
              onChange={({ hijri, gregorian }) => setForm(f => ({ ...f, transaction_date: gregorian, transaction_date_hijri: hijri }))}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogMode(null)}>إلغاء</Button>
              <Button type="submit" disabled={createManual.isPending || updateManual.isPending}>
                {dialogMode === 'edit' ? 'تعديل' : 'حفظ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* === Booking Customer Payment Dialog === */}
      <Dialog open={dialogMode === 'booking'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              سداد من حساب عميل — الخزينة
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={e => {
              e.preventDefault();
              if (!selectedBooking) return;
              createBookingPayment.mutate({
                booking: selectedBooking,
                paymentAmount: bookingPayForm.amount,
                payDate: bookingPayForm.payment_date,
                payDateHijri: bookingPayForm.payment_date_hijri,
                refNum: bookingPayForm.reference_number,
                notes: bookingPayForm.notes,
              });
            }}
            className="space-y-4"
          >
            {/* Client selector */}
            <div className="space-y-2">
              <Label>اختر العميل (الحجوزات التي بها متبقي) *</Label>
              <Select
                value={bookingPayForm.selectedBookingId}
                onValueChange={id => {
                  const bk = pendingBookings.find(b => b.id === id);
                  setBookingPayForm(f => ({
                    ...f,
                    selectedBookingId: id,
                    amount: bk ? String(bk.remaining_amount || '') : '',
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر عميلاً..." />
                </SelectTrigger>
                <SelectContent>
                  {pendingBookings.length === 0 ? (
                    <SelectItem value="__none__" disabled>لا يوجد عملاء بمبالغ متبقية</SelectItem>
                  ) : pendingBookings.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.customer_name} — {b.booking_number} — متبقي: {formatCurrency(b.remaining_amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {selectedBooking && (
              <div className="p-3 rounded-xl bg-muted/50 border text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">نوع المناسبة:</span>
                  <span className="font-medium">{selectedBooking.event_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المبلغ الإجمالي:</span>
                  <span className="font-medium">{formatCurrency(selectedBooking.final_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المسدد سابقاً:</span>
                  <span className="font-medium text-green-700">{formatCurrency(selectedBooking.paid_amount)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-muted-foreground">المتبقي:</span>
                  <span className="text-red-600">{formatCurrency(selectedBooking.remaining_amount)}</span>
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label>المبلغ المسدد *</Label>
              <Input
                type="number"
                value={bookingPayForm.amount}
                onChange={e => setBookingPayForm(f => ({ ...f, amount: e.target.value }))}
                required
                dir="ltr"
                max={selectedBooking?.remaining_amount}
              />
              {selectedBooking && parseFloat(bookingPayForm.amount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  المتبقي بعد هذه الدفعة:{' '}
                  <span className="font-semibold text-foreground">
                    {formatCurrency((selectedBooking.remaining_amount || 0) - parseFloat(bookingPayForm.amount))}
                  </span>
                </p>
              )}
            </div>

            {/* Date */}
            <HijriDatePicker
              label="تاريخ السداد"
              value={{ hijri: bookingPayForm.payment_date_hijri, gregorian: bookingPayForm.payment_date }}
              onChange={({ hijri, gregorian }) => setBookingPayForm(f => ({ ...f, payment_date: gregorian, payment_date_hijri: hijri }))}
            />

            {/* Reference */}
            <div className="space-y-2">
              <Label>رقم المرجع (اختياري)</Label>
              <Input value={bookingPayForm.reference_number} onChange={e => setBookingPayForm(f => ({ ...f, reference_number: e.target.value }))} />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogMode(null)}>إلغاء</Button>
              <Button type="submit" disabled={createBookingPayment.isPending || !selectedBooking}>
                {createBookingPayment.isPending ? 'جاري الحفظ...' : 'حفظ وعرض الإيصال'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* === Transfer Dialog === */}
      <Dialog open={dialogMode === 'transfer'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" /> تحويل بين الخزينة والبنك
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>قيمة التحويل *</Label>
              <Input
                type="number"
                value={transferForm.amount}
                onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value }))}
                required
                dir="ltr"
                placeholder="0.00"
              />
            </div>
            <HijriDatePicker
              label="تاريخ التحويل"
              value={{ hijri: transferForm.transaction_date_hijri, gregorian: transferForm.transaction_date }}
              onChange={({ hijri, gregorian }) => setTransferForm(f => ({ ...f, transaction_date: gregorian, transaction_date_hijri: hijri }))}
            />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                disabled={!transferForm.amount || transferFunds.isPending}
                onClick={() => setTransferConfirm('toBank')}
                className="gap-1"
              >
                <Building2 className="w-4 h-4" /> إيداع بنكي
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!transferForm.amount || transferFunds.isPending}
                onClick={() => setTransferConfirm('toCash')}
                className="gap-1"
              >
                <Wallet className="w-4 h-4" /> سحب من البنك
              </Button>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={() => setDialogMode(null)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Edit Confirmation === */}
      <AlertDialog open={confirmEdit} onOpenChange={setConfirmEdit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد التعديل</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من تعديل هذه العملية؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => updateManual.mutate({ id: editTransactionId, data: form })}>
              تأكيد التعديل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* === Delete Confirmation === */}
      <AlertDialog open={!!deleteTransactionId} onOpenChange={() => setDeleteTransactionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذه العملية؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTransaction.mutate(deleteTransactionId)} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* === Transfer Confirmation === */}
      <AlertDialog open={!!transferConfirm} onOpenChange={() => setTransferConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد التحويل</AlertDialogTitle>
            <AlertDialogDescription>
              {transferConfirm === 'toBank'
                ? `هل أنت متأكد من تحويل ${formatCurrency(parseFloat(transferForm.amount) || 0)} من الخزينة إلى البنك؟`
                : transferConfirm === 'toCash'
                ? `هل أنت متأكد من تحويل ${formatCurrency(parseFloat(transferForm.amount) || 0)} من البنك إلى الخزينة؟`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => transferFunds.mutate({ direction: transferConfirm, data: transferForm })}>
              تأكيد التحويل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}