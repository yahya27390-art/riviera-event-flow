import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, ChevronRight, ChevronLeft, 
  Sparkles, CheckCircle2, Clock, Users, Plus, ArrowRight,
  Eye, CalendarCheck, Moon, Sun, LayoutGrid, List,
  MessageSquare, Phone, MapPin, AlertCircle
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
 * Returns distinct styling and labels for hall sections:
 * - 👑 القاعة بالكامل (رجال ونساء)
 * - 🌸 قسم النساء فقط
 * - ☕ قسم الرجال فقط
 */
export function getSectionBadge(section) {
  const s = (section || '').trim();
  if (!s || s === 'رجال ونساء' || s.includes('كامل') || s === 'القسمين') {
    return {
      type: 'both',
      label: '👑 القاعة بالكامل (رجال ونساء)',
      shortLabel: '👑 رجال ونساء',
      badgeClass: 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-500/40 font-black',
      dotClass: 'bg-amber-500',
    };
  }
  if (s.includes('نساء')) {
    return {
      type: 'women',
      label: '🌸 قسم النساء فقط',
      shortLabel: '🌸 نساء فقط',
      badgeClass: 'bg-pink-500/15 text-pink-900 dark:text-pink-300 border-pink-500/40 font-black',
      dotClass: 'bg-pink-500',
    };
  }
  if (s.includes('رجال')) {
    return {
      type: 'men',
      label: '☕ قسم الرجال فقط',
      shortLabel: '☕ رجال فقط',
      badgeClass: 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border-emerald-500/40 font-black',
      dotClass: 'bg-emerald-500',
    };
  }
  return {
    type: 'other',
    label: s,
    shortLabel: s,
    badgeClass: 'bg-primary/15 text-primary border-primary/40 font-bold',
    dotClass: 'bg-primary',
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
  const [hijriViewYear, setHijriViewYear] = useState(parseInt(todayMoment.format('iYYYY')));
  const [hijriViewMonth, setHijriViewMonth] = useState(parseInt(todayMoment.format('iMM')));

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
    setHijriViewYear(parseInt(todayMoment.format('iYYYY')));
    setHijriViewMonth(parseInt(todayMoment.format('iMM')));
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

  // Robust month bookings filter for Agenda/List view
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

  // Handle cell click (iPhone inline inspector + double tap/click opens dialog)
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
      `السلام عليكم ورحمة الله وبركاته\nالأستاذ/ة: ${b.customer_name}\nنود تذكيركم بموعد حجزكم في قاعة قمة الريف بتاريخ ${b.event_date_hijri || gregorianToHijri(b.event_date)} هـ (${b.event_date} م).\nالقسم المحجوز: ${b.hall_section || 'كامل القاعة'}\nالمبلغ المتبقي: ${formatCurrency(b.remaining_amount)}\nنسعد بخدمتكم دائماً!`
    );
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  // Render a day cell in the calendar grid
  const renderDayCell = (dayNumber, dayBookings, isToday, gregorianDate, dayOfWeekName) => {
    const status = getDayStatus(dayBookings);
    const isWeekend = dayOfWeekName === 'الخميس' || dayOfWeekName === 'الجمعة';
    const isSelected = inlineSelectedDate === gregorianDate;

    let cellBg = 'bg-card hover:bg-muted/40 border-border/70';
    let ringStyle = '';
    let statusDot = null;

    if (isSelected) {
      ringStyle = 'ring-2.5 ring-amber-500 shadow-md shadow-amber-500/20 border-amber-500 bg-amber-500/10 dark:bg-amber-950/30';
    } else if (isToday) {
      ringStyle = 'ring-2 ring-emerald-500/80 border-emerald-500/50 bg-emerald-500/5';
    }

    if (status === 'full') {
      cellBg = isSelected ? cellBg : 'bg-rose-500/10 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 hover:bg-rose-500/15';
      statusDot = <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="القاعة محجوزة بالكامل"></span>;
    } else if (status === 'partial') {
      cellBg = isSelected ? cellBg : 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900 hover:bg-amber-500/15';
      statusDot = <span className="w-2 h-2 rounded-full bg-amber-500" title="حجز جزئي - قسم متاح"></span>;
    } else if (isWeekend && !isSelected) {
      cellBg = 'bg-muted/20 hover:bg-muted/50 border-border/80';
    }

    const gDay = gregorianDate ? parseInt(gregorianDate.split('-')[2], 10) : '';

    return (
      <button
        key={gregorianDate}
        type="button"
        onClick={() => handleCellClick(gregorianDate)}
        onDoubleClick={() => handleOpenDialog(gregorianDate)}
        className={cn(
          "group relative rounded-2xl p-1.5 sm:p-2.5 min-h-[72px] sm:min-h-[86px] flex flex-col justify-between text-right transition-all duration-200 cursor-pointer border shadow-2xs",
          cellBg, ringStyle,
          "hover:-translate-y-0.5 active:scale-[0.98]"
        )}
      >
        {/* Top bar: Day number (Hijri Primary) + Gregorian secondary + badges */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            <span className={cn(
              "text-sm sm:text-base font-black tracking-tight",
              isToday ? "text-emerald-600 dark:text-emerald-400" : isSelected ? "text-amber-600 dark:text-amber-400" : "text-foreground"
            )}>
              {dayNumber}
            </span>
            {calMode === 'hijri' && gregorianDate && (
              <span className="text-[10px] text-muted-foreground font-mono opacity-70 mr-0.5">
                ({gDay}م)
              </span>
            )}
            {isToday && (
              <span className="text-[8.5px] px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-black">
                اليوم
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {statusDot}
            {isWeekend && status === 'available' && (
              <span className="text-[8.5px] text-muted-foreground font-medium hidden sm:inline-block">عطلة</span>
            )}
          </div>
        </div>

        {/* Middle: Prominent Bookings with Section Tags */}
        <div className="w-full mt-1 space-y-1">
          {dayBookings.length > 0 ? (
            <>
              {dayBookings.slice(0, 2).map((b, idx) => {
                const sec = getSectionBadge(b.hall_section);
                return (
                  <div 
                    key={idx}
                    className={cn(
                      "px-1 sm:px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] truncate border flex items-center justify-between gap-1 shadow-2xs",
                      sec.badgeClass
                    )}
                  >
                    <span className="truncate font-bold text-slate-900 dark:text-slate-100">{b.customer_name}</span>
                    <span className="text-[8px] font-black opacity-90 hidden sm:inline-block flex-shrink-0">
                      {sec.shortLabel}
                    </span>
                  </div>
                );
              })}
              {dayBookings.length > 2 && (
                <span className="text-[9px] text-muted-foreground font-bold block text-left">
                  +{dayBookings.length - 2} حجز آخر
                </span>
              )}
            </>
          ) : (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-0.5">
              <span>+ متاح</span>
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
      <Card className="glass-card border-border/80 shadow-xl overflow-hidden rounded-3xl">
        {/* Luxury Header Toolbar */}
        <CardHeader className="p-4 sm:p-5 border-b border-border/50 bg-gradient-to-r from-emerald-950/10 via-amber-500/5 to-muted/20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            
            {/* Title & Statement (في البيان اسم الشهر كما طلب المستخدم) */}
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-xs">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-black text-foreground">
                    جدول حجوزات وتوافر القاعة
                  </CardTitle>
                  <CardDescription className="text-xs mt-1 text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span>مواعيد</span>
                    <strong className="text-foreground font-bold underline decoration-amber-500/50 underline-offset-4">
                      {calMode === 'hijri' 
                        ? `شهر ${HIJRI_MONTHS[hijriViewMonth - 1]} (الشهر ${hijriViewMonth}) لعام ${hijriViewYear} هـ` 
                        : `${format(calViewDate, 'MMMM yyyy', { locale: ar })}`}
                    </strong>
                    <span>• تصفح الأيام وتوافر أقسام القاعة وإضافة الحجوزات</span>
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
                    "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-bold cursor-pointer",
                    viewType === 'grid'
                      ? "bg-card text-foreground shadow-sm font-black border border-border/60 scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="عرض التقويم الشهري الكامل"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
                  <span>التقويم الشهري</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewType('agenda')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-bold cursor-pointer",
                    viewType === 'agenda'
                      ? "bg-card text-foreground shadow-sm font-black border border-border/60 scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="عرض قائمة الحجوزات لهذا الشهر"
                >
                  <List className="w-3.5 h-3.5 text-amber-500" />
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
                  className="h-8 w-8 text-foreground rounded-xl"
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
                      <div className="text-[10.5px] font-bold text-muted-foreground leading-tight mt-0.5">
                        شهر {HIJRI_MONTHS[hijriViewMonth - 1]}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm sm:text-base font-black text-primary leading-tight">
                        شهر ({format(calViewDate, 'MM')}) • {format(calViewDate, 'yyyy')} م
                      </div>
                      <div className="text-[10.5px] font-bold text-muted-foreground leading-tight mt-0.5">
                        {format(calViewDate, 'MMMM yyyy', { locale: ar })}
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={nextMonth} 
                  className="h-8 w-8 text-foreground rounded-xl"
                  title="الشهر التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>

              <Button 
                size="sm" 
                variant="outline" 
                onClick={resetToToday} 
                className="text-xs h-9 px-3 rounded-xl font-bold"
              >
                اليوم
              </Button>
            </div>
          </div>

          {/* Month Quick Status Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/40 mt-1">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs font-semibold py-1 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1.5"></span>
              {monthStats.availableDays} يوم متاح بالكامل
            </Badge>
            <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 text-xs font-semibold py-1 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-rose-500 ml-1.5"></span>
              {monthStats.bookedDays} يوم محجوز بالكامل
            </Badge>
            {monthStats.partialDays > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-xs font-semibold py-1 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-amber-500 ml-1.5"></span>
                {monthStats.partialDays} يوم به حجز جزئي
              </Badge>
            )}
            
            {/* Quick Section Indicators legend */}
            <div className="mr-auto hidden sm:flex items-center gap-3 text-[11px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500"></span> نساء فقط</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> رجال فقط</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> رجال ونساء معاً</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-5">
          {viewType === 'grid' ? (
            <div>
              {/* Day of week headers */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5">
                {HIJRI_DAYS.map((dayName, idx) => {
                  const isWeekend = dayName === 'الخميس' || dayName === 'الجمعة';
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "text-center text-xs font-black py-2 rounded-xl",
                        isWeekend 
                          ? "text-amber-600 dark:text-amber-400 bg-amber-500/10" 
                          : "text-muted-foreground bg-muted/40"
                      )}
                    >
                      {dayName}
                    </div>
                  );
                })}
              </div>

              {/* Day Cells Grid */}
              {calMode === 'hijri' ? (
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {hijriCalDays.map((day, i) => {
                    if (!day) return <div key={i} className="min-h-[72px] sm:min-h-[86px] rounded-2xl bg-muted/10" />;
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
                    <div key={`empty-${i}`} className="min-h-[72px] sm:min-h-[86px] rounded-2xl bg-muted/10" />
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
              <div className="mt-5 p-4 rounded-3xl bg-gradient-to-br from-card via-muted/30 to-card border border-border/80 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-foreground">
                          {selectedDayHijri ? `${selectedDayHijri} هـ` : ''}
                        </h4>
                        <span className="text-xs text-muted-foreground font-medium">
                          ({inlineSelectedDate ? format(new Date(inlineSelectedDate), 'EEEE، dd MMMM yyyy', { locale: ar }) : ''} م)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        حالة التوافر: {selectedDayStatus === 'full' ? '🔴 محجوز بالكامل' : selectedDayStatus === 'partial' ? '🟡 حجز جزئي' : '🟢 متاح للحجز'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedDayAvailableSections.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => openQuickBookingForDate(inlineSelectedDate)}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs h-9 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5 ml-1" /> إضافة حجز في هذا اليوم
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(inlineSelectedDate)}
                      className="rounded-xl text-xs h-9 font-bold"
                    >
                      <Eye className="w-3.5 h-3.5 ml-1" /> إدارة وتفاصيل اليوم
                    </Button>
                  </div>
                </div>

                {/* Selected Day Bookings Detail List */}
                <div className="mt-3">
                  {selectedDayBookings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedDayBookings.map(b => {
                        const sec = getSectionBadge(b.hall_section);
                        return (
                          <div 
                            key={b.id}
                            className="p-3.5 rounded-2xl bg-card border border-border/80 flex items-center justify-between gap-3 shadow-xs hover:border-primary/40 transition-all"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-foreground truncate">{b.customer_name}</span>
                                <Badge className={cn("text-[10px] px-2 py-0.5 rounded-lg border", sec.badgeClass)}>
                                  {sec.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <span>{b.event_type}</span>
                                <span>•</span>
                                <span className="font-mono" dir="ltr">{b.customer_phone}</span>
                                <span>•</span>
                                <span className="font-black text-primary">{formatCurrency(b.final_amount)}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {b.customer_phone && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openWhatsApp(b)}
                                  className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-xl"
                                  title="مراسلة واتساب"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => navigate(`/bookings/${b.id}`)}
                                className="h-8 w-8 text-muted-foreground hover:text-primary rounded-xl"
                                title="عرض العقد"
                              >
                                <ArrowRight className="w-4 h-4 rotate-180" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-muted-foreground font-semibold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>جميع أقسام القاعة متاحة للحجز في هذا اليوم (الرجال والنساء).</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Agenda / List View (Optimized for Mobile & iPhone) */
            <div className="space-y-3">
              {currentMonthBookings.length > 0 ? (
                currentMonthBookings.map((b) => {
                  const sec = getSectionBadge(b.hall_section);
                  const hijriDateDisplay = b.event_date_hijri || gregorianToHijri(b.event_date);
                  const gregFormatted = b.event_date ? format(new Date(b.event_date), 'dd MMMM yyyy', { locale: ar }) : '-';

                  return (
                    <div 
                      key={b.id}
                      className="p-4 rounded-3xl border border-border/80 bg-card hover:bg-muted/30 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        {/* Date badge */}
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-950 to-slate-900 text-white flex flex-col items-center justify-center font-black flex-shrink-0 shadow-md border border-amber-500/30">
                          <span className="text-base leading-none text-amber-400">
                            {hijriDateDisplay ? hijriDateDisplay.split('/')[2] : '--'}
                          </span>
                          <span className="text-[9.5px] text-emerald-200 mt-1 leading-none">
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

                          <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
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

                        <div className="flex items-center gap-1">
                          {b.customer_phone && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openWhatsApp(b)}
                              className="h-9 w-9 text-emerald-600 hover:bg-emerald-50 rounded-xl"
                              title="مراسلة واتساب"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/bookings/${b.id}`)}
                            className="rounded-xl text-xs font-bold h-9"
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
                    className="mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-md"
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