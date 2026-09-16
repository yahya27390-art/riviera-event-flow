import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import HijriDatePicker from '@/components/shared/HijriDatePicker';
import { gregorianToHijri } from '@/lib/hijri';
import { buildPaymentReceipt } from '@/components/print/PaymentReceipt';
import { buildPaymentReceiptBW } from '@/components/print/ReportPageBuilder';
import { openPrintWindow } from '@/lib/printReport';
import { Receipt } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function PaymentDialog({ open, onClose, booking, onSubmit, isLoading, lastPayment }) {
  const todayGreg = new Date().toISOString().split('T')[0];
  const [payment, setPayment] = useState({
    amount: '',
    payment_method: 'نقدي',
    reference_number: '',
    payment_date: todayGreg,
    payment_date_hijri: gregorianToHijri(todayGreg),
    notes: '',
  });

  const { data: settingsList = [] } = useQuery({ queryKey: ['hallSettings'], queryFn: () => base44.entities.HallSettings.list() });
  const hallSettings = settingsList[0] || {};

  const handleDateChange = ({ hijri, gregorian }) => {
    setPayment(p => ({ ...p, payment_date: gregorian, payment_date_hijri: hijri }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...payment,
      amount: parseFloat(payment.amount),
      booking_id: booking.id,
      booking_number: booking.booking_number,
    });
  };

  const printReceipt = (bw = false) => {
    const paidAfter = (booking.paid_amount || 0) + parseFloat(payment.amount || 0);
    const fakeBooking = { ...booking, paid_amount: paidAfter, remaining_amount: (booking.final_amount || 0) - paidAfter };
    const receiptNum = `${booking.booking_number || 'N/A'}-P`;
    if (bw) {
      const html = buildPaymentReceiptBW(hallSettings, fakeBooking, payment, receiptNum);
      openPrintWindow(html, `إيصال سداد - ${receiptNum}`);
    } else {
      const src = (payment.payment_method === 'تحويل بنكي' || payment.payment_method === 'مدى') ? 'bank' : 'cash';
      const html = buildPaymentReceipt(hallSettings, fakeBooking, payment, src);
      const win = window.open('', '_blank', 'width=900,height=700');
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تسجيل دفعة - {booking?.booking_number}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
            <div className="flex justify-between"><span>المبلغ النهائي:</span><span className="font-semibold">{formatCurrency(booking?.final_amount)}</span></div>
            <div className="flex justify-between"><span>المدفوع:</span><span className="font-semibold">{formatCurrency(booking?.paid_amount)}</span></div>
            <div className="flex justify-between text-accent font-bold"><span>المتبقي:</span><span>{formatCurrency(booking?.remaining_amount)}</span></div>
          </div>

          <div className="space-y-2">
            <Label>المبلغ *</Label>
            <Input type="number" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} required dir="ltr" />
          </div>

          <div className="space-y-2">
            <Label>طريقة الدفع</Label>
            <Select value={payment.payment_method} onValueChange={v => setPayment({ ...payment, payment_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="نقدي">نقدي</SelectItem>
                <SelectItem value="مدى">مدى</SelectItem>
                <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <HijriDatePicker
              label="تاريخ الدفع"
              value={{ hijri: payment.payment_date_hijri, gregorian: payment.payment_date }}
              onChange={handleDateChange}
            />
          </div>

          {payment.payment_method !== 'نقدي' && (
            <div className="space-y-2">
              <Label>رقم المرجع</Label>
              <Input value={payment.reference_number} onChange={e => setPayment({ ...payment, reference_number: e.target.value })} />
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            {parseFloat(payment.amount) > 0 && (
              <>
                <Button type="button" variant="outline" onClick={() => printReceipt(false)} className="gap-1 text-xs">
                  <Receipt className="w-4 h-4" /> ملوّن
                </Button>
                <Button type="button" variant="outline" onClick={() => printReceipt(true)} className="gap-1 text-xs">
                  <Receipt className="w-4 h-4" /> أبيض/أسود
                </Button>
              </>
            )}
            <Button type="submit" disabled={isLoading}>تسجيل الدفعة</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}