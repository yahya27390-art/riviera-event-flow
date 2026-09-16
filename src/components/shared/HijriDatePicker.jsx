/**
 * HijriDatePicker — full Hijri calendar picker component
 * Props:
 *   value: { hijri: 'iYYYY/iMM/iDD', gregorian: 'YYYY-MM-DD' }
 *   onChange: (value) => void
 *   label: string (optional)
 *   required: bool
 */
import React, { useState, useRef, useEffect } from 'react';
import moment from 'moment-hijri';
import { HIJRI_MONTHS, HIJRI_DAYS, getHijriMonthGrid } from '@/lib/hijri';
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
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

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setInputVal(val);
    // try parse on complete input
    const m = moment(val, 'iYYYY/iMM/iDD');
    if (m.isValid()) {
      const gregorian = m.format('YYYY-MM-DD');
      onChange({ hijri: val, gregorian });
      setViewYear(parseInt(val.split('/')[0]));
      setViewMonth(parseInt(val.split('/')[1]));
    }
  };

  const selectedDay = value?.hijri
    ? parseInt(value.hijri.split('/')[2])
    : null;
  const isSelected = (day) =>
    selectedDay === day &&
    value?.hijri?.startsWith(`${viewYear}/${String(viewMonth).padStart(2,'0')}`);

  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="block text-sm font-medium mb-1.5">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}
      <div
        className="flex items-center border border-input rounded-md bg-background shadow-sm cursor-pointer hover:border-ring transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <input
          type="text"
          value={inputVal}
          onChange={handleInput}
          onClick={e => e.stopPropagation()}
          placeholder={placeholder || 'مثال: 1446/07/15'}
          required={required}
          className="flex-1 px-3 py-2 text-sm bg-transparent outline-none text-right"
          dir="rtl"
        />
        <Calendar className="w-4 h-4 text-muted-foreground mx-2 flex-shrink-0" />
      </div>

      {/* Gregorian sub-label */}
      {value?.gregorian && (
        <p className="text-xs text-muted-foreground mt-1">
          الميلادي: {value.gregorian}
        </p>
      )}

      {open && (
        <div className="absolute top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl p-3 w-72 right-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-muted">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="text-sm font-bold text-center">
              <span>{HIJRI_MONTHS[viewMonth - 1]}</span>
              <span className="mx-1 text-muted-foreground">{viewYear}</span>
            </div>
            <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-muted">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Year nav */}
          <div className="flex justify-center gap-2 mb-2">
            <button type="button" onClick={() => setViewYear(y => y - 1)} className="text-xs px-2 py-0.5 rounded border hover:bg-muted">−</button>
            <span className="text-xs font-semibold">{viewYear} هـ</span>
            <button type="button" onClick={() => setViewYear(y => y + 1)} className="text-xs px-2 py-0.5 rounded border hover:bg-muted">+</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {HIJRI_DAYS.map(d => (
              <div key={d} className="text-center text-[10px] text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => day && selectDay(day)}
                disabled={!day}
                className={cn(
                  'h-8 w-full rounded text-xs font-medium transition-colors',
                  !day && 'invisible',
                  day && isSelected(day) && 'bg-primary text-primary-foreground',
                  day && !isSelected(day) && 'hover:bg-muted',
                )}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Today button */}
          <button
            type="button"
            onClick={() => {
              const hijri = today.format('iYYYY/iMM/iDD');
              const gregorian = today.format('YYYY-MM-DD');
              setViewYear(parseInt(today.format('iYYYY')));
              setViewMonth(parseInt(today.format('iMM')));
              setInputVal(hijri);
              onChange({ hijri, gregorian });
              setOpen(false);
            }}
            className="mt-2 w-full text-xs text-center py-1 rounded border hover:bg-muted transition-colors"
          >
            اليوم — {today.format('iYYYY/iMM/iDD')}
          </button>
        </div>
      )}
    </div>
  );
}