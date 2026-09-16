import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pencil, CreditCard, Trash2, Save, X, Plus, Printer, Download, Check } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { buildBookingEditReceipt, buildBookingEditReceiptContent } from './BookingEditReceipt';

const sectionBadge = (section) => {
  if (section === 'رجال فقط') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (section === 'نساء فقط') return 'bg-pink-100 text-pink-700 border-pink-200';
  return 'bg-purple-100 text-purple-700 border-purple-200';
};

const statusBadge = (status) => {
  if (status === 'مؤكد') return 'bg-green-100 text-green-700 border-green-200';
  if (status === 'معلق') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
};

export default function BookingActionCard({ booking }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  const { data: settingsList = [] } = useQuery({
    queryKey: ['hallSettings'],
    queryFn: () => base44.entities.HallSettings.list(),
  });
  const hallSettings = settingsList[0] || {};

  const [mode, setMode] = useState('view');
  const [deleteState, setDeleteState] = useState(null);
  const [addedItems, setAddedItems] = useState([]);
  const [newItem, setNewItem] = useState({ item_name: '', price: '', quantity: 1 });
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSavedBooking, setLastSavedBooking] = useState(null);
  const [lastAddedItems, setLastAddedItems] = useState([]);

  const [editForm, setEditForm] = useState({
    status: booking.status || 'معلق',
    hall_section: booking.hall_section || 'رجال فقط',
    service_type: booking.service_type || 'خدمات كاملة',
    event_type: booking.event_type || 'زواج',
    notes: booking.notes || '',
  });

  const [payment, setPayment] = useState({
    amount: '',
    payment_method: 'نقدي',
    payment_date: new Date().toISOString().split('T')[0],
  });

  const updateBooking = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('تم تحديث الحجز');
      setMode('view');
      setShowReceipt(true);
      setAddedItems([]);
      setNewItem({ item_name: '', price: '', quantity: 1 });
    },
  });

  const deleteBooking = useMutation({
    mutationFn: (id) => base44.entities.Booking.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('تم حذف الحجز');
      setDeleteState(null);
    },
  });

  const createPayment = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(payment.amount);
      await base44.entities.Payment.create({
        booking_id: booking.id, booking_number: booking.booking_number,
        amount: amt, payment_method: payment.payment_method,
        payment_date: payment.payment_date, notes: 'دفعة من التقويم',
      });
      const newPaid = (booking.paid_amount || 0) + amt;
      await base44.entities.Booking.update(booking.id, {
        paid_amount: newPaid,
        remaining_amount: (booking.final_amount || 0) - newPaid,
      });
      if (payment.payment_method === 'نقدي') {
        await base44.entities.CashTransaction.create({
          type: 'إيراد', source: 'حجز', reference_id: booking.id,
          reference_label: `دفعة حجز ${booking.booking_number}`,
          amount: amt, transaction_date: payment.payment_date,
        });
      } else {
        await base44.entities.BankTransaction.create({
          type: 'إيراد', source: 'حجز', reference_id: booking.id,
          reference_label: `دفعة حجز ${booking.booking_number}`,
          amount: amt, transaction_date: payment.payment_date,
          payment_method: payment.payment_method === 'مدى' ? 'مدى' : 'تحويل بنكي',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('تم تسجيل الدفعة');
      setMode('view');
      setPayment({ amount: '', payment_method: 'نقدي', payment_date: new Date().toISOString().split('T')[0] });
    },
  });

  const handleAddItem = () => {
    if (!newItem.item_name.trim() || !newItem.price || parseFloat(newItem.price) <= 0) {
      toast.error('أدخل اسم الخدمة والسعر');
      return;
    }
    setAddedItems([...addedItems, { ...newItem, quantity: parseFloat(newItem.quantity) || 1, price: parseFloat(newItem.price) }]);
    setNewItem({ item_name: '', price: '', quantity: 1 });
  };

  const handleSaveEdit = () => {
    const existingItems = booking.items || [];
    const itemsToAdd = addedItems.map(item => ({
      item_name: item.item_name, price: item.price,
      quantity: item.quantity, total: item.price * item.quantity,
    }));
    const allItems = [...existingItems, ...itemsToAdd];
    const total_amount = allItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const discount = booking.discount || 0;
    const final_amount = total_amount - discount;
    const paid_amount = booking.paid_amount || 0;
    const remaining_amount = final_amount - paid_amount;

    const data = { ...editForm, items: allItems, total_amount, final_amount, remaining_amount };
    setLastSavedBooking({ ...booking, ...data });
    setLastAddedItems(itemsToAdd);
    updateBooking.mutate({ id: booking.id, data });
  };

  const handlePayment = () => {
    if (!payment.amount || parseFloat(payment.amount) <= 0) { toast.error('أدخل المبلغ'); return; }
    createPayment.mutate();
  };

  const handleDeleteClick = () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const eventDate = booking.event_date ? new Date(booking.event_date) : null;
    if (eventDate && eventDate >= today) {
      setDeleteState({ error: `لا يمكن حذف الحجز لأن موعد المناسبة (${format(eventDate, 'dd/MM/yyyy')}) لم يأتِ بعد.` });
    } else if ((booking.remaining_amount || 0) > 0) {
      setDeleteState({ error: `لا يمكن حذف الحجز لأن هناك مبلغ متبقٍ غير مسدد (${formatCurrency(booking.remaining_amount)}).` });
    } else {
      setDeleteState({ confirm: true });
    }
  };

  const handlePrint = () => {
    if (!lastSavedBooking) return;
    const html = buildBookingEditReceipt(hallSettings, lastSavedBooking, lastAddedItems);
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
  };

  const handleSavePNG = async () => {
    if (!lastSavedBooking) return;
    const content = buildBookingEditReceiptContent(hallSettings, lastSavedBooking, lastAddedItems);
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:#fff;';
    container.innerHTML = content;
    document.body.appendChild(container);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise(r => setTimeout(r, 400));
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
      const link = document.createElement('a');
      link.download = `تحديث-حجز-${lastSavedBooking.booking_number || lastSavedBooking.customer_name || ''}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('تم حفظ الصورة');
    } catch (err) {
      toast.error('فشل حفظ الصورة');
    } finally {
      document.body.removeChild(container);
    }
  };

  return (
    <div className="p-3 rounded-xl border bg-card space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{booking.customer_name}</p>
          <p className="text-xs text-muted-foreground" dir="ltr">{booking.customer_phone}</p>
        </div>
        <Badge variant="outline" className={statusBadge(booking.status)}>{booking.status}</Badge>
      </div>

      {/* Section + type */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={sectionBadge(booking.hall_section)}>{booking.hall_section}</Badge>
        <span className="text-xs text-muted-foreground">{booking.event_type}</span>
        {booking.voucher_number && <span className="text-xs text-muted-foreground" dir="ltr">#{booking.voucher_number}</span>}
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-muted/50 text-center text-xs">
        <div><p className="text-muted-foreground">الإجمالي</p><p className="font-semibold">{formatCurrency(booking.final_amount)}</p></div>
        <div><p className="text-muted-foreground">المدفوع</p><p className="font-semibold text-green-600">{formatCurrency(booking.paid_amount)}</p></div>
        <div><p className="text-muted-foreground">المتبقي</p><p className="font-semibold text-red-600">{formatCurrency(booking.remaining_amount)}</p></div>
      </div>

      {/* Receipt option after save */}
      {showReceipt && (
        <div className="space-y-2 p-3 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-700 font-medium flex items-center gap-1"><Check className="w-4 h-4" /> تم حفظ التعديلات بنجاح</p>
          <p className="text-xs text-green-600">اطبع النموذج أو احفظه كصورة وأرسله للعميل</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 border-green-300 text-green-700 hover:bg-green-100" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5 ml-1" /> طباعة
            </Button>
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleSavePNG}>
              <Download className="w-3.5 h-3.5 ml-1" /> حفظ صورة PNG
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowReceipt(false)}>إغلاق</Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {mode === 'view' && !showReceipt && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setMode('edit')}>
            <Pencil className="w-3.5 h-3.5 ml-1" /> تعديل سريع
          </Button>
          <Button size="sm" className="flex-1" onClick={() => setMode('payment')}>
            <CreditCard className="w-3.5 h-3.5 ml-1" /> دفعة
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10" onClick={handleDeleteClick}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Quick edit form */}
      {mode === 'edit' && (
        <div className="space-y-3 p-3 rounded-lg bg-muted/30 border">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">الحالة</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="معلق">معلق</SelectItem><SelectItem value="مؤكد">مؤكد</SelectItem><SelectItem value="ملغي">ملغي</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">القسم</Label>
              <Select value={editForm.hall_section} onValueChange={v => setEditForm({ ...editForm, hall_section: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="رجال فقط">رجال فقط</SelectItem><SelectItem value="نساء فقط">نساء فقط</SelectItem><SelectItem value="رجال ونساء">رجال ونساء</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نوع المناسبة</Label>
              <Select value={editForm.event_type} onValueChange={v => setEditForm({ ...editForm, event_type: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="زواج">زواج</SelectItem><SelectItem value="اجتماع">اجتماع</SelectItem><SelectItem value="مناسبة أخرى">مناسبة أخرى</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نوع الخدمات</Label>
              <Select value={editForm.service_type} onValueChange={v => setEditForm({ ...editForm, service_type: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="خدمات كاملة">خدمات كاملة</SelectItem><SelectItem value="خدمات جزئية">خدمات جزئية</SelectItem><SelectItem value="بدون خدمات">بدون خدمات</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          {/* Add service item */}
          <div className="space-y-2 p-2.5 rounded-lg bg-muted/20 border border-dashed">
            <Label className="text-xs font-semibold">إضافة بند خدمة</Label>
            <div className="grid grid-cols-12 gap-1.5">
              <Input className="col-span-5 h-8 text-xs" placeholder="اسم الخدمة" value={newItem.item_name} onChange={e => setNewItem({ ...newItem, item_name: e.target.value })} />
              <Input className="col-span-3 h-8 text-xs" type="number" placeholder="السعر" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} dir="ltr" />
              <Input className="col-span-2 h-8 text-xs" type="number" placeholder="الكمية" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} dir="ltr" />
              <Button size="sm" className="col-span-2 h-8 px-0" onClick={handleAddItem} type="button"><Plus className="w-3 h-3" /></Button>
            </div>
            {addedItems.length > 0 && (
              <div className="space-y-1 mt-1">
                {addedItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-card border gap-2">
                    <span className="truncate flex-1">{item.item_name} ×{item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    <button onClick={() => setAddedItems(addedItems.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 px-1 flex-shrink-0">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">ملاحظات</Label>
            <Textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={2} className="text-xs" placeholder="ملاحظات..." />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} disabled={updateBooking.isPending}>
              <Save className="w-3.5 h-3.5 ml-1" /> {updateBooking.isPending ? 'جاري...' : 'حفظ'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setMode('view'); setAddedItems([]); }}>
              <X className="w-3.5 h-3.5 ml-1" /> إلغاء
            </Button>
          </div>
        </div>
      )}

      {/* Payment form */}
      {mode === 'payment' && (
        <div className="space-y-3 p-3 rounded-lg bg-muted/30 border">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">المبلغ *</Label>
              <Input type="number" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} dir="ltr" placeholder="0.00" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">طريقة الدفع</Label>
              <Select value={payment.payment_method} onValueChange={v => setPayment({ ...payment, payment_method: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="نقدي">نقدي → الخزينة</SelectItem><SelectItem value="مدى">مدى → البنك</SelectItem><SelectItem value="تحويل بنكي">تحويل → البنك</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">التاريخ</Label>
            <Input type="date" value={payment.payment_date} onChange={e => setPayment({ ...payment, payment_date: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePayment} disabled={createPayment.isPending}>{createPayment.isPending ? 'جاري...' : 'تسجيل الدفعة'}</Button>
            <Button variant="outline" size="sm" onClick={() => setMode('view')}><X className="w-3.5 h-3.5 ml-1" /> إلغاء</Button>
          </div>
        </div>
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!deleteState} onOpenChange={(open) => { if (!open) setDeleteState(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={deleteState?.error ? 'text-destructive' : ''}>
              {deleteState?.error ? '⚠️ لا يمكن حذف الحجز' : 'تأكيد الحذف'}
            </AlertDialogTitle>
            <AlertDialogDescription>{deleteState?.error || 'هل أنت متأكد من حذف هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {deleteState?.error ? (
              <AlertDialogAction onClick={() => setDeleteState(null)}>حسناً</AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteBooking.mutate(booking.id)} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}