"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monthKey = monthKey;
function monthKey(date = new Date(), tz = 'Asia/Colombo') {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit' });
    const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
    return `${parts.year}-${parts.month}`; // "YYYY-MM"
}
