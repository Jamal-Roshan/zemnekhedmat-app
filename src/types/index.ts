/**
 * Core Types for In-Service Training & Attendance System
 */

export type Gender = 'male' | 'female';

export interface Personnel {
  id: string;
  personnelCode: string; // کد پرسنلی
  nationalId: string;    // کد ملی
  firstName: string;     // نام
  lastName: string;      // نام خانوادگی
  gender: Gender;        // جنسیت
  workLocation: string;  // محل خدمت / واحد سازمانی
  isGuest?: boolean;     // پرسنل مهمان
  phone?: string;        // شماره تماس (اختیاری)
  createdAt: string;     // تاریخ ایجاد به شمسی
  updatedAt: string;     // تاریخ بروزرسانی به شمسی
}

export type CourseStatus = 'active' | 'completed' | 'upcoming';

export interface CourseSession {
  id: string;
  courseId: string;
  date: string;          // تاریخ شمسی مثلاً ۱۴۰۵/۰۸/۱۷
  sessionNumber: number; // شماره جلسه: ۱، ۲، ۳...
  sessionName: string;   // عنوان جلسه مثلاً "جلسه اول (صبح)", "جلسه دوم (بعدازظهر)"
  startTime: string;     // ساعت شروع مثلاً "۰۸:۳۰"
  endTime: string;       // ساعت پایان مثلاً "۱۲:۰۰"
}

export interface Course {
  id: string;
  code: string;          // کد دوره
  name: string;          // نام دوره
  hours: number;         // مدت دوره (ساعت)
  instructor: string;    // مدرس
  location: string;      // محل برگزاری (سالن / کلاس)
  startDate: string;     // تاریخ شروع به شمسی
  endDate: string;       // تاریخ پایان به شمسی
  status: CourseStatus;  // وضعیت دوره
  description?: string;  // توضیحات
  sessions: CourseSession[]; // جلسات تعریف شده برای دوره
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  courseId: string;
  sessionId: string;
  personnelId: string;
  personnelCode: string;
  nationalId: string;
  fullName: string;
  gender: Gender;
  workLocation: string;
  isGuest: boolean;
  date: string;          // تاریخ شمسی ثبت حضور
  time: string;          // ساعت دقیق ثبت (مثلاً ۰۹:۱۴:۲۵)
  status: AttendanceStatus;
  note?: string;         // یادداشت یا توضیحات
  timestamp: number;     // زمان میلی‌ثانیه برای مرتب‌سازی دقیق
}

export type ThemeName = 'emerald' | 'blue' | 'indigo' | 'amber' | 'rose' | 'slate';

export interface BackupSnapshot {
  id: string;
  timestamp: number;
  jalaliDate: string;
  jalaliTime: string;
  personnelCount: number;
  coursesCount: number;
  attendanceCount: number;
  sizeBytes: number;
  data: {
    personnel: Personnel[];
    courses: Course[];
    attendance: AttendanceRecord[];
    version: string;
  };
}

export type FontSize = 'small' | 'normal' | 'large' | 'xlarge';

export interface AppSettings {
  theme: ThemeName;
  darkMode: boolean;
  fontSize: FontSize;
  fontSizePx?: number;           // اندازه قلم به پیکسل (۱۲ تا ۲۶)
  autoBackup: boolean;
  autoBackupIntervalMinutes: number; // مثلاً هر ۳۰ دقیقه
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  lastBackupDate?: string;
  nidExportZeros?: 'keep' | 'strip';          // صفر اول کد ملی در اکسل خروجی
  nidImportMode?: 'auto' | 'with' | 'without'; // اکسل ورودی صفر اول دارد؟
  nidManualMode?: 'flexible' | 'full';        // ثبت دستی: با/بدون صفر اول
}
