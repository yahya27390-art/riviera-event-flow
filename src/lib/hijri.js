/**
 * Hijri ↔ Gregorian helpers using moment-hijri
 */
import moment from 'moment-hijri';

/** Convert Gregorian ISO date string → Hijri display string "١٤٤٦/٠٧/١٥" */
export function gregorianToHijri(gregorianDateStr) {
  if (!gregorianDateStr) return '';
  try {
    return moment(gregorianDateStr, 'YYYY-MM-DD').format('iYYYY/iMM/iDD');
  } catch { return ''; }
}

/** Convert Hijri string "1446/07/15" → Gregorian ISO "2025-01-14" */
export function hijriToGregorian(hijriStr) {
  if (!hijriStr) return '';
  try {
    const m = moment(hijriStr, 'iYYYY/iMM/iDD');
    if (!m.isValid()) return '';
    return m.format('YYYY-MM-DD');
  } catch { return ''; }
}

/** Returns { hijri, gregorian } from a Gregorian ISO string */
export function toHijriInfo(gregorianDateStr) {
  if (!gregorianDateStr) return { hijri: '', gregorian: '' };
  const m = moment(gregorianDateStr, 'YYYY-MM-DD');
  return {
    hijri: m.format('iYYYY/iMM/iDD'),
    gregorian: gregorianDateStr,
  };
}

/** Arabic month names (Hijri) */
export const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

export const HIJRI_DAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

/** Get calendar grid for a given hijri year/month (1-indexed) */
export function getHijriMonthGrid(iYear, iMonth) {
  const firstDay = moment(`${iYear}/${String(iMonth).padStart(2,'0')}/01`, 'iYYYY/iMM/iDD');
  const daysInMonth = firstDay.iDaysInMonth();
  const startDow = firstDay.day(); // 0=Sun

  const cells = [];
  // leading empty cells
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return { cells, daysInMonth, startDow };
}