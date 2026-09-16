import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, User, Phone, Sparkles } from 'lucide-react';
import { generateBookingNumber } from '@/lib/utils/bookingNumber';
import { gregorianToHijri } from '@/lib/hijri';
import HijriDatePicker from '@/components/shared/HijriDatePicker';
import { toast } from 'sonner';

export default function QuickBookingDialog({ open, onClose, presetDate, presetHijri, availableSections }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    event_date: presetDate || '',
    event_date_hijri: presetHijri || '',
    hall_section: availableSections?.[0] || 'رجال فقط',
    base_price: '',
    initial_payment_amount: '',
    initial_payment_method: 'نقدي',
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    enabled: open,
  });

  const suggestedCustomer = useMemo(() => {
    if (!form.customer_phone || form.customer_phone.length < 9) return null;
    return customers.find(c => c.phone === form.customer_phone);
  }, [form.customer_phone, customers]);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const createBooking = useMutation({
    mutationFn: async (data) => {
      const bookingNumber = generateBookingNumber();
      const basePrice = parseFloat(data.base_price) || 0;
      const initialPaid = parseFloat(data.initial_payment_amount) || 0;
      const created = await base44.entities.Booking.create({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        booking_number: bookingNumber,
        event_date: data.event_date,
        event_date_hijri: data.event_date_hijri || gregorianToHijri(data.event_date),
        hall_section: data.hall_section,
        event_type: 'زواج',
        service_type: 'خدمات كاملة',
        status: 'معلق',
        base_price: basePrice,
        items: [],
        discount: 0,
        total_amount: basePrice,
        final_amount: basePrice,
        paid_amount: initialPaid,
        remaining_amount: basePrice - initialPaid,
      });
      if (initialPaid > 0) {
        await base44.entities.Payment.create({
          booking_id: created.id,
          booking_number: bookingNumber,
          amount: initialPaid,
          payment_method: data.initial_payment_method === 'تحويل بنكي' ? 'تحويل بنكي' : 'نقدي',
          payment_date: new Date().toISOString().split('T')[0],
          notes: 'دفعة الحجز الأولى',
        });
        if (data.initial_payment_method === 'نقدي') {
          await base44.entities.CashTransaction.create({
            type: 'إيراد', source: 'حجز', reference_id: created.id,
            reference_label: `دفعة حجز ${bookingNumber}`,
            amount: initialPaid,
            transaction_date: new Date().toISOString().split('T')[0],
          });
        } else {
          await base44.entities.BankTransaction.create({
            type: 'إيراد', source: 'حجز', reference_id: created.id,
            reference_label: `دفعة حجز ${bookingNumber}`,
            amount: initialPaid,
            transaction_date: new Date().toISOString().split('T')[0],
            payment_method: 'تحويل بنكي',
          });
        }
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('تم إنشاء الحجز بنجاح — يمكن إكمال التفاصيل لاحقاً');
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone || !form.event_date) {
      toast.error('الرجاء تعبئة الاسم والجوال والتاريخ');
      return;
    }
    createBooking.mutate(form);
  };

  const sections = availableSections || ['رجال فقط', 'نساء فقط', 'رجال ونساء'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            حجز سريع
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">اسم العميل *</Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={form.customer_name}
                onChange={e => updateField('customer_name', e.target.value)}
                required
                placeholder="الاسم الكامل"
                className="pr-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">رقم الجوال *</Label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={form.customer_phone}
                onChange={e => updateField('customer_phone', e.target.value)}
                required
                dir="ltr"
                placeholder="05xxxxxxxx"
                className="pr-10"
              />
            </div>
            {suggestedCustomer && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-700">عميل موجود: {suggestedCustomer.name}</span>
                <button type="button" onClick={() => updateField('customer_name', suggestedCustomer.name)} className="text-xs font-bold text-blue-600 underline mr-auto">
                  استخدام
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">التاريخ *</Label>
            {presetDate ? (
              <div className="p-3 rounded-xl bg-muted/50 text-sm">
                <span className="font-medium">{form.event_date_hijri || gregorianToHijri(form.event_date)} هـ</span>
                <span className="text-muted-foreground mr-2">({form.event_date})</span>
              </div>
            ) : (
              <HijriDatePicker
                value={{ hijri: form.event_date_hijri, gregorian: form.event_date }}
                onChange={({ hijri, gregorian }) => setForm(prev => ({ ...prev, event_date: gregorian, event_date_hijri: hijri }))}
                placeholder="اختر التاريخ"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">القاعة</Label>
            <Select value={form.hall_section} onValueChange={v => updateField('hall_section', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">قيمة الحجز</Label>
              <Input type="number" value={form.base_price} onChange={e => updateField('base_price', e.target.value)} placeholder="0" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">الدفعة الأولى</Label>
              <Input type="number" value={form.initial_payment_amount} onChange={e => updateField('initial_payment_amount', e.target.value)} placeholder="0" dir="ltr" />
            </div>
          </div>

          {parseFloat(form.initial_payment_amount) > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm">طريقة الدفع</Label>
              <Select value={form.initial_payment_method} onValueChange={v => updateField('initial_payment_method', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="نقدي">نقدي → الخزينة</SelectItem>
                  <SelectItem value="تحويل بنكي">تحويل بنكي → البنك</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button type="submit" disabled={createBooking.isPending} className="w-full" size="lg">
              <Zap className="w-4 h-4 ml-2" />
              {createBooking.isPending ? 'جاري الحفظ...' : 'حجز سريع'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">يمكن إكمال التفاصيل لاحقاً من صفحة الحجوزات</p>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}