import { AppSettings, AttendanceRecord, BackupSnapshot, Course, Personnel } from '../types';
import { getCurrentTime, getTodayJalali } from './jalali';
import { saveTextFile } from './nativeFile';
import { deepNormalize } from './persianText';

const STORAGE_KEYS = {
  PERSONNEL: 'shamsi_attendance_personnel',
  COURSES: 'shamsi_attendance_courses',
  ATTENDANCE: 'shamsi_attendance_records',
  SETTINGS: 'shamsi_attendance_settings',
  BACKUPS: 'shamsi_attendance_backups',
};

// Realistic Iranian initial sample data
const SEED_PERSONNEL: Personnel[] = [
  {
    id: 'p_seed_1',
    personnelCode: '1001',
    nationalId: '0019842511',
    firstName: 'احمد',
    lastName: 'رضایی',
    gender: 'male',
    workLocation: 'فناوری اطلاعات و تحول دیجیتال',
    createdAt: '1405/08/01',
    updatedAt: '1405/08/01',
  },
  {
    id: 'p_seed_2',
    personnelCode: '1002',
    nationalId: '0021458960',
    firstName: 'سارا',
    lastName: 'حسینی',
    gender: 'female',
    workLocation: 'امور مالی و اعتبارات',
    createdAt: '1405/08/01',
    updatedAt: '1405/08/01',
  },
  {
    id: 'p_seed_3',
    personnelCode: '1003',
    nationalId: '0036985211',
    firstName: 'مهدی',
    lastName: 'کریمی',
    gender: 'male',
    workLocation: 'روابط عمومی و امور بین‌الملل',
    createdAt: '1405/08/01',
    updatedAt: '1405/08/01',
  },
  {
    id: 'p_seed_4',
    personnelCode: '1004',
    nationalId: '0047896541',
    firstName: 'فاطمه',
    lastName: 'صادقی',
    gender: 'female',
    workLocation: 'آموزش و توسعه منابع انسانی',
    createdAt: '1405/08/01',
    updatedAt: '1405/08/01',
  },
  {
    id: 'p_seed_5',
    personnelCode: '1005',
    nationalId: '0058963219',
    firstName: 'علیرضا',
    lastName: 'مرادی',
    gender: 'male',
    workLocation: 'حراست و امنیت فیزیکی',
    createdAt: '1405/08/01',
    updatedAt: '1405/08/01',
  },
  {
    id: 'p_seed_6',
    personnelCode: '1006',
    nationalId: '0069874123',
    firstName: 'مریم',
    lastName: 'جعفری',
    gender: 'female',
    workLocation: 'برنامه‌ریزی و آمار',
    createdAt: '1405/08/01',
    updatedAt: '1405/08/01',
  },
  {
    id: 'p_seed_7',
    personnelCode: '1007',
    nationalId: '0078523699',
    firstName: 'حسین',
    lastName: 'کاظمی',
    gender: 'male',
    workLocation: 'پشتیبانی و تدارکات',
    createdAt: '1405/08/01',
    updatedAt: '1405/08/01',
  },
  {
    id: 'p_seed_8',
    personnelCode: '1008',
    nationalId: '0089632583',
    firstName: 'نرگس',
    lastName: 'طاهری',
    gender: 'female',
    workLocation: 'حقوقی و قراردادها',
    createdAt: '1405/08/01',
    updatedAt: '1405/08/01',
  },
];

const today = getTodayJalali();

const SEED_COURSES: Course[] = [
  {
    id: 'c_seed_1',
    code: 'TR-1405',
    name: 'مهارت‌های حرفه‌ای و ارتباط سازمانی',
    hours: 16,
    instructor: 'دکتر علیرضا محمدی',
    location: 'سالن همایش دکتر چمران',
    startDate: today,
    endDate: today,
    status: 'active',
    description: 'دوره ضمن خدمت اصول تعاملات اداری و حل تعارضات تیمی',
    sessions: [
      {
        id: 's_seed_1',
        courseId: 'c_seed_1',
        date: today,
        sessionNumber: 1,
        sessionName: 'جلسه صبح (مفاهیم پایه)',
        startTime: '08:30',
        endTime: '11:00',
      },
      {
        id: 's_seed_2',
        courseId: 'c_seed_1',
        date: today,
        sessionNumber: 2,
        sessionName: 'جلسه بعدازظهر (کارگاه تعاملی)',
        startTime: '13:30',
        endTime: '16:00',
      },
      {
        id: 's_seed_3',
        courseId: 'c_seed_1',
        date: today,
        sessionNumber: 3,
        sessionName: 'جلسه ارزیابی پایانی',
        startTime: '16:15',
        endTime: '17:30',
      },
    ],
    createdAt: today,
    updatedAt: today,
  },
  {
    id: 'c_seed_2',
    code: 'SEC-402',
    name: 'امنیت سایبری و حفاظت از داده‌های اداری',
    hours: 8,
    instructor: 'مهندس بهزاد نوری',
    location: 'سایت تخصصی کامپیوتر',
    startDate: today,
    endDate: today,
    status: 'active',
    description: 'آشنایی با تهدیدات فیشینگ و الزامات امنیتی سامانه‌ها',
    sessions: [
      {
        id: 's_seed_4',
        courseId: 'c_seed_2',
        date: today,
        sessionNumber: 1,
        sessionName: 'جلسه اول (مفاهیم امنیت)',
        startTime: '09:00',
        endTime: '12:00',
      },
    ],
    createdAt: today,
    updatedAt: today,
  },
];

