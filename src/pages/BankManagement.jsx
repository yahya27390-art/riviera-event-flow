import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, TrendingUp, TrendingDown, Pencil, Trash2, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import HijriDatePicker from '@/components/shared/HijriDatePicker';
import { gregorianToHijri } from '@/lib/hijri';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const EXPENSE_TYPES = [
  'كهرباء', 'عمالة', 'صيانة', 'رواتب', 'إدارية', 'طارئة', 'بنكية',
  'تجهيز فرح', 'زهور وديكور', 'كماليات', 'مشتريات', 'أخرى'
];

export default function BankManagement() {
  const [showDialog, setShowDialog] = useState(false);
  const todayGreg = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ 
    type: 'إيراد', 
    expense_type: 'تجهيز فرح',
    amount: '', 
    reference_label: '', 
    payment_method: 'مدى', 
    transaction_date: todayGreg, 
    transaction_date_hijri: gregorianToHijri(todayGreg) 
  });
  const [editTransactionId, setEditTransactionId] = useState(null);
  const [deleteTransactionId, setDeleteTransactionId] = useState(null);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: transactions = [] } = useQuery({
    queryKey: ['bankTransactions'],
    queryFn: () => base44.entities.BankTransaction.list('-created_date', 500),
  });

  const create = useMutation({
    mutationFn: async (data) => {
      const amount = parseFloat(data.amount);
      if (data.type === 'مصروف') {
        // 1. Create official Expense record
        const expense = await base44.entities.Expense.create({
          expense_type: data.expense_type || 'أخرى',
          amount,
          payment_method: data.payment_method === 'نقدي' ? 'نقدي' : (data.payment_method || 'تحويل بنكي'),
          description: data.reference_label || '',
          expense_date: data.transaction_date,
          edited_by: user?.full_name || user?.email || '—',
        });

        // 2. Create BankTransaction linked to the Expense
        await base44.entities.BankTransaction.create({
          type: 'مصروف',
          source: 'مصروف',
          reference_id: expense.id,
          reference_label: `${data.expense_type || 'مصروف'}${data.reference_label ? ' - ' + data.reference_label : ''}`,
          payment_method: data.payment_method || 'مدى',
          amount,
          transaction_date: data.transaction_date,
        });
      } else {
        // Regular Bank Income
        await base44.entities.BankTransaction.create({
          type: 'إيراد',
          source: 'يدوي',
          reference_label: data.reference_label || 'إيراد بنكي',
          payment_method: data.payment_method || 'مدى',
          amount,
          transaction_date: data.transaction_date,
        });
      }
    },
    onSuccess: () => { 
      queryClient.invalidateQueries(); 
      setShowDialog(false); 
      toast.success('تمت العملية وحفظ سند المصروف بنجاح'); 
    },
    onError: (err) => {
      console.error('Error creating bank transaction:', err);
      toast.error('تعذر حفظ العملية: ' + (err?.message || 'يرجى المحاولة مرة أخرى'));
    }
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, data }) => {
      const amount = parseFloat(data.amount);
      const currentTx = transactions.find(t => t.id === id);

      await base44.entities.BankTransaction.update(id, {
        type: data.type,
        reference_label: data.reference_label,
        payment_method: data.payment_method,
        amount,
        transaction_date: data.transaction_date,
      });

      if (data.type === 'مصروف') {
        if (currentTx?.reference_id && (currentTx.source === 'مصروف' || currentTx.type === 'مصروف')) {
          await base44.entities.Expense.update(currentTx.reference_id, {
            expense_type: data.expense_type || 'أخرى',
            amount,
            payment_method: data.payment_method || 'تحويل بنكي',
            description: data.reference_label || '',
            expense_date: data.transaction_date,
            edited_by: user?.full_name || user?.email || '—',
          }).catch(() => {});
        } else {
          const exp = await base44.entities.Expense.create({
            expense_type: data.expense_type || 'أخرى',
            amount,
            payment_method: data.payment_method || 'تحويل بنكي',
            description: data.reference_label || '',
            expense_date: data.transaction_date,
            edited_by: user?.full_name || user?.email || '—',
          });
          await base44.entities.BankTransaction.update(id, { reference_id: exp.id, source: 'مصروف' });
        }
      } else if (currentTx?.reference_id && currentTx.source === 'مصروف') {
        await base44.entities.Expense.delete(currentTx.reference_id).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setShowDialog(false);
      setEditTransactionId(null);
      setConfirmEdit(false);
      toast.success('تم التعديل ومزامنة المصروف بنجاح');
    },
    onError: (err) => {
      console.error('Error updating bank transaction:', err);
      toast.error('تعذر تعديل العملية: ' + (err?.message || 'يرجى المحاولة مرة أخرى'));
    }
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id) => {
      const tx = transactions.find(t => t.id === id);
      if (tx?.reference_id && tx.source === 'مصروف') {
        await base44.entities.Expense.delete(tx.reference_id).catch(() => {});
      }
      await base44.entities.BankTransaction.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setDeleteTransactionId(null);
      toast.success('تم الحذف بنجاح');
    },
  });

  const income = transactions.filter(t => t.type === 'إيراد').reduce((s, t) => s + (t.amount || 0), 0);
  const expense = transactions.filter(t => t.type === 'مصروف').reduce((s, t) => s + (t.amount || 0), 0);
  const balance = income - expense;

  return (
    <div>
      <PageHeader
        title="البنك"
        description="إدارة الحسابات البنكية"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => {
              setForm({ type: 'مصروف', expense_type: 'تجهيز فرح', amount: '', reference_label: '', payment_method: 'مدى', transaction_date: todayGreg, transaction_date_hijri: gregorianToHijri(todayGreg) });
              setEditTransactionId(null);
              setShowDialog(true);
            }} className="bg-rose-600 hover:bg-rose-700 text-white gap-1 shadow-md shadow-rose-600/20 font-bold">
              <Receipt className="w-4 h-4 ml-1" /> تسجيل مصروف بنكي
            </Button>
            <Button onClick={() => {
              setForm({ type: 'إيراد', expense_type: 'تجهيز فرح', amount: '', reference_label: '', payment_method: 'مدى', transaction_date: todayGreg, transaction_date_hijri: gregorianToHijri(todayGreg) });
              setEditTransactionId(null);
              setShowDialog(true);
            }} className="gap-1">
              <Plus className="w-4 h-4 ml-1" /> عملية جديدة
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard title="إيرادات البنك" value={formatCurrency(income)} icon={TrendingUp} className="bg-card" />
        <StatCard title="مصروفات البنك" value={formatCurrency(expense)} icon={TrendingDown} className="bg-card" />
        <StatCard title="رصيد البنك" value={formatCurrency(balance)} icon={Building2} className="bg-card" />
      </div>

      {transactions.length === 0 ? (
        <EmptyState title="لا توجد عمليات بنكية" />
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الطريقة</TableHead>
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
                    <TableCell className="text-sm">{t.payment_method || '-'}</TableCell>
                    <TableCell className="text-sm">{t.reference_label || '-'}</TableCell>
                    <TableCell className="font-medium text-sm">{formatCurrency(t.amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          const isExp = t.type === 'مصروف';
                          setForm({
                            type: t.type,
                            expense_type: isExp ? (t.reference_label?.split(' - ')[0] || 'تجهيز فرح') : 'تجهيز فرح',
                            amount: String(t.amount || ''),
                            reference_label: t.reference_label || '',
                            payment_method: t.payment_method || 'مدى',
                            transaction_date: t.transaction_date,
                            transaction_date_hijri: gregorianToHijri(t.transaction_date),
                          });
                          setEditTransactionId(t.id);
                          setShowDialog(true);
                        }}>
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

      {/* === Bank Transaction / Expense Dialog === */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) setEditTransactionId(null); }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl glass-card">
          <div className={cn(
            "p-5 pb-4 text-white border-b",
            form.type === 'مصروف' 
              ? "bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 border-rose-800/40"
              : "bg-gradient-to-r from-cyan-950 via-cyan-900 to-slate-900 border-cyan-800/40"
          )}>
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center border",
                form.type === 'مصروف'
                  ? "bg-rose-500/20 border-rose-400/40 text-rose-400"
                  : "bg-cyan-500/20 border-cyan-400/40 text-cyan-400"
              )}>
                {form.type === 'مصروف' ? <Receipt className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">
                  {editTransactionId 
                    ? (form.type === 'مصروف' ? 'تعديل سند مصروف بنكي' : 'تعديل إيراد بنكي') 
                    : (form.type === 'مصروف' ? 'تسجيل مصروف بنكي تشغيلي' : 'تسجيل إيراد بنكي جديد')}
                </DialogTitle>
                <p className="text-[11px] text-white/80 font-medium">سند معتمد لقاعة قمة الريف 🇸🇦</p>
              </div>
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); if (editTransactionId) { setConfirmEdit(true); } else { create.mutate(form); } }} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-xs font-black text-foreground">نوع العملية</Label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant={form.type === 'إيراد' ? 'default' : 'outline'} 
                  className={cn("flex-1 font-bold", form.type === 'إيراد' && "bg-cyan-700 hover:bg-cyan-800 text-white")}
                  onClick={() => setForm({ ...form, type: 'إيراد' })}
                >
                  إيراد بنكي 🏦
                </Button>
                <Button 
                  type="button" 
                  variant={form.type === 'مصروف' ? 'default' : 'outline'} 
                  className={cn("flex-1 font-bold", form.type === 'مصروف' && "bg-rose-600 hover:bg-rose-700 text-white")}
                  onClick={() => setForm({ ...form, type: 'مصروف' })}
                >
                  مصروف بنكي 🧾
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
                    form.type === 'مصروف' ? "border-rose-500/30 text-rose-600" : "border-cyan-500/30 text-cyan-600"
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                  ر.س
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black text-foreground">طريقة الدفع / القناة</Label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-muted/50 border border-border/60">
                {[
                  { id: 'مدى', label: 'شبكة مدى 💳' },
                  { id: 'تحويل بنكي', label: 'تحويل بنكي 🏦' },
                ].map(pm => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setForm({ ...form, payment_method: pm.id })}
                    className={cn(
                      "py-2 rounded-xl text-xs font-bold transition-all",
                      form.payment_method === pm.id
                        ? "bg-card text-foreground shadow-sm font-black border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black text-foreground">{form.type === 'مصروف' ? 'بيان وتفاصيل المصروف' : 'الوصف والملاحظات'}</Label>
              <Input 
                value={form.reference_label} 
                onChange={e => setForm({ ...form, reference_label: e.target.value })} 
                placeholder={form.type === 'مصروف' ? 'مثال: سداد فاتورة كهرباء، صيانة أجهزة، كماليات...' : 'تفاصيل الإيراد البنكي...'}
                className="rounded-2xl bg-card text-xs border-border/80"
              />
            </div>

            <HijriDatePicker
              label="تاريخ العملية"
              value={{ hijri: form.transaction_date_hijri, gregorian: form.transaction_date }}
              onChange={({ hijri, gregorian }) => setForm(f => ({ ...f, transaction_date: gregorian, transaction_date_hijri: hijri }))}
            />

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">إلغاء</Button>
              <Button 
                type="submit" 
                disabled={create.isPending || updateTransaction.isPending}
                className={cn(
                  "rounded-xl font-black text-white",
                  form.type === 'مصروف' ? "bg-rose-600 hover:bg-rose-700" : "bg-cyan-700 hover:bg-cyan-800"
                )}
              >
                {editTransactionId ? 'حفظ التعديل' : (form.type === 'مصروف' ? 'حفظ سند المصروف' : 'حفظ الإيراد')}
              </Button>
            </DialogFooter>
          </form>
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
            <AlertDialogAction onClick={() => updateTransaction.mutate({ id: editTransactionId, data: form })}>
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
    </div>
  );
}