import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, ChevronLeft, 
  CheckCircle2, Clock, Plus, ArrowRight,
  Eye, CalendarCheck, Moon, Sun, LayoutGrid, List,
  MessageSquare, Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import moment from 'moment-hijri';
import { HIJRI_MONTHS, HIJRI_DAYS, getHijriMonthGrid, gregorianToHijri } from '@/lib/hijri';
import DayBookingsDialog from './DayBookingsDialog';
import QuickBookingDialog from '@/components/bookings/QuickBookingDialog';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import { cn } from '@/lib/utils';

// Helper: returns true if a hall_section value means "both sections" (full hall)
function isBothSection(s) {
  if (!s) return true;
  const t = s.trim();
  return t === 'رجال ونساء' || t === 'القسمين' || t.includes('كامل') || t.includes('معاً') || t.includes('معا');
}

export function getSectionBadge(section) {
  const s = (section || '').trim();
  if (isBothSection(s)) {
    return {
      type: 'both',
      label: 'رجال ونساء',
      shortLabel: 'رجال ونساء',
      badgeClass: 'bg-purple-100 text-purple-800 dark:text-purple-200 border-purple-300 font-bold',
      dotClass: 'bg-amber-500',
      cellBg: 'bg-purple-50/80 dark:bg-purple-950/20',
      icon: '👑',
    };
  }
  if (s.includes('نساء')) {
    return {
      type: 'women',
      label: 'نساء فقط',
      shortLabel: 'نساء',
      badgeClass: 'bg-rose-100 text-rose-800 dark:text-rose-200 border-rose-300 font-bold',
      dotClass: 'bg-rose-400',
      cellBg: 'bg-rose-50/80 dark:bg-rose-950/20',
      icon: '🌸',
    };
  }
  if (s.includes('رجال')) {
    return {
      type: 'men',
      label: 'رجال فقط',
      shortLabel: 'رجال',
      badgeClass: 'bg-sky-100 text-sky-800 dark:text-sky-200 border-sky-300 font-bold',
      dotClass: 'bg-sky-500',
      cellBg: 'bg-sky-50/80 dark:bg-sky-950/20',
      icon: '👔',
    };
  }
  return {
    type: 'other',
    label: s,
    shortLabel: s,
    badgeClass: 'bg-primary/20 text-primary border-primary/40 font-bold',
    dotClass: 'bg-primary',
    cellBg: 'bg-muted/30',
    icon: '📌',
  };
}

export function getDayStatus(dayBookings) {
  if (!dayBookings || dayBookings.length === 0) return 'available';
  const hasBoth = dayBookings.some(b => isBothSection(b.hall_section));
  if (hasBoth) return 'full';
  const hasMen = dayBookings.some(b => (b.hall_section || '').includes('رجال'));
  const hasWomen = dayBookings.some(b => (b.hall_section || '').includes('نساء'));
  if (hasMen && hasWomen) return 'full';
  return 'partial';
}

export function getAvailableSections(dayBookings) {
  if (!dayBookings || dayBookings.length === 0) return ['رجال فقط', 'نساء فقط', 'رجال ونساء'];
  const hasBoth = dayBookings.some(b => isBothSection(b.hall_section));
  if (hasBoth) return [];
  const hasMen = dayBookings.some(b => (b.hall_section || '').includes('رجال'));
  const hasWomen = dayBookings.some(b => (b.hall_section || '').includes('نساء'));
  const available = [];
  if (!hasMen && !hasWomen) available.push('رجال ونساء');
  if (!hasMen) available.push('رجال فقط');
  if (!hasWomen) available.push('نساء فقط');
  return available;
}