const SEED_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att_seed_1',
    courseId: 'c_seed_1',
    sessionId: 's_seed_1',
    personnelId: 'p_seed_1',
    personnelCode: '1001',
    nationalId: '0019842511',
    fullName: 'احمد رضایی',
    gender: 'male',
    workLocation: 'فناوری اطلاعات و تحول دیجیتال',
    isGuest: false,
    date: today,
    time: '08:24:12',
    status: 'present',
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'att_seed_2',
    courseId: 'c_seed_1',
    sessionId: 's_seed_1',
    personnelId: 'p_seed_2',
    personnelCode: '1002',
    nationalId: '0021458960',
    fullName: 'سارا حسینی',
    gender: 'female',
    workLocation: 'امور مالی و اعتبارات',
    isGuest: false,
    date: today,
    time: '08:29:45',
    status: 'present',
    timestamp: Date.now() - 3400000,
  },
  {
    id: 'att_seed_3',
    courseId: 'c_seed_1',
    sessionId: 's_seed_1',
    personnelId: 'p_seed_3',
    personnelCode: '1003',
    nationalId: '0036985211',
    fullName: 'مهدی کریمی',
    gender: 'male',
    workLocation: 'روابط عمومی و امور بین‌الملل',
    isGuest: false,
    date: today,
    time: '08:41:03',
    status: 'late',
    note: 'تأخیر به علت ترافیک مسیر',
    timestamp: Date.now() - 3000000,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'emerald',
  darkMode: false,
  fontSize: 'normal',
  fontSizePx: 16,
  autoBackup: true,
  autoBackupIntervalMinutes: 20,
  soundEnabled: true,
  vibrationEnabled: true,
  lastBackupDate: today,
  nidExportZeros: 'keep',
  nidImportMode: 'auto',
  nidManualMode: 'flexible',
};

// Safe JSON parser with fallback
function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error loading key ${key}:`, err);
    return fallback;
  }
}

// فقط در اولین اجرای برنامه (کلید وجود ندارد) داده نمونه ساخته می‌شود؛
// اگر کاربر همه‌ی داده را حذف کند، دیگر نمونه برنمی‌گردد.
function isUnset(key: string): boolean {
  try {
    return localStorage.getItem(key) === null;
  } catch {
    return false;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving key ${key}:`, err);
  }
}

/**
 * Storage API
 */
