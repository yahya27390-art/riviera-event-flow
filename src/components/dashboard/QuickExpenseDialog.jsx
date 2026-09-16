import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt } from 'lucide-react';
import { toast } from 'sonner';

const EXPENSE_TYPES = [
  'كهرباء', 'عمالة', 'صيانة', 'رواتب', 'إدارية', 'طارئة', 'بنكية',
  'تجهيز فرح', 'زهور وديكور', 'كماليات', 'مشتريات', 'أخرى'
];

export default function QuickExpenseDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    expense_type: 'تجهيز فرح',
    amount: '',
    payment_method: 'نقدي',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
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
      toast.success('تم تسجيل المصروف');
      onClose();
      setForm({ expense_type: 'تجهيز فرح', amount: '', payment_method: 'نقدي', description: '', expense_date: new Date().toISOString().split('T')[0] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('الرجاء إدخال المبلغ');
      return;
    }
    create.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-accent" /> مصروف جديد
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">نوع المصروف</Label>
            <Select value={form.expense_type} onValueChange={v => setForm({ ...form, expense_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">المبلغ *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required dir="ltr" placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">طريقة الدفع</Label>
              <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="نقدي">نقدي → الخزينة</SelectItem>
                  <SelectItem value="بنك">بنك</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">الوصف</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="تفاصيل إضافية..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">التاريخ</Label>
            <Input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'جاري...' : 'حفظ'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}