import React, { useState, useMemo } from 'react';
import { Calendar, ChevronRight, ChevronLeft, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import moment from 'moment-hijri';
import { HIJRI_MONTHS, HIJRI_DAYS, getHijriMonthGrid, gregorianToHijri } from '@/lib/hijri';
import DayBookingsDialog from './DayBookingsDialog';

export function getDayStatus(dayBookings) {
  if (!dayBookings || dayBookings.length === 0) return 'available';
  const hasBoth = dayBookings.some(b => b.hall_section === 'رجال ونساء');
  if (hasBoth) return 'full';
  const hasMen = dayBookings.some(b => b.hall_section === 'رجال فقط');
  const hasWomen = dayBookings.some(b => b.hall_section === 'نساء فقط');
  if (hasMen && hasWomen) return 'full';
  return 'partial';
}

export function getAvailableSections(dayBookings) {
  if (!dayBookings || dayBookings.length === 0) return ['رجال فقط', 'نساء فقط', 'رجال ونساء'];
  const hasBoth = dayBookings.some(b => b.hall_section === 'رجال ونساء');
  if (hasBoth) return [];
  const hasMen = dayBookings.some(b => b.hall_section === 'رجال فقط');
  const hasWomen = dayBookings.some(b => b.hall_section === 'نساء فقط');
  const available = [];
  if (!hasMen && !hasWomen) available.push('رجال ونساء');
  if (!hasMen) available.push('رجال فقط');
  if (!hasWomen) available.push('نساء فقط');
  return available;
}

const statusConfig = {
  available: { bg: 'bg-green-50 border-green-200 hover:border-green-400', text: 'text-green-700', label: 'متاح' },
  partial: { bg: 'bg-amber-50 border-amber-200 hover:border-amber-400', text: 'text-amber-700', label: 'جزئي' },
  full: { bg: 'bg-red-50 border-red-200 hover:border-red-400', text: 'text-red-700', label: 'محجوز' },
};

export default function InteractiveCalendar({ bookings = [] }) {
  const [calMode, setCalMode] = useState('hijri');
  const [calViewDate, setCalViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const todayMoment = moment();
  const [hijriViewYear, setHijriViewYear] = useState(parseInt(todayMoment.format('iYYYY')));
  const [hijriViewMonth, setHijriViewMonth] = useState(parseInt(todayMoment.format('iMM')));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = format(today, 'yyyy-MM-dd');

  const activeBookings = bookings.filter(b => b.status !== 'ملغي');

  const calDays = useMemo(() => {
    const start = startOfMonth(calViewDate);
    const end = endOfMonth(calViewDate);
    const days = eachDayOfInterval({ start, end });
    const startDow = start.getDay();
    return { days, startDow };
  }, [calViewDate]);

  const hijriCalDays = useMemo(() => {
    const { cells } = getHijriMonthGrid(hijriViewYear, hijriViewMonth);
    return cells;
  }, [hijriViewYear, hijriViewMonth]);

  const prevHijriMonth = () => {
    if (hijriViewMonth === 1) { setHijriViewMonth(12); setHijriViewYear(y => y - 1); }
    else setHijriViewMonth(m => m - 1);
  };
  const nextHijriMonth = () => {
    if (hijriViewMonth === 12) { setHijriViewMonth(1); setHijriViewYear(y => y + 1); }
    else setHijriViewMonth(m => m + 1);
  };

  const getBookingsForDate = (dateStr) => activeBookings.filter(b => b.event_date === dateStr);

  const getBookingsForHijriDay = (day) => {
    if (!day) return [];
    const hijriStr = `${hijriViewYear}/${String(hijriViewMonth).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
    const gDate = moment(hijriStr, 'iYYYY/iMM/iDD').format('YYYY-MM-DD');
    return getBookingsForDate(gDate);
  };

  const todayHijriDay = parseInt(todayMoment.format('iDD'));
  const todayHijriMonth = parseInt(todayMoment.format('iMM'));
  const todayHijriYear = parseInt(todayMoment.format('iYYYY'));
  const isHijriToday = (day) => day === todayHijriDay && hijriViewMonth === todayHijriMonth && hijriViewYear === todayHijriYear;

  const renderDayCell = (dayNumber, dayBookings, isToday, gregorianDate) => {
    const status = getDayStatus(dayBookings);
    const config = statusConfig[status];
    const menBooked = dayBookings.some(b => b.hall_section === 'رجال فقط' || b.hall_section === 'رجال ونساء');
    const womenBooked = dayBookings.some(b => b.hall_section === 'نساء فقط' || b.hall_section === 'رجال ونساء');

    return (
      <button
        key={gregorianDate}
        onClick={() => setSelectedDate(gregorianDate)}
        className={`rounded-lg p-1.5 min-h-[56px] md:min-h-[68px] text-right text-xs transition-all hover:shadow-md cursor-pointer border ${config.bg} ${isToday ? 'ring-2 ring-accent' : ''}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`font-bold text-sm ${isToday ? 'text-accent' : config.text}`}>{dayNumber}</span>
          {dayBookings.length > 0 && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${config.text} bg-white/70`}>
              {dayBookings.length}
            </span>
          )}
        </div>
        {status === 'available' && <span className="text-[10px] text-green-500">متاح</span>}
        {status !== 'available' && (
          <div className="flex gap-1 flex-wrap">
            {menBooked && <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">رجال</span>}
            {womenBooked && <span className="text-[9px] px-1 py-0.5 rounded bg-pink-100 text-pink-700 font-medium">نساء</span>}
          </div>
        )}
      </button>
    );
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-accent" /> تقويم الحجوزات</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalMode(m => m === 'hijri' ? 'gregorian' : 'hijri')}
                className="flex items-center gap-1 text-xs px-3 py-1 rounded-full border border-accent bg-accent/10 hover:bg-accent/20 transition-colors font-semibold text-accent"
              >
                <RefreshCw className="w-3 h-3" />
                {calMode === 'hijri' ? 'ميلادي' : 'هجري'}
              </button>
              {calMode === 'hijri' ? (
                <>
                  <button onClick={nextHijriMonth} className="p-1 rounded hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
                  <span className="text-sm font-medium min-w-[150px] text-center">{HIJRI_MONTHS[hijriViewMonth - 1]} {hijriViewYear} هـ</span>
                  <button onClick={prevHijriMonth} className="p-1 rounded hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <button onClick={() => setCalViewDate(d => subMonths(d, 1))} className="p-1 rounded hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
                  <span className="text-sm font-medium min-w-[150px] text-center">{format(calViewDate, 'MMMM yyyy', { locale: ar })}</span>
                  <button onClick={() => setCalViewDate(d => addMonths(d, 1))} className="p-1 rounded hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                </>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 mb-2">
            {HIJRI_DAYS.map(d => (
              <div key={d} className="text-center text-[10px] md:text-xs font-bold text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {calMode === 'hijri' ? (
            <div className="grid grid-cols-7 gap-1">
              {hijriCalDays.map((day, i) => {
                if (!day) return <div key={i} />;
                const hijriStr = `${hijriViewYear}/${String(hijriViewMonth).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
                const gDate = moment(hijriStr, 'iYYYY/iMM/iDD').format('YYYY-MM-DD');
                const dayBookings = getBookingsForDate(gDate);
                return renderDayCell(day, dayBookings, isHijriToday(day), gDate);
              })}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: calDays.startDow }).map((_, i) => <div key={`e${i}`} />)}
              {calDays.days.map(day => {
                const gDate = format(day, 'yyyy-MM-dd');
                const dayBookings = getBookingsForDate(gDate);
                return renderDayCell(format(day, 'd'), dayBookings, gDate === todayStr, gDate);
              })}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" />متاح</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block" />جزئي</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" />محجوز</span>
            </div>
            <span className="text-xs text-muted-foreground">اضغط على اليوم للتفاصيل والحجز</span>
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <DayBookingsDialog
          open={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          date={selectedDate}
          bookings={getBookingsForDate(selectedDate)}
        />
      )}
    </>
  );
}