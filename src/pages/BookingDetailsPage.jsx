import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import BookingDetails from '@/components/bookings/BookingDetails';
import PaymentDialog from '@/components/bookings/PaymentDialog';
import { toast } from 'sonner';

export default function BookingDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentBooking, setPaymentBooking] = useState(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 200),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date', 500),
  });

  const selectedBooking = bookings.find(b => b.id === id);
  const bookingPayments = payments.filter(p => p.booking_id === id);

  const createPayment = useMutation({
    mutationFn: async (paymentData) => {
      await base44.entities.Payment.create(paymentData);
      const newPaid = (selectedBooking.paid_amount || 0) + paymentData.amount;
      await base44.entities.Booking.update(selectedBooking.id, {
        paid_amount: newPaid,
        remaining_amount: (selectedBooking.final_amount || 0) - newPaid,
      });
      if (paymentData.payment_method === 'نقدي') {
        await base44.entities.CashTransaction.create({
          type: 'إيراد', source: 'حجز', reference_id: selectedBooking.id,
          reference_label: `دفعة حجز ${selectedBooking.booking_number}`,
          amount: paymentData.amount, transaction_date: paymentData.payment_date,
        });
      } else {
        await base44.entities.BankTransaction.create({
          type: 'إيراد', source: 'حجز', reference_id: selectedBooking.id,
          reference_label: `دفعة حجز ${selectedBooking.booking_number}`,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!selectedBooking) {
    return <div className="text-center py-20 text-muted-foreground">لم يتم العثور على الحجز</div>;
  }

  return (
    <>
      <BookingDetails
        booking={selectedBooking}
        payments={bookingPayments}
        onBack={() => navigate('/bookings')}
        onEdit={() => navigate(`/bookings/${id}/edit`)}
        onAddPayment={() => setPaymentBooking(selectedBooking)}
      />
      {paymentBooking && (
        <PaymentDialog
          open={!!paymentBooking}
          onClose={() => setPaymentBooking(null)}
          booking={paymentBooking}
          onSubmit={(data) => createPayment.mutate(data)}
          isLoading={createPayment.isPending}
        />
      )}
    </>
  );
}