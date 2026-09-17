import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Users, Calendar, CheckCircle2, ShieldAlert } from 'lucide-react';
import { gregorianToHijri } from '@/lib/hijri';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getAvailableSections } from './InteractiveCalendar';
import QuickBookingDialog from '@/components/bookings/QuickBookingDialog';
import BookingActionCard from './BookingActionCard';
import { Badge } from '@/components/ui/badge';

export default function DayBookingsDialog({ open, onClose, date, bookings = [] }) {
  const [showQuickBook, setShowQuickBook] = useState(false);
  const availableSections = getAvailableSections(bookings);
  const hijriDate = date ? gregorianToHijri(date) : '';

  const menBooked = bookings.some(b => b.hall_section === 'رجال فقط' || b.hall_section === 'رجال ونساء');
  const womenBooked = bookings.some(b => b.hall_section === 'نساء فقط' || b.hall_section === 'رجال ونساء');

  if (!date) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto glass-card border-border">
          <DialogHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg font-extrabold text-foreground">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  {hijriDate} هـ
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-muted-foreground mt-1">
                  الموافق: {format(new Date(date), 'EEEE، d MMMM yyyy', { locale: ar })} م
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Section availability summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3.5 rounded-xl border text-center transition-all ${
                menBooked 
                  ? 'bg-rose-500/10 border-rose-300 dark:border-rose-900' 
                  : 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-900'
              }`}>
                <p className="text-xs font-semibold text-muted-foreground">قسم الرجال</p>
                <p className={`font-black text-sm mt-1 ${menBooked ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {menBooked ? 'محجوز' : 'متاح للحجز'}
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border text-center transition-all ${
                womenBooked 
                  ? 'bg-rose-500/10 border-rose-300 dark:border-rose-900' 
                  : 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-900'
              }`}>
                <p className="text-xs font-semibold text-muted-foreground">قسم النساء</p>
                <p className={`font-black text-sm mt-1 ${womenBooked ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {womenBooked ? 'محجوز' : 'متاح للحجز'}
                </p>
              </div>
            </div>

            {/* Bookings list */}
            {bookings.length > 0 ? (
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-muted-foreground">حجوزات هذا اليوم ({bookings.length}):</p>
                {bookings.map(b => (
                  <BookingActionCard key={b.id} booking={b} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 rounded-xl bg-muted/20 border border-dashed border-border/80">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">القاعة متاحة بالكامل في هذا اليوم</p>
                <p className="text-xs text-muted-foreground mt-0.5">يمكنك تسجيل حجز جديد للقسمين أو لأحد الأقسام</p>
              </div>
            )}

            {/* Quick add button */}
            {availableSections.length > 0 && (
              <Button 
                onClick={() => setShowQuickBook(true)} 
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold shadow-md shadow-amber-500/20" 
                size="lg"
              >
                <Plus className="w-4 h-4 ml-2" />
                {bookings.length === 0 ? 'تسجيل حجز جديد في هذا اليوم' : 'إضافة حجز للقسم المتاح'}
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