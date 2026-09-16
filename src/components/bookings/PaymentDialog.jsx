import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import HijriDatePicker from '@/components/shared/HijriDatePicker';
import { gregorianToHijri } from '@/lib/hijri';
import { buildPaymentReceipt } from '@/components/print/PaymentReceipt';
import { buildPaymentReceiptBW } from '@/components/print/ReportPageBuilder';
import { openPrintWindow } from '@/lib/printReport';
import { Receipt, CreditCard, CheckCircle2, DollarSign, Wallet, Building2, Smartphone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

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

  const { data: settingsList = [] } = useQuery({ 
    queryKey: ['hallSettings'], 
    queryFn: () => base44.entities.HallSettings.list() 
  });
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

  const setQuickAmount = (val) => {
    setPayment(p => ({ ...p, amount: val.toString() }));
  };

  const printReceipt = (bw = false) => {
    const paidAfter = (booking.paid_amount || 0) + parseFloat(payment.amount || 0);
    const updatedBooking = { ...booking, paid_amount: paidAfter, remaining_amount: (booking.final_amount || 0) - paidAfter };
    const receiptNum = `${booking.booking_number || 'N/A'}-P`;
    
    if (bw) {
      const html = buildPaymentReceiptBW(hallSettings, updatedBooking, payment, receiptNum);
      openPrintWindow(html, `إيصال سداد - ${receiptNum}`);
    } else {
      const src = (payment.payment_method === 'تحويل بنكي' || payment.payment_method === 'مدى') ? 'bank' : 'cash';
      const html = buildPaymentReceipt(hallSettings, updatedBooking, payment, src);
      const win = window.open('', '_blank', 'width=900,height=700');
      win.document.write(html);
      win.document.close();
    }
  };

  const remaining = booking?.remaining_amount || 0;
  const currentInputAmount = parseFloat(payment.amount) || 0;
  const isFullSettlement = currentInputAmount >= remaining && remaining > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl glass-card">
        
        {/* iOS Luxury Modal Header */}
        <div className="p-5 pb-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white border-b border-emerald-800/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">تسجيل دفعة / سند قبض</DialogTitle>
                <p className="text-[11px] text-emerald-200/80 font-medium">حجز رقم: {booking?.booking_number} — {booking?.customer_name}</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-amber-500 text-slate-950 px-2.5 py-1 rounded-xl">
              سند رسمي 🇸🇦
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Financial Summary Card */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>إجمالي قيمة العقد:</span>
              <span className="font-black text-foreground">{formatCurrency(booking?.final_amount)}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>المبلغ المسدد سابقاً:</span>
              <span className="font-bold text-emerald-600">{formatCurrency(booking?.paid_amount)}</span>
            </div>
            <div className="flex justify-between items-center text-sm sm:text-base font-black pt-2 border-t border-border">
              <span>المبلغ المتبقي للتحصيل:</span>
              <span className="text-rose-600 dark:text-rose-400 font-black">{formatCurrency(remaining)}</span>
            </div>
          </div>

          {/* Amount Input with Quick Selection Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black text-foreground">مبلغ الدفعة المحصلة الآن *</Label>
              <span className="text-[11px] text-muted-foreground">أقصى حد: {formatCurrency(remaining)}</span>
            </div>
            
            <div className="relative">
              <Input 
                type="number" 
                value={payment.amount} 
                onChange={e => setPayment({ ...payment, amount: e.target.value })} 
                required 
                dir="ltr"
                max={remaining}
                placeholder="0.00"
                className="h-12 text-lg font-black text-left pl-3 pr-14 rounded-2xl bg-card border-amber-500/40 text-primary"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                ر.س
              </span>
            </div>

            {/* Quick Amount Chips */}
            {remaining > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() => setQuickAmount(remaining)}
                  className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                >
                  تسديد كامل المتبقي ({formatCurrency(remaining)})
                </button>
                {remaining > 2000 && (
                  <button
                    type="button"
                    onClick={() => setQuickAmount(Math.round(remaining / 2))}
                    className="text-xs font-bold px-2 py-1 rounded-xl bg-muted hover:bg-muted/80 text-foreground"
                  >
                    نصف المبلغ ({formatCurrency(Math.round(remaining / 2))})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Saudi Payment Method Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-foreground">طريقة الدفع والاستلام</Label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/60">
              {[
                { id: 'نقدي', label: 'نقدي كاش 💵' },
                { id: 'تحويل بنكي', label: 'تحويل بنكي 🏦' },
                { id: 'مدى', label: 'شبكة مدى 💳' },
              ].map(pm => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPayment({ ...payment, payment_method: pm.id })}
                  className={cn(
                    "py-2.5 rounded-xl text-xs font-bold transition-all text-center",
                    payment.payment_method === pm.id
                      ? "bg-primary text-primary-foreground shadow-sm font-black scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <HijriDatePicker
            label="تاريخ الاستلام والتحصيل"
            value={{ hijri: payment.payment_date_hijri, gregorian: payment.payment_date }}
            onChange={handleDateChange}
          />

          {/* Reference / Transfer Number for Bank & Mada */}
          {payment.payment_method !== 'نقدي' && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <Label className="text-xs font-black text-foreground">رقم الحوالة / المرجع البنكي / إيصال مدى</Label>
              <Input
                value={payment.reference_number}
                onChange={e => setPayment({ ...payment, reference_number: e.target.value })}
                placeholder="مثال: REF-9832104"
                dir="ltr"
                className="h-10 rounded-xl bg-card font-mono text-left"
              />
            </div>
          )}

          {/* Full Settlement Alert */}
          {isFullSettlement && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>سيتم تصفية وإغلاق حساب هذا الحجز بالكامل بعد تسجيل هذا السند.</span>
            </div>
          )}

          {/* Dialog Action Buttons */}
          <DialogFooter className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-10 px-4 text-xs flex-1 sm:flex-initial">
                إلغاء
              </Button>
              {currentInputAmount > 0 && (
                <Button type="button" variant="outline" onClick={() => printReceipt(false)} className="rounded-xl h-10 px-3 text-xs gap-1">
                  <Receipt className="w-3.5 h-3.5" /> معاينة السند
                </Button>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || currentInputAmount <= 0}
              className="rounded-xl h-10 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-transform w-full sm:w-auto"
            >
              {isLoading ? 'جاري التسجيل...' : 'تأكيد وإصدار سند القبض'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
}