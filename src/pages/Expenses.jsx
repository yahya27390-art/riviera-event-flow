import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Receipt, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import HijriDatePicker from '@/components/shared/HijriDatePicker';
import { gregorianToHijri } from '@/lib/hijri';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EXPENSE_TYPES = [
  'كهرباء', 'عمالة', 'صيانة', 'رواتب', 'إدارية', 'طارئة', 'بنكية',
  'تجهيز فرح', 'زهور وديكور', 'كماليات', 'مشتريات', 'أخرى'
];

const TYPE_COLORS = {
  'كهرباء': 'bg-amber-100 text-amber-700 border-amber-200',
  'عمالة': 'bg-blue-100 text-blue-700 border-blue-200',
  'صيانة': 'bg-purple-100 text-purple-700 border-purple-200',
  'رواتب': 'bg-green-100 text-green-700 border-green-200',
  'إدارية': 'bg-slate-100 text-slate-700 border-slate-200',
  'طارئة': 'bg-red-100 text-red-700 border-red-200',
  'بنكية': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'تجهيز فرح': 'bg-pink-100 text-pink-700 border-pink-200',
  'زهور وديكور': 'bg-rose-100 text-rose-700 border-rose-200',
  'كماليات': 'bg-violet-100 text-violet-700 border-violet-200',
  'مشتريات': 'bg-orange-100 text-orange-700 border-orange-200',
};

const todayGreg = new Date().toISOString().split('T')[0];
const emptyForm = {
  expense_type: 'تجهيز فرح', amount: '', payment_method: 'نقدي', description: '',
  expense_date: todayGreg,
  expense_date_hijri: gregorianToHijri(todayGreg),
};

