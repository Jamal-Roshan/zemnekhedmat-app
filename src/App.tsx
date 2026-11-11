/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { setNationalIdConfig } from './utils/nationalId';
import { 
  UserCheck, 
  BookOpen, 
  Users, 
  BarChart3, 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  WifiOff
} from 'lucide-react';
import { AppSettings, AttendanceRecord, Course, CourseSession, Personnel } from './types';
import { StorageAPI, DEFAULT_SETTINGS } from './utils/storage';
import { applyTheme, getThemeConfig } from './utils/theme';
import { getTodayJalali, toPersianDigits } from './utils/jalali';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { FastAttendanceScanner } from './components/FastAttendanceScanner';
import { CourseManagement } from './components/CourseManagement';
import { PersonnelManagement } from './components/PersonnelManagement';
import { ReportsPanel } from './components/ReportsPanel';
import { SettingsAndBackup } from './components/SettingsAndBackup';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ToastProvider } from './components/Toast';

export default function App() {
  // Database states
  const [personnel, setPersonnel] = useState<Personnel[]>(() => StorageAPI.getPersonnel());
  const [courses, setCourses] = useState<Course[]>(() => StorageAPI.getCourses());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => StorageAPI.getAttendance());
  const [settings, setSettings] = useState<AppSettings>(() => StorageAPI.getSettings());
  // تنظیمات صفر اول کد ملی باید پیش از رندر کامپوننت‌ها اعمال شود
  setNationalIdConfig(settings);

  // UI state
  const [currentTab, setCurrentTab] = useState<'attendance' | 'courses' | 'personnel' | 'reports' | 'settings'>('attendance');
  const [activeCourseId, setActiveCourseId] = useState<string>(() => courses[0]?.id || '');
  const [activeSessionId, setActiveSessionId] = useState<string>(() => courses[0]?.sessions[0]?.id || '');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Apply dark mode, theme, & font size to root
  useEffect(() => {
    applyTheme(settings.theme, settings.darkMode, settings.fontSize, settings.fontSizePx);
  }, [settings.theme, settings.darkMode, settings.fontSize, settings.fontSizePx]);

  // Network online / offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // پشتیبان‌گیری خودکار: آخرین داده‌ها در ref نگه داشته می‌شوند تا با هر تغییر داده، زمان‌سنج صفر نشود
  const latestDataRef = useRef({ personnel, courses, attendance });
  latestDataRef.current = { personnel, courses, attendance };

  useEffect(() => {
    if (!settings.autoBackup) return;

    const takeSnapshot = () => {
      const { personnel: p, courses: c, attendance: a } = latestDataRef.current;
      StorageAPI.createBackupSnapshot(p, c, a); // اگر تغییری نباشد، نسخه‌ی تکراری ساخته نمی‌شود
    };

    const intervalMs = Math.max(5, settings.autoBackupIntervalMinutes || 20) * 60 * 1000;
    const timer = setInterval(takeSnapshot, intervalMs);

    // در اندروید وقتی برنامه به پس‌زمینه می‌رود زمان‌سنج متوقف می‌شود؛ پس همان لحظه نسخه گرفته می‌شود
    const onHidden = () => {
      if (document.visibilityState === 'hidden') takeSnapshot();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', takeSnapshot);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', takeSnapshot);
    };
  }, [settings.autoBackup, settings.autoBackupIntervalMinutes]);

  // Keep active course and session synced
  useEffect(() => {
    if (!courses.find(c => c.id === activeCourseId) && courses.length > 0) {
      setActiveCourseId(courses[0].id);
      if (courses[0].sessions.length > 0) {
        setActiveSessionId(courses[0].sessions[0].id);
      }
    }
  }, [courses, activeCourseId]);

  // Attendance Handlers
  const handleAddAttendance = useCallback((record: AttendanceRecord) => {
    setAttendance(prev => {
      const updated = [record, ...prev];
      StorageAPI.saveAttendance(updated);
      return updated;
    });
  }, []);

  const handleRemoveAttendance = useCallback((recordId: string) => {
    setAttendance(prev => {
      const updated = prev.filter(a => a.id !== recordId);
      StorageAPI.saveAttendance(updated);
      return updated;
    });
  }, []);

  // Personnel Handlers
  const handleSavePersonnel = useCallback((person: Personnel) => {
    setPersonnel(prev => {
      const index = prev.findIndex(p => p.id === person.id);
      let updated: Personnel[];
      if (index !== -1) {
        updated = [...prev];
        updated[index] = person;
      } else {
        updated = [person, ...prev];
      }
      StorageAPI.savePersonnel(updated);
      return updated;
    });
  }, []);

  const handleBulkUpdatePersonnel = useCallback((newList: Personnel[]) => {
    setPersonnel(newList);
    StorageAPI.savePersonnel(newList);
  }, []);

  const handleDeletePersonnel = useCallback((personId: string) => {
    setPersonnel(prev => {
      const updated = prev.filter(p => p.id !== personId);
      StorageAPI.savePersonnel(updated);
      return updated;
    });
    // Also remove attendance of deleted person
    setAttendance(prev => {
      const updated = prev.filter(a => a.personnelId !== personId);
      StorageAPI.saveAttendance(updated);
      return updated;
    });
  }, []);

  // Course Handlers
  const handleSaveCourse = useCallback((course: Course) => {
    setCourses(prev => {
      const index = prev.findIndex(c => c.id === course.id);
      let updated: Course[];
      if (index !== -1) {
        updated = [...prev];
        updated[index] = course;
      } else {
        updated = [course, ...prev];
      }
      StorageAPI.saveCourses(updated);
      return updated;
    });
  }, []);

  const handleDeleteCourse = useCallback((courseId: string) => {
    setCourses(prev => {
      const updated = prev.filter(c => c.id !== courseId);
      StorageAPI.saveCourses(updated);
      return updated;
    });
    // Remove related attendance
    setAttendance(prev => {
      const updated = prev.filter(a => a.courseId !== courseId);
      StorageAPI.saveAttendance(updated);
      return updated;
    });
  }, []);

  const handleAddSession = useCallback((courseId: string, session: CourseSession) => {
    setCourses(prev => {
      const updated = prev.map(c => {
        if (c.id === courseId) {
          return {
            ...c,
            sessions: [...c.sessions, session],
            updatedAt: getTodayJalali(),
          };
        }
        return c;
      });
      StorageAPI.saveCourses(updated);
      return updated;
    });
  }, []);

  // Full Database Reload (after restore / reset)
  const handleReloadAllData = useCallback((data: {
    personnel: Personnel[];
    courses: Course[];
    attendance: AttendanceRecord[];
  }) => {
    setPersonnel(data.personnel);
    setCourses(data.courses);
    setAttendance(data.attendance);
    if (data.courses.length > 0) {
      setActiveCourseId(data.courses[0].id);
      if (data.courses[0].sessions.length > 0) {
        setActiveSessionId(data.courses[0].sessions[0].id);
      }
    }
  }, []);

  // Settings Handlers
  const handleUpdateSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    StorageAPI.saveSettings(newSettings);
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    handleUpdateSettings({
      ...settings,
      darkMode: !settings.darkMode,
    });
  }, [settings, handleUpdateSettings]);

  // Jump from Course page straight to Attendance
  const handleSelectForAttendance = useCallback((courseId: string) => {
    setActiveCourseId(courseId);
    const course = courses.find(c => c.id === courseId);
    if (course && course.sessions.length > 0) {
      setActiveSessionId(course.sessions[0].id);
    }
    setCurrentTab('attendance');
  }, [courses]);

  // Global Quick Metrics
  const todayAttendanceCount = useMemo(() => {
    const today = getTodayJalali();
    return attendance.filter(a => a.date === today).length;
  }, [attendance]);

  const activeCoursesCount = useMemo(() => {
    return courses.filter(c => c.status === 'active').length;
  }, [courses]);

  const themeObj = getThemeConfig(settings.theme);

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-20 md:pb-10 transition-colors duration-200">
        {/* Top Navbar Header */}
        <Navbar
          currentTab={currentTab}
          onChangeTab={setCurrentTab}
          settings={settings}
          onToggleDarkMode={handleToggleDarkMode}
          onSelectTheme={(theme) => handleUpdateSettings({ ...settings, theme })}
          currentTheme={settings.theme}
        />

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
          {/* Offline notification banner if user loses internet */}
          {!isOnline && (
            <div className="p-3.5 bg-amber-500 text-white rounded-2xl flex items-center justify-between text-xs font-semibold shadow-md animate-pulse">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4" />
                <span>حالت آفلاین — برنامه به صورت مستقل و بدون اینترنت روی حافظه دستگاه در حال کار است.</span>
              </div>
              <span className="bg-amber-600/60 px-2 py-0.5 rounded-md">آفلاین</span>
            </div>
          )}

          {/* Top Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${themeObj.bgLight} ${themeObj.textPrimary}`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">حضورهای ثبت شده امروز</span>
                <strong className="text-base sm:text-lg font-black text-slate-800 dark:text-white font-mono">
                  {toPersianDigits(todayAttendanceCount)} <span className="text-xs font-normal text-slate-400">نفر</span>
                </strong>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">دوره‌های در حال برگزاری</span>
                <strong className="text-base sm:text-lg font-black text-slate-800 dark:text-white font-mono">
                  {toPersianDigits(activeCoursesCount)} <span className="text-xs font-normal text-slate-400">دوره</span>
                </strong>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">کل بانک پرسنل</span>
                <strong className="text-base sm:text-lg font-black text-slate-800 dark:text-white font-mono">
                  {toPersianDigits(personnel.length)} <span className="text-xs font-normal text-slate-400">نفر</span>
                </strong>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">وضعیت پشتیبان‌گیری</span>
                <strong className="text-xs sm:text-sm font-bold text-emerald-600 block truncate">
                  خودکار و ایمن
                </strong>
              </div>
            </div>
          </div>

          {/* Android PWA Install Banner */}
          <PWAInstallButton variant="card" />

          {/* Tab 1: Fast Attendance Check-In */}
          {currentTab === 'attendance' && (
            <FastAttendanceScanner
              courses={courses}
              personnel={personnel}
              attendance={attendance}
              activeCourseId={activeCourseId}
              activeSessionId={activeSessionId}
              onSelectCourse={setActiveCourseId}
              onSelectSession={setActiveSessionId}
              onAddAttendance={handleAddAttendance}
              onRemoveAttendance={handleRemoveAttendance}
              onAddPersonnel={handleSavePersonnel}
              onAddSession={handleAddSession}
              soundEnabled={settings.soundEnabled}
              vibrationEnabled={settings.vibrationEnabled}
              currentTheme={settings.theme}
            />
          )}

          {/* Tab 2: Course Management */}
          {currentTab === 'courses' && (
            <CourseManagement
              courses={courses}
              attendance={attendance}
              personnel={personnel}
              onSaveCourse={handleSaveCourse}
              onDeleteCourse={handleDeleteCourse}
              onSelectForAttendance={handleSelectForAttendance}
              onDeleteSessionRecords={(sessionId) => {
                setAttendance(prev => {
                  const updated = prev.filter(a => a.sessionId !== sessionId);
                  StorageAPI.saveAttendance(updated);
                  return updated;
                });
              }}
              currentTheme={settings.theme}
            />
          )}

          {/* Tab 3: Personnel Management */}
          {currentTab === 'personnel' && (
            <PersonnelManagement
              personnel={personnel}
              onSavePersonnel={handleSavePersonnel}
              onBulkUpdatePersonnel={handleBulkUpdatePersonnel}
              onDeletePersonnel={handleDeletePersonnel}
              currentTheme={settings.theme}
            />
          )}

          {/* Tab 4: Reports & Excel Exports */}
          {currentTab === 'reports' && (
            <ReportsPanel
              courses={courses}
              attendance={attendance}
              personnel={personnel}
              currentTheme={settings.theme}
            />
          )}

          {/* Tab 5: Settings & Backup */}
          {currentTab === 'settings' && (
            <SettingsAndBackup
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              personnel={personnel}
              courses={courses}
              attendance={attendance}
              onReloadAllData={handleReloadAllData}
            />
          )}
        </main>

        {/* Mobile Android Bottom Navigation Bar */}
        <BottomNav
          currentTab={currentTab}
          onChangeTab={setCurrentTab}
          vibrationEnabled={settings.vibrationEnabled}
          currentTheme={settings.theme}
        />
      </div>
    </ToastProvider>
  );
}
