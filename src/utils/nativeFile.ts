import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { normalizePersian } from './persianText';

/**
 * ذخیره فایل خروجی
 * - اندروید: پنجره ساده‌ی «ذخیره به‌عنوان» سیستم؛ کاربر نام و محل ذخیره را انتخاب می‌کند.
 * - وب: دانلود معمولی مرورگر.
 */
const isNative = () => Capacitor.isNativePlatform();

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type ToastKind = 'success' | 'error' | 'info' | 'warning';
function notify(message: string, type: ToastKind = 'info') {
  try {
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
  } catch { /* ignore */ }
}

const safeName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_');

/* ---------------- افزونه‌های اندروید ---------------- */
interface NativeSavePlugin {
  save(options: { fileName: string; mimeType: string; data: string }): Promise<{ saved: boolean; uri?: string; bytes?: number }>;
}
const NativeSave = registerPlugin<NativeSavePlugin>('NativeSave');

interface NativePrintPlugin {
  print(options: { jobName?: string }): Promise<void>;
}
const NativePrint = registerPlugin<NativePrintPlugin>('NativePrint');

/* ---------------- ابزارها ---------------- */
function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToBlob(base64: string, mime: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** پنجره اشتراک‌گذاری (فقط وقتی افزونه ذخیره در دسترس نباشد) */
async function shareBase64(base64: string, fileName: string): Promise<void> {
  const name = safeName(fileName);
  const written = await Filesystem.writeFile({ path: name, data: base64, directory: Directory.Cache });
  try {
    await Share.share({ title: name, dialogTitle: 'ذخیره یا ارسال فایل', url: written.uri });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (!/cancel/i.test(msg)) throw e;
  }
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  return bytes >= 1024 * 1024
    ? ` (${(bytes / 1024 / 1024).toFixed(1)} مگابایت)`
    : ` (${Math.max(1, Math.round(bytes / 1024))} کیلوبایت)`;
}

async function saveBase64(base64: string, fileName: string, mime: string): Promise<void> {
  const name = safeName(fileName);
  if (!base64) {
    notify('فایل خالی است و ذخیره نشد.', 'error');
    return;
  }
  if (isNative()) {
    try {
      const res = await NativeSave.save({ fileName: name, mimeType: mime, data: base64 });
      if (res.saved) notify('فایل با موفقیت ذخیره شد' + formatSize(res.bytes) + '.', 'success');
      else notify('ذخیره‌سازی فایل لغو شد.', 'info');
    } catch (e) {
      // اگر ذخیره مستقیم ممکن نشد، پنجره اشتراک‌گذاری به‌عنوان راه جایگزین باز می‌شود تا فایل از بین نرود
      const msg = String((e as Error)?.message ?? e);
      notify('ذخیره مستقیم ممکن نشد (' + msg + '). از پنجره اشتراک‌گذاری استفاده کنید.', 'warning');
      try {
        await shareBase64(base64, name);
      } catch (e2) {
        notify('خطا در ذخیره فایل: ' + String((e2 as Error)?.message ?? e2), 'error');
      }
    }
    return;
  }
  const url = URL.createObjectURL(base64ToBlob(base64, mime));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  notify('فایل دانلود شد.', 'success');
}

/* ---------------- اکسل ---------------- */

/** تبدیل ي/ك عربی به فارسی در همه‌ی سلول‌ها */
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

/** ساخت فایل xlsx با فونت Tahoma برای همه‌ی سلول‌ها */
async function workbookToBase64(workbook: XLSX.WorkBook): Promise<string> {
  const raw = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  try {
    const zip = await JSZip.loadAsync(raw, { base64: true });
    const stylesFile = zip.file('xl/styles.xml');
    if (!stylesFile) return raw;
    let xml = await stylesFile.async('string');
    xml = xml
      .replace(/<name val="[^"]*"\s*\/>/g, '<name val="Tahoma"/>')
      .replace(/<scheme val="[^"]*"\s*\/>/g, '');
    zip.file('xl/styles.xml', xml);
    return await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
  } catch {
    return raw; // در صورت خطا همان فایل بدون تغییر فونت
  }
}

/** جایگزین XLSX.writeFile */
export async function saveWorkbook(workbook: XLSX.WorkBook, fileName: string): Promise<void> {
  try {
    normalizeWorkbook(workbook);
    const base64 = await workbookToBase64(workbook);
    await saveBase64(base64, fileName, XLSX_MIME);
  } catch (e) {
    notify('خطا در ساخت فایل اکسل: ' + String((e as Error)?.message ?? e), 'error');
  }
}

/** ذخیره متن (مثلاً پشتیبان JSON) */
export async function saveTextFile(text: string, fileName: string, mime = 'application/json'): Promise<void> {
  try {
    await saveBase64(utf8ToBase64(normalizePersian(text)), fileName, mime);
  } catch (e) {
    notify('خطا در ذخیره فایل: ' + String((e as Error)?.message ?? e), 'error');
  }
}

/** چاپ صفحه (در اندروید از سرویس چاپ سیستم؛ در وب window.print) */
export async function printPage(jobName = 'پرونده آموزشی'): Promise<void> {
  if (isNative()) {
    try {
      await NativePrint.print({ jobName });
    } catch (e) {
      notify('خطا در چاپ: ' + String((e as Error)?.message ?? e), 'error');
    }
  } else {
    window.print();
  }
}
