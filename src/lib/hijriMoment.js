import moment from 'moment-hijri';

export function normalizeDateDigits(value) {
  return String(value ?? '').replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0));
}

// moment-hijri defaults to ar-sa, whose formatted date digits cannot be parsed
// by parseInt, Date or ISO database/date inputs. Keep machine dates in ASCII
// without changing the global locale or the Arabic labels in the interface.
export default function hijriMoment(...args) {
  if (typeof args[0] === 'string') args[0] = normalizeDateDigits(args[0]);
  return moment(...args).locale('en');
}
