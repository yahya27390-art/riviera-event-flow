import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import { toast } from 'sonner';
import HijriDatePicker from '@/components/shared/HijriDatePicker';
import { gregorianToHijri } from '@/lib/hijri';

export default function QuickPaymentDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('نقدي');
  const todayGreg = new Date().toISOString().split('T')[0];
  const [paymentDate, setPaymentDate] = useState(todayGreg);
  const [paymentDateHijri, setPaymentDateHijri] = useState(gregorianToHijri(todayGreg));
  const [search, setSearch] = useState('');

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 200),
    enabled: open,
  });

  const outstandingBookings = useMemo(() => {
    return bookings
      .filter(b => b.status !== 'ملغي' && (b.remaining_amount || 0) > 0)
      .filter(b => !search || b.customer_name?.includes(search) || b.customer_phone?.includes(search) || b.booking_number?.includes(search));
  }, [bookings, search]);

  const selectedBooking = bookings.find(b => b.id === selectedBookingId);

  const createPayment = useMutation({
    mutationFn: async () => {
      const booking = selectedBooking;
      const hijri = paymentDateHijri || gregorianToHijri(paymentDate);
      const paymentData = {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        payment_date_hijri: hijri,
        notes: 'سداد دفعة',
      };
      await base44.entities.Payment.create(paymentData);
      const newPaid = (booking.paid_amount || 0) + parseFloat(amount);
      await base44.entities.Booking.update(booking.id, {
        paid_amount: newPaid,
        remaining_amount: (booking.final_amount || 0) - newPaid,
      });
      if (paymentMethod === 'نقدي') {
        await base44.entities.CashTransaction.create({
          type: 'إيراد', source: 'حجز', reference_id: booking.id,
          reference_label: `دفعة حجز ${booking.booking_number}`,
          amount: parseFloat(amount), transaction_date: paymentDate,
          transaction_date_hijri: hijri,
        });
      } else {
        await base44.entities.BankTransaction.create({
          type: 'إيراد', source: 'حجز', reference_id: booking.id,
          reference_label: `دفعة حجز ${booking.booking_number}`,
          amount: parseFloat(amount), transaction_date: paymentDate,
          transaction_date_hijri: hijri,
          payment_method: paymentMethod === 'مدى' ? 'مدى' : 'تحويل بنكي',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('تم تسجيل الدفعة بنجاح');
      onClose();
      setSelectedBookingId('');
      setAmount('');
      setSearch('');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedBookingId) { toast.error('اختر الحجز أولاً'); return; }
    if (!amount || parseFloat(amount) <= 0) { toast.error('أدخل المبلغ'); return; }
    createPayment.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent" /> سداد دفعة
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الجوال أو رقم الحجز..."
              className="pr-10"
            />
          </div>

          {/* Booking selector */}
          <div className="space-y-1.5">
            <Label className="text-sm">اختر الحجز *</Label>
            {outstandingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد حجوزات بمبالغ متبقية</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border p-1.5">
                {outstandingBookings.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { setSelectedBookingId(b.id); setAmount(String(b.remaining_amount || '')); }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-right ${selectedBookingId === b.id ? 'bg-accent/15 border border-accent/30' : 'hover:bg-muted/50 border border-transparent'}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{b.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{b.booking_number} • {b.customer_phone}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm text-red-600">{formatCurrency(b.remaining_amount)}</p>
                      <p className="text-xs text-muted-foreground">متبقي</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected booking summary */}
          {selectedBooking && (
            <div className="p-3 rounded-xl bg-muted/50 grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <p className="text-xs text-muted-foreground">الإجمالي</p>
                <p className="font-semibold">{formatCurrency(selectedBooking.final_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">المدفوع</p>
                <p className="font-semibold text-green-600">{formatCurrency(selectedBooking.paid_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">المتبقي</p>
                <p className="font-semibold text-red-600">{formatCurrency(selectedBooking.remaining_amount)}</p>
              </div>
            </div>
          )}

          {/* Amount + method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">المبلغ *</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} required dir="ltr" placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">طريقة الدفع</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="نقدي">نقدي → الخزينة</SelectItem>
                  <SelectItem value="مدى">مدى → البنك</SelectItem>
                  <SelectItem value="تحويل بنكي">تحويل → البنك</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <HijriDatePicker
            label="تاريخ السداد (تقويم أم القرى) *"
            value={{ hijri: paymentDateHijri, gregorian: paymentDate }}
            onChange={({ hijri, gregorian }) => {
              setPaymentDate(gregorian);
              setPaymentDateHijri(hijri);
            }}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit" disabled={createPayment.isPending || !selectedBookingId}>
              {createPayment.isPending ? 'جاري...' : 'تسجيل الدفعة'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}