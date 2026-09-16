import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DEFAULT_PACKAGES, DEFAULT_SECTIONS, DEFAULT_EVENT_TYPES } from '@/lib/systemSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Plus, Trash2, Save, CreditCard, AlertTriangle, Sparkles, User, Calendar, 
  DollarSign, Package, Coffee, Utensils, Crown, Flame, Music, Gift, 
  Check, CheckCircle2, ChevronDown, Percent, Wallet, Building2, Building, CalendarHeart
} from 'lucide-react';
import HijriDatePicker from '@/components/shared/HijriDatePicker';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/bookingNumber';

const iconMap = {
  Coffee: Coffee,
  Utensils: Utensils,
  Crown: Crown,
  Music: Music,
  Flame: Flame,
  Gift: Gift,
  Package: Package,
  Sparkles: Sparkles,
};

const pricePresets = [8000, 10000, 12000, 15000, 18000, 20000];

export default function BookingForm({ booking, onSubmit, onCancel, isLoading, existingBookings = [] }) {
  const { data: settingsList = [] } = useQuery({
    queryKey: ['hallSettings'],
    queryFn: () => base44.entities.HallSettings.list(),
  });
  const hallSettings = settingsList[0] || {};

  const availablePackages = (hallSettings.packages || DEFAULT_PACKAGES).filter(p => p.active !== false);
  const availableSections = hallSettings.custom_sections || DEFAULT_SECTIONS;
  const availableEventTypes = hallSettings.custom_event_types || DEFAULT_EVENT_TYPES;

  const [form, setForm] = useState(booking || {
    customer_name: '',
    customer_phone: '',
    national_id: '',
    voucher_number: '',
    event_date: '',
    event_date_hijri: '',
    hall_section: availableSections[0]?.id || 'رجال ونساء',
    event_type: availableEventTypes[0]?.id || 'زواج',
    shift_time: 'مسائي',
    service_type: 'خدمات كاملة',
    notes: '',
    status: 'معلق',
    base_price: hallSettings.evening_price || 12000,
    items: [],
    discount: 0,
    initial_payment_amount: '',
    initial_payment_method: 'نقدي',
  });

  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleEventDateChange = ({ hijri, gregorian }) => {
    setForm(prev => ({ ...prev, event_date: gregorian, event_date_hijri: hijri }));
  };

  // Toggle or add package
  const isPackageSelected = (pkgName) => {
    return (form.items || []).some(item => item.item_name === pkgName);
  };

  const togglePackage = (pkg) => {
    const exists = isPackageSelected(pkg.name);
    if (exists) {
      setForm(prev => ({ ...prev, items: (prev.items || []).filter(item => item.item_name !== pkg.name) }));
    } else {
      const newItem = {
        item_name: pkg.name,
        price: pkg.price,
        quantity: 1,
        total: pkg.price
      };
      setForm(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
    }
  };

  const addCustomItem = () => {
    const newItem = { item_name: '', price: 0, quantity: 1, total: 0 };
    setForm(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const updateItem = (index, field, value) => {
    const items = [...(form.items || [])];
    items[index] = { ...items[index], [field]: value };
    if (field === 'price' || field === 'quantity') {
      const p = parseFloat(items[index].price) || 0;
      const q = parseInt(items[index].quantity) || 1;
      items[index].total = p * q;
    }
    setForm(prev => ({ ...prev, items }));
  };

  const removeItem = (index) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const adjustBasePrice = (amount) => {
    const current = parseFloat(form.base_price) || 0;
    const next = Math.max(0, current + amount);
    updateField('base_price', next);
  };

  const applyQuickDiscount = (amount) => {
    updateField('discount', amount);
  };

  const totalAmount = (parseFloat(form.base_price) || 0) + (form.items || []).reduce((sum, item) => sum + (item.total || 0), 0);
  const finalAmount = Math.max(0, totalAmount - (parseFloat(form.discount) || 0));
  const initialPaid = parseFloat(form.initial_payment_amount) || 0;

  // Existing paid vs new initial payment
  const existingPaid = booking?.id ? (parseFloat(booking.paid_amount) || 0) : 0;
  const newPaidAmount = booking?.id ? existingPaid : initialPaid;
  const remainingAmount = Math.max(0, finalAmount - newPaidAmount);

  // Date conflicts check
  const conflictingBookings = useMemo(() => {
    if (!form.event_date) return [];
    return existingBookings.filter(b =>
      b.event_date === form.event_date &&
      b.status !== 'ملغي' &&
      b.id !== booking?.id
    );
  }, [form.event_date, existingBookings, booking?.id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...form,
      total_amount: totalAmount,
      final_amount: finalAmount,
      paid_amount: newPaidAmount,
      remaining_amount: remainingAmount,
      initial_payment_amount: initialPaid,
    };
    if (conflictingBookings.length > 0) {
      setPendingSubmitData(submitData);
      setShowConflictDialog(true);
    } else {
      onSubmit(submitData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-12">
      
      {/* 1. iOS Card: Customer Information (Saudi Identity) */}
      <Card className="glass-card border-border/80 shadow-md rounded-3xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-base font-black flex items-center justify-between text-foreground">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span>بيانات العميل والمستأجر</span>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold border-amber-500/30 text-amber-700 dark:text-amber-300">
              المملكة العربية السعودية 🇸🇦
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">تسجيل الاسم ورقم الجوال السعودي والسند الدفتري</CardDescription>
        </CardHeader>
        
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
          
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label className="font-black text-xs text-foreground">اسم العميل الثلاثي *</Label>
            <Input 
              value={form.customer_name} 
              onChange={e => updateField('customer_name', e.target.value)} 
              placeholder="مثال: فيصل بن عبدالعزيز المقرن"
              className="h-11 rounded-2xl bg-card text-sm font-semibold border-border/80 focus-visible:ring-amber-500"
              required 
            />
          </div>

          {/* Saudi Phone Input */}
          <div className="space-y-1.5">
            <Label className="font-black text-xs text-foreground">رقم الجوال السعودي *</Label>
            <div className="relative flex items-center">
              <Input 
                value={form.customer_phone} 
                onChange={e => updateField('customer_phone', e.target.value)} 
                placeholder="05X XXX XXXX"
                required 
                dir="ltr" 
                className="h-11 rounded-2xl bg-card text-sm font-bold text-left pl-3 pr-20 border-border/80 focus-visible:ring-amber-500"
              />
              <div className="absolute right-2.5 flex items-center gap-1.5 text-xs font-bold text-muted-foreground pointer-events-none select-none border-l pl-2">
                <span>🇸🇦</span>
                <span className="font-mono text-[11px]">+966</span>
              </div>
            </div>
          </div>

          {/* Voucher / Paper Contract Number */}
          <div className="space-y-1.5">
            <Label className="font-black text-xs text-foreground">رقم السند الدفتري / العقد الورقي</Label>
            <Input
              value={form.voucher_number || ''}
              onChange={e => updateField('voucher_number', e.target.value)}
              placeholder="مثال: V-2026-104"
              dir="ltr"
              className="h-11 rounded-2xl bg-card text-sm font-mono text-left border-border/80"
            />
          </div>

        </CardContent>
      </Card>

      {/* 2. iOS Card: Event Details & Dynamic Segmented Selectors */}
      <Card className="glass-card border-border/80 shadow-md rounded-3xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-base font-black flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span>تفاصيل وتوقيت المناسبة</span>
          </CardTitle>
          <CardDescription className="text-xs">تحديد تاريخ أم القرى والقسم المحجوز وفترة الحجز</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-5 pt-5">
          
          {/* Hijri Date Picker */}
          <HijriDatePicker
            label="تاريخ المناسبة (تقويم أم القرى) *"
            required
            value={{ hijri: form.event_date_hijri, gregorian: form.event_date }}
            onChange={handleEventDateChange}
            placeholder="اضغط لاختيار موعد المناسبة"
          />

          {/* Date Conflict Alert Banner */}
          {conflictingBookings.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-black text-sm mb-1">⚠️ تنبيه: يوجد حجز مسجل مسبقاً في هذا التاريخ!</p>
                {conflictingBookings.map(b => (
                  <p key={b.id} className="font-semibold">• العميل: {b.customer_name} ({b.booking_number}) — {b.hall_section}</p>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Hall Sections */}
          <div className="space-y-2">
            <Label className="font-black text-xs text-foreground">قسم القاعة المطلوب</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border/60">
              {availableSections.map(sec => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => updateField('hall_section', sec.id)}
                  className={cn(
                    "py-2.5 px-2 rounded-xl text-xs font-black transition-all text-center flex flex-col items-center justify-center",
                    form.hall_section === sec.id
                      ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                >
                  <span>{sec.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Event Types */}
          <div className="space-y-2">
            <Label className="font-black text-xs text-foreground">نوع المناسبة والاحتفال</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border/60">
              {availableEventTypes.map(evt => (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => updateField('event_type', evt.id)}
                  className={cn(
                    "py-2 px-1.5 rounded-xl text-xs font-bold transition-all text-center",
                    form.event_type === evt.id
                      ? "bg-amber-500 text-slate-950 font-black shadow-md scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                >
                  {evt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shift & Status Dual Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Shift / Time */}
            <div className="space-y-2">
              <Label className="font-black text-xs text-foreground">فترة الحجز</Label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/60">
                {[
                  { id: 'مسائي', label: 'مسائية 🌙' },
                  { id: 'صباحي', label: 'صباحية ☀️' },
                  { id: 'يوم كامل', label: 'يوم كامل 🌟' },
                ].map(shift => (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => updateField('shift_time', shift.id)}
                    className={cn(
                      "py-2 rounded-xl text-xs font-bold transition-all",
                      form.shift_time === shift.id
                        ? "bg-card text-foreground shadow-sm font-black border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {shift.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="font-black text-xs text-foreground">حالة الحجز</Label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/60">
                {[
                  { id: 'معلق', label: 'معلق (عربون قيد السداد) ⏳' },
                  { id: 'مؤكد', label: 'مؤكد رسمي ✅' },
                ].map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => updateField('status', st.id)}
                    className={cn(
                      "py-2 rounded-xl text-xs font-bold transition-all",
                      form.status === st.id
                        ? st.id === 'مؤكد' 
                          ? "bg-emerald-600 text-white shadow-sm font-black" 
                          : "bg-amber-500 text-slate-950 shadow-sm font-black"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="font-black text-xs text-foreground">شروط واشتراطات خاصة بالمناسبة</Label>
            <Textarea 
              value={form.notes || ''} 
              onChange={e => updateField('notes', e.target.value)} 
              placeholder="مثال: مواعيد دخول طاقم التجهيز، وقت تقديم العشاء، عدد الذبائح، اشتراطات الدخول..." 
              rows={2}
              className="rounded-2xl bg-card border-border/80 text-xs"
            />
          </div>

        </CardContent>
      </Card>

      {/* 3. iOS Card: Interactive Base Price & Dynamic Hospitality Packages */}
      <Card className="glass-card border-border/80 shadow-md rounded-3xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-black flex items-center gap-2 text-foreground">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <span>سعر إيجار القاعة والباقات المضافة</span>
              </CardTitle>
              <CardDescription className="text-xs">حدد السعر الأساسي للقاعة واختر باقات الضيافة والتجهيز المعتمدة</CardDescription>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addCustomItem} 
              className="h-8.5 rounded-xl gap-1 text-xs font-bold border-border"
            >
              <Plus className="w-3.5 h-3.5" /> إضافة خدمة مخصصة
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-5 pt-5">
          
          {/* Base Hall Rental Price Card with Steppers & Quick Chips */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 border border-amber-500/25 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <Label className="text-sm font-black text-foreground flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-500" />
                  سعر إيجار القاعة الأساسي *
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">القيمة التعاقدية للقسم المحدد</p>
              </div>

              {/* Price Input with Stepper Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustBasePrice(-500)}
                  className="w-8 h-8 rounded-xl bg-card border border-border shadow-sm text-foreground font-black hover:bg-muted active:scale-95 transition-all text-sm"
                  title="خصم 500"
                >
                  −
                </button>
                <div className="relative">
                  <Input
                    type="number"
                    value={form.base_price || ''}
                    onChange={e => updateField('base_price', parseFloat(e.target.value) || 0)}
                    placeholder="12000"
                    dir="ltr"
                    className="w-36 h-10 font-black text-lg text-primary text-left bg-card rounded-xl border-amber-500/40"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => adjustBasePrice(500)}
                  className="w-8 h-8 rounded-xl bg-card border border-border shadow-sm text-foreground font-black hover:bg-muted active:scale-95 transition-all text-sm"
                  title="زيادة 500"
                >
                  +
                </button>
                <span className="text-xs font-bold text-muted-foreground">ر.س</span>
              </div>
            </div>

            {/* Quick Price Preset Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/50">
              <span className="text-[11px] font-bold text-muted-foreground ml-1">أسعار جاهزة:</span>
              {pricePresets.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateField('base_price', preset)}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-xl transition-all border",
                    form.base_price === preset
                      ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                  )}
                >
                  {preset.toLocaleString('ar-SA')} ر.س
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Packages Grid */}
          <div className="space-y-2.5">
            <Label className="font-black text-xs text-foreground flex items-center justify-between">
              <span>باقات الضيافة والخدمات المتاحة ({availablePackages.length}):</span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">باقات قابلة للتعديل في لوحة التحكم</span>
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {availablePackages.map((pkg) => {
                const IconComponent = iconMap[pkg.icon] || Sparkles;
                const isSelected = isPackageSelected(pkg.name);

                return (
                  <div
                    key={pkg.id}
                    onClick={() => togglePackage(pkg)}
                    className={cn(
                      "group p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between active:scale-[0.98] select-none",
                      isSelected
                        ? "bg-primary/10 border-primary/50 shadow-md ring-2 ring-primary/20"
                        : "bg-card border-border/70 hover:border-amber-500/40 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm transition-all",
                          `bg-gradient-to-br ${pkg.color || 'from-amber-700 to-amber-900'}`,
                          isSelected ? "scale-105" : ""
                        )}>
                          <IconComponent className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-foreground line-clamp-1">{pkg.shortName || pkg.name}</p>
                          <p className="text-[11px] font-black text-amber-600 dark:text-amber-400">{pkg.price.toLocaleString('ar-SA')} ر.س</p>
                        </div>
                      </div>

                      {/* Check Toggle Indicator */}
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center border transition-all",
                        isSelected 
                          ? "bg-primary text-primary-foreground border-primary scale-105" 
                          : "border-border/80 bg-muted/40 text-transparent"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {pkg.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Itemized Services Custom List */}
          {(form.items || []).length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Label className="font-black text-xs text-foreground">تفاصيل الباقات والخدمات المضافة ({form.items.length}):</Label>
              
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-2xl bg-muted/30 border border-border/70">
                  <div className="col-span-12 sm:col-span-5 space-y-1">
                    <Input 
                      value={item.item_name} 
                      onChange={e => updateItem(idx, 'item_name', e.target.value)} 
                      placeholder="اسم الخدمة / البند" 
                      className="bg-card text-xs font-bold h-9 rounded-xl"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <Input 
                      type="number" 
                      value={item.price || ''} 
                      onChange={e => updateItem(idx, 'price', e.target.value)} 
                      className="bg-card text-xs text-left font-bold h-9 rounded-xl"
                      dir="ltr"
                      placeholder="السعر"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <Input 
                      type="number" 
                      value={item.quantity || ''} 
                      onChange={e => updateItem(idx, 'quantity', e.target.value)} 
                      className="bg-card text-xs text-left font-bold h-9 rounded-xl"
                      dir="ltr"
                      placeholder="الكمية"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-left font-black text-xs text-primary">
                    {(item.total || 0).toLocaleString('ar-SA')} ر.س
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeItem(idx)} 
                      className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </CardContent>
      </Card>

      {/* 4. iOS Card: Financial Summary & Discount */}
      <Card className="glass-card border-border/80 shadow-md rounded-3xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-base font-black flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <span>الحسابات المالية والخصم</span>
          </CardTitle>
          <CardDescription className="text-xs">الملخص المالي وتطبيق الخصم المعتمد</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-5">
          <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
            <div className="flex justify-between items-center text-xs sm:text-sm text-muted-foreground">
              <span className="font-semibold">إجمالي قيمة القاعة والبنود:</span>
              <span className="font-black text-foreground text-sm sm:text-base">{totalAmount.toLocaleString('ar-SA')} ر.س</span>
            </div>

            {/* Discount with quick buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/50">
              <span className="font-bold text-xs text-muted-foreground">الخصم الممنوح:</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => applyQuickDiscount(500)} className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-muted hover:bg-muted/80">500 ر.س</button>
                  <button type="button" onClick={() => applyQuickDiscount(1000)} className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-muted hover:bg-muted/80">1000 ر.س</button>
                </div>
                <Input 
                  type="number" 
                  className="w-24 h-8 text-left font-black text-xs rounded-xl bg-card" 
                  value={form.discount || ''} 
                  onChange={e => updateField('discount', parseFloat(e.target.value) || 0)} 
                  placeholder="0"
                  dir="ltr" 
                />
                <span className="text-xs font-bold text-muted-foreground">ر.س</span>
              </div>
            </div>

            {/* Net Total */}
            <div className="flex justify-between items-center text-base sm:text-lg font-black pt-3 border-t border-border/80">
              <span>إجمالي قيمة العقد الصافية:</span>
              <span className="text-primary text-xl font-black">{finalAmount.toLocaleString('ar-SA')} ر.س</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. iOS Card: Initial Deposit & Saudi Payment Method */}
      <Card className="glass-card border-border/80 shadow-md rounded-3xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-base font-black flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <span>سداد العربون والدفعة الأولى</span>
          </CardTitle>
          <CardDescription className="text-xs">تسجيل ما تم استلامه من العميل الآن لإنشاء السند المحاسبي فوراً</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-5">
          {!booking?.id ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Deposit Amount */}
                <div className="space-y-1.5">
                  <Label className="font-black text-xs text-foreground">المبلغ المستلم الآن (العربون)</Label>
                  <Input
                    type="number"
                    value={form.initial_payment_amount}
                    onChange={e => updateField('initial_payment_amount', e.target.value)}
                    placeholder="مثال: 3000"
                    dir="ltr"
                    className="h-11 rounded-2xl bg-card font-black text-left text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">اتركه 0 إذا لم يسدد العميل أي مبلغ عند إنشاء العقد</p>
                </div>

                {/* Saudi Payment Method Selector */}
                <div className="space-y-1.5">
                  <Label className="font-black text-xs text-foreground">طريقة السداد المعتمدة</Label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/60">
                    {[
                      { id: 'نقدي', label: 'نقدي 💵' },
                      { id: 'تحويل بنكي', label: 'تحويل بنكي 🏦' },
                      { id: 'مدى', label: 'شبكة مدى 💳' },
                    ].map(pm => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => updateField('initial_payment_method', pm.id)}
                        className={cn(
                          "py-2 rounded-xl text-xs font-bold transition-all",
                          form.initial_payment_method === pm.id
                            ? "bg-card text-foreground shadow-sm font-black border border-border/80"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {initialPaid > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-300 dark:border-emerald-800 space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">العربون المستلم الآن:</span>
                    <span className="font-black text-emerald-600">{initialPaid.toLocaleString('ar-SA')} ر.س</span>
                  </div>
                  <div className="flex justify-between font-black text-sm sm:text-base pt-1 border-t border-emerald-200 dark:border-emerald-800">
                    <span>المبلغ المتبقي للتحصيل:</span>
                    <span className="text-rose-600 dark:text-rose-400">{remainingAmount.toLocaleString('ar-SA')} ر.س</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 rounded-2xl bg-muted/40 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-muted-foreground">إجمالي المسدد حتى الآن:</span>
                <span className="font-black text-emerald-600">{(booking.paid_amount || 0).toLocaleString('ar-SA')} ر.س</span>
              </div>
              <div className="flex justify-between font-black text-sm sm:text-base pt-1 border-t border-border">
                <span>المتبقي للتحصيل:</span>
                <span className="text-rose-600">{(booking.remaining_amount || 0).toLocaleString('ar-SA')} ر.س</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Sticky Action Bottom Bar (iOS Native Flow) */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-3xl bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-border/80 shadow-2xl">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          className="h-11 px-6 rounded-2xl font-bold text-xs"
        >
          إلغاء التغييرات
        </Button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-left">
            <p className="text-[10px] text-muted-foreground font-bold">الصافي التعاقدي</p>
            <p className="text-base font-black text-primary">{finalAmount.toLocaleString('ar-SA')} ر.س</p>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="h-11 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 active:scale-95 transition-transform"
          >
            <Save className="w-4 h-4 ml-1.5 stroke-[2.5]" />
            {booking?.id ? 'حفظ تعديلات العقد' : 'تأكيد وإصدار العقد'}
          </Button>
        </div>
      </div>

      {/* Conflict Dialog */}
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> تحذير: يوجد حجز مسجل مسبقاً بنفس التاريخ!
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2 text-sm text-foreground">
              <p>يوجد <strong>{conflictingBookings.length}</strong> حجز في نفس هذا التاريخ:</p>
              {conflictingBookings.map(b => (
                <div key={b.id} className="p-2 rounded-xl bg-muted text-xs font-semibold">
                  • العميل: {b.customer_name} ({b.booking_number}) — {b.hall_section || b.event_type}
                </div>
              ))}
              <p className="mt-2 text-xs text-muted-foreground">هل ترغب في المتابعة وحفظ الحجز رغم التعارض؟</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowConflictDialog(false); setPendingSubmitData(null); }}>
              تراجع وتغيير التاريخ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowConflictDialog(false); onSubmit(pendingSubmitData); setPendingSubmitData(null); }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              متابعة الحجز رغم التعارض
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </form>
  );
}