export const StorageAPI = {
  getPersonnel(): Personnel[] {
    const stored = safeParse<Personnel[]>(STORAGE_KEYS.PERSONNEL, []);
    if (isUnset(STORAGE_KEYS.PERSONNEL)) {
      safeSet(STORAGE_KEYS.PERSONNEL, SEED_PERSONNEL);
      return SEED_PERSONNEL;
    }
    return deepNormalize(stored);
  },

  savePersonnel(list: Personnel[]): void {
    safeSet(STORAGE_KEYS.PERSONNEL, deepNormalize(list));
  },

  getCourses(): Course[] {
    const stored = safeParse<Course[]>(STORAGE_KEYS.COURSES, []);
    if (isUnset(STORAGE_KEYS.COURSES)) {
      safeSet(STORAGE_KEYS.COURSES, SEED_COURSES);
      return SEED_COURSES;
    }
    return deepNormalize(stored);
  },

  saveCourses(list: Course[]): void {
    safeSet(STORAGE_KEYS.COURSES, deepNormalize(list));
  },

  getAttendance(): AttendanceRecord[] {
    const stored = safeParse<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    if (isUnset(STORAGE_KEYS.ATTENDANCE)) {
      safeSet(STORAGE_KEYS.ATTENDANCE, SEED_ATTENDANCE);
      return SEED_ATTENDANCE;
    }
    return deepNormalize(stored);
  },

  saveAttendance(list: AttendanceRecord[]): void {
    safeSet(STORAGE_KEYS.ATTENDANCE, deepNormalize(list));
  },

  getSettings(): AppSettings {
    const stored = safeParse<Partial<AppSettings>>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
    };
  },

  saveSettings(settings: AppSettings): void {
    safeSet(STORAGE_KEYS.SETTINGS, settings);
  },

  getBackups(): BackupSnapshot[] {
    return safeParse<BackupSnapshot[]>(STORAGE_KEYS.BACKUPS, []);
  },

  saveBackups(backups: BackupSnapshot[]): void {
    safeSet(STORAGE_KEYS.BACKUPS, backups);
  },

  /**
   * Take automatic or manual backup snapshot
   */
  createBackupSnapshot(
    personnel: Personnel[],
    courses: Course[],
    attendance: AttendanceRecord[]
  ): BackupSnapshot {
    const backupData = {
      personnel,
      courses,
      attendance,
      version: '1.0.0',
    };
    const jsonStr = JSON.stringify(backupData);
    const snapshot: BackupSnapshot = {
      id: 'snap_' + Date.now(),
      timestamp: Date.now(),
      jalaliDate: getTodayJalali(),
      jalaliTime: getCurrentTime(),
      personnelCount: personnel.length,
      coursesCount: courses.length,
      attendanceCount: attendance.length,
      sizeBytes: new Blob([jsonStr]).size,
      data: backupData,
    };

    const currentBackups = this.getBackups();
    // Keep max 10 latest snapshots
    const updated = [snapshot, ...currentBackups].slice(0, 10);
    this.saveBackups(updated);

    // Update settings lastBackupDate
    const settings = this.getSettings();
    this.saveSettings({
      ...settings,
      lastBackupDate: `${snapshot.jalaliDate} ${snapshot.jalaliTime}`,
    });

    return snapshot;
  },

  /**
   * Export all database as a downloadable JSON backup
   */
  exportBackupFile(
    personnel: Personnel[],
    courses: Course[],
    attendance: AttendanceRecord[]
  ): void {
    const data = deepNormalize({
      appName: 'سامانه حضور و غیاب ضمن خدمت',
      exportDateJalali: getTodayJalali(),
      exportTime: getCurrentTime(),
      timestamp: Date.now(),
      version: '1.0.0',
      stats: {
        personnelCount: personnel.length,
        coursesCount: courses.length,
        attendanceCount: attendance.length,
      },
      data: {
        personnel,
        courses,
        attendance,
      },
    });

    void saveTextFile(
      JSON.stringify(data, null, 2),
      `پشتیبان_کامل_سامانه_حضور_غیاب_${getTodayJalali().replace(/\//g, '-')}_${Date.now()}.json`
    );
  },

  /**
   * Import and parse a JSON backup file
   */
  async importBackupFile(file: File): Promise<{
    personnel: Personnel[];
    courses: Course[];
    attendance: AttendanceRecord[];
  }> {
    const text = await file.text();
    const parsed = deepNormalize(JSON.parse(text));

    let personnel: Personnel[] = [];
    let courses: Course[] = [];
    let attendance: AttendanceRecord[] = [];

    if (parsed.data) {
      personnel = Array.isArray(parsed.data.personnel) ? parsed.data.personnel : [];
      courses = Array.isArray(parsed.data.courses) ? parsed.data.courses : [];
      attendance = Array.isArray(parsed.data.attendance) ? parsed.data.attendance : [];
    } else if (Array.isArray(parsed.personnel)) {
      personnel = parsed.personnel;
      courses = parsed.courses || [];
      attendance = parsed.attendance || [];
    } else {
      throw new Error('ساختار فایل پشتیبان نامعتبر است.');
    }

    this.savePersonnel(personnel);
    this.saveCourses(courses);
    this.saveAttendance(attendance);

    return { personnel, courses, attendance };
  },

  /**
   * Danger operations
   */
  deleteAllPersonnel(): void {
    safeSet(STORAGE_KEYS.PERSONNEL, []);
  },

  deleteAllCourses(): void {
    safeSet(STORAGE_KEYS.COURSES, []);
  },

  deleteAllAttendance(): void {
    safeSet(STORAGE_KEYS.ATTENDANCE, []);
  },

  resetToFactoryDefaults(): {
    personnel: Personnel[];
    courses: Course[];
    attendance: AttendanceRecord[];
  } {
    safeSet(STORAGE_KEYS.PERSONNEL, SEED_PERSONNEL);
    safeSet(STORAGE_KEYS.COURSES, SEED_COURSES);
    safeSet(STORAGE_KEYS.ATTENDANCE, SEED_ATTENDANCE);
    safeSet(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return {
      personnel: SEED_PERSONNEL,
      courses: SEED_COURSES,
      attendance: SEED_ATTENDANCE,
    };
  },
};
