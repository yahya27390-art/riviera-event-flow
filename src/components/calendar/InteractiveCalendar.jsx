import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, ChevronRight, ChevronLeft, 
  Sparkles, CheckCircle2, Clock, Users, Plus, ArrowRight,
  Eye, CalendarCheck, Moon, Sun, LayoutGrid, List,
  MessageSquare, Phone, MapPin, AlertCircle, ShieldCheck, Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import moment from 'moment-hijri';
import { HIJRI_MONTHS, HIJRI_DAYS, getHijriMonthGrid, gregorianToHijri } from '@/lib/hijri';
import DayBookingsDialog from './DayBookingsDialog';
import QuickBookingDialog from '@/components/bookings/QuickBookingDialog';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils/bookingNumber';
import { cn } from '@/lib/utils';

/**
 * Returns distinct luxury styling and labels for hall sections:
 * - 👑 رجال ونساء (القاعة بالكامل)
 * - 👔 رجال فقط (قسم الرجال)
 * - 👗 نساء فقط (قسم النساء)
 */
export function getSectionBadge(section) {
  const s = (section || '').trim();
  if (!s || s === 'رجال ونساء' || s.includes('كامل') || s === 'القسمين' || s.includes('معاً')) {
    return {
      type: 'both',
      label: '👑 القاعة بالكامل (رجال ونساء)',
      shortLabel: '👑 رجال ونساء',
      tagText: 'رجال ونساء',
      badgeClass: 'bg-amber-500/20 text-amber-950 dark:text-amber-200 border-amber-500/50 font-black',
      pillClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black border-amber-400',
      dotClass: 'bg-amber-500',
      icon: '👑',
    };
  }
  if (s.includes('نساء')) {
    return {
      type: 'women',
      label: '👗 قسم النساء فقط',
      shortLabel: '👗 نساء فقط',
      tagText: 'نساء فقط',
      badgeClass: 'bg-pink-500/20 text-pink-950 dark:text-pink-200 border-pink-500/50 font-black',
      pillClass: 'bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black border-pink-400',
      dotClass: 'bg-pink-500',
      icon: '👗',
    };
  }
  if (s.includes('رجال')) {
    return {
      type: 'men',
      label: '👔 قسم الرجال فقط',
      shortLabel: '👔 رجال فقط',
      tagText: 'رجال فقط',
      badgeClass: 'bg-emerald-600/20 text-emerald-950 dark:text-emerald-200 border-emerald-500/50 font-black',
      pillClass: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black border-emerald-400',
      dotClass: 'bg-emerald-500',
      icon: '👔',
    };
  }
  return {
    type: 'other',
    label: s,
    shortLabel: s,
    tagText: s,
    badgeClass: 'bg-primary/20 text-primary border-primary/50 font-bold',
    pillClass: 'bg-primary text-primary-foreground font-bold',
    dotClass: 'bg-primary',
    icon: '✨',
  };
}

export function getDayStatus(dayBookings) {
  if (!dayBookings || dayBookings.length === 0) return 'available';
  const hasBoth = dayBookings.some(b => b.hall_section === 'رجال ونساء' || !b.hall_section);
  if (hasBoth) return 'full';
  const hasMen = dayBookings.some(b => b.hall_section === 'رجال فقط');
  const hasWomen = dayBookings.some(b => b.hall_section === 'نساء فقط');
  if (hasMen && hasWomen) return 'full';
  return 'partial';
}

