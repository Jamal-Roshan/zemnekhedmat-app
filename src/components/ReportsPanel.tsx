import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  FileSpreadsheet, 
  User, 
  Users, 
  Search, 
  Calendar, 
  Clock, 
  Award, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Download,
  Building2,
  ChevronDown,
  Printer
} from 'lucide-react';
import { AttendanceRecord, Course, Personnel, ThemeName } from '../types';
import { exportCourseAttendanceExcel, exportCoursesSummaryExcel } from '../utils/excel';
import { getTodayJalali, toEnglishDigits, toPersianDigits } from '../utils/jalali';
import { THEMES, getThemeConfig } from '../utils/theme';
import { useToast } from './Toast';

interface Props {
  courses: Course[];
  attendance: AttendanceRecord[];
  personnel: Personnel[];
  currentTheme: ThemeName;
}

export const ReportsPanel: React.FC<Props> = ({
  courses,
  attendance,
  personnel,
  currentTheme,
}) => {
  const [reportType, setReportType] = useState<'individual' | 'group' | 'courses'>('group');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [individualSearch, setIndividualSearch] = useState<string>('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>(personnel[0]?.id || '');

  const { showToast } = useToast();
  const themeObj = getThemeConfig(currentTheme);

  // Active selected course
  const selectedCourse = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId) || courses[0];
  }, [courses, selectedCourseId]);

  // Selected person
  const selectedPerson = useMemo(() => {
    return personnel.find(p => p.id === selectedPersonId) || personnel[0];
  }, [personnel, selectedPersonId]);

  // Personnel filter for individual search
  const filteredPersonnelOptions = useMemo(() => {
    if (!individualSearch.trim()) return personnel.slice(0, 8);
    const q = toEnglishDigits(individualSearch).toLowerCase();
    return personnel.filter(p => {
      const name = `${p.firstName} ${p.lastName}`.toLowerCase();
      const code = toEnglishDigits(p.personnelCode).toLowerCase();
      const nId = toEnglishDigits(p.nationalId).toLowerCase();
      return name.includes(q) || code.includes(q) || nId.includes(q);
    }).slice(0, 8);
  }, [individualSearch, personnel]);

  // Individual attendance data
  const individualAttendanceRecords = useMemo(() => {
    if (!selectedPerson) return [];
    return attendance.filter(a => a.personnelId === selectedPerson.id);
  }, [attendance, selectedPerson]);

  const individualCourseIds = useMemo(() => {
    return Array.from(new Set(individualAttendanceRecords.map(a => a.courseId)));
  }, [individualAttendanceRecords]);

  const individualHoursSum = useMemo(() => {
    return individualCourseIds.reduce((sum, cId) => {
      const c = courses.find(item => item.id === cId);
      return sum + (c?.hours || 0);
    }, 0);
  }, [individualCourseIds, courses]);

  // Group Course Matrix Data
  const courseAttendance = useMemo(() => {
    if (!selectedCourse) return [];
    return attendance.filter(a => a.courseId === selectedCourse.id);
  }, [attendance, selectedCourse]);

  // Distinct attendees in the course
  const courseAttendees = useMemo(() => {
    if (!selectedCourse) return [];
    const map = new Map<string, {
      person: Personnel;
      records: AttendanceRecord[];
      presentCount: number;
    }>();

    courseAttendance.forEach(record => {
      if (!map.has(record.personnelId)) {
        const foundPerson = personnel.find(p => p.id === record.personnelId) || {
          id: record.personnelId,
          personnelCode: record.personnelCode,
          nationalId: record.nationalId,
          firstName: record.fullName.split(' ')[0] || '',
          lastName: record.fullName.split(' ').slice(1).join(' ') || '',
          gender: record.gender,
          workLocation: record.workLocation,
          isGuest: record.isGuest,
          createdAt: record.date,
          updatedAt: record.date,
        };
        map.set(record.personnelId, {
          person: foundPerson,
          records: [],
          presentCount: 0,
        });
      }

      const item = map.get(record.personnelId)!;
      item.records.push(record);
      if (record.status === 'present') item.presentCount += 1;
      else if (record.status === 'late') item.presentCount += 0.8;
      else if (record.status === 'excused') item.presentCount += 0.5;
    });

    return Array.from(map.values());
  }, [courseAttendance, selectedCourse, personnel]);

  // Department participation analysis
  const departmentStats = useMemo(() => {
    const counts: Record<string, number> = {};
    attendance.forEach(a => {
      const dept = a.workLocation || 'نامشخص';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [attendance]);

  return (
    <div className="space-y-6">
      {/* Header & Report Mode Tabs */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </span>
            سامانه گزارشات و تحلیل حضور و غیاب
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            گزارش‌های تفکیکی فردی، وضعیت کلاسی دوره‌ها به صورت گروهی و خروجی کامل اکسل
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setReportType('group')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              reportType === 'group'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            گزارش گروهی دوره
          </button>
          <button
            onClick={() => setReportType('individual')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              reportType === 'individual'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            گزارش فردی پرسنل
          </button>
          <button
            onClick={() => setReportType('courses')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              reportType === 'courses'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            وضعیت کلی دوره‌ها
          </button>
        </div>
      </div>

      {/* VIEW 1: GROUP / COURSE REPORT */}
      {reportType === 'group' && (
        <div className="space-y-6">
          {/* Selector & Export Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">انتخاب دوره:</span>
              <div className="relative flex-1 sm:w-80">
                <select
                  value={selectedCourse?.id || ''}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3.5 py-2 text-xs font-bold"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) - {c.instructor}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {selectedCourse && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    exportCourseAttendanceExcel(selectedCourse, selectedCourse.sessions, attendance, personnel, false);
                    showToast(`فایل اکسل ماتریس حاضرین دوره «${selectedCourse.name}» دانلود شد.`, 'success');
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  title="دانلود ماتریس اکسل فقط برای حاضرین و ثبت‌نام‌شدگان این دوره"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  دانلود اکسل ماتریس حاضرین دوره
                </button>

                <button
                  onClick={() => {
                    exportCourseAttendanceExcel(selectedCourse, selectedCourse.sessions, attendance, personnel, true);
                    showToast(`فایل اکسل ماتریس کلیه پرسنل در دوره «${selectedCourse.name}» دانلود شد.`, 'success');
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  title="دانلود ماتریس کامل کلیه پرسنل سازمان در جلسات این دوره"
                >
                  <Download className="w-4 h-4" />
                  اکسل ماتریس کلیه پرسنل
                </button>
              </div>
            )}
          </div>

          {selectedCourse && (
            <>
              {/* Course KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">کل جلسات</span>
                  <strong className="text-xl font-black text-slate-800 dark:text-white font-mono">
                    {toPersianDigits(selectedCourse.sessions.length)}
                  </strong>
                  <span className="text-[11px] text-slate-400 block mt-0.5">{toPersianDigits(selectedCourse.hours)} ساعت آموزش</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">شرکت‌کنندگان کل</span>
                  <strong className="text-xl font-black text-teal-600 font-mono">
                    {toPersianDigits(courseAttendees.length)}
                  </strong>
                  <span className="text-[11px] text-slate-400 block mt-0.5">پرسنل ثبت‌نامی</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">پرسنل مهمان</span>
                  <strong className="text-xl font-black text-amber-600 font-mono">
                    {toPersianDigits(courseAttendees.filter(a => a.person.isGuest).length)}
                  </strong>
                  <span className="text-[11px] text-slate-400 block mt-0.5">مهمان در دوره</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">میانگین حضور</span>
                  <strong className="text-xl font-black text-emerald-600 font-mono">
                    {toPersianDigits(
                      courseAttendees.length > 0 && selectedCourse.sessions.length > 0
                        ? Math.round(
                            (courseAttendees.reduce((sum, a) => sum + a.presentCount, 0) /
                              (courseAttendees.length * selectedCourse.sessions.length)) *
                              100
                          )
                        : 0
                    )}%
                  </strong>
                  <span className="text-[11px] text-slate-400 block mt-0.5">نرخ حضور کلی</span>
                </div>
              </div>

              {/* Group Attendance Matrix Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-600" />
                    ماتریس حضور و غیاب شرکت‌کنندگان به تفکیک جلسات
                  </h3>
                  <span className="text-xs text-slate-400">
                    مدرس: {selectedCourse.instructor} | محل: {selectedCourse.location}
                  </span>
                </div>

                {courseAttendees.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                          <th className="py-3 px-3">ردیف</th>
                          <th className="py-3 px-3">نام شرکت‌کننده</th>
                          <th className="py-3 px-3">کد پرسنلی</th>
                          <th className="py-3 px-3">محل خدمت</th>
                          {selectedCourse.sessions.map((sess, i) => (
                            <th key={sess.id} className="py-3 px-3 text-center whitespace-nowrap">
                              {sess.sessionName}
                              <span className="block text-[10px] text-slate-400 font-mono font-normal">
                                {toPersianDigits(sess.date)}
                              </span>
                            </th>
                          ))}
                          <th className="py-3 px-3 text-center">جلسات حاضر</th>
                          <th className="py-3 px-3 text-center">درصد حضور</th>
                          <th className="py-3 px-3 text-center">نتیجه نهایی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {courseAttendees.map((att, idx) => {
                          const totalSess = selectedCourse.sessions.length || 1;
                          const rate = Math.min(100, Math.round((att.presentCount / totalSess) * 100));

                          return (
                            <tr key={att.person.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                              <td className="py-3 px-3 font-mono text-slate-400">{toPersianDigits(idx + 1)}</td>
                              <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">
                                {att.person.firstName} {att.person.lastName}
                                {att.person.isGuest && (
                                  <span className="mr-1.5 px-1 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    مهمان
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-500">{toPersianDigits(att.person.personnelCode)}</td>
                              <td className="py-3 px-3 text-slate-500">{att.person.workLocation}</td>
                              {selectedCourse.sessions.map(sess => {
                                const foundRecord = att.records.find(r => r.sessionId === sess.id);
                                return (
                                  <td key={sess.id} className="py-3 px-3 text-center">
                                    {foundRecord ? (
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded-md font-mono text-[11px] ${
                                          foundRecord.status === 'present'
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold'
                                            : foundRecord.status === 'late'
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                            : foundRecord.status === 'excused'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                        }`}
                                        title={`ساعت ثبت: ${foundRecord.time}`}
                                      >
                                        ✓ {toPersianDigits(foundRecord.time.slice(0, 5))}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 dark:text-slate-600 font-mono">غایب</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="py-3 px-3 text-center font-bold font-mono text-slate-700 dark:text-slate-200">
                                {toPersianDigits(Math.round(att.presentCount))} از {toPersianDigits(totalSess)}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold">
                                <span className={rate >= 75 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-rose-600'}>
                                  {toPersianDigits(rate)}%
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  rate >= 75
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : rate >= 50
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {rate >= 75 ? 'قبول' : rate >= 50 ? 'مشروط' : 'تجدید'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-10 text-center text-xs text-slate-400">
                    هنوز حضوری برای این دوره ثبت نشده است.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* VIEW 2: INDIVIDUAL PERSONNEL REPORT */}
      {reportType === 'individual' && (
        <div className="space-y-6">
          {/* Personnel Quick Search Selector */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={individualSearch}
                onChange={(e) => setIndividualSearch(e.target.value)}
                placeholder="جستجوی پرسنل بر اساس نام، کد پرسنلی یا کد ملی..."
                className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              {filteredPersonnelOptions.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersonId(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedPersonId === p.id
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {p.firstName} {p.lastName} ({toPersianDigits(p.personnelCode)})
                </button>
              ))}
            </div>
          </div>

          {selectedPerson && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 space-y-6">
              {/* Profile Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-black text-xl flex items-center justify-center shadow-md shadow-teal-600/20">
                    {selectedPerson.firstName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      {selectedPerson.firstName} {selectedPerson.lastName}
                      {selectedPerson.isGuest && (
                        <span className="px-2 py-0.5 rounded-md text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          پرسنل مهمان
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>کد پرسنلی: <strong className="font-mono text-slate-700 dark:text-slate-200">{toPersianDigits(selectedPerson.personnelCode)}</strong></span>
                      <span>کد ملی: <strong className="font-mono text-slate-700 dark:text-slate-200">{toPersianDigits(selectedPerson.nationalId) || '-'}</strong></span>
                      <span>محل خدمت: <strong className="text-slate-700 dark:text-slate-200">{selectedPerson.workLocation}</strong></span>
                      <span>جنسیت: <strong>{selectedPerson.gender === 'female' ? 'زن' : 'مرد'}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Printer className="w-4 h-4" />
                  چاپ پرونده آموزشی
                </button>
              </div>

              {/* Individual Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">دوره‌های شرکت‌کرده</span>
                  <strong className="text-xl font-black text-teal-600 font-mono">
                    {toPersianDigits(individualCourseIds.length)}
                  </strong>
                  <span className="text-[11px] text-slate-400 block mt-0.5">دوره آموزشی</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">کل ساعات آموزش</span>
                  <strong className="text-xl font-black text-emerald-600 font-mono">
                    {toPersianDigits(individualHoursSum)}
                  </strong>
                  <span className="text-[11px] text-slate-400 block mt-0.5">ساعت ضمن خدمت</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">تعداد جلسات حضور</span>
                  <strong className="text-xl font-black text-blue-600 font-mono">
                    {toPersianDigits(individualAttendanceRecords.length)}
                  </strong>
                  <span className="text-[11px] text-slate-400 block mt-0.5">جلسه ثبت شده</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">وضعیت انضباطی</span>
                  <strong className="text-sm font-black text-emerald-600 block mt-1">
                    عالی و منظم
                  </strong>
                  <span className="text-[11px] text-slate-400 block mt-0.5">بدون غیبت غیرموجه</span>
                </div>
              </div>

              {/* Records Timeline Table */}
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  ریز سوابق حضور در جلسات دوره‌ها
                </h4>

                {individualAttendanceRecords.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                          <th className="py-2.5 px-3">دوره آموزشی</th>
                          <th className="py-2.5 px-3">عنوان جلسه</th>
                          <th className="py-2.5 px-3">تاریخ برگزاری (شمسی)</th>
                          <th className="py-2.5 px-3">ساعت ثبت حضور</th>
                          <th className="py-2.5 px-3">وضعیت</th>
                          <th className="py-2.5 px-3">یادداشت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {individualAttendanceRecords.map(rec => {
                          const course = courses.find(c => c.id === rec.courseId);
                          const session = course?.sessions.find(s => s.id === rec.sessionId);

                          return (
                            <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                                {course?.name || 'دوره نامشخص'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                {session?.sessionName || 'جلسه عمومی'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                                {toPersianDigits(rec.date)}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-teal-600 dark:text-teal-400 font-semibold">
                                {toPersianDigits(rec.time)}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  rec.status === 'present'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : rec.status === 'late'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                }`}>
                                  {rec.status === 'present' ? 'حاضر' : rec.status === 'late' ? 'با تأخیر' : 'موجه'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                                {rec.note || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    سابقه‌ای برای این پرسنل ثبت نشده است.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: COURSES OVERVIEW & EXCEL SUMMARY */}
      {reportType === 'courses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                خلاصه وضعیت کلیه دوره‌ها و میزان مشارکت
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تعداد شرکت‌کنندگان، تعداد جلسات، مدرسین و وضعیت هر دوره به صورت یکجا
              </p>
            </div>

            <button
              onClick={() => exportCoursesSummaryExcel(courses, attendance)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              دانلود خروجی اکسل کلیه دوره‌ها
            </button>
          </div>

          {/* Department Breakdown Mini Dashboard */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h4 className="font-bold text-xs text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              مشارکت واحدها و ادارات در دوره‌های آموزشی:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {departmentStats.map(([dept, count]) => (
                <div key={dept} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate" title={dept}>
                    {dept}
                  </span>
                  <strong className="text-base font-black text-teal-600 dark:text-teal-400 font-mono mt-0.5 block">
                    {toPersianDigits(count)} <span className="text-[10px] font-normal">نفر-جلسه</span>
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* Courses Summary Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-3">ردیف</th>
                    <th className="py-3 px-3">کد دوره</th>
                    <th className="py-3 px-3">نام دوره آموزشی</th>
                    <th className="py-3 px-3">مدرس</th>
                    <th className="py-3 px-3">مدت (ساعت)</th>
                    <th className="py-3 px-3 text-center">تعداد جلسات</th>
                    <th className="py-3 px-3 text-center">شرکت‌کنندگان کل</th>
                    <th className="py-3 px-3 text-center">پرسنل مهمان</th>
                    <th className="py-3 px-3 text-center">وضعیت دوره</th>
                    <th className="py-3 px-3 text-center">خروجی اکسل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {courses.map((c, i) => {
                    const cAtt = attendance.filter(a => a.courseId === c.id);
                    const uniq = new Set(cAtt.map(a => a.personnelId)).size;
                    const guests = new Set(cAtt.filter(a => a.isGuest).map(a => a.personnelId)).size;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-mono text-slate-400">{toPersianDigits(i + 1)}</td>
                        <td className="py-3 px-3 font-mono font-bold text-teal-600">{c.code}</td>
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">{c.name}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{c.instructor}</td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">{toPersianDigits(c.hours)}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-200">
                          {toPersianDigits(c.sessions.length)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-teal-600">
                          {toPersianDigits(uniq)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-amber-600">
                          {toPersianDigits(guests)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'active'
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {c.status === 'active' ? 'در حال اجرا' : 'پایان‌یافته'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => exportCourseAttendanceExcel(c, c.sessions, attendance, personnel)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition cursor-pointer"
                            title="دانلود اکسل این دوره"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
