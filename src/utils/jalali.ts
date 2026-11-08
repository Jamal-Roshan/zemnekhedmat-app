/**
 * Jalali (Shamsi / Persian) Calendar & Date Utility
 * High precision Gregorian <-> Jalali conversion without external dependencies
 */

// Persian digits array
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];
const PERSIAN_WEEK_DAYS = [
  'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'
];

/**
 * Convert any string or number to Persian digits
 */
export function toPersianDigits(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  return String(input).replace(/[0-9]/g, (char) => PERSIAN_DIGITS[parseInt(char, 10)] || char);
}

/**
 * Convert Persian and Arabic digits to English digits
 */
export function toEnglishDigits(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  return String(input)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .trim();
}

/**
 * Algorithm for converting Gregorian Date to Jalali Date
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

/**
 * Algorithm for converting Jalali Date to Gregorian Date
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy: number;
  if (jy > 979) {
    gy = 1600;
    jy -= 979;
  } else {
    gy = 621;
  }
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const gd_m = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && days > gd_m[gm]) {
    days -= gd_m[gm];
    gm++;
  }
  const gd = days;
  return [gy, gm, gd];
}

/**
 * Get current Jalali date formatted as YYYY/MM/DD
 */
export function getTodayJalali(dateObj: Date = new Date()): string {
  const [jy, jm, jd] = gregorianToJalali(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
  const mm = String(jm).padStart(2, '0');
  const dd = String(jd).padStart(2, '0');
  return `${jy}/${mm}/${dd}`;
}

/**
 * Get current time formatted as HH:mm:ss
 */
export function getCurrentTime(dateObj: Date = new Date(), withSeconds = true): string {
  const h = String(dateObj.getHours()).padStart(2, '0');
  const m = String(dateObj.getMinutes()).padStart(2, '0');
  const s = String(dateObj.getSeconds()).padStart(2, '0');
  return withSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;
}

/**
 * Get human readable full Jalali date, e.g. "شنبه ۱۷ آبان ۱۴۰۵"
 */
export function getHumanJalaliDate(jalaliDateStr: string): string {
  try {
    const cleanStr = toEnglishDigits(jalaliDateStr);
    const parts = cleanStr.split(/[\/\-]/);
    if (parts.length !== 3) return jalaliDateStr;
    const jy = parseInt(parts[0], 10);
    const jm = parseInt(parts[1], 10);
    const jd = parseInt(parts[2], 10);

    const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
    const dateObj = new Date(gy, gm - 1, gd);
    const dayOfWeek = PERSIAN_WEEK_DAYS[dateObj.getDay()];
    const monthName = PERSIAN_MONTHS[jm - 1] || '';

    return `${dayOfWeek} ${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`;
  } catch {
    return jalaliDateStr;
  }
}

/**
 * Get Persian month name by index 1-12
 */
export function getPersianMonthName(monthNumber: number): string {
  return PERSIAN_MONTHS[monthNumber - 1] || '';
}

/**
 * Parse and validate Jalali date
 */
export function isValidJalaliDate(jalaliDateStr: string): boolean {
  if (!jalaliDateStr) return false;
  const cleanStr = toEnglishDigits(jalaliDateStr);
  const match = cleanStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (!match) return false;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (y < 1300 || y > 1500) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (m > 6 && d > 30) return false;
  return true;
}

/**
 * Format relative Persian time (مثلاً چند دقیقه پیش، همین الان)
 */
export function formatPersianTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 45) return 'همین الان';
  if (diffSec < 3600) return `${toPersianDigits(Math.floor(diffSec / 60))} دقیقه پیش`;
  if (diffSec < 86400) return `${toPersianDigits(Math.floor(diffSec / 3600))} ساعت پیش`;
  return `${toPersianDigits(Math.floor(diffSec / 86400))} روز پیش`;
}
