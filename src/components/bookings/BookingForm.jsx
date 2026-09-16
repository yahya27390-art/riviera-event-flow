import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Save, CreditCard, AlertTriangle, Sparkles, User, Calendar, DollarSign, Package } from 'lucide-react';
import HijriDatePicker from '@/components/shared/HijriDatePicker';
import { Badge } from '@/components/ui/badge';

const defaultItem = { item_name: '', price: 0, quantity: 1, total: 0 };

const servicePresets = [
  { name: 'كوشة وتنسيق مسرح', defaultPrice: 2500 },
  { name: 'باقة عشاء وضيافة فاخرة', defaultPrice: 5000 },
  { name: 'تنسيق إضاءة ودي جي احترافي', defaultPrice: 1500 },
  { name: 'صبابين ومباشرين قهوة وشاي', defaultPrice: 800 },
  { name: 'مؤثرات وبخار وليزر', defaultPrice: 600 },
  { name: 'طاولات استقبال وحلويات', defaultPrice: 1200 },
];

export default function BookingForm({ booking, onSubmit, onCancel, isLoading, existingBookings = [] }) {
  const [form, setForm] = useState(booking || {
    customer_name: '',
    customer_phone: '',
    voucher_number: '',
    event_date: '',
    event_date_hijri: '',
    hall_section: 'رجال ونساء',
    event_type: 'زواج',
    service_type: 'خدمات كاملة',
    notes: '',
    status: 'معلق',
    base_price: 12000,
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

  const addItem = (preset = null) => {
    const newItem = preset ? {
      item_name: preset.name,
      price: preset.defaultPrice,
      quantity: 1,
      total: preset.defaultPrice
    } : { ...defaultItem };
    
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

  const totalAmount = (parseFloat(form.base_price) || 0) + (form.items || []).reduce((sum, item) => sum + (item.total || 0), 0);
  const finalAmount = Math.max(0, totalAmount - (parseFloat(form.discount) || 0));
  const initialPaid = parseFloat(form.initial_payment_amount) || 0;

  // When editing, keep existing paid; when creating, initial payment is paid_amount
  const existingPaid = booking?.id ? (parseFloat(booking.paid_amount) || 0) : 0;
  const newPaidAmount = booking?.id ? existingPaid : initialPaid;
  const remainingAmount = Math.max(0, finalAmount - newPaidAmount);

  // Check date conflicts
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Customer Info */}
      <Card className="glass-card border-border/80 shadow-md">
        <CardHeader className="pb-4 border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
            <User className="w-5 h-5 text-amber-500" /> بيانات العميل الأساسية
          </CardTitle>
          <CardDescription className="text-xs">سجل بيانات المستأجر والتواصل ورقم السند</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="space-y-2">
            <Label className="font-bold text-xs">اسم العميل الثلاثي *</Label>
            <Input 
              value={form.customer_name} 
              onChange={e => updateField('customer_name', e.target.value)} 
              placeholder="مثال: تركي بن فهد آل سعود"
              required 
            />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs">رقم الجوال *</Label>
            <Input 
              value={form.customer_phone} 
              onChange={e => updateField('customer_phone', e.target.value)} 
              placeholder="05xxxxxxxx"
              required 
              dir="ltr" 
            />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs">رقم السند الدفتري / العقد الورقي</Label>
            <Input
              value={form.voucher_number || ''}
              onChange={e => updateField('voucher_number', e.target.value)}
              placeholder="مثال: V-2026-081"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Event Details */}
      <Card className="glass-card border-border/80 shadow-md">
        <CardHeader className="pb-4 border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
            <Calendar className="w-5 h-5 text-amber-500" /> تفاصيل المناسبة وتاريخ الحجز
          </CardTitle>
          <CardDescription className="text-xs">تحديد التاريخ والوقت والقسم المطلوب</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <HijriDatePicker
              label="تاريخ المناسبة (هجري / ميلادي) *"
              required
              value={{ hijri: form.event_date_hijri, gregorian: form.event_date }}
              onChange={handleEventDateChange}
              placeholder="اختر التاريخ الهجري"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-xs">نوع المناسبة</Label>
            <Select value={form.event_type} onValueChange={v => updateField('event_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="زواج">زواج وفرح</SelectItem>
                <SelectItem value="ملكة وعقد قران">ملكة وعقد قران</SelectItem>
                <SelectItem value="حفل تخرج">حفل تخرج</SelectItem>
                <SelectItem value="اجتماع ومؤتمر">اجتماع ومؤتمر</SelectItem>
                <SelectItem value="مناسبة أخرى">مناسبة خاصة أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-xs">قسم القاعة</Label>
            <Select value={form.hall_section} onValueChange={v => updateField('hall_section', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="رجال ونساء">قسمين (رجال ونساء)</SelectItem>
                <SelectItem value="رجال فقط">قسم الرجال فقط</SelectItem>
                <SelectItem value="نساء فقط">قسم النساء فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-xs">نوع باقة الخدمات</Label>
            <Select value={form.service_type} onValueChange={v => updateField('service_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="خدمات كاملة">خدمات كاملة VIP (ضيافة وعشاء)</SelectItem>
                <SelectItem value="خدمات جزئية">خدمات جزئية (إيجار القاعة مع ضيافة)</SelectItem>
                <SelectItem value="بدون خدمات">إيجار القاعة فقط (بدون خدمات)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-xs">حالة الحجز</Label>
            <Select value={form.status} onValueChange={v => updateField('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="معلق">معلق (بانتظار التأكيد/سداد العربون)</SelectItem>
                <SelectItem value="مؤكد">مؤكد رسمي</SelectItem>
                <SelectItem value="ملغي">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="font-bold text-xs">ملاحظات وشروط خاصة</Label>
            <Textarea 
              value={form.notes || ''} 
              onChange={e => updateField('notes', e.target.value)} 
              placeholder="أي اشتراطات خاصة للعميل، مواعيد الدخول، أو تفاصيل الضيافة..." 
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Date Conflict Alert */}
      {conflictingBookings.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold mb-1">⚠️ تحذير: يوجد حجز مسجل مسبقاً في نفس هذا التاريخ!</p>
            {conflictingBookings.map(b => (
              <p key={b.id} className="text-xs font-semibold">• العميل: {b.customer_name} — رقم الحجز: {b.booking_number} ({b.hall_section || b.event_type})</p>
            ))}
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">يرجى مراجعة الجدول لتجنب التضارب المزدوج.</p>
          </div>
        </div>
      )}

      {/* 3. Items and Pricing Packages */}
      <Card className="glass-card border-border/80 shadow-md">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                <Package className="w-5 h-5 text-amber-500" /> بنود الحجز والخدمات الإضافية
              </CardTitle>
              <CardDescription className="text-xs">حدد سعر إيجار القاعة وأضف أي باقات أو خدمات إضافية</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => addItem()} className="gap-1 text-xs">
              <Plus className="w-4 h-4" /> إضافة بند مخصص
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Quick Presets */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> إضافة سريعة من باقات القاعة الجاهزة:
            </p>
            <div className="flex flex-wrap gap-2">
              {servicePresets.map((preset, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => addItem(preset)}
                  className="text-xs bg-muted/60 hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-300 border border-border transition-all"
                >
                  + {preset.name} ({preset.defaultPrice} ر.س)
                </Button>
              ))}
            </div>
          </div>

          {/* Base Hall Price Field */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <Label className="text-sm font-bold text-foreground">سعر إيجار القاعة الأساسي *</Label>
              <p className="text-xs text-muted-foreground mt-0.5">القيمة التعاقدية الأساسية للقسم المحدد</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={form.base_price || ''}
                onChange={e => updateField('base_price', parseFloat(e.target.value) || 0)}
                placeholder="12000"
                dir="ltr"
                className="w-36 font-black text-lg text-primary text-left bg-background"
                required
              />
              <span className="text-sm font-bold text-muted-foreground">ر.س</span>
            </div>
          </div>

          {/* Itemized Services List */}
          {(form.items || []).length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-muted-foreground">الخدمات والباقات المضافة:</p>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-muted/40 border border-border/60">
                  <div className="col-span-12 sm:col-span-5 space-y-1">
                    <Label className="text-[11px] font-semibold">اسم البند / الخدمة</Label>
                    <Input 
                      value={item.item_name} 
                      onChange={e => updateItem(idx, 'item_name', e.target.value)} 
                      placeholder="مثال: كوشة" 
                      className="bg-background text-xs"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold">السعر</Label>
                    <Input 
                      type="number" 
                      value={item.price || ''} 
                      onChange={e => updateItem(idx, 'price', e.target.value)} 
                      className="bg-background text-xs text-left"
                      dir="ltr"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold">الكمية</Label>
                    <Input 
                      type="number" 
                      value={item.quantity || ''} 
                      onChange={e => updateItem(idx, 'quantity', e.target.value)} 
                      className="bg-background text-xs text-left"
                      dir="ltr"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold">الإجمالي</Label>
                    <Input 
                      value={(item.total || 0).toFixed(2)} 
                      disabled 
                      className="bg-muted text-xs font-bold text-left"
                      dir="ltr"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pricing Calculations & Discount */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3 mt-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>إجمالي قيمة القاعة والبنود:</span>
              <span className="font-bold">{totalAmount.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">الخصم الممنوح:</span>
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  className="w-28 text-left font-bold" 
                  value={form.discount || ''} 
                  onChange={e => updateField('discount', parseFloat(e.target.value) || 0)} 
                  placeholder="0"
                  dir="ltr" 
                />
                <span className="text-xs text-muted-foreground">ر.س</span>
              </div>
            </div>
            <div className="flex justify-between text-lg font-black pt-3 border-t border-border">
              <span>إجمالي العقد النهائي:</span>
              <span className="text-primary">{finalAmount.toFixed(2)} ر.س</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Payment at Booking (Initial Deposit) */}
      <Card className="glass-card border-border/80 shadow-md">
        <CardHeader className="pb-4 border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
            <CreditCard className="w-5 h-5 text-amber-500" /> سداد العربون / الدفعة الأولى عند التعاقد
          </CardTitle>
          <CardDescription className="text-xs">تسجيل ما تم استلامه من العميل الآن لإنشاء السند تلقائياً</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {!booking?.id ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-xs">المبلغ المسدد الآن (العربون)</Label>
                  <Input
                    type="number"
                    value={form.initial_payment_amount}
                    onChange={e => updateField('initial_payment_amount', e.target.value)}
                    placeholder="مثال: 3000"
                    dir="ltr"
                    className="font-bold text-left"
                  />
                  <p className="text-[11px] text-muted-foreground">اتركه فارغاً أو 0 إذا لم يسدد العميل شيئاً بعد</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-xs">طريقة سداد العربون</Label>
                  <Select value={form.initial_payment_method} onValueChange={v => updateField('initial_payment_method', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="نقدي">نقدي (كاش في الصندوق)</SelectItem>
                      <SelectItem value="تحويل بنكي">تحويل بنكي لحساب القاعة</SelectItem>
                      <SelectItem value="مدى">شبكة مدى / بطاقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {initialPaid > 0 && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-300 dark:border-emerald-800 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">العربون المسدد الآن:</span>
                    <span className="font-bold text-emerald-600">{initialPaid.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between font-bold text-base">
                    <span>المبلغ المتبقي على العميل:</span>
                    <span className="text-rose-600 dark:text-rose-400">{remainingAmount.toFixed(2)} ر.س</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 rounded-xl bg-muted/50 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>إجمالي المسدد حتى الآن:</span>
                <span className="font-bold text-emerald-600">{(booking.paid_amount || 0).toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>المتبقي للتحصيل:</span>
                <span className="text-rose-600">{(booking.remaining_amount || 0).toFixed(2)} ر.س</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="px-6">
          إلغاء
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-8 shadow-lg shadow-amber-500/20"
        >
          <Save className="w-4 h-4 ml-2" />
          {booking?.id ? 'حفظ التعديلات' : 'إتمام وتأكيد الحجز'}
        </Button>
      </div>

      {/* Conflict Dialog */}
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> تحذير: يوجد حجز مسجل مسبقاً بنفس التاريخ!
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2 text-sm text-foreground">
              <p>يوجد <strong>{conflictingBookings.length}</strong> حجز في نفس هذا التاريخ:</p>
              {conflictingBookings.map(b => (
                <div key={b.id} className="p-2 rounded bg-muted text-xs font-semibold">
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