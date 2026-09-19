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
import { cn } from '@/lib/utils';

const EXPENSE_TYPES = [
  'كهرباء', 'عمالة', 'صيانة', 'رواتب', 'إدارية', 'طارئة', 'بنكية',
  'تجهيز فرح', 'زهور وديكور', 'كماليات', 'مشتريات', 'أخرى'
];

export default function CashManagement() {
  const todayGreg = new Date().toISOString().split('T')[0];

  // Dialog modes: null | 'manual' | 'booking'
  const [dialogMode, setDialogMode] = useState(null);

  // Manual transaction form
  const [form, setForm] = useState({
    type: 'إيراد',
    expense_type: 'تجهيز فرح',
    amount: '',
    reference_label: '',
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

  // Create manual cash transaction (Auto-sync with Expense entity if type is مصروف)
  const createManual = useMutation({
    mutationFn: async (data) => {
      const amount = parseFloat(data.amount);
      if (data.type === 'مصروف') {
        // 1. Create official Expense record
        const expense = await base44.entities.Expense.create({
          expense_type: data.expense_type || 'أخرى',
          amount,
          payment_method: 'نقدي',
          description: data.reference_label || '',
          expense_date: data.transaction_date,
          created_by: user?.full_name || user?.email || '—',
        });

        // 2. Create CashTransaction linked to the Expense
        await base44.entities.CashTransaction.create({
          type: 'مصروف',
          source: 'مصروف',
          reference_id: expense.id,
          reference_label: `${data.expense_type || 'مصروف'}${data.reference_label ? ' - ' + data.reference_label : ''}`,
          amount,
          transaction_date: data.transaction_date,
        });
      } else {
        // Regular Cash Income
        await base44.entities.CashTransaction.create({
          type: 'إيراد',
          source: 'يدوي',
          reference_label: data.reference_label || 'إيراد نقدي يدوي',
          amount,
          transaction_date: data.transaction_date,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setDialogMode(null);
      toast.success('تمت العملية وحفظ سند المصروف بنجاح');
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

  // Update manual cash transaction (and linked Expense if applicable)
  const updateManual = useMutation({
    mutationFn: async ({ id, data }) => {
      const amount = parseFloat(data.amount);
      const currentTx = transactions.find(t => t.id === id);

      // 1. Update the cash transaction
      await base44.entities.CashTransaction.update(id, {
        type: data.type,
        reference_label: data.reference_label,
        amount,
        transaction_date: data.transaction_date,
      });

      // 2. If it is an Expense, update or create/delete the Expense
      if (data.type === 'مصروف') {
        if (currentTx?.reference_id && (currentTx.source === 'مصروف' || currentTx.type === 'مصروف')) {
          await base44.entities.Expense.update(currentTx.reference_id, {
            expense_type: data.expense_type || 'أخرى',
            amount,
            payment_method: 'نقدي',
            description: data.reference_label || '',
            expense_date: data.transaction_date,
            edited_by: user?.full_name || user?.email || '—',
          }).catch(() => {});
        } else {
          // If it wasn't linked before, create the Expense now and link it
          const exp = await base44.entities.Expense.create({
            expense_type: data.expense_type || 'أخرى',
            amount,
            payment_method: 'نقدي',
            description: data.reference_label || '',
            expense_date: data.transaction_date,
            created_by: user?.full_name || user?.email || '—',
          });
          await base44.entities.CashTransaction.update(id, { reference_id: exp.id, source: 'مصروف' });
        }
      } else if (currentTx?.reference_id && currentTx.source === 'مصروف') {
        // Changed from expense to income, delete the old expense
        await base44.entities.Expense.delete(currentTx.reference_id).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setDialogMode(null);
      setEditTransactionId(null);
      setConfirmEdit(false);
      toast.success('تم التعديل ومزامنة المصروف بنجاح');
    },
  });

  // Delete cash transaction (and linked Expense if applicable)
  const deleteTransaction = useMutation({
    mutationFn: async (id) => {
      const tx = transactions.find(t => t.id === id);
      if (tx?.reference_id && tx.source === 'مصروف') {
        await base44.entities.Expense.delete(tx.reference_id).catch(() => {});
      }
      await base44.entities.CashTransaction.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setDeleteTransactionId(null);
      toast.success('تم الحذف بنجاح');
    },
  });

  // Self-heal: ensure past manual cash expenses are registered in Expense entity
  React.useEffect(() => {
    async function syncOrphanExpenses() {
      try {
        const [cashTx, existingExpenses] = await Promise.all([
          base44.entities.CashTransaction.list('-created_date', 500),
          base44.entities.Expense.list('-created_date', 500),
        ]);
        
        const existingIds = new Set((existingExpenses || []).map(e => e.id));

        const orphanCash = (cashTx || []).filter(t => 
          t.type === 'مصروف' && 
          t.source !== 'تحويل' && 
          (!t.reference_id || !existingIds.has(t.reference_id))
        );

        if (orphanCash.length > 0) {
          for (const t of orphanCash) {
            const exp = await base44.entities.Expense.create({
              expense_type: 'أخرى',
              amount: parseFloat(t.amount),
              payment_method: 'نقدي',
              description: t.reference_label || 'مصروف خزينة',
              expense_date: t.transaction_date || todayGreg,
              created_by: 'مزامنة تلقائية',
            });
            await base44.entities.CashTransaction.update(t.id, { reference_id: exp.id, source: 'مصروف' });
          }
          queryClient.invalidateQueries();
        }
      } catch (err) {
        console.warn('Sync orphan cash expenses warning:', err);
      }
    }
    syncOrphanExpenses();
  }, []);

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
      setForm({ type: 'إيراد', expense_type: 'تجهيز فرح', amount: '', reference_label: '', transaction_date: todayGreg, transaction_date_hijri: gregorianToHijri(todayGreg) });
      setEditTransactionId(null);
    } else if (mode === 'expense') {
      setForm({ type: 'مصروف', expense_type: 'تجهيز فرح', amount: '', reference_label: '', transaction_date: todayGreg, transaction_date_hijri: gregorianToHijri(todayGreg) });
      setEditTransactionId(null);
    } else if (mode === 'edit') {
      const isExp = transaction.type === 'مصروف';
      setForm({
        type: transaction.type,
        expense_type: isExp ? (transaction.reference_label?.split(' - ')[0] || 'أخرى') : 'تجهيز فرح',
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
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => openDialog('booking')} className="gap-1">
              <Users className="w-4 h-4" /> سداد من عميل
            </Button>
            <Button onClick={() => openDialog('expense')} className="bg-rose-600 hover:bg-rose-700 text-white gap-1 shadow-md shadow-rose-600/20 font-bold">
              <Receipt className="w-4 h-4" /> تسجيل مصروف نقدي
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
                          <div className="font-bold text-xs">{gregorianToHijri(t.transaction_date)} هـ</div>
                          <div className="text-[11px] text-muted-foreground font-mono">({format(new Date(t.transaction_date), 'dd/MM/yyyy')} م)</div>
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

      {/* === Manual / Expense Transaction Dialog === */}
      <Dialog open={dialogMode === 'manual' || dialogMode === 'edit' || dialogMode === 'expense'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl glass-card">
          <div className={cn(
            "p-5 pb-4 text-white border-b",
            form.type === 'مصروف' 
              ? "bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 border-rose-800/40"
              : "bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 border-emerald-800/40"
          )}>
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center border",
                form.type === 'مصروف'
                  ? "bg-rose-500/20 border-rose-400/40 text-rose-400"
                  : "bg-emerald-500/20 border-emerald-400/40 text-emerald-400"
              )}>
                {form.type === 'مصروف' ? <Receipt className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">
                  {dialogMode === 'edit' 
                    ? (form.type === 'مصروف' ? 'تعديل سند مصروف الخزينة' : 'تعديل إيراد الخزينة') 
                    : (form.type === 'مصروف' ? 'تسجيل مصروف خزينة تشغيلي (نقدي)' : 'تسجيل إيراد خزينة يدوي')}
                </DialogTitle>
                <p className="text-[11px] text-white/80 font-medium">سند معتمد لقاعة قمة الريف 🇸🇦</p>
              </div>
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); if (dialogMode === 'edit') { setConfirmEdit(true); } else { createManual.mutate(form); } }} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-xs font-black text-foreground">نوع العملية</Label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant={form.type === 'إيراد' ? 'default' : 'outline'} 
                  className={cn("flex-1 font-bold", form.type === 'إيراد' && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                  onClick={() => setForm({ ...form, type: 'إيراد' })}
                >
                  إيراد خزينة 💵
                </Button>
                <Button 
                  type="button" 
                  variant={form.type === 'مصروف' ? 'default' : 'outline'} 
                  className={cn("flex-1 font-bold", form.type === 'مصروف' && "bg-rose-600 hover:bg-rose-700 text-white")}
                  onClick={() => setForm({ ...form, type: 'مصروف' })}
                >
                  مصروف خزينة 🧾
                </Button>
              </div>
            </div>

            {form.type === 'مصروف' && (
              <div className="space-y-2">
                <Label className="text-xs font-black text-foreground">نوع وبند المصروف</Label>
                <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-muted/40 border border-border/60">
                  {EXPENSE_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, expense_type: t })}
                      className={cn(
                        "text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all",
                        (form.expense_type || 'تجهيز فرح') === t
                          ? "bg-rose-600 text-white shadow-sm font-black scale-105"
                          : "bg-card text-muted-foreground hover:text-foreground border border-border/60"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-black text-foreground">المبلغ *</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  value={form.amount} 
                  onChange={e => setForm({ ...form, amount: e.target.value })} 
                  required 
                  dir="ltr" 
                  placeholder="0.00"
                  className={cn(
                    "h-11 text-base font-black text-left pl-3 pr-12 rounded-2xl bg-card",
                    form.type === 'مصروف' ? "border-rose-500/30 text-rose-600" : "border-emerald-500/30 text-emerald-600"
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                  ر.س
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black text-foreground">{form.type === 'مصروف' ? 'بيان وتفاصيل المصروف' : 'الوصف والملاحظات'}</Label>
              <Input 
                value={form.reference_label} 
                onChange={e => setForm({ ...form, reference_label: e.target.value })} 
                placeholder={form.type === 'مصروف' ? 'مثال: فاتورة صيانة تكييف، شراء بخور، دفعة عمالة...' : 'تفاصيل الإيراد...'}
                className="rounded-2xl bg-card text-xs border-border/80"
              />
            </div>

            <HijriDatePicker
              label="تاريخ العملية"
              value={{ hijri: form.transaction_date_hijri, gregorian: form.transaction_date }}
              onChange={({ hijri, gregorian }) => setForm(f => ({ ...f, transaction_date: gregorian, transaction_date_hijri: hijri }))}
            />

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogMode(null)} className="rounded-xl">إلغاء</Button>
              <Button 
                type="submit" 
                disabled={createManual.isPending || updateManual.isPending}
                className={cn(
                  "rounded-xl font-black text-white",
                  form.type === 'مصروف' ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                {dialogMode === 'edit' ? 'حفظ التعديل' : (form.type === 'مصروف' ? 'حفظ سند المصروف' : 'حفظ الإيراد')}
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