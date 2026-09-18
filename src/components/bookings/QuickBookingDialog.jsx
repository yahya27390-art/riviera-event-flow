import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, User, Phone, Sparkles, Crown, Check, Calendar } from 'lucide-react';
import { generateBookingNumber } from '@/lib/utils/bookingNumber';
import { gregorianToHijri } from '@/lib/hijri';
import HijriDatePicker from '@/components/shared/HijriDatePicker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { DEFAULT_SECTIONS } from '@/lib/systemSettings';

const pricePresets = [8000, 10000, 12000, 15000];

export default function QuickBookingDialog({ open, onClose, presetDate, presetHijri, availableSections: propSections }) {
  const queryClient = useQueryClient();

  const { data: settingsList = [] } = useQuery({
    queryKey: ['hallSettings'],
    queryFn: () => base44.entities.HallSettings.list(),
    enabled: open,
  });
  const hallSettings = settingsList[0] || {};

  // Normalize sections list: ensure every item has id and label regardless of format
  const sectionsList = useMemo(() => {
    let raw = (propSections && Array.isArray(propSections) && propSections.length > 0)
      ? propSections
      : ((hallSettings.custom_sections && Array.isArray(hallSettings.custom_sections) && hallSettings.custom_sections.length > 0)
        ? hallSettings.custom_sections
        : DEFAULT_SECTIONS);

    return raw.map(item => {
      if (typeof item === 'string') {
        const matched = DEFAULT_SECTIONS.find(s => s.id === item || s.label === item);
        return matched || { id: item, label: item, desc: '' };
      }
      return item;
    });
  }, [propSections, hallSettings.custom_sections]);

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    event_date: presetDate || '',
    event_date_hijri: presetHijri || (presetDate ? gregorianToHijri(presetDate) : ''),
    hall_section: 'كامل القاعة (قسمين)',
    base_price: hallSettings.evening_price || 12000,
    initial_payment_amount: '',
    initial_payment_method: 'نقدي',
  });

  // Synchronize preset date and defaults whenever dialog opens or props change
  React.useEffect(() => {
    if (open) {
      const defaultSec = sectionsList[0]?.id || 'كامل القاعة (قسمين)';
      setForm(prev => ({
        ...prev,
        event_date: presetDate || prev.event_date || '',
        event_date_hijri: presetHijri || (presetDate ? gregorianToHijri(presetDate) : prev.event_date_hijri || ''),
        hall_section: prev.hall_section || defaultSec,
        base_price: prev.base_price || hallSettings.evening_price || 12000
      }));
    }
  }, [open, presetDate, presetHijri, hallSettings.evening_price, sectionsList]);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    enabled: open,
  });

  const suggestedCustomer = useMemo(() => {
    if (!form.customer_phone || form.customer_phone.length < 5) return null;
    const clean = form.customer_phone.replace(/\D/g, '');
    return customers.find(c => (c.phone || '').replace(/\D/g, '').includes(clean));
  }, [form.customer_phone, customers]);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const createBooking = useMutation({
    mutationFn: async (data) => {
      const bookingNumber = generateBookingNumber();
      const basePrice = parseFloat(data.base_price) || 0;
      const initialPaid = parseFloat(data.initial_payment_amount) || 0;

      // Note: 'base_price' is removed because it is not a column in the Supabase 'bookings' table
      const created = await base44.entities.Booking.create({
        customer_name: data.customer_name.trim(),
        customer_phone: data.customer_phone.trim(),
        booking_number: bookingNumber,
        event_date: data.event_date,
        event_date_hijri: data.event_date_hijri || gregorianToHijri(data.event_date),
        hall_section: data.hall_section || 'كامل القاعة (قسمين)',
        event_type: 'زواج',
        service_type: 'خدمات كاملة',
        status: 'معلق',
        items: [],
        discount: 0,
        total_amount: basePrice,
        final_amount: basePrice,
        paid_amount: initialPaid,
        remaining_amount: Math.max(0, basePrice - initialPaid),
        initial_payment_amount: initialPaid,
        initial_payment_method: data.initial_payment_method || 'نقدي',
        notes: data.notes || '',
      });

      // Auto-create customer record if new
      try {
        const cleanPhone = (data.customer_phone || '').trim();
        const existingCust = customers.find(c => (c.phone || '').replace(/\D/g, '') === cleanPhone.replace(/\D/g, ''));
        if (!existingCust && cleanPhone) {
          await base44.entities.Customer.create({
            name: data.customer_name.trim(),
            phone: cleanPhone,
            notes: 'عميل حجز سريع',
          });
        }
      } catch (custErr) {
        console.warn('Customer auto-create skipped:', custErr);
      }

      // Record payment and transactions if deposit provided
      if (initialPaid > 0) {
        try {
          await base44.entities.Payment.create({
            booking_id: created.id,
            booking_number: bookingNumber,
            customer_name: data.customer_name.trim(),
            customer_phone: data.customer_phone.trim(),
            amount: initialPaid,
            payment_method: data.initial_payment_method || 'نقدي',
            payment_date: new Date().toISOString().split('T')[0],
            notes: 'عربون حجز سريع',
          });

          const txType = data.initial_payment_method === 'نقدي' ? 'cash' : 'bank';
          if (txType === 'cash') {
            await base44.entities.CashTransaction.create({
              type: 'إيراد',
              source: 'حجز',
              reference_id: created.id,
              reference_label: `عربون حجز ${bookingNumber}`,
              amount: initialPaid,
              transaction_date: new Date().toISOString().split('T')[0],
            });
          } else {
            await base44.entities.BankTransaction.create({
              type: 'إيراد',
              source: 'حجز',
              reference_id: created.id,
              reference_label: `عربون حجز ${bookingNumber}`,
              amount: initialPaid,
              transaction_date: new Date().toISOString().split('T')[0],
              payment_method: data.initial_payment_method || 'تحويل بنكي',
            });
          }
        } catch (payErr) {
          console.error('Payment record error:', payErr);
        }
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('تم تسجيل وتثبيت الحجز بنجاح');
      onClose();
    },
    onError: (err) => {
      console.error('Error creating booking:', err);
      toast.error(err?.message || 'تعذر تسجيل الحجز، يرجى المحاولة مرة أخرى');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.customer_phone.trim() || !form.event_date) {
      toast.error('يرجى تعبئة كافة الحقول الأساسية المطلوبة');
      return;
    }
    createBooking.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl glass-card">
        
        {/* iOS Luxury Modal Header */}
        <div className="p-5 pb-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white border-b border-emerald-800/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">إنشاء حجز سريع</DialogTitle>
                <p className="text-[11px] text-emerald-200/80 font-medium">تسجيل سريع للعميل وتثبيت الموعد في التقويم</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-amber-500 text-slate-950 px-2.5 py-1 rounded-xl">
              المملكة 🇸🇦
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Customer Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-foreground">اسم العميل *</Label>
            <Input
              value={form.customer_name}
              onChange={e => updateField('customer_name', e.target.value)}
              placeholder="مثال: سلمان بن خالد الدوسري"
              required
              className="h-10.5 rounded-2xl bg-card font-semibold text-sm"
            />
          </div>

          {/* Saudi Phone Number Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-foreground">رقم الجوال السعودي *</Label>
            <div className="relative flex items-center">
              <Input
                value={form.customer_phone}
                onChange={e => updateField('customer_phone', e.target.value)}
                placeholder="05X XXX XXXX"
                required
                dir="ltr"
                className="h-10.5 rounded-2xl bg-card font-bold text-sm text-left pr-20"
              />
              <div className="absolute right-2.5 flex items-center gap-1.5 text-xs font-bold text-muted-foreground pointer-events-none select-none border-l pl-2">
                <span>🇸🇦</span>
                <span className="font-mono text-[11px]">+966</span>
              </div>
            </div>

            {suggestedCustomer && (
              <div 
                onClick={() => updateField('customer_name', suggestedCustomer.name)}
                className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 cursor-pointer flex items-center justify-between"
              >
                <span>عميل مسجل مسبقاً: <strong>{suggestedCustomer.name}</strong></span>
                <span className="text-[10px] underline font-bold">استخدام الاسم</span>
              </div>
            )}
          </div>

          {/* Date Selector */}
          <HijriDatePicker
            label="تاريخ المناسبة *"
            required
            value={{ hijri: form.event_date_hijri, gregorian: form.event_date }}
            onChange={({ hijri, gregorian }) => setForm(f => ({ ...f, event_date: gregorian, event_date_hijri: hijri }))}
          />

          {/* Hall Section Segmented Control */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-foreground">قسم القاعة *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border/60">
              {sectionsList.map(sec => {
                const isSelected = form.hall_section === sec.id;
                const isMen = sec.id === 'رجال فقط';
                const isWomen = sec.id === 'نساء فقط';

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => updateField('hall_section', sec.id)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 border",
                      isSelected
                        ? (isMen 
                            ? "bg-sky-500 text-white border-sky-600 shadow-md font-black" 
                            : isWomen 
                              ? "bg-pink-500 text-white border-pink-600 shadow-md font-black"
                              : "bg-emerald-600 text-white border-emerald-700 shadow-md font-black")
                        : "bg-card text-muted-foreground hover:text-foreground border-border/60"
                    )}
                  >
                    <span>{sec.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Base Price with Quick Presets */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black text-foreground">سعر إيجار القاعة *</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={form.base_price}
                  onChange={e => updateField('base_price', e.target.value)}
                  placeholder="12000"
                  dir="ltr"
                  className="w-28 h-8 text-left font-black text-primary bg-card rounded-xl"
                  required
                />
                <span className="text-xs font-bold text-muted-foreground">ر.س</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/40">
              {pricePresets.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateField('base_price', preset)}
                  className={cn(
                    "text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all",
                    parseFloat(form.base_price) === preset
                      ? "bg-amber-500 text-slate-950 border-amber-500 font-black"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  {preset.toLocaleString('ar-SA')} ر.س
                </button>
              ))}
            </div>
          </div>

          {/* Initial Deposit & Payment Method */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-black text-foreground">العربون المسدد الآن</Label>
              <Input
                type="number"
                value={form.initial_payment_amount}
                onChange={e => updateField('initial_payment_amount', e.target.value)}
                placeholder="0"
                dir="ltr"
                className="h-10 rounded-xl bg-card text-left font-bold text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-black text-foreground">طريقة السداد</Label>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/50 border border-border/60">
                {[
                  { id: 'نقدي', label: 'كاش 💵' },
                  { id: 'تحويل بنكي', label: 'تحويل 🏦' },
                  { id: 'مدى', label: 'مدى 💳' },
                ].map(pm => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => updateField('initial_payment_method', pm.id)}
                    className={cn(
                      "py-1.5 rounded-lg text-[10px] font-bold transition-all",
                      form.initial_payment_method === pm.id
                        ? "bg-card text-foreground shadow-sm font-black border border-border/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <DialogFooter className="pt-3 border-t border-border flex flex-row items-center justify-between gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-10 px-4 text-xs">
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={createBooking.isPending}
              className="rounded-xl h-10 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-transform"
            >
              {createBooking.isPending ? 'جاري الإنشاء...' : 'تثبيت الحجز السريع'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
}