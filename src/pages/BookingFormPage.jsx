import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import BookingForm from '@/components/bookings/BookingForm';
import PageHeader from '@/components/shared/PageHeader';
import { generateBookingNumber } from '@/lib/utils/bookingNumber';
import { toast } from 'sonner';

export default function BookingFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 200),
  });

  const editingBooking = isEdit ? bookings.find(b => b.id === id) : null;

  const createBooking = useMutation({
    mutationFn: async (data) => {
      const bookingNumber = generateBookingNumber();
      const created = await base44.entities.Booking.create({ ...data, booking_number: bookingNumber });
      if (data.initial_payment_amount > 0) {
        await base44.entities.Payment.create({
          booking_id: created.id,
          booking_number: bookingNumber,
          amount: data.initial_payment_amount,
          payment_method: data.initial_payment_method === 'تحويل بنكي' ? 'تحويل بنكي' : 'نقدي',
          payment_date: new Date().toISOString().split('T')[0],
          notes: 'دفعة الحجز الأولى',
        });
        if (data.initial_payment_method === 'نقدي') {
          await base44.entities.CashTransaction.create({
            type: 'إيراد', source: 'حجز', reference_id: created.id,
            reference_label: `دفعة حجز ${bookingNumber}`,
            amount: data.initial_payment_amount,
            transaction_date: new Date().toISOString().split('T')[0],
          });
        } else {
          await base44.entities.BankTransaction.create({
            type: 'إيراد', source: 'حجز', reference_id: created.id,
            reference_label: `دفعة حجز ${bookingNumber}`,
            amount: data.initial_payment_amount,
            transaction_date: new Date().toISOString().split('T')[0],
            payment_method: 'تحويل بنكي',
          });
        }
      }
      return created;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      navigate(`/bookings/${data.id}`);
      toast.success('تم إنشاء الحجز بنجاح');
    },
  });

  const updateBooking = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate(`/bookings/${id}`);
      toast.success('تم تحديث الحجز');
    },
  });

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isEdit && !isLoading && !editingBooking) {
    return <div className="text-center py-20 text-muted-foreground">لم يتم العثور على الحجز</div>;
  }

  return (
    <div>
      <PageHeader title={isEdit ? 'تعديل الحجز' : 'حجز جديد'} />
      <BookingForm
        booking={editingBooking}
        onSubmit={(data) => isEdit ? updateBooking.mutate({ id, data }) : createBooking.mutate(data)}
        onCancel={() => navigate('/bookings')}
        isLoading={createBooking.isPending || updateBooking.isPending}
        existingBookings={bookings}
      />
    </div>
  );
}