export default function InteractiveCalendar({ bookings = [] }) {
  const navigate = useNavigate();
  const [calMode, setCalMode] = useState('hijri');
  const [viewType, setViewType] = useState('grid');
  const [calViewDate, setCalViewDate] = useState(new Date());
  const [selectedDialogDate, setSelectedDialogDate] = useState(null);

  const todayMoment = moment();
  const [hijriViewYear, setHijriViewYear] = useState(parseInt(todayMoment.format('iYYYY'), 10));
  const [hijriViewMonth, setHijriViewMonth] = useState(parseInt(todayMoment.format('iMM'), 10));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = format(today, 'yyyy-MM-dd');
  const [inlineSelectedDate, setInlineSelectedDate] = useState(todayStr);

  const [showQuickBook, setShowQuickBook] = useState(false);
  const [quickBookPresetDate, setQuickBookPresetDate] = useState(null);
  const [quickBookPresetHijri, setQuickBookPresetHijri] = useState(null);

  const activeBookings = useMemo(() => bookings.filter(b => b.status !== 'ملغي'), [bookings]);

  const calDays = useMemo(() => {
    const start = startOfMonth(calViewDate);
    const end = endOfMonth(calViewDate);
    const days = eachDayOfInterval({ start, end });
    const startDow = (start.getDay() + 1) % 7;
    return { days, startDow };
  }, [calViewDate]);

  const hijriCalDays = useMemo(() => {
    const { cells } = getHijriMonthGrid(hijriViewYear, hijriViewMonth);
    return cells;
  }, [hijriViewYear, hijriViewMonth]);

  const prevMonth = () => {
    if (calMode === 'hijri') {
      if (hijriViewMonth === 1) { setHijriViewMonth(12); setHijriViewYear(y => y - 1); }
      else setHijriViewMonth(m => m - 1);
    } else setCalViewDate(d => subMonths(d, 1));
  };

  const nextMonth = () => {
    if (calMode === 'hijri') {
      if (hijriViewMonth === 12) { setHijriViewMonth(1); setHijriViewYear(y => y + 1); }
      else setHijriViewMonth(m => m + 1);
    } else setCalViewDate(d => addMonths(d, 1));
  };

  const resetToToday = () => {
    setCalViewDate(new Date());
    setHijriViewYear(parseInt(todayMoment.format('iYYYY'), 10));
    setHijriViewMonth(parseInt(todayMoment.format('iMM'), 10));
    setInlineSelectedDate(todayStr);
  };

  const getBookingsForDate = (dateStr) => activeBookings.filter(b => b.event_date === dateStr);
  const isTodayDate = (dateStr) => dateStr === todayStr;

  const monthStats = useMemo(() => {
    let bookedDays = 0;
    let partialDays = 0;
    const cells = calMode === 'hijri' ? hijriCalDays : calDays.days;
    cells.forEach(day => {
      if (!day) return;
      let gDate;
      if (calMode === 'hijri') {
        const hijriStr = `${hijriViewYear}/${String(hijriViewMonth).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
        gDate = moment(hijriStr, 'iYYYY/iMM/iDD').format('YYYY-MM-DD');
      } else {
        gDate = format(day, 'yyyy-MM-dd');
      }
      const status = getDayStatus(getBookingsForDate(gDate));
      if (status === 'full') bookedDays++;
      else if (status === 'partial') partialDays++;
    });
    const total = calMode === 'hijri' ? hijriCalDays.filter(Boolean).length : calDays.days.length;
    return { bookedDays, partialDays, availableDays: Math.max(0, total - bookedDays - partialDays) };
  }, [calMode, hijriCalDays, calDays, hijriViewYear, hijriViewMonth, activeBookings]);

  const currentMonthBookings = useMemo(() => {
    return activeBookings.filter(b => {
      if (!b.event_date) return false;
      if (calMode === 'hijri') {
        let bYear, bMonth;
        if (b.event_date_hijri && b.event_date_hijri.includes('/')) {
          const parts = b.event_date_hijri.split('/');
          bYear = parseInt(parts[0], 10);
          bMonth = parseInt(parts[1], 10);
        } else {
          try {
            const m = moment(b.event_date, 'YYYY-MM-DD');
            bYear = parseInt(m.format('iYYYY'), 10);
            bMonth = parseInt(m.format('iMM'), 10);
          } catch { return false; }
        }
        return bYear === hijriViewYear && bMonth === hijriViewMonth;
      } else {
        return b.event_date.startsWith(format(calViewDate, 'yyyy-MM'));
      }
    }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  }, [activeBookings, calMode, calViewDate, hijriViewYear, hijriViewMonth]);

  const handleCellClick = (gregorianDate) => setInlineSelectedDate(gregorianDate);
  const handleOpenDialog = (gregorianDate) => setSelectedDialogDate(gregorianDate);

  const openQuickBookingForDate = (gregDate) => {
    setQuickBookPresetDate(gregDate);
    setQuickBookPresetHijri(gregorianToHijri(gregDate));
    setShowQuickBook(true);
  };

  const openWhatsApp = (b) => {
    if (!b.customer_phone) return;
    const cleanPhone = b.customer_phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('966') ? cleanPhone : `966${cleanPhone.replace(/^0+/, '')}`;
    const text = encodeURIComponent(
      `السلام عليكم ورحمة الله وبركاته\nالأستاذ/ة: ${b.customer_name}\nنود تذكيركم بموعد حجزكم بتاريخ ${b.event_date_hijri || gregorianToHijri(b.event_date)} هـ.\nالقسم: ${b.hall_section || 'كامل القاعة'}\nالمتبقي: ${formatCurrency(b.remaining_amount)}`
    );
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  // ─── Day Cell: circles (blue=men, pink=women) with hover tooltip ────────────
  const renderDayCell = (dayNumber, dayBookings, isToday, gregorianDate, dayOfWeekName) => {
    const status = getDayStatus(dayBookings);
    const isWeekend = dayOfWeekName === 'الخميس' || dayOfWeekName === 'الجمعة';
    const isSelected = inlineSelectedDate === gregorianDate;

    // Derive which section types exist today
    const hasMenBooking  = dayBookings.some(b => !isBothSection(b.hall_section) && (b.hall_section || '').includes('رجال'));
    const hasWomenBooking = dayBookings.some(b => !isBothSection(b.hall_section) && (b.hall_section || '').includes('نساء'));
    const hasBothBooking = dayBookings.some(b => isBothSection(b.hall_section));

    // For tooltip: build customer list per section
    const menNames = dayBookings.filter(b => !isBothSection(b.hall_section) && (b.hall_section || '').includes('رجال')).map(b => b.customer_name).join('، ');
    const womenNames = dayBookings.filter(b => !isBothSection(b.hall_section) && (b.hall_section || '').includes('نساء')).map(b => b.customer_name).join('، ');
    const bothNames = dayBookings.filter(b => isBothSection(b.hall_section)).map(b => b.customer_name).join('، ');

    // Cell background
    let bg = isWeekend ? 'bg-amber-50/60 dark:bg-amber-950/10' : 'bg-card';
    if (isSelected) bg = 'bg-amber-500/15 dark:bg-amber-900/30';
    else if (isToday) bg = 'bg-emerald-50 dark:bg-emerald-950/20';

    let ring = '';
    if (isSelected) ring = 'ring-2 ring-amber-500';
    else if (isToday) ring = 'ring-2 ring-emerald-500';

    // Circle components with hover tooltip
    const MenCircle = ({ name }) => (
      <div className="relative group/dot flex-shrink-0">
        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-sky-500 shadow-md shadow-sky-500/40 border-2 border-white dark:border-slate-900 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95" />
        {name && (
          <div className="absolute bottom-full mb-1.5 right-1/2 translate-x-1/2 z-50 pointer-events-none">
            <div className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 bg-sky-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-xl">
              👔 {name}
            </div>
          </div>
        )}
      </div>
    );

    const WomenCircle = ({ name }) => (
      <div className="relative group/dot flex-shrink-0">
        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-400 shadow-md shadow-rose-400/40 border-2 border-white dark:border-slate-900 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95" />
        {name && (
          <div className="absolute bottom-full mb-1.5 right-1/2 translate-x-1/2 z-50 pointer-events-none">
            <div className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 bg-rose-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-xl">
              🌸 {name}
            </div>
          </div>
        )}
      </div>
    );

    return (
      <button
        key={gregorianDate}
        type="button"
        onClick={() => handleCellClick(gregorianDate)}
        onDoubleClick={() => handleOpenDialog(gregorianDate)}
        className={cn(
          "relative rounded-xl border p-1 flex flex-col items-center gap-1",
          "min-h-[64px] sm:min-h-[80px] transition-all duration-150 active:scale-95 cursor-pointer select-none",
          bg, ring,
          isSelected ? 'border-amber-400' : isToday ? 'border-emerald-400' : 'border-border/60'
        )}
      >
        {/* Day number */}
        <span className={cn(
          "text-sm sm:text-base font-black leading-none mt-1",
          isToday ? "text-emerald-600 dark:text-emerald-400"
            : isSelected ? "text-amber-600 dark:text-amber-400"
            : "text-foreground"
        )}>
          {dayNumber}
        </span>

        {/* Today indicator */}
        {isToday && (
          <span className="w-1 h-1 rounded-full bg-emerald-500" />
        )}

        {/* Section Circles */}
        {dayBookings.length > 0 && (
          <div className="flex items-center justify-center gap-1 flex-wrap mt-auto pb-0.5">
            {/* Both booking = blue + pink circles together */}
            {hasBothBooking && (
              <>
                <MenCircle name={bothNames} />
                <WomenCircle name={bothNames} />
              </>
            )}
            {/* Men-only booking */}
            {!hasBothBooking && hasMenBooking && (
              <MenCircle name={menNames} />
            )}
            {/* Women-only booking */}
            {!hasBothBooking && hasWomenBooking && (
              <WomenCircle name={womenNames} />
            )}
            {/* Extra bookings count */}
            {dayBookings.length > 2 && (
              <span className="text-[8px] text-muted-foreground font-black">+{dayBookings.length - 2}</span>
            )}
          </div>
        )}
      </button>
    );
  };

  // ─── Selected day data ──────────────────────────────────────────────────────
  const selectedDayBookings = getBookingsForDate(inlineSelectedDate);
  const selectedDayStatus = getDayStatus(selectedDayBookings);
  const selectedDayAvailableSections = getAvailableSections(selectedDayBookings);
  const selectedDayHijri = inlineSelectedDate ? gregorianToHijri(inlineSelectedDate) : '';

  return (
    <>
      <Card className="border-border/60 shadow-xl rounded-3xl overflow-hidden">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50 bg-gradient-to-r from-emerald-950/10 via-amber-500/5 to-card">

          {/* Row 1: Title + View switcher */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-black text-foreground leading-tight">جدول حجوزات القاعة</p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold leading-tight">
                  {calMode === 'hijri'
                    ? `${HIJRI_MONTHS[hijriViewMonth - 1]} ${hijriViewYear} هـ`
                    : format(calViewDate, 'MMMM yyyy', { locale: ar })}
                </p>
              </div>
            </div>

            {/* View type toggle (grid / agenda) */}
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted border border-border text-xs">
              <button
                type="button"
                onClick={() => setViewType('grid')}
                className={cn("px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all",
                  viewType === 'grid' ? "bg-card text-foreground shadow-sm border border-border/60" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">شهري</span>
              </button>
              <button
                type="button"
                onClick={() => setViewType('agenda')}
                className={cn("px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all",
                  viewType === 'agenda' ? "bg-card text-foreground shadow-sm border border-border/60" : "text-muted-foreground hover:text-foreground")}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">قائمة</span>
                {currentMonthBookings.length > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                    {currentMonthBookings.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Row 2: Month nav + Hijri/Gregorian toggle */}
          <div className="flex items-center justify-between gap-2">
            {/* Month Navigator */}
            <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-0.5 shadow-xs">
              <Button size="icon" variant="ghost" onClick={prevMonth} className="h-8 w-8 rounded-lg">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="px-2 text-center min-w-[100px] sm:min-w-[130px]">
                <p className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 leading-tight">
                  {calMode === 'hijri' ? `شهر (${hijriViewMonth}) • ${hijriViewYear} هـ` : `(${format(calViewDate, 'MM')}) • ${format(calViewDate, 'yyyy')} م`}
                </p>
                <p className="text-[10px] text-muted-foreground font-semibold leading-tight">
                  {calMode === 'hijri' ? HIJRI_MONTHS[hijriViewMonth - 1] : format(calViewDate, 'MMMM', { locale: ar })}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={nextMonth} className="h-8 w-8 rounded-lg">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Hijri/Gregorian toggle */}
              <div className="flex items-center p-0.5 rounded-xl bg-muted border border-border text-xs">
                <button type="button" onClick={() => setCalMode('hijri')}
                  className={cn("px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1",
                    calMode === 'hijri' ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground")}>
                  <Moon className="w-3 h-3" /> هجري
                </button>
                <button type="button" onClick={() => setCalMode('gregorian')}
                  className={cn("px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1",
                    calMode === 'gregorian' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}>
                  <Sun className="w-3 h-3" /> ميلادي
                </button>
              </div>

              <Button size="sm" variant="outline" onClick={resetToToday} className="h-8 px-3 text-xs rounded-xl font-bold">
                اليوم
              </Button>
            </div>
          </div>

          {/* Row 3: Stats strip + legend */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> {monthStats.availableDays} متاح
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> {monthStats.bookedDays} محجوز
            </span>
            {monthStats.partialDays > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> {monthStats.partialDays} جزئي
              </span>
            )}
            <span className="mr-auto hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground font-semibold">
              <span>👑 رجال ونساء</span>
              <span>👔 رجال فقط</span>
              <span>🌸 نساء فقط</span>
            </span>
          </div>
        </CardHeader>

        {/* ── CONTENT ─────────────────────────────────────────────────────── */}
        <CardContent className="p-2 sm:p-4">
          {viewType === 'grid' ? (
            <div>
              {/* Day headers - full names */}
              <div className="grid grid-cols-7 gap-1 mb-1.5">
                {HIJRI_DAYS.map((d, i) => {
                  const isWknd = d === 'الخميس' || d === 'الجمعة';
                  return (
                    <div key={i} className={cn(
                      "text-center text-[9px] sm:text-[11px] font-black py-1.5 rounded-lg leading-tight",
                      isWknd ? "text-amber-600 dark:text-amber-400 bg-amber-500/10" : "text-muted-foreground bg-muted/40"
                    )}>
                      {d}
                    </div>
                  );
                })}
              </div>

              {/* Cells */}
              {calMode === 'hijri' ? (
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {hijriCalDays.map((day, i) => {
                    if (!day) return <div key={i} className="min-h-[56px] sm:min-h-[72px] rounded-xl" />;
                    const hijriStr = `${hijriViewYear}/${String(hijriViewMonth).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
                    const gDate = moment(hijriStr, 'iYYYY/iMM/iDD').format('YYYY-MM-DD');
                    return renderDayCell(day, getBookingsForDate(gDate), isTodayDate(gDate), gDate, HIJRI_DAYS[i % 7]);
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {Array.from({ length: calDays.startDow }).map((_, i) => (
                    <div key={`e-${i}`} className="min-h-[56px] sm:min-h-[72px] rounded-xl" />
                  ))}
                  {calDays.days.map((day, idx) => {
                    const gDate = format(day, 'yyyy-MM-dd');
                    return renderDayCell(format(day, 'd'), getBookingsForDate(gDate), isTodayDate(gDate), gDate, HIJRI_DAYS[(calDays.startDow + idx) % 7]);
                  })}
                </div>
              )}

              {/* ── SELECTED DAY PANEL ─────────────────────────────────────── */}
              <div className="mt-4 rounded-2xl border border-border/70 bg-card/80 overflow-hidden shadow-sm">
                {/* Panel header */}
                <div className="flex items-center justify-between gap-2 p-3 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-black text-foreground">{selectedDayHijri} هـ</p>
                      <p className="text-[10px] text-muted-foreground">
                        {inlineSelectedDate ? format(new Date(inlineSelectedDate), 'EEEE، dd MMMM yyyy', { locale: ar }) : ''}
                      </p>
                    </div>
                    <Badge className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-lg ml-1",
                      selectedDayStatus === 'full' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                        : selectedDayStatus === 'partial' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    )}>
                      {selectedDayStatus === 'full' ? '● محجوز' : selectedDayStatus === 'partial' ? '◑ جزئي' : '○ متاح'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {selectedDayAvailableSections.length > 0 && (
                      <Button size="sm" onClick={() => openQuickBookingForDate(inlineSelectedDate)}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black h-8 text-xs rounded-xl px-3 shadow-sm">
                        <Plus className="w-3.5 h-3.5 ml-1" /> حجز
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleOpenDialog(inlineSelectedDate)}
                      className="h-8 text-xs rounded-xl font-bold px-3">
                      <Eye className="w-3.5 h-3.5 ml-1" /> تفاصيل
                    </Button>
                  </div>
                </div>

                {/* Panel bookings */}
                <div className="p-3">
                  {selectedDayBookings.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDayBookings.map(b => {
                        const sec = getSectionBadge(b.hall_section);
                        return (
                          <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/60 hover:border-amber-400/50 transition-colors">
                            <span className={cn("w-3 h-3 rounded-full flex-shrink-0 shadow-xs", sec.dotClass)} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-sm text-foreground truncate">{b.customer_name}</span>
                                <span className="text-[10px] font-bold text-muted-foreground">{sec.icon} {sec.label}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                <span>{b.event_type}</span>
                                <span>•</span>
                                <span className={cn("font-bold", (b.remaining_amount || 0) > 0 ? "text-rose-600" : "text-emerald-600")}>
                                  {(b.remaining_amount || 0) > 0 ? `متبقي: ${formatCurrency(b.remaining_amount)}` : 'خالص ✓'}
                                </span>
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {b.customer_phone && (
                                <Button size="icon" variant="ghost" onClick={() => openWhatsApp(b)}
                                  className="h-8 w-8 text-emerald-600 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => navigate(`/bookings/${b.id}`)}
                                className="h-8 w-8 text-muted-foreground rounded-xl hover:text-primary">
                                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>القاعة متاحة بالكامل في هذا اليوم</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── AGENDA VIEW ───────────────────────────────────────────────── */
            <div className="space-y-2.5">
              {currentMonthBookings.length > 0 ? (
                currentMonthBookings.map(b => {
                  const sec = getSectionBadge(b.hall_section);
                  const hijriDateDisplay = b.event_date_hijri || gregorianToHijri(b.event_date);
                  return (
                    <div key={b.id}
                      className="p-3.5 rounded-2xl border border-border/80 bg-card hover:border-amber-400/40 transition-all shadow-xs flex items-center gap-3">
                      {/* Date badge */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-950 to-slate-900 text-white flex flex-col items-center justify-center flex-shrink-0 border border-amber-500/30">
                        <span className="text-sm font-black text-amber-400 leading-none">{hijriDateDisplay?.split('/')[2]}</span>
                        <span className="text-[9px] text-emerald-300 mt-0.5 leading-none">{HIJRI_MONTHS[hijriViewMonth - 1]}</span>
                      </div>
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="font-black text-sm text-foreground truncate">{b.customer_name}</span>
                          <Badge className={cn("text-[10px] px-2 py-0 rounded-lg border", sec.badgeClass)}>{sec.icon} {sec.label}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <span>{b.event_type}</span>
                          <span>•</span>
                          <span className="font-mono">{b.customer_phone}</span>
                          <span>•</span>
                          <span className={cn("font-bold", (b.remaining_amount || 0) > 0 ? "text-rose-600" : "text-emerald-600")}>
                            {(b.remaining_amount || 0) > 0 ? `متبقي: ${formatCurrency(b.remaining_amount)}` : 'خالص ✓'}
                          </span>
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {b.customer_phone && (
                          <Button size="icon" variant="ghost" onClick={() => openWhatsApp(b)}
                            className="h-8 w-8 text-emerald-600 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                            <MessageSquare className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/bookings/${b.id}`)}
                          className="h-8 w-8 text-muted-foreground rounded-xl hover:text-primary">
                          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 rounded-2xl bg-muted/10 border border-dashed border-border/60">
                  <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-amber-500/40" />
                  <p className="font-bold text-foreground text-sm">لا توجد حجوزات في هذا الشهر</p>
                  <Button size="sm" onClick={() => openQuickBookingForDate(todayStr)}
                    className="mt-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl">
                    <Plus className="w-4 h-4 ml-1" /> تسجيل حجز جديد
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDialogDate && (
        <DayBookingsDialog
          open={!!selectedDialogDate}
          onClose={() => setSelectedDialogDate(null)}
          date={selectedDialogDate}
          bookings={getBookingsForDate(selectedDialogDate)}
        />
      )}

      {showQuickBook && (
        <QuickBookingDialog
          open={showQuickBook}
          onClose={() => { setShowQuickBook(false); setQuickBookPresetDate(null); }}
          presetDate={quickBookPresetDate}
          presetHijri={quickBookPresetHijri}
        />
      )}
    </>
  );
}