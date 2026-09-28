export function monthKey(date: Date = new Date(), tz: string = 'Asia/Colombo'): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}`; // "YYYY-MM"
}
