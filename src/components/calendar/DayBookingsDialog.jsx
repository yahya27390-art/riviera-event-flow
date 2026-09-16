import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { gregorianToHijri } from '@/lib/hijri';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getAvailableSections } from './InteractiveCalendar';
import QuickBookingDialog from '@/components/bookings/QuickBookingDialog';
import BookingActionCard from './BookingActionCard';

export default function DayBookingsDialog({ open, onClose, date, bookings = [] }) {
  const [showQuickBook, setShowQuickBook] = useState(false);
  const availableSections = getAvailableSections(bookings);
  const hijriDate = gregorianToHijri(date);

  const menBooked = bookings.some(b => b.hall_section === 'رجال فقط' || b.hall_section === 'رجال ونساء');
  const womenBooked = bookings.some(b => b.hall_section === 'نساء فقط' || b.hall_section === 'رجال ونساء');

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {format(new Date(date), 'EEEE، d MMMM', { locale: ar })}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{hijriDate} هـ</p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Section availability summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-xl border text-center ${menBooked ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <p className="text-xs text-muted-foreground">قاعة الرجال</p>
                <p className={`font-bold text-sm ${menBooked ? 'text-red-600' : 'text-green-600'}`}>
                  {menBooked ? 'محجوزة' : 'متاحة'}
                </p>
              </div>
              <div className={`p-3 rounded-xl border text-center ${womenBooked ? 'bg-pink-50 border-pink-200' : 'bg-green-50 border-green-200'}`}>
                <p className="text-xs text-muted-foreground">قاعة النساء</p>
                <p className={`font-bold text-sm ${womenBooked ? 'text-pink-600' : 'text-green-600'}`}>
                  {womenBooked ? 'محجوزة' : 'متاحة'}
                </p>
              </div>
            </div>

            {/* Bookings list */}
            {bookings.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">الحجوزات ({bookings.length})</p>
                {bookings.map(b => (
                  <BookingActionCard key={b.id + '_' + (b.updated_date || '')} booking={b} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="w-10 h-10 text-green-300 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد حجوزات في هذا اليوم</p>
              </div>
            )}

            {/* Quick add button */}
            {availableSections.length > 0 && (
              <Button onClick={() => setShowQuickBook(true)} className="w-full" size="lg">
                <Plus className="w-4 h-4 ml-2" />
                {bookings.length === 0 ? 'إضافة حجز' : 'إضافة حجز للقاعة المتاحة'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showQuickBook && (
        <QuickBookingDialog
          open={showQuickBook}
          onClose={() => { setShowQuickBook(false); onClose(); }}
          presetDate={date}
          presetHijri={hijriDate}
          availableSections={availableSections}
        />
      )}
    </>
  );
}