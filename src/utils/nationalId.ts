import { toEnglishDigits } from './jalali';

/**
 * Validates Iranian National ID (کد ملی ۱۰ رقمی بر اساس الگوریتم رقم کنترلی ثبت احوال)
 * 
 * Rules:
 * 1. Clean all non-digit characters and convert Persian/Arabic digits to English.
 * 2. Pad with leading zeros if length is 8 or 9 (due to Excel removing leading zeros).
 * 3. Must be exactly 10 digits.
 * 4. Reject repeating identical digits (e.g., 0000000000, 1111111111...).
 * 5. Checksum formula:
 *    sum = d1*10 + d2*9 + d3*8 + d4*7 + d5*6 + d6*5 + d7*4 + d8*3 + d9*2
 *    remainder = sum % 11
 *    if remainder < 2, d10 === remainder
 *    if remainder >= 2, d10 === 11 - remainder
 */
export function isValidIranianNationalId(input: string | number | null | undefined): boolean {
  if (input === null || input === undefined) return false;

  let code = toEnglishDigits(String(input)).replace(/\D/g, '').trim();
  if (!code) return false;

  // Pad with leading zeros if between 8 and 9 digits
  if (code.length >= 8 && code.length < 10) {
    code = code.padStart(10, '0');
  }

  if (code.length !== 10) return false;

  // Reject all identical digits
  if (/^(\d)\1{9}$/.test(code)) return false;

  const digits = code.split('').map(Number);
  const checkDigit = digits[9];

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }

  const remainder = sum % 11;
  if (remainder < 2) {
    return checkDigit === remainder;
  } else {
    return checkDigit === 11 - remainder;
  }
}

/**
 * Normalizes an Iranian National ID to standard 10-digit format with padded leading zeros
 */
export function normalizeNationalId(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  let code = toEnglishDigits(String(input)).replace(/\D/g, '').trim();
  if (code.length >= 8 && code.length < 10) {
    code = code.padStart(10, '0');
  }
  return code;
}
