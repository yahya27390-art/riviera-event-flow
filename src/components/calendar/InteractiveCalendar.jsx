import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, ChevronRight, ChevronLeft, 
  Sparkles, CheckCircle2, Clock, Users, Plus, ArrowRight,
  Eye, CalendarCheck, Moon, Sun, LayoutGrid, List
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import moment from 'moment-hijri';
import { HIJRI_MONTHS, HIJRI_DAYS, getHijriMonthGrid, gregorianToHijri } from '@/lib/hijri';
import DayBookingsDialog from './DayBookingsDialog';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils/bookingNumber';

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

export default function InteractiveCalendar({ bookings = [] }) {
  const navigate = useNavigate();
  const [calMode, setCalMode] = useState('hijri'); // 'hijri' | 'gregorian'
  const [viewType, setViewType] = useState('grid'); // 'grid' | 'agenda'
  const [calViewDate, setCalViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const todayMoment = moment();
  const [hijriViewYear, setHijriViewYear] = useState(parseInt(todayMoment.format('iYYYY')));
  const [hijriViewMonth, setHijriViewMonth] = useState(parseInt(todayMoment.format('iMM')));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = format(today, 'yyyy-MM-dd');

  const activeBookings = useMemo(() => bookings.filter(b => b.status !== 'ملغي'), [bookings]);

  // Gregorian Calendar Grid
  const calDays = useMemo(() => {
    const start = startOfMonth(calViewDate);
    const end = endOfMonth(calViewDate);
    const days = eachDayOfInterval({ start, end });
    const startDow = (start.getDay() + 1) % 7; // Saturday = 0 in Saudi week
    return { days, startDow };
  }, [calViewDate]);

  // Hijri Calendar Grid
  const hijriCalDays = useMemo(() => {
    const { cells } = getHijriMonthGrid(hijriViewYear, hijriViewMonth);
    return cells;
  }, [hijriViewYear, hijriViewMonth]);

  const prevMonth = () => {
    if (calMode === 'hijri') {
      if (hijriViewMonth === 1) { setHijriViewMonth(12); setHijriViewYear(y => y - 1); }
      else setHijriViewMonth(m => m - 1);
    } else {
      setCalViewDate(d => subMonths(d, 1));
    }
  };

  const nextMonth = () => {
    if (calMode === 'hijri') {
      if (hijriViewMonth === 12) { setHijriViewMonth(1); setHijriViewYear(y => y + 1); }
      else setHijriViewMonth(m => m + 1);
    } else {
      setCalViewDate(d => addMonths(d, 1));
    }
  };

  const resetToToday = () => {
    setCalViewDate(new Date());
    setHijriViewYear(parseInt(todayMoment.format('iYYYY')));
    setHijriViewMonth(parseInt(todayMoment.format('iMM')));
  };

  const getBookingsForDate = (dateStr) => activeBookings.filter(b => b.event_date === dateStr);

  const isTodayDate = (dateStr) => dateStr === todayStr;

  // Month Statistics
  const monthStats = useMemo(() => {
    let daysCount = 30;
    let bookedDays = 0;
    let partialDays = 0;

    if (calMode === 'hijri') {
      hijriCalDays.forEach(day => {
        if (!day) return;
        const hijriStr = `${hijriViewYear}/${String(hijriViewMonth).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
        const gDate = moment(hijriStr, 'iYYYY/iMM/iDD').format('YYYY-MM-DD');
        const dayBookings = getBookingsForDate(gDate);
        const status = getDayStatus(dayBookings);
        if (status === 'full') bookedDays++;
        if (status === 'partial') partialDays++;
      });
    } else {
      calDays.days.forEach(day => {
        const gDate = format(day, 'yyyy-MM-dd');
        const dayBookings = getBookingsForDate(gDate);
        const status = getDayStatus(dayBookings);
        if (status === 'full') bookedDays++;
        if (status === 'partial') partialDays++;
      });
      daysCount = calDays.days.length;
    }

    const availableDays = Math.max(0, daysCount - bookedDays - partialDays);
    return { daysCount, bookedDays, partialDays, availableDays };
  }, [calMode, hijriCalDays, calDays, hijriViewYear, hijriViewMonth, activeBookings]);

  // List of active bookings in current viewing month
  const currentMonthBookings = useMemo(() => {
    return activeBookings.filter(b => {
      if (!b.event_date) return false;
      if (calMode === 'hijri') {
        const bHijri = b.event_date_hijri || gregorianToHijri(b.event_date);
        return bHijri && bHijri.includes(`${HIJRI_MONTHS[hijriViewMonth - 1]}`);
      } else {
        const monthPrefix = format(calViewDate, 'yyyy-MM');
        return b.event_date.startsWith(monthPrefix);
      }
    }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  }, [activeBookings, calMode, calViewDate, hijriViewMonth]);

  const renderDayCell = (dayNumber, dayBookings, isToday, gregorianDate, dayOfWeekName) => {
    const status = getDayStatus(dayBookings);
    const isWeekend = dayOfWeekName === 'الخميس' || dayOfWeekName === 'الجمعة';

    // Elegant styling for day cell
    let cellBg = 'bg-card hover:bg-muted/50 border-border/70';
    let ringStyle = '';
    let statusDot = null;

    if (isToday) {
      ringStyle = 'ring-2 ring-amber-500 shadow-md shadow-amber-500/10 border-amber-400/50 bg-amber-500/5';
    }

    if (status === 'full') {
      cellBg = 'bg-rose-500/10 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 hover:bg-rose-500/15';
      statusDot = <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>;
    } else if (status === 'partial') {
      cellBg = 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900 hover:bg-amber-500/15';
      statusDot = <span className="w-2 h-2 rounded-full bg-amber-500"></span>;
    } else if (isWeekend) {
      cellBg = 'bg-muted/30 hover:bg-muted/60 border-border/80';
    }

    return (
      <button
        key={gregorianDate}
        type="button"
        onClick={() => setSelectedDate(gregorianDate)}
        className={`group relative rounded-xl p-2 min-h-[64px] sm:min-h-[76px] flex flex-col justify-between text-right transition-all duration-200 cursor-pointer border shadow-sm ${cellBg} ${ringStyle} hover:-translate-y-0.5 hover:shadow-md`}
      >
        {/* Top bar: Day number + Today / Weekend tags */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            <span className={`text-sm sm:text-base font-bold ${isToday ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
              {dayNumber}
            </span>
            {isToday && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black">
                اليوم
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {statusDot}
            {isWeekend && status === 'available' && (
              <span className="text-[9px] text-muted-foreground font-medium hidden sm:inline-block">عطلة</span>
            )}
          </div>
        </div>

        {/* Middle/Bottom Booking details */}
        <div className="w-full mt-1">
          {dayBookings.length > 0 ? (
            <div className="space-y-1 w-full">
              {dayBookings.slice(0, 2).map((b, idx) => (
                <div 
                  key={idx}
                  className="px-1.5 py-0.5 rounded-md bg-white/90 dark:bg-slate-900/90 text-[10px] font-bold text-slate-900 dark:text-slate-100 truncate border border-border/50 flex items-center gap-1 shadow-xs"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'مؤكد' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span className="truncate">{b.customer_name}</span>
                </div>
              ))}
              {dayBookings.length > 2 && (
                <span className="text-[9px] text-muted-foreground block text-left">+{dayBookings.length - 2} المزيد</span>
              )}
            </div>
          ) : (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary/70 font-semibold flex items-center justify-end gap-0.5">
              <span>+ حجز</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <>
      <Card className="glass-card border-border/80 shadow-lg overflow-hidden">
        {/* Luxury Header Toolbar */}
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Title */}
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center border border-amber-500/30">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <CardTitle className="text-base sm:text-lg font-extrabold text-foreground">
                  جدول حجوزات وتوافر القاعة
                </CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">
                تصفح الأيام المتاحة والمحجوزة وإضافة الحجوزات السريعة
              </CardDescription>
            </div>

            {/* Navigation & Controls */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Mode switch (Hijri / Gregorian) */}
              <div className="flex items-center p-1 rounded-xl bg-muted/80 border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setCalMode('hijri')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    calMode === 'hijri' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Moon className="w-3 h-3" /> هجري
                </button>
                <button
                  type="button"
                  onClick={() => setCalMode('gregorian')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    calMode === 'gregorian' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sun className="w-3 h-3" /> ميلادي
                </button>
              </div>

              {/* View Switcher (Grid / Agenda) */}
              <div className="flex items-center p-1 rounded-xl bg-muted/80 border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setViewType('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewType === 'grid' 
                      ? 'bg-card text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="عرض التقويم الشبكي"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewType('agenda')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewType === 'agenda' 
                      ? 'bg-card text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="عرض قائمة الفعاليات"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Month Navigator */}
              <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-sm">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={prevMonth} 
                  className="h-8 w-8 text-foreground"
                  title="الشهر السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <div className="px-3 text-xs sm:text-sm font-bold min-w-[140px] text-center text-primary">
                  {calMode === 'hijri' ? (
                    `${HIJRI_MONTHS[hijriViewMonth - 1]} ${hijriViewYear} هـ`
                  ) : (
                    format(calViewDate, 'MMMM yyyy', { locale: ar })
                  )}
                </div>

                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={nextMonth} 
                  className="h-8 w-8 text-foreground"
                  title="الشهر التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>

              <Button 
                size="sm" 
                variant="outline" 
                onClick={resetToToday} 
                className="text-xs h-9 px-3"
              >
                اليوم
              </Button>
            </div>
          </div>

          {/* Month Quick Status Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs font-semibold py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1.5"></span>
              {monthStats.availableDays} يوم متاح
            </Badge>
            <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 text-xs font-semibold py-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 ml-1.5"></span>
              {monthStats.bookedDays} حجز مؤكد
            </Badge>
            {monthStats.partialDays > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-xs font-semibold py-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 ml-1.5"></span>
                {monthStats.partialDays} حجز جزئي
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground mr-auto hidden sm:inline-block">
              اضغط على أي يوم لعرض التفاصيل أو إضافة حجز
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {viewType === 'grid' ? (
            <div className="space-y-2">
              {/* Day Headers (السبت -> الجمعة) */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                {HIJRI_DAYS.map((dayName, idx) => {
                  const isWeekend = dayName === 'الخميس' || dayName === 'الجمعة';
                  return (
                    <div 
                      key={idx} 
                      className={`text-center text-xs font-bold py-2 rounded-lg ${
                        isWeekend 
                          ? 'text-amber-600 dark:text-amber-400 bg-amber-500/5' 
                          : 'text-muted-foreground bg-muted/30'
                      }`}
                    >
                      {dayName}
                    </div>
                  );
                })}
              </div>

              {/* Day Cells */}
              {calMode === 'hijri' ? (
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {hijriCalDays.map((day, i) => {
                    if (!day) return <div key={i} className="min-h-[64px] sm:min-h-[76px] rounded-xl bg-muted/10" />;
                    const hijriStr = `${hijriViewYear}/${String(hijriViewMonth).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
                    const gDate = moment(hijriStr, 'iYYYY/iMM/iDD').format('YYYY-MM-DD');
                    const dayBookings = getBookingsForDate(gDate);
                    const dayOfWeekIdx = i % 7;
                    const dayOfWeekName = HIJRI_DAYS[dayOfWeekIdx];
                    return renderDayCell(day, dayBookings, isTodayDate(gDate), gDate, dayOfWeekName);
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {Array.from({ length: calDays.startDow }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[64px] sm:min-h-[76px] rounded-xl bg-muted/10" />
                  ))}
                  {calDays.days.map((day, idx) => {
                    const gDate = format(day, 'yyyy-MM-dd');
                    const dayBookings = getBookingsForDate(gDate);
                    const dayOfWeekIdx = (calDays.startDow + idx) % 7;
                    const dayOfWeekName = HIJRI_DAYS[dayOfWeekIdx];
                    return renderDayCell(format(day, 'd'), dayBookings, isTodayDate(gDate), gDate, dayOfWeekName);
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Agenda List View */
            <div className="space-y-3">
              {currentMonthBookings.length > 0 ? (
                currentMonthBookings.map((b) => (
                  <div 
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="p-4 rounded-xl border border-border/80 bg-card hover:bg-muted/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex flex-col items-center justify-center font-bold">
                        <span className="text-xs">{b.event_date ? format(new Date(b.event_date), 'dd') : '-'}</span>
                        <span className="text-[10px]">{b.event_date ? format(new Date(b.event_date), 'MMM', { locale: ar }) : ''}</span>
                      </div>
                      <div>
                        <p className="font-bold text-base text-foreground">{b.customer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.event_type} • {b.hall_section || 'رجال ونساء'} • {b.event_date_hijri || gregorianToHijri(b.event_date)} هـ
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <span className="text-xs text-muted-foreground block">إجمالي العقد</span>
                        <span className="font-bold text-sm text-primary">{formatCurrency(b.final_amount)}</span>
                      </div>
                      <Badge className={b.status === 'مؤكد' ? 'bg-emerald-500/15 text-emerald-700' : 'bg-amber-500/15 text-amber-700'}>
                        {b.status}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center">
                  <CalendarCheck className="w-10 h-10 mb-2 opacity-30 text-primary" />
                  <p className="font-semibold">لا توجد حجوزات مسجلة في هذا الشهر</p>
                  <p className="text-xs mt-1">اضغط على أي يوم في التقويم لإضافة حجز جديد</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Booking Dialog */}
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