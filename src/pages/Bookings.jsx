import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, Search, CreditCard, Eye, Pencil, Trash2, 
  MessageSquare, Calendar, Filter, FileText, CheckCircle2, 
  Clock, AlertCircle, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import PaymentDialog from '@/components/bookings/PaymentDialog';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import { gregorianToHijri } from '@/lib/hijri';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/AuthContext';
import SecureConfirmButton from '@/components/shared/SecureConfirmButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Bookings() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [deleteBookingObj, setDeleteBookingObj] = useState(null);
  const [paymentBooking, setPaymentBooking] = useState(null);
  
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_at', 500),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['hallSettings'],
    queryFn: () => base44.entities.HallSettings.list(),
  });
  const hallSettings = settingsList[0] || {};

  const deleteBooking = useMutation({
    mutationFn: async (booking) => {
      await base44.entities.CashTransaction.deleteMany({ reference_id: booking.id });
      await base44.entities.BankTransaction.deleteMany({ reference_id: booking.id });
      await base44.entities.Payment.deleteMany({ booking_id: booking.id });
      await base44.entities.Booking.delete(booking.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['cashTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
      setDeleteBookingObj(null);
      toast.success('تم حذف الحجز وجميع السندات المرتبطة به بنجاح');
    },
  });

  const createPayment = useMutation({
    mutationFn: async (paymentData) => {
      const booking = paymentBooking;
      await base44.entities.Payment.create(paymentData);
      const newPaid = (Number(booking.paid_amount) || 0) + Number(paymentData.amount);
      const newRemaining = Math.max(0, (Number(booking.final_amount) || 0) - newPaid);
      
      await base44.entities.Booking.update(booking.id, {
        paid_amount: newPaid,
        remaining_amount: newRemaining,
        status: newRemaining === 0 ? 'مؤكد' : booking.status
      });

      if (paymentData.payment_method === 'نقدي') {
        await base44.entities.CashTransaction.create({
          type: 'إيراد', source: 'حجز', reference_id: booking.id,
          reference_label: `دفعة حجز ${booking.booking_number} (${booking.customer_name})`,
          amount: Number(paymentData.amount), transaction_date: paymentData.payment_date,
        });
      } else {
        await base44.entities.BankTransaction.create({
          type: 'إيراد', source: 'حجز', reference_id: booking.id,
          reference_label: `دفعة حجز ${booking.booking_number} (${booking.customer_name})`,
          amount: Number(paymentData.amount), transaction_date: paymentData.payment_date,
          payment_method: paymentData.payment_method === 'مدى' ? 'مدى' : 'تحويل بنكي',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setPaymentBooking(null);
      toast.success('تم تسجيل الدفعة وتحديث رصيد الحجز والخزينة بنجاح');
    },
  });

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = !searchQuery ||
        b.booking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer_phone?.includes(searchQuery) ||
        b.voucher_number?.includes(searchQuery);

      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchesSection = sectionFilter === 'all' || b.hall_section === sectionFilter;

      return matchesSearch && matchesStatus && matchesSection;
    });
  }, [bookings, searchQuery, statusFilter, sectionFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter(b => b.status === 'مؤكد').length;
    const pending = bookings.filter(b => b.status === 'معلق').length;
    const totalValue = bookings.reduce((s, b) => s + (Number(b.final_amount) || 0), 0);
    const totalRemaining = bookings.reduce((s, b) => s + (Number(b.remaining_amount) || 0), 0);
    return { total, confirmed, pending, totalValue, totalRemaining };
  }, [bookings]);

  const openWhatsApp = (e, booking) => {
    e.stopPropagation();
    if (!booking.customer_phone) return;
    const cleanPhone = booking.customer_phone.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('966') ? cleanPhone : `966${cleanPhone.replace(/^0/, '')}`;
    const hallName = hallSettings.hall_name || 'قاعة قمة الريف';
    const message = encodeURIComponent(
      `السلام عليكم ورحمة الله وبركاته\nالأستاذ/ة: ${booking.customer_name}\nنرحب بكم في ${hallName}.\nرقم الحجز: ${booking.booking_number}\nتاريخ المناسبة: ${booking.event_date_hijri || gregorianToHijri(booking.event_date)} هـ (الموافق ${booking.event_date} م)\nالمبلغ الإجمالي: ${formatCurrency(booking.final_amount)}\nالمسدد: ${formatCurrency(booking.paid_amount)}\nالمتبقي: ${formatCurrency(booking.remaining_amount)}\n\nنتشرف بخدمتكم!`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const getStatusBadge = (status) => {
    if (status === 'مؤكد') {
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold">مؤكد</Badge>;
    }
    if (status === 'معلق') {
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold">معلق</Badge>;
    }
    return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold">ملغي</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحجوزات والعقود"
        description="إدارة كافة حجوزات القاعة والعقود وسندات الدفع والتحصيل"
        actions={
          <Button 
            onClick={() => navigate('/bookings/new')}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 ml-2" /> حجز عقد جديد
          </Button>
        }
      />

      {/* Quick Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-semibold">إجمالي الحجوزات</p>
            <p className="text-xl font-bold mt-0.5">{stats.total}</p>
          </div>
          <Calendar className="w-8 h-8 text-primary/30" />
        </div>
        <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">حجوزات مؤكدة</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{stats.confirmed}</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
        </div>
        <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold">حجوزات معلقة</p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">{stats.pending}</p>
          </div>
          <Clock className="w-8 h-8 text-amber-500/40" />
        </div>
        <div className="p-4 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-800/40 flex items-center justify-between">
          <div>
            <p className="text-xs text-sky-800 dark:text-sky-300 font-semibold">متبقي التحصيل</p>
            <p className="text-lg font-bold text-sky-700 dark:text-sky-400 mt-0.5">{formatCurrency(stats.totalRemaining)}</p>
          </div>
          <AlertCircle className="w-8 h-8 text-sky-500/40" />
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <Card className="glass-card border-border/80">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الحجز، رقم السند، اسم العميل، أو الجوال..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] text-xs">
                  <SelectValue placeholder="حالة الحجز" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="مؤكد">مؤكد</SelectItem>
                  <SelectItem value="معلق">معلق</SelectItem>
                  <SelectItem value="ملغي">ملغي</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-[140px] text-xs">
                  <SelectValue placeholder="قسم القاعة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأقسام</SelectItem>
                  <SelectItem value="رجال ونساء">رجال ونساء</SelectItem>
                  <SelectItem value="رجال فقط">رجال فقط</SelectItem>
                  <SelectItem value="نساء فقط">نساء فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table View */}
      {filteredBookings.length === 0 ? (
        <EmptyState 
          title="لا توجد حجوزات مطابقة" 
          description={searchQuery ? "لم نجد أي حجز يطابق معايير البحث الحالية" : "ابدأ بإنشاء أول حجز وقعد مناسبة في النظام"} 
        />
      ) : (
        <Card className="glass-card border-border/80 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 border-b border-border">
                  <TableHead className="text-right font-bold">رقم الحجز</TableHead>
                  <TableHead className="text-right font-bold">العميل</TableHead>
                  <TableHead className="text-right font-bold">تاريخ المناسبة</TableHead>
                  <TableHead className="text-right font-bold">قسم القاعة</TableHead>
                  <TableHead className="text-right font-bold">المبلغ الإجمالي</TableHead>
                  <TableHead className="text-right font-bold">المسدد</TableHead>
                  <TableHead className="text-right font-bold">المتبقي</TableHead>
                  <TableHead className="text-right font-bold">الحالة</TableHead>
                  <TableHead className="text-center font-bold">إجراءات سريعة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map(booking => (
                  <TableRow 
                    key={booking.id} 
                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => navigate(`/bookings/${booking.id}`)}
                  >
                    <TableCell className="font-mono font-bold text-primary text-xs sm:text-sm">
                      {booking.booking_number}
                      {booking.voucher_number && (
                        <span className="block text-[10px] text-muted-foreground">سند: {booking.voucher_number}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-bold text-sm text-foreground">{booking.customer_name}</p>
                        <p className="text-xs text-muted-foreground font-mono" dir="ltr">{booking.customer_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {booking.event_date ? (
                        <div>
                          <div className="font-bold">{booking.event_date_hijri || gregorianToHijri(booking.event_date)} هـ</div>
                          <div className="text-xs text-muted-foreground font-mono">({booking.event_date} م)</div>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-semibold bg-secondary/50">
                        {booking.hall_section || 'رجال ونساء'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-sm">
                      {formatCurrency(booking.final_amount)}
                    </TableCell>
                    <TableCell className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(booking.paid_amount)}
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold text-sm ${(Number(booking.remaining_amount) || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                        {formatCurrency(booking.remaining_amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(booking.status)}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {/* WhatsApp Button */}
                        {booking.customer_phone && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                            onClick={(e) => openWhatsApp(e, booking)}
                            title="مراسلة العميل عبر واتساب"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        )}

                        {/* Record Payment Button */}
                        {(Number(booking.remaining_amount) || 0) > 0 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                            onClick={() => setPaymentBooking(booking)}
                            title="سداد دفعة"
                          >
                            <CreditCard className="w-4 h-4" />
                          </Button>
                        )}

                        {/* View Details */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => navigate(`/bookings/${booking.id}`)}
                          title="تفاصيل الحجز والعقد"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {/* Edit Booking */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => navigate(`/bookings/${booking.id}/edit`)}
                          title="تعديل الحجز"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        {/* Delete Booking */}
                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteBookingObj(booking)}
                            title="حذف الحجز"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Record Payment Dialog */}
      {paymentBooking && (
        <PaymentDialog
          booking={paymentBooking}
          open={!!paymentBooking}
          onClose={() => setPaymentBooking(null)}
          onSubmit={(data) => createPayment.mutate(data)}
        />
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!deleteBookingObj} onOpenChange={(open) => { if (!open) setDeleteBookingObj(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive font-bold">تأكيد حذف الحجز</AlertDialogTitle>
            <AlertDialogDescription>
              أنت على وشك حذف حجز العميل <strong>{deleteBookingObj?.customer_name}</strong> (رقم: {deleteBookingObj?.booking_number}).
              سيؤدي هذا إلى حذف جميع الدفعات وسندات الصندوق والبنك المرتبطة بهذا الحجز نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBooking.mutate(deleteBookingObj)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}