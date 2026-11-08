import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as XLSX from 'xlsx';
import { registerPlugin } from '@capacitor/core';
import { normalizePersian } from './persianText';

/**
 * ذخیره/اشتراک‌گذاری فایل خروجی.
 * - در اپ اندروید (Capacitor): فایل در حافظه موقت نوشته و پنجره «اشتراک‌گذاری/ذخیره» اندروید باز می‌شود
 *   (کاربر می‌تواند در Files، Drive، تلگرام، ایتا و... ذخیره کند).
 * - در مرورگر: دانلود معمولی.
 */
const isNative = () => Capacitor.isNativePlatform();

const safeName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_');

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function shareBase64(base64: string, fileName: string): Promise<void> {
  const name = safeName(fileName);
  const written = await Filesystem.writeFile({
    path: name,
    data: base64,
    directory: Directory.Cache,
  });
  try {
    await Share.share({
      title: name,
      dialogTitle: 'ذخیره یا ارسال فایل',
      url: written.uri,
    });
  } catch (e) {
    // بستن پنجره اشتراک‌گذاری توسط کاربر خطا نیست
    const msg = String((e as Error)?.message ?? e);
    if (!/cancel/i.test(msg)) throw e;
  }
}

/** تبدیل ي/ك عربی به فارسی در همه‌ی سلول‌ها و نام شیت‌ها */
function normalizeWorkbook(workbook: XLSX.WorkBook): void {
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    for (const addr of Object.keys(ws)) {
      if (addr[0] === '!') continue;
      const cell = ws[addr] as XLSX.CellObject;
      if (cell && typeof cell.v === 'string') {
        cell.v = normalizePersian(cell.v);
        if (typeof cell.w === 'string') cell.w = normalizePersian(cell.w);
      }
    }
  }
}

/** جایگزین XLSX.writeFile */
export async function saveWorkbook(workbook: XLSX.WorkBook, fileName: string): Promise<void> {
  normalizeWorkbook(workbook);
  if (isNative()) {
    try {
      const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      await shareBase64(base64, fileName);
    } catch (e) {
      alert('خطا در ذخیره فایل: ' + String((e as Error)?.message ?? e));
    }
  } else {
    XLSX.writeFile(workbook, fileName);
  }
}

/** ذخیره متن (مثلاً پشتیبان JSON) */
export async function saveTextFile(text: string, fileName: string, mime = 'application/json'): Promise<void> {
  text = normalizePersian(text);
  if (isNative()) {
    try {
      await shareBase64(utf8ToBase64(text), fileName);
    } catch (e) {
      alert('خطا در ذخیره فایل: ' + String((e as Error)?.message ?? e));
    }
    return;
  }
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface NativePrintPlugin {
  print(options: { jobName?: string }): Promise<void>;
}
const NativePrint = registerPlugin<NativePrintPlugin>('NativePrint');

/** چاپ صفحه (در اندروید از سرویس چاپ سیستم؛ در وب window.print) */
export async function printPage(jobName = 'پرونده آموزشی'): Promise<void> {
  if (isNative()) {
    try {
      await NativePrint.print({ jobName });
    } catch (e) {
      alert('خطا در چاپ: ' + String((e as Error)?.message ?? e));
    }
  } else {
    window.print();
  }
}
