// Both calendars use Sunday-first headers, including in an RTL layout.
export function gregorianStartColumn(year, month) {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

export function civilDateLabel(isoDate) {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(date);
}
