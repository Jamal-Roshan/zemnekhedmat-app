import React, { useState, useRef } from 'react';
import { 
  Settings, 
  Palette, 
  ShieldAlert, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Vibrate, 
  Moon, 
  Sun, 
  CheckCircle, 
  AlertTriangle, 
  History, 
  Lock,
  Check,
  X,
  FileCode2,
  Type
} from 'lucide-react';
import { AppSettings, BackupSnapshot, Course, Personnel, AttendanceRecord, ThemeName } from '../types';
import { THEMES, getThemeConfig } from '../utils/theme';
import { StorageAPI } from '../utils/storage';
import { toPersianDigits } from '../utils/jalali';
import { ConfirmModal } from './ConfirmModal';
import { Accordion } from './Accordion';
import { Hash } from 'lucide-react';
import { useToast } from './Toast';

interface Props {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  personnel: Personnel[];
  courses: Course[];
  attendance: AttendanceRecord[];
  onReloadAllData: (data: { personnel: Personnel[]; courses: Course[]; attendance: AttendanceRecord[] }) => void;
}

export const SettingsAndBackup: React.FC<Props> = ({
  settings,
  onUpdateSettings,
  personnel,
  courses,
  attendance,
  onReloadAllData,
}) => {
  const { showToast } = useToast();
  const themeObj = getThemeConfig(settings.theme);

  // اندازه قلم (پیکسل) - سازگار با تنظیمات قدیمی small/normal/large/xlarge
  const legacyPx: Record<string, number> = { small: 14, normal: 16, large: 18, xlarge: 20 };
  const fontPx = Math.min(26, Math.max(12, settings.fontSizePx ?? legacyPx[settings.fontSize || 'normal'] ?? 16));
  const setFontPx = (px: number) => {
    const v = Math.min(26, Math.max(12, Math.round(px)));
    onUpdateSettings({ ...settings, fontSizePx: v });
  };

  const [backupsList, setBackupsList] = useState<BackupSnapshot[]>(StorageAPI.getBackups());
  const [dangerConfirmType, setDangerConfirmType] = useState<'personnel' | 'courses' | 'all' | null>(null);
  const [dangerInputText, setDangerInputText] = useState('');
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);
  const [snapshotToRestore, setSnapshotToRestore] = useState<BackupSnapshot | null>(null);

  const jsonImportRef = useRef<HTMLInputElement>(null);

  // Take manual snapshot now
  const handleCreateSnapshotNow = () => {
    const res = StorageAPI.createBackupSnapshot(personnel, courses, attendance, { force: true });
    setBackupsList(StorageAPI.getBackups());
    if (res.status === 'saved') {
      setBackupSuccessMessage(`نسخه پشتیبان در ساعت ${res.snapshot.jalaliTime} با موفقیت ثبت شد.`);
      showToast(`نسخه پشتیبان در ساعت ${res.snapshot.jalaliTime} ذخیره شد.`, 'success');
      setTimeout(() => setBackupSuccessMessage(null), 4000);
    } else if (res.status === 'failed') {
      showToast('ثبت نسخه پشتیبان انجام نشد: ' + res.reason, 'error');
    }
  };

  // Download complete JSON backup file to device
  const handleDownloadFullBackup = () => {
    StorageAPI.exportBackupFile(personnel, courses, attendance);
  };

  // Confirm restore from snapshot
  const handleConfirmRestoreSnapshot = () => {
    if (!snapshotToRestore) return;
    // قبل از بازگردانی، از وضعیت فعلی یک نسخه‌ی ایمنی گرفته می‌شود تا قابل برگشت باشد
    StorageAPI.createBackupSnapshot(personnel, courses, attendance, { force: true });
    setBackupsList(StorageAPI.getBackups());
    StorageAPI.savePersonnel(snapshotToRestore.data.personnel);
    StorageAPI.saveCourses(snapshotToRestore.data.courses);
    StorageAPI.saveAttendance(snapshotToRestore.data.attendance);
    onReloadAllData({
      personnel: snapshotToRestore.data.personnel,
      courses: snapshotToRestore.data.courses,
      attendance: snapshotToRestore.data.attendance,
    });
    showToast(`دیتابیس با موفقیت به تاریخ ${snapshotToRestore.jalaliDate} بازگردانی شد.`, 'success');
    setSnapshotToRestore(null);
  };

  // Import JSON backup from disk
  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      StorageAPI.createBackupSnapshot(personnel, courses, attendance, { force: true });
      const data = await StorageAPI.importBackupFile(file);
      onReloadAllData(data);
      setBackupsList(StorageAPI.getBackups());
      showToast('اطلاعات با موفقیت از فایل پشتیبان بازیابی گردید.', 'success');
    } catch (err: unknown) {
      showToast('خطا در بارگذاری فایل پشتیبان: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      if (jsonImportRef.current) jsonImportRef.current.value = '';
    }
  };

  // Execute danger action after confirmation
  const handleExecuteDangerAction = () => {
    if (dangerConfirmType === 'personnel') {
      StorageAPI.deleteAllPersonnel();
      onReloadAllData({
        personnel: [],
        courses,
        attendance,
      });
      showToast('کلیه اطلاعات پرسنل با موفقیت حذف گردید.', 'success');
    } else if (dangerConfirmType === 'courses') {
      StorageAPI.deleteAllCourses();
      StorageAPI.deleteAllAttendance();
      onReloadAllData({
        personnel,
        courses: [],
        attendance: [],
      });
      showToast('کلیه دوره‌ها، جلسات و سوابق حضور مربوطه حذف گردید.', 'success');
    } else if (dangerConfirmType === 'all') {
      const resetData = StorageAPI.resetToFactoryDefaults();
      onReloadAllData(resetData);
      showToast('سامانه به وضعیت اولیه کارخانه بازنشانی شد.', 'success');
    }

    setDangerConfirmType(null);
    setDangerInputText('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
          <span className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
            <Settings className="w-6 h-6" />
          </span>
          تنظیمات سامانه، تم‌ها و امنیت داده‌ها
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          شخصی‌سازی ظاهر برنامه، سیستم پشتیبان‌گیری خودکار، بازیابی داده‌ها و مدیریت عملیات حساس
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: THEME & APPEARANCE */}
        <Accordion defaultOpen title="تغییر رنگ، تم و اندازه قلم" icon={<Palette className="w-4 h-4 text-teal-600" />}>

          {/* Color Palettes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => onUpdateSettings({ ...settings, theme: theme.id })}
                className={`p-3 rounded-2xl border text-right transition flex items-center justify-between cursor-pointer ${
                  settings.theme === theme.id
                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-teal-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-4 h-4 rounded-full shadow-xs shrink-0"
                    style={{ backgroundColor: theme.hex }}
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {theme.name.split(' ')[0]}
                  </span>
                </div>
                {settings.theme === theme.id && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
              </button>
            ))}
          </div>

          {/* FONT SIZE SLIDER */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Type className="w-4 h-4 text-teal-600" />
                اندازه قلم و متون سامانه
              </h4>
              <span className="text-xs font-bold text-teal-700 dark:text-teal-300 font-mono">
                {toPersianDigits(fontPx)} پیکسل
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              با کشیدن لغزنده اندازه نوشته‌ها را از ۱۲ تا ۲۶ پیکسل تنظیم کنید (استاندارد: ۱۶).
            </p>

            <div className="flex items-center gap-3" dir="ltr">
              <button
                type="button"
                onClick={() => setFontPx(fontPx - 1)}
                className="w-9 h-9 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                A-
              </button>
              <input
                type="range"
                min={12}
                max={26}
                step={1}
                value={fontPx}
                onChange={(e) => setFontPx(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
                aria-label="اندازه قلم"
              />
              <button
                type="button"
                onClick={() => setFontPx(fontPx + 1)}
                className="w-9 h-9 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-base hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                A+
              </button>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono" dir="ltr">
              <span>۱۲</span>
              <span>۱۶</span>
              <span>۲۰</span>
              <span>۲۶</span>
            </div>
            <button
              type="button"
              onClick={() => setFontPx(16)}
              className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              بازگشت به اندازه استاندارد
            </button>

            {/* Live Text Preview Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-right space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">پیش‌نمایش زنده سایز نوشته‌ها:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                سامانه هوشمند حضور و غیاب ضمن خدمت — شرکت‌کننده: احمد رضایی
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ساعت ثبت: {toPersianDigits('۰۹:۳۰:۰۰')} | کد پرسنلی: {toPersianDigits('1001')} | وضعیت: حاضر
              </p>
            </div>
          </div>

          {/* Dark Mode & Sound Options */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div 
              onClick={() => {
                const nextDark = !settings.darkMode;
                onUpdateSettings({ ...settings, darkMode: nextDark });
                showToast(nextDark ? 'حالت شب فعال شد.' : 'حالت روز فعال شد.', 'info');
              }}
              className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <div className="flex items-center gap-2.5">
                {settings.darkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    حالت شب و تاریک (Dark Mode)
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                      settings.darkMode ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {settings.darkMode ? 'فعال (تاریک)' : 'غیرفعال (روشن)'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">کاهش خستگی چشم و صرفه‌جویی در باتری گوشی</p>
                </div>
              </div>
              <div
                className={`w-12 h-6 rounded-full transition relative ${
                  settings.darkMode ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span className={`block w-4 h-4 rounded-full bg-white transition absolute top-1 ${settings.darkMode ? 'left-1' : 'right-1'}`} />
              </div>
            </div>

            <div 
              onClick={() => onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <div className="flex items-center gap-2.5">
                {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-teal-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">افکت صوتی حضور و غیاب</h4>
                  <p className="text-[11px] text-slate-400">پخش زنگ موفقیت، خطا یا اعلان ثبت مهمان</p>
                </div>
              </div>
              <div
                className={`w-11 h-6 rounded-full transition relative ${
                  settings.soundEnabled ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              >
                <span className={`block w-4 h-4 rounded-full bg-white transition absolute top-1 ${settings.soundEnabled ? 'left-1' : 'right-1'}`} />
              </div>
            </div>

            <div 
              onClick={() => onUpdateSettings({ ...settings, vibrationEnabled: !settings.vibrationEnabled })}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <div className="flex items-center gap-2.5">
                <Vibrate className="w-4 h-4 text-teal-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">لرزش و ویبره لمسی (اندروید)</h4>
                  <p className="text-[11px] text-slate-400">فیدبک هپتیک هنگام لمس دکمه‌ها در گوشی</p>
                </div>
              </div>
              <div
                className={`w-11 h-6 rounded-full transition relative ${
                  settings.vibrationEnabled ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              >
                <span className={`block w-4 h-4 rounded-full bg-white transition absolute top-1 ${settings.vibrationEnabled ? 'left-1' : 'right-1'}`} />
              </div>
            </div>
          </div>
        </Accordion>

        {/* SECTION: NATIONAL ID LEADING ZEROS */}
        <Accordion title="تنظیمات صفر ابتدایی کد ملی" icon={<Hash className="w-4 h-4 text-teal-600" />}>
          <div>
            <p className="text-[11px] text-slate-400 leading-5">
              کدهای ملی که با یک یا دو صفر شروع می‌شوند (مثل ۰۰۱۲۳۴۵۶۷۸) در اکسل ممکن است بدون صفر ذخیره شوند.
              صحت‌سنجی کد ملی در همه حالت‌ها هوشمند است و صفرهای حذف‌شده را خودکار تکمیل می‌کند.
            </p>
          </div>

          {([
            {
              key: 'nidExportZeros' as const,
              title: 'کد ملی در فایل‌های اکسل خروجی',
              options: [
                { id: 'keep', label: 'با صفر اول (ده رقمی)' },
                { id: 'strip', label: 'بدون صفر اول' },
              ],
              def: 'keep',
            },
            {
              key: 'nidImportMode' as const,
              title: 'کد ملی در فایل اکسل ورودی',
              options: [
                { id: 'auto', label: 'تشخیص خودکار' },
                { id: 'with', label: 'صفر اول دارد' },
                { id: 'without', label: 'صفر اول ندارد' },
              ],
              def: 'auto',
            },
            {
              key: 'nidManualMode' as const,
              title: 'ثبت یا ویرایش دستی پرسنل (تکی و مهمان)',
              options: [
                { id: 'flexible', label: 'با یا بدون صفر اول' },
                { id: 'full', label: 'فقط ده رقم کامل' },
              ],
              def: 'flexible',
            },
          ]).map((group) => {
            const current = (settings[group.key] as string | undefined) ?? group.def;
            return (
              <div key={group.key} className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{group.title}</h4>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, [group.key]: opt.id } as AppSettings)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                        current === opt.id
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </Accordion>

        {/* SECTION 2: AUTO-BACKUP & DATABASE SECURITY */}
        <Accordion
          title="پشتیبان‌گیری خودکار و بازیابی"
          icon={<Database className="w-4 h-4 text-teal-600" />}
          badge={
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              فعال
            </span>
          }
        >

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            سامانه به طور پیوسته نسخه‌های پشتیبان از دیتابیس تهیه نموده و امکان دانلود فایل پشتیبان کامل با فرمت استاندارد JSON و بازگردانی آن را فراهم می‌کند.
          </p>

          {/* Quick Backup Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleCreateSnapshotNow}
              className="px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              تهیه آنی نسخه پشتیبان
            </button>

            <button
              onClick={handleDownloadFullBackup}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              <Download className="w-4 h-4" />
              دانلود فایل پشتیبان (JSON)
            </button>
          </div>

          {backupSuccessMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {backupSuccessMessage}
            </div>
          )}

          {/* Restore JSON Backup from Disk */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-teal-600" />
                  بازیابی دیتابیس از فایل پشتیبان:
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  انتخاب فایل پشتیبان ذخیره‌شده روی گوشی یا رایانه
                </p>
              </div>

              <input
                ref={jsonImportRef}
                type="file"
                accept=".json"
                onChange={handleImportJsonFile}
                className="hidden"
              />
              <button
                onClick={() => jsonImportRef.current?.click()}
                className="px-3.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer shadow-xs"
              >
                انتخاب فایل JSON
              </button>
            </div>
          </div>

          {/* Backup History Snapshots */}
          <div>
            <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-400" />
              تاریخچه نسخه‌های پشتیبان در حافظه (۱۰ نسخه آخر):
            </h4>

            {backupsList.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {backupsList.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        {toPersianDigits(snap.jalaliDate)} - {toPersianDigits(snap.jalaliTime)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {toPersianDigits(snap.personnelCount)} پرسنل | {toPersianDigits(snap.coursesCount)} دوره | {toPersianDigits(snap.attendanceCount)} رکورد حضور
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSnapshotToRestore(snap)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 rounded-lg hover:bg-teal-100 transition cursor-pointer"
                    >
                      بازیابی این نسخه
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">هنوز نسخه‌ای ذخیره نشده است.</p>
            )}
          </div>
        </Accordion>
      </div>

      {/* SECTION 3: DANGER ZONE (CONFIRMED BULK DELETES) */}
      <Accordion
        variant="danger"
        title="منطقه عملیات حساس (Danger Zone)"
        subtitle="این عملیات غیرقابل بازگشت هستند و مستلزم تایید کتبی می‌باشند."
        icon={<ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />}
      >

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Delete All Personnel */}
          <button
            onClick={() => {
              setDangerConfirmType('personnel');
              setDangerInputText('');
            }}
            className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-800 hover:border-rose-500 text-rose-700 dark:text-rose-300 text-right transition cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs">حذف کلیه پرسنل</span>
              <Trash2 className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-[11px] text-slate-400">
              پاکسازی کلیه رکوردهای پرسنل ({toPersianDigits(personnel.length)} نفر) با تایید دو مرحله‌ای
            </p>
          </button>

          {/* Delete All Courses */}
          <button
            onClick={() => {
              setDangerConfirmType('courses');
              setDangerInputText('');
            }}
            className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-800 hover:border-rose-500 text-rose-700 dark:text-rose-300 text-right transition cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs">حذف کلیه دوره‌ها و جلسات</span>
              <Trash2 className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-[11px] text-slate-400">
              حذف تمامی {toPersianDigits(courses.length)} دوره و کلیه سوابق حضور مربوطه
            </p>
          </button>

          {/* Factory Reset */}
          <button
            onClick={() => {
              setDangerConfirmType('all');
              setDangerInputText('');
            }}
            className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-800 hover:border-rose-500 text-rose-700 dark:text-rose-300 text-right transition cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs">بازنشانی کامل دیتابیس</span>
              <RefreshCw className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-[11px] text-slate-400">
              بازگشت به اطلاعات نمونه اولیه کارخانه و پاکسازی داده‌ها
            </p>
          </button>
        </div>
      </Accordion>

      {/* Danger Confirmation Modal */}
      {dangerConfirmType && (
        <div className="app-modal-overlay bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="app-modal-panel w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-rose-300 dark:border-rose-800 text-right">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  تاییدیه امنیتی حذف اطلاعات
                </h3>
                <p className="text-xs text-rose-600 font-semibold mt-0.5">
                  {dangerConfirmType === 'personnel' && 'شما در حال حذف تمامی اطلاعات پرسنل هستید!'}
                  {dangerConfirmType === 'courses' && 'شما در حال حذف تمامی دوره‌ها، جلسات و حضور و غیاب‌ها هستید!'}
                  {dangerConfirmType === 'all' && 'شما در حال بازنشانی کامل کلیه اطلاعات سامانه هستید!'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              جهت جلوگیری از حذف تصادفی، لطفاً عبارت <strong className="text-rose-600 select-all font-mono">حذف</strong> را در کادر زیر تایپ نمایید:
            </p>

            <input
              type="text"
              value={dangerInputText}
              onChange={(e) => setDangerInputText(e.target.value.trim())}
              placeholder="تایپ کنید: حذف"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-center text-sm font-bold text-rose-600 focus:outline-hidden focus:border-rose-500 mb-4 font-mono"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDangerConfirmType(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={dangerInputText !== 'حذف'}
                onClick={handleExecuteDangerAction}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer ${
                  dangerInputText === 'حذف'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                تایید و حذف قطعی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Restoring Snapshot */}
      <ConfirmModal
        isOpen={!!snapshotToRestore}
        title="بازیابی نسخه پشتیبان دیتابیس"
        message={`آیا مطمئن هستید که می‌خواهید دیتابیس را به تاریخ ${snapshotToRestore?.jalaliDate} ساعت ${snapshotToRestore?.jalaliTime} بازگردانی کنید؟ اطلاعات فعلی با این نسخه جایگزین خواهند شد.`}
        confirmText="بله، بازگردانی نسخه"
        cancelText="انصراف"
        variant="warning"
        onConfirm={handleConfirmRestoreSnapshot}
        onCancel={() => setSnapshotToRestore(null)}
      />
    </div>
  );
};
