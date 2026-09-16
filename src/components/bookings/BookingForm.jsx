import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Save, CreditCard, AlertTriangle } from 'lucide-react';
import HijriDatePicker from '@/components/shared/HijriDatePicker';

const defaultItem = { item_name: '', price: 0, quantity: 1, total: 0 };

export default function BookingForm({ booking, onSubmit, onCancel, isLoading, existingBookings = [] }) {
  const [form, setForm] = useState(booking || {
    customer_name: '',
    customer_phone: '',
    voucher_number: '',
    event_date: '',
    event_date_hijri: '',
    hall_section: 'رجال فقط',
    event_type: 'زواج',
    service_type: 'خدمات كاملة',
    notes: '',
    status: 'معلق',
    base_price: 0,
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

  const addItem = () => setForm(prev => ({ ...prev, items: [...(prev.items || []), { ...defaultItem }] }));

  const updateItem = (index, field, value) => {
    const items = [...(form.items || [])];
    items[index] = { ...items[index], [field]: value };
    if (field === 'price' || field === 'quantity') {
      items[index].total = (items[index].price || 0) * (items[index].quantity || 1);
    }
    setForm(prev => ({ ...prev, items }));
  };

  const removeItem = (index) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const totalAmount = (parseFloat(form.base_price) || 0) + (form.items || []).reduce((sum, item) => sum + (item.total || 0), 0);
  const finalAmount = totalAmount - (form.discount || 0);
  const initialPaid = parseFloat(form.initial_payment_amount) || 0;

  // When editing, keep existing paid; when creating, initial payment is paid_amount
  const existingPaid = booking?.id ? (booking.paid_amount || 0) : 0;
  const newPaidAmount = booking?.id ? existingPaid : initialPaid;
  const remainingAmount = finalAmount - newPaidAmount;

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
      {/* بيانات العميل */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base">بيانات العميل</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>اسم العميل *</Label>
            <Input value={form.customer_name} onChange={e => updateField('customer_name', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>رقم الجوال *</Label>
            <Input value={form.customer_phone} onChange={e => updateField('customer_phone', e.target.value)} required dir="ltr" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>رقم السند الدفتري</Label>
            <Input
              value={form.voucher_number || ''}
              onChange={e => updateField('voucher_number', e.target.value)}
              placeholder="أدخل رقم السند الدفتري الخاص بهذا الحجز"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">رقم السند يُعطى للعميل كإثبات للحجز</p>
          </div>
        </CardContent>
      </Card>

      {/* بيانات المناسبة */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base">بيانات المناسبة</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <HijriDatePicker
              label="تاريخ المناسبة"
              required
              value={{ hijri: form.event_date_hijri, gregorian: form.event_date }}
              onChange={handleEventDateChange}
              placeholder="اختر التاريخ الهجري"
            />
          </div>
          <div className="space-y-2">
            <Label>نوع المناسبة</Label>
            <Select value={form.event_type} onValueChange={v => updateField('event_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="زواج">زواج</SelectItem>
                <SelectItem value="اجتماع">اجتماع</SelectItem>
                <SelectItem value="مناسبة أخرى">مناسبة أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>قسم القاعة</Label>
            <Select value={form.hall_section} onValueChange={v => updateField('hall_section', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="رجال فقط">رجال فقط</SelectItem>
                <SelectItem value="نساء فقط">نساء فقط</SelectItem>
                <SelectItem value="رجال ونساء">رجال ونساء</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>نوع الخدمات</Label>
            <Select value={form.service_type} onValueChange={v => updateField('service_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="خدمات كاملة">خدمات كاملة</SelectItem>
                <SelectItem value="خدمات جزئية">خدمات جزئية</SelectItem>
                <SelectItem value="بدون خدمات">بدون خدمات</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>حالة الحجز</Label>
            <Select value={form.status} onValueChange={v => updateField('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="معلق">معلق</SelectItem>
                <SelectItem value="مؤكد">مؤكد</SelectItem>
                <SelectItem value="ملغي">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>ملاحظات</Label>
            <Textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} placeholder="أي تفاصيل إضافية عن المناسبة..." />
          </div>
        </CardContent>
      </Card>

      {/* تنبيه تعارض التاريخ */}
      {conflictingBookings.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-300">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-amber-800 mb-1">⚠️ تحذير: يوجد حجز بنفس التاريخ!</p>
            {conflictingBookings.map(b => (
              <p key={b.id} className="text-amber-700">• {b.customer_name} — {b.booking_number} ({b.hall_section || b.event_type})</p>
            ))}
            <p className="text-amber-600 mt-1 text-xs">يرجى التأكد قبل الحفظ لتفادي التعارض.</p>
          </div>
        </div>
      )}

      {/* بنود الحجز */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">بنود الحجز</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 ml-1" /> إضافة بند
          </Button>
        </CardHeader>
        <CardContent>
          {/* حقل قيمة الحجز الأساسية */}
          <div className="mb-4 p-4 rounded-xl bg-accent/10 border border-accent/30">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-bold whitespace-nowrap">قيمة الحجز الأساسية:</Label>
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="number"
                  value={form.base_price || ''}
                  onChange={e => updateField('base_price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  dir="ltr"
                  className="max-w-[180px] font-semibold text-base"
                />
                <span className="text-sm text-muted-foreground">ر.س</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">المبلغ الإجمالي للحجز — يمكن إضافة بنود إضافية بالضغط على "+ إضافة بند"</p>
          </div>

          {(form.items || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد بنود إضافية — اضغط "+ إضافة بند" لإضافتها</p>
          ) : (
            <div className="space-y-3">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-muted/50">
                  <div className="col-span-12 md:col-span-4 space-y-1">
                    <Label className="text-xs">البند</Label>
                    <Input value={item.item_name} onChange={e => updateItem(idx, 'item_name', e.target.value)} placeholder="مثال: كوشة" />
                  </div>
                  <div className="col-span-4 md:col-span-2 space-y-1">
                    <Label className="text-xs">السعر</Label>
                    <Input type="number" value={item.price || ''} onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-3 md:col-span-2 space-y-1">
                    <Label className="text-xs">الكمية</Label>
                    <Input type="number" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="col-span-3 md:col-span-2 space-y-1">
                    <Label className="text-xs">الإجمالي</Label>
                    <Input value={(item.total || 0).toFixed(2)} disabled />
                  </div>
                  <div className="col-span-2 md:col-span-2 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>قيمة الحجز:</span>
              <span>{(parseFloat(form.base_price) || 0).toFixed(2)} ر.س</span>
            </div>
            {(form.items || []).length > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>البنود الإضافية:</span>
                <span>{(form.items || []).reduce((s, i) => s + (i.total || 0), 0).toFixed(2)} ر.س</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>الإجمالي:</span>
              <span className="font-semibold">{totalAmount.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>الخصم:</span>
              <Input type="number" className="w-32 text-left" value={form.discount || ''} onChange={e => updateField('discount', parseFloat(e.target.value) || 0)} dir="ltr" />
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>المبلغ النهائي:</span>
              <span className="text-accent">{finalAmount.toFixed(2)} ر.س</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* السداد عند الحجز */}
      <Card className="border-0 shadow-sm border-r-4 border-r-accent">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent" />
            السداد عند الحجز
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-muted/50 space-y-2 text-sm">
            <div className="flex justify-between font-semibold text-base">
              <span>إجمالي المبلغ المطلوب:</span>
              <span className="text-primary">{finalAmount.toFixed(2)} ر.س</span>
            </div>
          </div>

          {!booking?.id && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المبلغ المسدد الآن</Label>
                  <Input
                    type="number"
                    value={form.initial_payment_amount}
                    onChange={e => updateField('initial_payment_amount', e.target.value)}
                    placeholder="0.00"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">اتركه فارغاً إذا لم يُسدَّد شيء الآن</p>
                </div>
                <div className="space-y-2">
                  <Label>طريقة السداد</Label>
                  <Select value={form.initial_payment_method} onValueChange={v => updateField('initial_payment_method', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="نقدي">نقدي</SelectItem>
                      <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {initialPaid > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>المبلغ المسدد:</span>
                    <span className="font-semibold text-green-700">{initialPaid.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>المتبقي:</span>
                    <span className="text-red-600">{remainingAmount.toFixed(2)} ر.س</span>
                  </div>
                </div>
              )}
            </>
          )}

          {booking?.id && (
            <div className="p-3 rounded-xl bg-muted/50 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>إجمالي المسدد:</span>
                <span className="font-semibold text-green-700">{(booking.paid_amount || 0).toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>المتبقي:</span>
                <span className="text-red-600">{(booking.remaining_amount || 0).toFixed(2)} ر.س</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">لتسجيل دفعة جديدة، استخدم زر "تسجيل دفعة" من صفحة تفاصيل الحجز</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>إلغاء</Button>
        <Button type="submit" disabled={isLoading}>
          <Save className="w-4 h-4 ml-2" />
          {booking?.id ? 'تحديث الحجز' : 'حفظ الحجز'}
        </Button>
      </div>

      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> تحذير: تعارض في التاريخ
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base space-y-2">
              <p>يوجد <strong>{conflictingBookings.length}</strong> حجز في نفس التاريخ:</p>
              {conflictingBookings.map(b => (
                <p key={b.id} className="text-sm font-medium">• {b.customer_name} ({b.booking_number}) — {b.hall_section || b.event_type}</p>
              ))}
              <p className="mt-2 text-muted-foreground">هل أنت متأكد من رغبتك في الحجز بهذا التاريخ رغم وجود حجز آخر؟</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowConflictDialog(false); setPendingSubmitData(null); }}>
              تراجع — تعديل التاريخ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowConflictDialog(false); onSubmit(pendingSubmitData); setPendingSubmitData(null); }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              تأكيد الحجز رغم التعارض
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}