export default function Expenses() {
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [form, setForm] = useState(emptyForm);
  const [editExpenseId, setEditExpenseId] = useState(null);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-created_date', 500),
  });

  const create = useMutation({
    mutationFn: async (data) => {
      const expense = await base44.entities.Expense.create({ ...data, amount: parseFloat(data.amount) });
      if (data.payment_method === 'نقدي') {
        await base44.entities.CashTransaction.create({
          type: 'مصروف', source: 'مصروف', reference_id: expense.id,
          reference_label: `${data.expense_type}${data.description ? ' - ' + data.description : ''}`,
          amount: parseFloat(data.amount), transaction_date: data.expense_date,
        });
      } else {
        await base44.entities.BankTransaction.create({
          type: 'مصروف', source: 'مصروف', reference_id: expense.id,
          reference_label: `${data.expense_type}${data.description ? ' - ' + data.description : ''}`,
          amount: parseFloat(data.amount), transaction_date: data.expense_date,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setShowDialog(false);
      setForm(emptyForm);
      toast.success('تم تسجيل المصروف');
    },
  });

  const deleteExpense = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setDeleteId(null); toast.success('تم حذف المصروف'); },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Expense.update(id, {
        expense_type: data.expense_type,
        amount: parseFloat(data.amount),
        payment_method: data.payment_method,
        description: data.description,
        expense_date: data.expense_date,
        edited_by: user?.full_name || user?.email || '—',
      });
      // مزامنة المعاملة المرتبطة (حذف القديمة وإنشاء الجديدة)
      await base44.entities.CashTransaction.deleteMany({ reference_id: id, source: 'مصروف' });
      await base44.entities.BankTransaction.deleteMany({ reference_id: id, source: 'مصروف' });
      const label = `${data.expense_type}${data.description ? ' - ' + data.description : ''}`;
      if (data.payment_method === 'نقدي') {
        await base44.entities.CashTransaction.create({
          type: 'مصروف', source: 'مصروف', reference_id: id,
          reference_label: label, amount: parseFloat(data.amount), transaction_date: data.expense_date,
        });
      } else {
        await base44.entities.BankTransaction.create({
          type: 'مصروف', source: 'مصروف', reference_id: id,
          reference_label: label, amount: parseFloat(data.amount), transaction_date: data.expense_date,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setShowDialog(false);
      setEditExpenseId(null);
      setConfirmEdit(false);
      toast.success('تم تعديل المصروف');
    },
  });

  const [searchTerm, setSearchTerm] = useState('');

  const filteredExpenses = expenses.filter(e => {
    const matchesType = filterType === 'all' || e.expense_type === filterType;
    const matchesSearch = !searchTerm || 
      (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.expense_number && e.expense_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.expense_type && e.expense_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      String(e.amount).includes(searchTerm);
    return matchesType && matchesSearch;
  });
  const total = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  // Summary by type
  const summaryByType = EXPENSE_TYPES.reduce((acc, type) => {
    const amount = expenses.filter(e => e.expense_type === type).reduce((s, e) => s + (e.amount || 0), 0);
    if (amount > 0) acc[type] = amount;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="سجل المصروفات التشغيلية"
        description={`إجمالي المصروفات: ${formatCurrency(expenses.reduce((s, e) => s + (e.amount || 0), 0))} (${expenses.length} سند صرف معتمد)`}
        actions={<Button onClick={() => { setForm(emptyForm); setEditExpenseId(null); setShowDialog(true); }} className="bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20"><Plus className="w-4 h-4 ml-2" /> تسجيل مصروف جديد</Button>}
      />

      {/* Summary Cards by Type */}
      {Object.keys(summaryByType).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
          {Object.entries(summaryByType).map(([type, amount]) => (
            <Card key={type} className={`border border-border/60 shadow-sm cursor-pointer hover:shadow-md transition-all ${filterType === type ? 'ring-2 ring-rose-500 bg-rose-50/50 dark:bg-rose-950/20' : ''}`} onClick={() => setFilterType(filterType === type ? 'all' : type)}>
              <CardContent className="p-3.5">
                <Badge variant="outline" className={`text-xs mb-1.5 ${TYPE_COLORS[type] || 'bg-muted text-muted-foreground'}`}>{type}</Badge>
                <p className="font-black text-sm text-foreground">{formatCurrency(amount)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Input
            placeholder="بحث بالوصف، رقم السند، أو المبلغ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 rounded-xl bg-card border-border/70 text-sm"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-52 h-10 rounded-xl bg-card border-border/70">
            <SelectValue placeholder="تصفية حسب النوع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع البنود ({expenses.length})</SelectItem>
            {EXPENSE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterType !== 'all' || searchTerm) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterType('all'); setSearchTerm(''); }} className="text-xs text-muted-foreground">
            إعادة تعيين
          </Button>
        )}
      </div>

      <div className="text-xs font-bold text-muted-foreground mb-3 px-1">
        المعروض: {filteredExpenses.length} سند صرف • إجمالي التصفية: <span className="text-rose-600 dark:text-rose-400 font-black">{formatCurrency(total)}</span>
      </div>

      {filteredExpenses.length === 0 ? (
        <EmptyState icon={Receipt} title="لا توجد مصروفات مطابقة" description="جرب تغيير معايير البحث أو التصفية" />
      ) : (
        <Card className="border border-border/70 shadow-sm overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-right">رقم السند</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">البند</TableHead>
                  <TableHead className="text-right">البيان / الوصف</TableHead>
                  <TableHead className="text-right">وسيلة الصرف</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map(e => (
                  <TableRow key={e.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs font-mono font-bold text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-md bg-muted border border-border/60">
                        {e.expense_number || `EXP-${e.id.slice(0, 6)}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.expense_date ? (
                        <div>
                          <div className="font-bold text-xs">{gregorianToHijri(e.expense_date)} هـ</div>
                          <div className="text-[11px] text-muted-foreground font-mono">({format(new Date(e.expense_date), 'dd/MM/yyyy')} م)</div>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={`font-bold text-xs ${TYPE_COLORS[e.expense_type] || 'bg-muted text-muted-foreground'}`}>{e.expense_type}</Badge></TableCell>
                    <TableCell className="text-sm max-w-sm">
                      <div className="font-medium text-foreground">{e.description || '-'}</div>
                      {e.edited_by && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">سُجل بواسطة: {e.edited_by}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={e.payment_method === 'نقدي' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-bold' : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 font-bold'}>
                        {e.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-black text-sm text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(e.amount)}</TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            setForm({
                              expense_type: e.expense_type,
                              amount: String(e.amount || ''),
                              payment_method: e.payment_method,
                              description: e.description || '',
                              expense_date: e.expense_date,
                              expense_date_hijri: gregorianToHijri(e.expense_date),
                            });
                            setEditExpenseId(e.id);
                            setShowDialog(true);
                          }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(e.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) setEditExpenseId(null); }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl glass-card">
          <div className="p-5 pb-4 bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 text-white border-b border-rose-800/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-white">
                    {editExpenseId ? 'تعديل سند مصروف' : 'تسجيل مصروف تشغيلي جديد'}
                  </DialogTitle>
                  <p className="text-[11px] text-rose-200/80 font-medium">سند صرف معتمد لقاعة قمة الريف 🇸🇦</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); if (editExpenseId) { setConfirmEdit(true); } else { create.mutate(form); } }} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            
            {/* Category Selector */}
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
                      form.expense_type === t
                        ? "bg-rose-600 text-white shadow-sm font-black scale-105"
                        : "bg-card text-muted-foreground hover:text-foreground border border-border/60"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-foreground">المبلغ المصروف *</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  value={form.amount} 
                  onChange={e => setForm({ ...form, amount: e.target.value })} 
                  required 
                  dir="ltr" 
                  placeholder="0.00"
                  className="h-11 text-base font-black text-left pl-3 pr-12 rounded-2xl bg-card border-rose-500/30 text-rose-600 dark:text-rose-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                  ر.س
                </span>
              </div>
            </div>

            {/* Payment Method Segmented */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-foreground">وسيلة الصرف</Label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/60">
                {[
                  { id: 'نقدي', label: 'نقدي كاش 💵' },
                  { id: 'تحويل بنكي', label: 'تحويل بنكي 🏦' },
                  { id: 'مدى', label: 'شبكة مدى 💳' },
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

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-foreground">بيان وتفاصيل المصروف</Label>
              <Textarea 
                value={form.description} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
                rows={2} 
                placeholder="مثال: فاتورة صيانة تكييف الصالة الكبرى، شراء بخور وعطور..."
                className="rounded-2xl bg-card text-xs border-border/80" 
              />
            </div>

            {/* Date */}
            <HijriDatePicker
              label="تاريخ الصرف"
              value={{ hijri: form.expense_date_hijri, gregorian: form.expense_date }}
              onChange={({ hijri, gregorian }) => setForm({ ...form, expense_date: gregorian, expense_date_hijri: hijri })}
            />

            <DialogFooter className="pt-3 border-t border-border flex flex-row items-center justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl h-10 px-4 text-xs">
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={create.isPending || updateExpense.isPending}
                className="rounded-xl h-10 px-6 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black text-xs shadow-md shadow-rose-500/20 active:scale-95 transition-transform"
              >
                {editExpenseId ? 'تأكيد التعديل' : (create.isPending ? 'جاري الحفظ...' : 'حفظ سند المصروف')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا المصروف؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteExpense.mutate(deleteId)} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* تأكيد التعديل */}
      <AlertDialog open={confirmEdit} onOpenChange={setConfirmEdit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد التعديل</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من تعديل هذا المصروف؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => updateExpense.mutate({ id: editExpenseId, data: form })}>
              تأكيد التعديل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}