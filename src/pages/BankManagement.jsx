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
import { Plus, Building2, TrendingUp, TrendingDown, Pencil, Trash2 } from 'lucide-react';
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

export default function BankManagement() {
  const [showDialog, setShowDialog] = useState(false);
  const todayGreg = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ type: 'إيراد', amount: '', reference_label: '', payment_method: 'مدى', transaction_date: todayGreg, transaction_date_hijri: gregorianToHijri(todayGreg) });
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
    mutationFn: (data) => base44.entities.BankTransaction.create({ ...data, source: 'يدوي', amount: parseFloat(data.amount) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bankTransactions'] }); setShowDialog(false); toast.success('تمت العملية بنجاح'); },
  });

  const updateTransaction = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankTransaction.update(id, {
      type: data.type,
      reference_label: data.reference_label,
      payment_method: data.payment_method,
      amount: parseFloat(data.amount),
      transaction_date: data.transaction_date,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
      setShowDialog(false);
      setEditTransactionId(null);
      setConfirmEdit(false);
      toast.success('تم التعديل بنجاح');
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: (id) => base44.entities.BankTransaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
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
        actions={<Button onClick={() => {
          setForm({ type: 'إيراد', amount: '', reference_label: '', payment_method: 'مدى', transaction_date: todayGreg, transaction_date_hijri: gregorianToHijri(todayGreg) });
          setEditTransactionId(null);
          setShowDialog(true);
        }}><Plus className="w-4 h-4 ml-2" /> عملية جديدة</Button>}
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
                          setForm({
                            type: t.type,
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

      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) setEditTransactionId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editTransactionId ? 'تعديل عملية بنكية' : 'عملية بنكية جديدة'}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (editTransactionId) { setConfirmEdit(true); } else { create.mutate(form); } }} className="space-y-4">
            <div className="space-y-2">
              <Label>النوع</Label>
              <div className="flex gap-2">
                <Button type="button" variant={form.type === 'إيراد' ? 'default' : 'outline'} className="flex-1" onClick={() => setForm({ ...form, type: 'إيراد' })}>إيراد</Button>
                <Button type="button" variant={form.type === 'مصروف' ? 'default' : 'outline'} className="flex-1" onClick={() => setForm({ ...form, type: 'مصروف' })}>مصروف</Button>
              </div>
            </div>
            <div className="space-y-2"><Label>المبلغ</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required dir="ltr" /></div>
            <div className="space-y-2">
              <Label>طريقة الدفع</Label>
              <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="مدى">مدى</SelectItem>
                  <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>الوصف</Label><Input value={form.reference_label} onChange={e => setForm({ ...form, reference_label: e.target.value })} /></div>
            <HijriDatePicker
              label="التاريخ"
              value={{ hijri: form.transaction_date_hijri, gregorian: form.transaction_date }}
              onChange={({ hijri, gregorian }) => setForm({ ...form, transaction_date: gregorian, transaction_date_hijri: hijri })}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
              <Button type="submit" disabled={create.isPending || updateTransaction.isPending}>
                {editTransactionId ? 'تعديل' : 'حفظ'}
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