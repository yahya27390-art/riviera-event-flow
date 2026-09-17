import React, { useState, useRef, useEffect } from 'react';
import moment from 'moment-hijri';
import { HIJRI_MONTHS, HIJRI_DAYS, getHijriMonthGrid } from '@/lib/hijri';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function HijriDatePicker({ value, onChange, label, required, placeholder }) {
  const today = moment();
  const initYear = value?.hijri
    ? parseInt(value.hijri.split('/')[0])
    : parseInt(today.format('iYYYY'));
  const initMonth = value?.hijri
    ? parseInt(value.hijri.split('/')[1])
    : parseInt(today.format('iMM'));

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const [inputVal, setInputVal] = useState(value?.hijri || '');
  const ref = useRef(null);

  // Sync inputVal when value changes from outside
  useEffect(() => {
    setInputVal(value?.hijri || '');
    if (value?.hijri) {
      const parts = value.hijri.split('/');
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0]));
        setViewMonth(parseInt(parts[1]));
      }
    }
  }, [value?.hijri]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { 
      if (ref.current && !ref.current.contains(e.target)) setOpen(false); 
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { cells } = getHijriMonthGrid(viewYear, viewMonth);

  const selectDay = (day) => {
    const hijri = `${viewYear}/${String(viewMonth).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
    const m = moment(hijri, 'iYYYY/iMM/iDD');
    const gregorian = m.format('YYYY-MM-DD');
    setInputVal(hijri);
    onChange({ hijri, gregorian });
    setOpen(false);
  };

  const selectQuickDate = (daysFromToday = 0) => {
    const target = moment().add(daysFromToday, 'days');
    const hijri = target.format('iYYYY/iMM/iDD');
    const gregorian = target.format('YYYY-MM-DD');
    setViewYear(parseInt(target.format('iYYYY')));
    setViewMonth(parseInt(target.format('iMM')));
    setInputVal(hijri);
    onChange({ hijri, gregorian });
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectedDay = value?.hijri
    ? parseInt(value.hijri.split('/')[2])
    : null;
  const isSelected = (day) =>
    selectedDay === day &&
    value?.hijri?.startsWith(`${viewYear}/${String(viewMonth).padStart(2,'0')}`);

  // Formatted display in Arabic
  const gregorianFormatted = value?.gregorian
    ? format(new Date(value.gregorian), 'EEEE، dd MMMM yyyy', { locale: ar })
    : null;

  return (
    <div className="relative space-y-1.5" ref={ref}>
      {label && (
        <label className="block text-xs font-bold text-foreground flex items-center justify-between">
          <span>{label} {required && <span className="text-destructive">*</span>}</span>
          {value?.hijri && (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {value.hijri} هـ
            </span>
          )}
        </label>
      )}

      {/* iOS Style Interactive Trigger Input */}
      <div
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center justify-between p-3 rounded-2xl bg-card border transition-all cursor-pointer shadow-sm active:scale-[0.99]",
          open 
            ? "border-amber-500 ring-2 ring-amber-500/20 shadow-md" 
            : "border-border hover:border-border/80 hover:bg-muted/40"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <CalendarIcon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="text-right">
            {value?.hijri ? (
              <>
                <p className="text-sm font-black text-amber-600 dark:text-amber-400">{value.hijri} هـ</p>
                <p className="text-xs font-semibold text-muted-foreground">{gregorianFormatted ? `الموافق: ${gregorianFormatted} م` : ''}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-muted-foreground">{placeholder || 'اضغط لتحديد تاريخ المناسبة (هجري / ميلادي)'}</p>
                <p className="text-[11px] text-muted-foreground">تقويم أم القرى المعتمد في المملكة</p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-xl">
            {open ? 'إغلاق' : 'تغيير'}
          </span>
        </div>
      </div>

      {/* Interactive Popover Sheet */}
      {open && (
        <div className="absolute top-full mt-2 z-50 bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-border/80 rounded-3xl shadow-2xl p-4 w-full sm:w-84 right-0 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Quick Presets for Saudi Events */}
          <div className="pb-3 mb-3 border-b border-border/60">
            <p className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> اختيارات سريعة:
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => selectQuickDate(0)}
                className="text-xs font-bold py-1.5 px-2 rounded-xl bg-muted/60 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                اليوم
              </button>
              <button
                type="button"
                onClick={() => selectQuickDate(1)}
                className="text-xs font-bold py-1.5 px-2 rounded-xl bg-muted/60 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                غداً
              </button>
              <button
                type="button"
                onClick={() => selectQuickDate(7)}
                className="text-xs font-bold py-1.5 px-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition-all"
              >
                بعد أسبوع
              </button>
            </div>
          </div>

          {/* Month Header Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button 
              type="button" 
              onClick={nextMonth} 
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-muted/60 hover:bg-muted active:scale-95 transition-all text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="text-center">
              <span className="text-sm font-black text-foreground">{HIJRI_MONTHS[viewMonth - 1]}</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 mr-1.5">{viewYear} هـ</span>
            </div>
            <button 
              type="button" 
              onClick={prevMonth} 
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-muted/60 hover:bg-muted active:scale-95 transition-all text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Year Step Nav */}
          <div className="flex items-center justify-center gap-2 mb-3 bg-muted/30 p-1 rounded-xl">
            <button type="button" onClick={() => setViewYear(y => y - 1)} className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-card border hover:bg-muted">−</button>
            <span className="text-xs font-black text-foreground">{viewYear} هـ</span>
            <button type="button" onClick={() => setViewYear(y => y + 1)} className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-card border hover:bg-muted">+</button>
          </div>

          {/* Weekday headers (Arabic) */}
          <div className="grid grid-cols-7 mb-1.5 text-center">
            {HIJRI_DAYS.map((d, idx) => (
              <div 
                key={d} 
                className={cn(
                  "text-[10px] font-bold py-1",
                  idx === 5 || idx === 6 ? "text-amber-600 dark:text-amber-400 font-black" : "text-muted-foreground"
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="h-8 w-full" />;
              const selected = isSelected(day);
              // Weekend check (Friday / Thursday)
              const colIdx = i % 7;
              const isWeekend = colIdx === 5 || colIdx === 6;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    'h-8.5 w-full rounded-xl text-xs font-bold transition-all flex items-center justify-center',
                    selected
                      ? 'bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/30 scale-105'
                      : isWeekend
                        ? 'hover:bg-amber-500/15 text-amber-700 dark:text-amber-300 font-extrabold'
                        : 'hover:bg-muted text-foreground'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}