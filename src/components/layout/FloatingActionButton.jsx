import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import QuickBookingDialog from '@/components/bookings/QuickBookingDialog';

export default function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-20 left-4 z-40 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-xl flex items-center justify-center active:scale-95 transition-transform select-none"
        aria-label="حجز سريع"
      >
        <Plus className="w-7 h-7" />
      </button>
      {open && (
        <QuickBookingDialog open={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}