export function getAvailableSections(dayBookings) {
  if (!dayBookings || dayBookings.length === 0) return ['رجال فقط', 'نساء فقط', 'رجال ونساء'];
  const hasBoth = dayBookings.some(b => b.hall_section === 'رجال ونساء' || !b.hall_section);
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
      if (hijriViewMonth === 1) { 
        setHijriViewMonth(12); 
        setHijriViewYear(y => y - 1); 
      } else {
        setHijriViewMonth(m => m - 1);
      }
    } else {
      setCalViewDate(d => subMonths(d, 1));
    }
  };

  const nextMonth = () => {
    if (calMode === 'hijri') {
      if (hijriViewMonth === 12) { 
        setHijriViewMonth(1); 
        setHijriViewYear(y => y + 1); 
      } else {
        setHijriViewMonth(m => m + 1);
      }
    } else {
      setCalViewDate(d => addMonths(d, 1));
    }
  };

  const resetToToday = () => {
    setCalViewDate(new Date());
    setHijriViewYear(parseInt(todayMoment.format('iYYYY'), 10));
    setHijriViewMonth(parseInt(todayMoment.format('iMM'), 10));
    setInlineSelectedDate(todayStr);
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

  // Month bookings for Agenda/List view
  const currentMonthBookings = useMemo(() => {
    return activeBookings.filter(b => {
      if (!b.event_date) return false;
      if (calMode === 'hijri') {
        let bYear = null;
        let bMonth = null;
        if (b.event_date_hijri && b.event_date_hijri.includes('/')) {
          const parts = b.event_date_hijri.split('/');
          bYear = parseInt(parts[0], 10);
          bMonth = parseInt(parts[1], 10);
        } else {
          try {
            const m = moment(b.event_date, 'YYYY-MM-DD');
            bYear = parseInt(m.format('iYYYY'), 10);
            bMonth = parseInt(m.format('iMM'), 10);
          } catch {
            return false;
          }
        }
        return bYear === hijriViewYear && bMonth === hijriViewMonth;
      } else {
        const monthPrefix = format(calViewDate, 'yyyy-MM');
        return b.event_date.startsWith(monthPrefix);
      }
    }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  }, [activeBookings, calMode, calViewDate, hijriViewYear, hijriViewMonth]);

  // Handle cell click
  const handleCellClick = (gregorianDate) => {
    setInlineSelectedDate(gregorianDate);
  };

  const handleOpenDialog = (gregorianDate) => {
    setSelectedDialogDate(gregorianDate);
  };

  const openQuickBookingForDate = (gregDate) => {
    const hDate = gregorianToHijri(gregDate);
    setQuickBookPresetDate(gregDate);
    setQuickBookPresetHijri(hDate);
    setShowQuickBook(true);
  };

  const openWhatsApp = (b) => {
    if (!b.customer_phone) return;
    const cleanPhone = b.customer_phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('966') ? cleanPhone : `966${cleanPhone.replace(/^0+/, '')}`;
    const text = encodeURIComponent(
      `السلام عليكم ورحمة الله وبركاته\nالأستاذ/ة: ${b.customer_name}\nنود تذكيركم بموعد حجزكم في قاعة قمة الريف بتاريخ ${b.event_date_hijri || gregorianToHijri(b.event_date)} هـ.\nالقسم المحجوز: ${b.hall_section || 'كامل القاعة'}\nالمبلغ المتبقي: ${formatCurrency(b.remaining_amount)}\nنسعد بخدمتكم دائماً!`
    );
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  // Render a day cell in the calendar grid with high-definition styling and prominent hall labels
  const renderDayCell = (dayNumber, dayBookings, isToday, gregorianDate, dayOfWeekName) => {
    const status = getDayStatus(dayBookings);
    const isWeekend = dayOfWeekName === 'الخميس' || dayOfWeekName === 'الجمعة';
    const isSelected = inlineSelectedDate === gregorianDate;

    let cellBg = 'bg-card hover:bg-muted/40 border-border/70';
    let ringStyle = '';

    if (isSelected) {
      ringStyle = 'ring-2.5 ring-amber-500 shadow-lg shadow-amber-500/25 border-amber-500 bg-amber-500/10 dark:bg-amber-950/30';
    } else if (isToday) {
      ringStyle = 'ring-2 ring-emerald-500/90 border-emerald-500/60 bg-emerald-500/5';
    }

    if (status === 'full') {
      cellBg = isSelected ? cellBg : 'bg-rose-500/10 dark:bg-rose-950/25 border-rose-300 dark:border-rose-900/80 hover:bg-rose-500/15';
    } else if (status === 'partial') {
      cellBg = isSelected ? cellBg : 'bg-amber-500/10 dark:bg-amber-950/25 border-amber-300 dark:border-amber-900/80 hover:bg-amber-500/15';
    } else if (isWeekend && !isSelected) {
      cellBg = 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20';
    }

    return (
      <button
        key={gregorianDate}
        type="button"
        onClick={() => handleCellClick(gregorianDate)}
        onDoubleClick={() => handleOpenDialog(gregorianDate)}
        className={cn(
          "group relative rounded-2xl p-1.5 sm:p-2.5 min-h-[82px] sm:min-h-[105px] flex flex-col justify-between text-right transition-all duration-200 cursor-pointer border shadow-xs select-none",
          cellBg, ringStyle,
          "hover:-translate-y-0.5 active:scale-[0.98]"
        )}
      >
        {/* Top bar: Crisp Hijri Day Number + Today Pill + Status Indicators */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-base sm:text-lg font-black tracking-tight font-sans leading-none",
              isToday ? "text-emerald-600 dark:text-emerald-400" : isSelected ? "text-amber-600 dark:text-amber-400" : "text-foreground"
            )}>
              {dayNumber}
            </span>
            {isToday && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-black shadow-xs">
                اليوم
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {status === 'full' && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs shadow-rose-500/50 animate-pulse" title="القاعة محجوزة بالكامل" />
            )}
            {status === 'partial' && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs shadow-amber-500/50" title="حجز جزئي - قسم متاح" />
            )}
            {status === 'available' && isWeekend && (
              <span className="text-[9px] text-amber-600/80 dark:text-amber-400/80 font-bold hidden sm:inline-block">عطلة</span>
            )}
          </div>
        </div>

        {/* Middle: Prominent Booked Halls / Sections directly in the cell */}
        <div className="w-full mt-1.5 space-y-1">
          {dayBookings.length > 0 ? (
            <>
              {dayBookings.slice(0, 2).map((b, idx) => {
                const sec = getSectionBadge(b.hall_section);
                return (
                  <div 
                    key={idx}
                    className={cn(
                      "w-full px-1.5 py-1 rounded-xl text-[9.5px] sm:text-[11px] font-black border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-1 shadow-2xs transition-all",
                      sec.badgeClass
                    )}
                  >
                    {/* Explicit Section Name */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={cn("w-1.5 h-1.5 rounded-full", sec.dotClass)}></span>
                      <span className="font-black text-[9px] sm:text-[10px] tracking-tight text-foreground">
                        {sec.shortLabel}
                      </span>
                    </div>

                    {/* Customer Name */}
                    <span className="truncate font-bold text-[8.5px] sm:text-[9.5px] opacity-90 text-foreground">
                      {b.customer_name}
                    </span>
                  </div>
                );
              })}
              {dayBookings.length > 2 && (
                <div className="text-[9px] text-muted-foreground font-black text-center bg-muted/60 rounded-md py-0.5">
                  +{dayBookings.length - 2} حجز إضافي
                </div>
              )}
            </>
          ) : (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1 py-1">
              <span>+ متاح للحجز</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  // Selected Day data for inline inspector
  const selectedDayBookings = getBookingsForDate(inlineSelectedDate);
  const selectedDayStatus = getDayStatus(selectedDayBookings);
  const selectedDayAvailableSections = getAvailableSections(selectedDayBookings);
  const selectedDayHijri = inlineSelectedDate ? gregorianToHijri(inlineSelectedDate) : '';

  return (
    <>
      <Card className="glass-card border-amber-500/20 shadow-2xl overflow-hidden rounded-3xl bg-gradient-to-b from-card via-card to-card/95">
        {/* Luxury Header Toolbar */}
        <CardHeader className="p-4 sm:p-6 border-b border-border/60 bg-gradient-to-r from-emerald-950/20 via-amber-500/10 to-card">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            
            {/* Title & Statement (اسم الشهر ورقم الشهر الهجري المعتمد) */}
            <div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
                  <Crown className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-2xl font-black text-foreground flex items-center gap-2">
                    <span>جدول حجوزات وتوافر القاعة</span>
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px] font-black px-2.5 py-0.5">
                      التقويم الهجري المعتمد
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1 text-muted-foreground flex items-center gap-2 flex-wrap font-medium">
                    <span>مواعيد</span>
                    <strong className="text-amber-600 dark:text-amber-400 font-extrabold text-sm">
                      {calMode === 'hijri' 
                        ? `شهر ${HIJRI_MONTHS[hijriViewMonth - 1]} (الشهر ${hijriViewMonth}) لعام ${hijriViewYear} هـ` 
                        : `${format(calViewDate, 'MMMM yyyy', { locale: ar })} م`}
                    </strong>
                    <span className="hidden sm:inline">• تصفح الأيام وحالة الأقسام المحجوزة</span>
                  </CardDescription>
                </div>
              </div>
            </div>

            {/* Controls Bar: iPhone Segmented Control + Month Navigator + Mode */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              
              {/* iOS Segmented View Switcher */}
              <div className="flex items-center p-1 rounded-2xl bg-muted/80 border border-border text-xs shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewType('grid')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-bold cursor-pointer",
                    viewType === 'grid'
                      ? "bg-card text-foreground shadow-sm font-black border border-border/60 scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="عرض التقويم الشهري الكامل"
                >
                  <LayoutGrid className="w-4 h-4 text-amber-500" />
                  <span>التقويم الشهري</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewType('agenda')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-bold cursor-pointer",
                    viewType === 'agenda'
                      ? "bg-card text-foreground shadow-sm font-black border border-border/60 scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="عرض قائمة الحجوزات لهذا الشهر"
                >
                  <List className="w-4 h-4 text-amber-500" />
                  <span>قائمة الحجوزات ({currentMonthBookings.length})</span>
                </button>
              </div>

              {/* Mode switch (Hijri Primary / Gregorian Secondary) */}
              <div className="flex items-center p-1 rounded-2xl bg-muted/80 border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setCalMode('hijri')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    calMode === 'hijri' 
                      ? "bg-emerald-600 text-white shadow-sm font-black" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Moon className="w-3.5 h-3.5" /> هجري
                </button>
                <button
                  type="button"
                  onClick={() => setCalMode('gregorian')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    calMode === 'gregorian' 
                      ? "bg-primary text-primary-foreground shadow-sm font-black" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sun className="w-3.5 h-3.5" /> ميلادي
                </button>
              </div>

              {/* Month Navigator (بيانات الشهر العليا برقم الشهر) */}
              <div className="flex items-center gap-1 bg-card border border-border rounded-2xl p-1 shadow-sm">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={prevMonth} 
                  className="h-8 w-8 text-foreground rounded-xl hover:bg-muted"
                  title="الشهر السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                {/* الشهر الهجري برقم الشهر في الأعلى واسم الشهر تحته */}
                <div className="px-3 text-center min-w-[135px] sm:min-w-[160px]">
                  {calMode === 'hijri' ? (
                    <div>
                      <div className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 leading-tight">
                        شهر ({hijriViewMonth}) • {hijriViewYear} هـ
                      </div>
                      <div className="text-[11px] font-bold text-muted-foreground leading-tight mt-0.5">
                        شهر {HIJRI_MONTHS[hijriViewMonth - 1]}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm sm:text-base font-black text-primary leading-tight">
                        شهر ({format(calViewDate, 'MM')}) • {format(calViewDate, 'yyyy')} م
                      </div>
                      <div className="text-[11px] font-bold text-muted-foreground leading-tight mt-0.5">
                        {format(calViewDate, 'MMMM yyyy', { locale: ar })}
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={nextMonth} 
                  className="h-8 w-8 text-foreground rounded-xl hover:bg-muted"
                  title="الشهر التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>

              <Button 
                size="sm" 
                variant="outline" 
                onClick={resetToToday} 
                className="text-xs h-9 px-3.5 rounded-xl font-black border-border shadow-2xs"
              >
                اليوم
              </Button>
            </div>
          </div>

          {/* Month Quick Status Badges & Section Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-border/50 mt-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold py-1 px-2.5 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1.5 shadow-xs"></span>
                {monthStats.availableDays} يوم متاح بالكامل
              </Badge>
              <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-xs font-bold py-1 px-2.5 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-rose-500 ml-1.5 shadow-xs"></span>
                {monthStats.bookedDays} يوم محجوز بالكامل
              </Badge>
              {monthStats.partialDays > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold py-1 px-2.5 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-amber-500 ml-1.5 shadow-xs"></span>
                  {monthStats.partialDays} يوم به حجز جزئي
                </Badge>
              )}
            </div>
            
            {/* Section Badges Legend */}
            <div className="flex items-center gap-2.5 text-[11px] font-black">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/40">
                👑 رجال ونساء
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border border-emerald-500/40">
                👔 رجال فقط
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-pink-500/15 text-pink-900 dark:text-pink-300 border border-pink-500/40">
                👗 نساء فقط
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-6">
          {viewType === 'grid' ? (
            <div>
              {/* Day of week headers */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 mb-2">
                {HIJRI_DAYS.map((dayName, idx) => {
                  const isWeekend = dayName === 'الخميس' || dayName === 'الجمعة';
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "text-center text-xs sm:text-sm font-black py-2 rounded-2xl shadow-2xs border transition-colors",
                        isWeekend 
                          ? "text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/30 font-black" 
                          : "text-muted-foreground bg-muted/40 border-border/50"
                      )}
                    >
                      {dayName}
                    </div>
                  );
                })}
              </div>

              {/* Day Cells Grid */}
              {calMode === 'hijri' ? (
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
                  {hijriCalDays.map((day, i) => {
                    if (!day) return <div key={i} className="min-h-[82px] sm:min-h-[105px] rounded-2xl bg-muted/10 border border-dashed border-border/30" />;
                    const hijriStr = `${hijriViewYear}/${String(hijriViewMonth).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
                    const gDate = moment(hijriStr, 'iYYYY/iMM/iDD').format('YYYY-MM-DD');
                    const dayBookings = getBookingsForDate(gDate);
                    const dayOfWeekIdx = i % 7;
                    const dayOfWeekName = HIJRI_DAYS[dayOfWeekIdx];
                    return renderDayCell(day, dayBookings, isTodayDate(gDate), gDate, dayOfWeekName);
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
                  {Array.from({ length: calDays.startDow }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[82px] sm:min-h-[105px] rounded-2xl bg-muted/10 border border-dashed border-border/30" />
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

              {/* iPhone / Mobile Interactive Selected Day Inspector Panel */}
              <div className="mt-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-card via-muted/40 to-card border border-amber-500/30 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-border/60">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md flex-shrink-0">
                      <Clock className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base sm:text-lg font-black text-foreground">
                          {selectedDayHijri ? `${selectedDayHijri} هـ` : ''}
                        </h4>
                        <Badge className={cn(
                          "text-xs font-black px-2.5 py-0.5 rounded-xl border",
                          selectedDayStatus === 'full' 
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" 
                            : selectedDayStatus === 'partial' 
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" 
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        )}>
                          {selectedDayStatus === 'full' ? '🔴 محجوز بالكامل' : selectedDayStatus === 'partial' ? '🟡 حجز جزئي' : '🟢 متاح بالكامل للحجز'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inlineSelectedDate ? format(new Date(inlineSelectedDate), 'EEEE، dd MMMM yyyy', { locale: ar }) : ''} م
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedDayAvailableSections.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => openQuickBookingForDate(inlineSelectedDate)}
                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs h-9 shadow-md shadow-amber-500/20"
                      >
                        <Plus className="w-4 h-4 ml-1 stroke-[3]" /> إضافة حجز في هذا اليوم
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(inlineSelectedDate)}
                      className="rounded-xl text-xs h-9 font-bold border-border"
                    >
                      <Eye className="w-3.5 h-3.5 ml-1" /> إدارة وتفاصيل اليوم
                    </Button>
                  </div>
                </div>

                {/* Selected Day Bookings Detail List */}
                <div className="mt-4">
                  {selectedDayBookings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {selectedDayBookings.map(b => {
                        const sec = getSectionBadge(b.hall_section);
                        return (
                          <div 
                            key={b.id}
                            className="p-4 rounded-2xl bg-card border border-border/80 flex items-center justify-between gap-3 shadow-sm hover:border-amber-500/50 transition-all"
                          >
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-sm sm:text-base text-foreground truncate">{b.customer_name}</span>
                                <Badge className={cn("text-xs px-2.5 py-0.5 rounded-xl border shadow-2xs", sec.badgeClass)}>
                                  {sec.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap font-medium">
                                <span>{b.event_type}</span>
                                <span>•</span>
                                <span className="font-mono" dir="ltr">{b.customer_phone}</span>
                                <span>•</span>
                                <span className="font-black text-primary">{formatCurrency(b.final_amount)}</span>
                              </p>
                              {(b.remaining_amount || 0) > 0 ? (
                                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                  متبقي للتحصيل: {formatCurrency(b.remaining_amount)}
                                </p>
                              ) : (
                                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> خالص السداد بالكامل
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {b.customer_phone && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openWhatsApp(b)}
                                  className="h-9 w-9 text-emerald-600 hover:bg-emerald-500/10 rounded-xl"
                                  title="مراسلة واتساب"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => navigate(`/bookings/${b.id}`)}
                                className="h-9 w-9 text-muted-foreground hover:text-primary rounded-xl"
                                title="عرض العقد الكامل"
                              >
                                <ArrowRight className="w-4 h-4 rotate-180" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-5 text-center text-xs sm:text-sm text-muted-foreground font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span>جميع أقسام القاعة متاحة للحجز في هذا اليوم (قسم الرجال وقسم النساء).</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Agenda / List View (Optimized for Mobile & iPhone) */
            <div className="space-y-3.5">
              {currentMonthBookings.length > 0 ? (
                currentMonthBookings.map((b) => {
                  const sec = getSectionBadge(b.hall_section);
                  const hijriDateDisplay = b.event_date_hijri || gregorianToHijri(b.event_date);
                  const gregFormatted = b.event_date ? format(new Date(b.event_date), 'dd MMMM yyyy', { locale: ar }) : '-';

                  return (
                    <div 
                      key={b.id}
                      className="p-4 sm:p-5 rounded-3xl border border-border/80 bg-card hover:bg-muted/30 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        {/* Date badge */}
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-950 to-slate-900 text-white flex flex-col items-center justify-center font-black flex-shrink-0 shadow-md border border-amber-500/30">
                          <span className="text-base leading-none text-amber-400">
                            {hijriDateDisplay ? hijriDateDisplay.split('/')[2] : '--'}
                          </span>
                          <span className="text-[10px] text-emerald-200 mt-1 leading-none font-bold">
                            {HIJRI_MONTHS[hijriViewMonth - 1]}
                          </span>
                        </div>

                        {/* Booking & Section details */}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-base text-foreground">{b.customer_name}</span>
                            {/* Prominent Hall Section Badge */}
                            <Badge className={cn("text-xs px-2.5 py-0.5 rounded-xl border shadow-2xs", sec.badgeClass)}>
                              {sec.label}
                            </Badge>
                            <Badge variant="outline" className={b.status === 'مؤكد' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold' : 'bg-amber-500/10 text-amber-700 border-amber-500/20 font-bold'}>
                              {b.status}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap font-medium">
                            <span>{b.event_type}</span>
                            <span>•</span>
                            <strong className="text-foreground">{hijriDateDisplay} هـ</strong>
                            <span className="opacity-75">({gregFormatted} م)</span>
                            {b.voucher_number && <span>• سند: #{b.voucher_number}</span>}
                          </p>

                          <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                            {b.customer_phone}
                          </p>
                        </div>
                      </div>

                      {/* Financial info & action buttons */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                        <div className="text-right sm:text-left">
                          <span className="text-[11px] text-muted-foreground block font-semibold">إجمالي العقد</span>
                          <span className="font-black text-base text-primary block">{formatCurrency(b.final_amount)}</span>
                          <span className={cn(
                            "text-[10px] font-bold block",
                            (b.remaining_amount || 0) > 0 ? "text-rose-600" : "text-emerald-600"
                          )}>
                            {(b.remaining_amount || 0) > 0 ? `متبقي: ${formatCurrency(b.remaining_amount)}` : 'خالص السداد ✓'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {b.customer_phone && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openWhatsApp(b)}
                              className="h-9 w-9 text-emerald-600 hover:bg-emerald-500/10 rounded-xl"
                              title="مراسلة واتساب"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/bookings/${b.id}`)}
                            className="rounded-xl text-xs font-black h-9 border-border"
                          >
                            <span>تفاصيل العقد</span>
                            <ArrowRight className="w-3.5 h-3.5 mr-1 rotate-180" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 text-muted-foreground flex flex-col items-center justify-center rounded-3xl bg-muted/10 border border-dashed border-border/80">
                  <CalendarCheck className="w-12 h-12 mb-3 text-amber-500/40" />
                  <p className="font-black text-base text-foreground">لا توجد حجوزات مسجلة في هذا الشهر</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    يمكنك تصفح الأشهر الأخرى أو الضغط على أي يوم لإضافة حجز جديد.
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => openQuickBookingForDate(todayStr)} 
                    className="mt-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl shadow-md"
                  >
                    <Plus className="w-4 h-4 ml-1" /> تسجيل حجز جديد
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Booking Modal Dialog */}
      {selectedDialogDate && (
        <DayBookingsDialog
          open={!!selectedDialogDate}
          onClose={() => setSelectedDialogDate(null)}
          date={selectedDialogDate}
          bookings={getBookingsForDate(selectedDialogDate)}
        />
      )}

      {/* Quick Booking Dialog */}
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