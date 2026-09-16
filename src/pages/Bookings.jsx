import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, CreditCard, Eye, Pencil, Trash2 } from 'lucide-react';
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

export default function Bookings() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteBookingObj, setDeleteBookingObj] = useState(null);
  const [paymentBooking, setPaymentBooking] = useState(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 200),
  });

  const deleteBooking = useMutation({
    mutationFn: async (booking) => {
      await base44.entities.CashTransaction.deleteMany({ reference_id: booking.id });
      await base44.entities.BankTransaction.deleteMany({ reference_id: booking.id });
      await base44.entities.Payment.deleteMany({ booking_id: booking.id });
      await base44.entities.Booking.delete(booking.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setDeleteBookingObj(null);
      toast.success('تم حذف الحجز وجميع السدادات المرتبطة');
    },
  });

  const createPayment = useMutation({
    mutationFn: async (paymentData) => {
      const booking = paymentBooking;
      await base44.entities.Payment.create(paymentData);
      const newPaid = (booking.paid_amount || 0) + paymentData.amount;
      await base44.entities.Booking.update(booking.id, {
        paid_amount: newPaid,
        remaining_amount: (booking.final_amount || 0) - newPaid,
      });
      if (paymentData.payment_method === 'نقدي') {
        await base44.entities.CashTransaction.create({
          type: 'إيراد', source: 'حجز', reference_id: booking.id,
          reference_label: `دفعة حجز ${booking.booking_number}`,
          amount: paymentData.amount, transaction_date: paymentData.payment_date,
        });
      } else {
        await base44.entities.BankTransaction.create({
          type: 'إيراد', source: 'حجز', reference_id: booking.id,
          reference_label: `دفعة حجز ${booking.booking_number}`,
          amount: paymentData.amount, transaction_date: paymentData.payment_date,
          payment_method: paymentData.payment_method === 'مدى' ? 'مدى' : 'تحويل بنكي',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setPaymentBooking(null);
      toast.success('تم تسجيل الدفعة بنجاح');
    },
  });

  const filteredBookings = bookings.filter(b =>
    !searchQuery ||
    b.booking_number?.includes(searchQuery) ||
    b.customer_name?.includes(searchQuery) ||
    b.customer_phone?.includes(searchQuery)
  );

  const statusColor = (status) => {
    if (status === 'مؤكد') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'معلق') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  return (
    <div>
      <PageHeader
        title="الحجوزات"
        description={`${filteredBookings.length} حجز`}
        actions={
          <Button onClick={() => navigate('/bookings/new')}>
            <Plus className="w-4 h-4 ml-2" /> حجز جديد
          </Button>
        }
      />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم الحجز أو الجوال أو الاسم..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <EmptyState title="لا توجد حجوزات" description="ابدأ بإضافة أول حجز" />
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">رقم الحجز</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">المتبقي</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map(booking => (
                  <TableRow key={booking.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/bookings/${booking.id}`)}>
                    <TableCell className="font-mono text-sm">{booking.booking_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{booking.customer_name}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{booking.customer_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {booking.event_date ? (
                        <div>
                          <div className="font-medium">{booking.event_date_hijri || gregorianToHijri(booking.event_date)} هـ</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(booking.event_date), 'dd/MM/yyyy')} م</div>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm">{booking.event_type}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(booking.final_amount)}</TableCell>
                    <TableCell className="text-sm font-medium text-accent">{formatCurrency(booking.remaining_amount)}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(booking.status)}>{booking.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/bookings/${booking.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPaymentBooking(booking)}>
                          <CreditCard className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/bookings/${booking.id}/edit`)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteBookingObj(booking)}>
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

      {paymentBooking && (
        <PaymentDialog
          open={!!paymentBooking}
          onClose={() => setPaymentBooking(null)}
          booking={paymentBooking}
          onSubmit={(data) => createPayment.mutate(data)}
          isLoading={createPayment.isPending}
        />
      )}

      <AlertDialog open={!!deleteBookingObj} onOpenChange={() => setDeleteBookingObj(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الحجز</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الحجز {deleteBookingObj?.booking_number} وجميع السدادات المرتبطة به؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>لا</AlertDialogCancel>
            <SecureConfirmButton
              onConfirm={() => deleteBooking.mutate(deleteBookingObj)}
              className="bg-destructive text-destructive-foreground"
            >
              نعم، احذف
            </SecureConfirmButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}