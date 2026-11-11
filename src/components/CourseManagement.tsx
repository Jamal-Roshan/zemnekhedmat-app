import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  Clock, 
  Calendar, 
  MapPin, 
  User, 
  Layers, 
  Play, 
  FileSpreadsheet, 
  PlusCircle, 
  X, 
  Check, 
  CalendarDays,
  FileCheck2
} from 'lucide-react';
import { AttendanceRecord, Course, CourseSession, CourseStatus, Personnel, ThemeName } from '../types';
import { getTodayJalali, toEnglishDigits, toPersianDigits } from '../utils/jalali';
import { exportCourseAttendanceExcel } from '../utils/excel';
import { getThemeConfig } from '../utils/theme';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from './Toast';

interface Props {
  courses: Course[];
  attendance: AttendanceRecord[];
  personnel: Personnel[];
  onSaveCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onSelectForAttendance: (courseId: string) => void;
  onDeleteSessionRecords?: (sessionId: string) => void;
  currentTheme: ThemeName;
}

export const CourseManagement: React.FC<Props> = ({
  courses,
  attendance,
  personnel,
  onSaveCourse,
  onDeleteCourse,
  onSelectForAttendance,
  onDeleteSessionRecords,
  currentTheme,
}) => {
  const { showToast } = useToast();
  const themeObj = getThemeConfig(currentTheme);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showSessionsModal, setShowSessionsModal] = useState<Course | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CourseStatus>('all');

  // Confirmation modals
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<{ course: Course; session: CourseSession } | null>(null);

  // Session Edit State
  const [editingSession, setEditingSession] = useState<CourseSession | null>(null);

  // Course Form State
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    hours: number;
    instructor: string;
    location: string;
    startDate: string;
    endDate: string;
    status: CourseStatus;
    description: string;
  }>({
    code: '',
    name: '',
    hours: 8,
    instructor: '',
    location: '',
    startDate: getTodayJalali(),
    endDate: getTodayJalali(),
    status: 'active',
    description: '',
  });

  // Session inside modal form state (for Add or Edit)
  const [sessionForm, setSessionForm] = useState<{
    sessionName: string;
    date: string;
    startTime: string;
    endTime: string;
  }>({
    sessionName: '',
    date: getTodayJalali(),
    startTime: '08:30',
    endTime: '11:30',
  });

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setFormData({
      code: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      hours: 12,
      instructor: '',
      location: 'سالن همایش مرکزی',
      startDate: getTodayJalali(),
      endDate: getTodayJalali(),
      status: 'active',
      description: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      code: course.code,
      name: course.name,
      hours: course.hours,
      instructor: course.instructor,
      location: course.location,
      startDate: course.startDate,
      endDate: course.endDate,
      status: course.status,
      description: course.description || '',
    });
    setShowModal(true);
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      showToast('لطفاً نام و کد دوره را تکمیل فرمایید.', 'error');
      return;
    }

    const todayJalali = getTodayJalali();

    if (editingCourse) {
      // Edit
      const updated: Course = {
        ...editingCourse,
        code: toEnglishDigits(formData.code).trim(),
        name: formData.name.trim(),
        hours: Number(formData.hours) || 8,
        instructor: formData.instructor.trim() || 'نامشخص',
        location: formData.location.trim() || 'مرکز آموزش',
        startDate: formData.startDate.trim() || todayJalali,
        endDate: formData.endDate.trim() || todayJalali,
        status: formData.status,
        description: formData.description.trim(),
        updatedAt: todayJalali,
      };
      onSaveCourse(updated);
      showToast('مشخصات دوره با موفقیت ویرایش شد.', 'success');
    } else {
      // Add new
      const newCourseId = 'c_' + Date.now();
      const defaultSession: CourseSession = {
        id: 's_' + Date.now(),
        courseId: newCourseId,
        date: formData.startDate.trim() || todayJalali,
        sessionNumber: 1,
        sessionName: 'جلسه اول (صبح)',
        startTime: '08:30',
        endTime: '12:00',
      };

      const newCourse: Course = {
        id: newCourseId,
        code: toEnglishDigits(formData.code).trim(),
        name: formData.name.trim(),
        hours: Number(formData.hours) || 8,
        instructor: formData.instructor.trim() || 'نامشخص',
        location: formData.location.trim() || 'مرکز آموزش',
        startDate: formData.startDate.trim() || todayJalali,
        endDate: formData.endDate.trim() || todayJalali,
        status: formData.status,
        description: formData.description.trim(),
        sessions: [defaultSession],
        createdAt: todayJalali,
        updatedAt: todayJalali,
      };
      onSaveCourse(newCourse);
      showToast('دوره جدید با موفقیت ثبت گردید.', 'success');
    }

    setShowModal(false);
  };

  // Open Add Session Form
  const handleOpenAddSession = () => {
    setEditingSession(null);
    setSessionForm({
      sessionName: `جلسه شماره ${(showSessionsModal?.sessions.length || 0) + 1}`,
      date: getTodayJalali(),
      startTime: '13:30',
      endTime: '16:00',
    });
  };

  // Open Edit Session Form
  const handleOpenEditSession = (session: CourseSession) => {
    setEditingSession(session);
    setSessionForm({
      sessionName: session.sessionName,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
    });
  };

  // Save Session (Add or Edit)
  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSessionsModal) return;
    if (!sessionForm.sessionName.trim()) {
      showToast('لطفاً عنوان جلسه را وارد فرمایید.', 'error');
      return;
    }

    if (editingSession) {
      // Update existing session
      const updatedSessions = showSessionsModal.sessions.map(s => {
        if (s.id === editingSession.id) {
          return {
            ...s,
            sessionName: sessionForm.sessionName.trim(),
            date: sessionForm.date.trim() || getTodayJalali(),
            startTime: sessionForm.startTime,
            endTime: sessionForm.endTime,
          };
        }
        return s;
      });

      const updatedCourse: Course = {
        ...showSessionsModal,
        sessions: updatedSessions,
        updatedAt: getTodayJalali(),
      };

      onSaveCourse(updatedCourse);
      setShowSessionsModal(updatedCourse);
      setEditingSession(null);
      showToast('جلسه با موفقیت ویرایش و بروزرسانی شد.', 'success');
    } else {
      // Add new session
      const newSession: CourseSession = {
        id: 's_' + Date.now(),
        courseId: showSessionsModal.id,
        date: sessionForm.date.trim() || getTodayJalali(),
        sessionNumber: showSessionsModal.sessions.length + 1,
        sessionName: sessionForm.sessionName.trim(),
        startTime: sessionForm.startTime,
        endTime: sessionForm.endTime,
      };

      const updatedCourse: Course = {
        ...showSessionsModal,
        sessions: [...showSessionsModal.sessions, newSession],
        updatedAt: getTodayJalali(),
      };

      onSaveCourse(updatedCourse);
      setShowSessionsModal(updatedCourse);
      handleOpenAddSession();
      showToast('جلسه جدید به دوره افزوده شد.', 'success');
    }
  };

  // Confirm delete session
  const handleConfirmDeleteSession = () => {
    if (!sessionToDelete) return;
    const { course, session } = sessionToDelete;

    if (course.sessions.length <= 1) {
      showToast('هر دوره باید حداقل دارای یک جلسه باشد.', 'warning');
      setSessionToDelete(null);
      return;
    }

    const updatedSessions = course.sessions.filter(s => s.id !== session.id);
    const updatedCourse: Course = {
      ...course,
      sessions: updatedSessions,
      updatedAt: getTodayJalali(),
    };

    onSaveCourse(updatedCourse);
    setShowSessionsModal(updatedCourse);
    if (onDeleteSessionRecords) {
      onDeleteSessionRecords(session.id);
    }
    setSessionToDelete(null);
    if (editingSession?.id === session.id) {
      setEditingSession(null);
    }
    showToast(`جلسه «${session.sessionName}» با موفقیت حذف گردید.`, 'success');
  };

  // Confirm delete course
  const handleConfirmDeleteCourse = () => {
    if (!courseToDelete) return;
    onDeleteCourse(courseToDelete.id);
    showToast(`دوره «${courseToDelete.name}» با موفقیت حذف گردید.`, 'success');
    setCourseToDelete(null);
  };

  // Filtered courses
  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                          c.code.toLowerCase().includes(search.toLowerCase()) ||
                          c.instructor.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <span className={`p-2 rounded-xl ${themeObj.bgLight} ${themeObj.textPrimary}`}>
              <BookOpen className="w-6 h-6" />
            </span>
            مدیریت و تعریف دوره‌های ضمن خدمت
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            تعریف دوره جدید، تعیین کد دوره، ویرایش و حذف جلسات متعدد، مدرسین و خروجی اکسل
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold shadow-md active:scale-95 transition cursor-pointer ${themeObj.btnPrimary}`}
        >
          <Plus className="w-5 h-5" />
          تعریف دوره جدید
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام دوره، کد دوره، مدرس..."
            className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-teal-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-700'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            همه ({toPersianDigits(courses.length)})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              statusFilter === 'active'
                ? `${themeObj.btnPrimary} !shadow-none`
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            در حال برگزاری ({toPersianDigits(courses.filter(c => c.status === 'active').length)})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            تکمیل شده ({toPersianDigits(courses.filter(c => c.status === 'completed').length)})
          </button>
        </div>
      </div>

      {/* Courses Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCourses.map(course => {
          const courseAttendance = attendance.filter(a => a.courseId === course.id);
          const uniqueParticipantsCount = new Set(courseAttendance.map(a => a.personnelId)).size;
          const guestCount = new Set(courseAttendance.filter(a => a.isGuest).map(a => a.personnelId)).size;

          return (
            <div
              key={course.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-1.5">
                      {course.code}
                    </span>
                    <h3 className="font-black text-slate-900 dark:text-white text-base leading-snug">
                      {course.name}
                    </h3>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                    course.status === 'active'
                      ? themeObj.badge
                      : course.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {course.status === 'active' ? 'در حال اجرا' : course.status === 'completed' ? 'تکمیل شده' : 'پیش‌رو'}
                  </span>
                </div>

                {/* Course Metadata */}
                <div className="py-3.5 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <User className={`w-4 h-4 ${themeObj.textPrimary} shrink-0`} />
                    <span>مدرس: <strong>{course.instructor}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${themeObj.textPrimary} shrink-0`} />
                    <span>مدت آموزش: <strong>{toPersianDigits(course.hours)} ساعت</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-4 h-4 ${themeObj.textPrimary} shrink-0`} />
                    <span>مکان: <strong className="truncate">{course.location}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${themeObj.textPrimary} shrink-0`} />
                    <span>تاریخ: از {toPersianDigits(course.startDate)} تا {toPersianDigits(course.endDate)}</span>
                  </div>
                </div>

                {/* Sessions Badge */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">جلسات دوره:</span>
                  <button
                    onClick={() => {
                      setShowSessionsModal(course);
                      handleOpenAddSession();
                    }}
                    className={`font-bold ${themeObj.textPrimary} hover:underline flex items-center gap-1 cursor-pointer`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {toPersianDigits(course.sessions.length)} جلسه (ویرایش و حذف)
                  </button>
                </div>

                {/* Attendees Mini Stats */}
                <div className="mt-3 flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
                  <span>شرکت‌کنندگان تا کنون:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {toPersianDigits(uniqueParticipantsCount)} نفر
                    {guestCount > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 mr-1 text-[11px]">
                        ({toPersianDigits(guestCount)} مهمان)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectForAttendance(course.id)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95 ${themeObj.btnPrimary}`}
                >
                  <Play className="w-3.5 h-3.5" />
                  ورود به حضور و غیاب
                </button>

                <button
                  onClick={() => exportCourseAttendanceExcel(course, course.sessions, attendance, personnel)}
                  title="خروجی فایل اکسل حضور و غیاب دوره"
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleOpenEdit(course)}
                  title="ویرایش مشخصات دوره"
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setCourseToDelete(course)}
                  title="حذف دوره"
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">هیچ دوره‌ای یافت نشد</p>
          <p className="text-xs text-slate-400 mt-1">با کلیک روی دکمه بالا دوره جدیدی تعریف فرمایید.</p>
        </div>
      )}

      {/* Add / Edit Course Modal */}
      {showModal && (
        <div className="app-modal-overlay bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="app-modal-panel w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <BookOpen className={`w-5 h-5 ${themeObj.textPrimary}`} />
                {editingCourse ? 'ویرایش دوره ضمن خدمت' : 'تعریف دوره ضمن خدمت جدید'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    نام دوره: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثلاً: اخلاق حرفه‌ای و فنون مذاکره اداری"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    کد دوره: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="TR-1405"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    مدت دوره (ساعت آموزشی):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: parseInt(e.target.value, 10) || 8 })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    نام استاد / مدرس:
                  </label>
                  <input
                    type="text"
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    placeholder="مثلاً: دکتر محمدی"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    محل برگزاری (سالن / اتاق):
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="سالن کنفرانس طبقه ۲"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    تاریخ شروع (شمسی):
                  </label>
                  <input
                    type="text"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    placeholder="1405/08/17"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    تاریخ پایان (شمسی):
                  </label>
                  <input
                    type="text"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    placeholder="1405/08/19"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    وضعیت دوره:
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CourseStatus })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden"
                  >
                    <option value="active">در حال برگزاری (فعال)</option>
                    <option value="upcoming">پیش‌رو / ثبت‌نام</option>
                    <option value="completed">پایان‌یافته و تکمیل شده</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  شرح و سرفصل‌های دوره (اختیاری):
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="توضیحات کوتاه پیرامون محتوای آموزشی..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer ${themeObj.btnPrimary}`}
                >
                  <Check className="w-4 h-4" />
                  {editingCourse ? 'ذخیره تغییرات دوره' : 'ثبت دوره جدید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Sessions Modal - Complete with EDIT and DELETE functionality */}
      {showSessionsModal && (
        <div className="app-modal-overlay bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="app-modal-panel w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${themeObj.bgLight} ${themeObj.textPrimary}`}>
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    مدیریت جلسات دوره: {showSessionsModal.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    امکان ویرایش جلسات، تغییر تاریخ، تغییر ساعت شروع و پایان، و حذف جلسات
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSessionsModal(null);
                  setEditingSession(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Existing Sessions List */}
            <div className="mt-4 space-y-2.5 max-h-56 overflow-y-auto pr-1">
              <span className="text-xs font-semibold text-slate-500 block mb-1">
                فهرست جلسات تعریف شده ({toPersianDigits(showSessionsModal.sessions.length)} جلسه):
              </span>
              {showSessionsModal.sessions.map((sess, idx) => {
                const isBeingEdited = editingSession?.id === sess.id;
                return (
                  <div
                    key={sess.id}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 text-xs ${
                      isBeingEdited 
                        ? `${themeObj.borderLight} ${themeObj.bgLight} ring-2 ring-teal-500/20`
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full font-bold flex items-center justify-center font-mono ${themeObj.badge}`}>
                        {toPersianDigits(idx + 1)}
                      </span>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                          {sess.sessionName}
                          {isBeingEdited && (
                            <span className="text-[10px] bg-teal-500 text-white px-2 py-0.5 rounded-md font-normal">
                              در حال ویرایش
                            </span>
                          )}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                          تاریخ: <strong className="font-mono text-slate-700 dark:text-slate-200">{toPersianDigits(sess.date)}</strong> | ساعت: {toPersianDigits(sess.startTime)} الی {toPersianDigits(sess.endTime)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSession(sess)}
                        title="ویرایش این جلسه"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSessionToDelete({ course: showSessionsModal, session: sess })}
                        title="حذف این جلسه"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Session Edit / Add Form */}
            <form onSubmit={handleSaveSession} className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  {editingSession ? (
                    <>
                      <Edit3 className={`w-4 h-4 ${themeObj.textPrimary}`} />
                      ویرایش جلسه: {editingSession.sessionName}
                    </>
                  ) : (
                    <>
                      <PlusCircle className={`w-4 h-4 ${themeObj.textPrimary}`} />
                      افزودن جلسه جدید به دوره:
                    </>
                  )}
                </h4>

                {editingSession && (
                  <button
                    type="button"
                    onClick={handleOpenAddSession}
                    className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                  >
                    انصراف از ویرایش و افزودن جلسه جدید
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    عنوان جلسه: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionForm.sessionName}
                    onChange={(e) => setSessionForm({ ...sessionForm, sessionName: e.target.value })}
                    placeholder="مثلاً: جلسه دوم (بعدازظهر)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    تاریخ برگزاری (شمسی): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionForm.date}
                    onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                    placeholder="1405/08/17"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">ساعت شروع:</label>
                  <input
                    type="time"
                    required
                    value={sessionForm.startTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">ساعت پایان:</label>
                  <input
                    type="time"
                    required
                    value={sessionForm.endTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                {editingSession && (
                  <button
                    type="button"
                    onClick={handleOpenAddSession}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    لغو ویرایش
                  </button>
                )}
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer ${themeObj.btnPrimary}`}
                >
                  <Check className="w-3.5 h-3.5" />
                  {editingSession ? 'ذخیره تغییرات جلسه' : 'ثبت جلسه در دوره'}
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={() => setShowSessionsModal(null)}
              className="mt-4 w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Session Deletion */}
      <ConfirmModal
        isOpen={!!sessionToDelete}
        title="حذف جلسه از دوره"
        message={`آیا از حذف «${sessionToDelete?.session.sessionName}» اطمینان دارید؟ تمامی سوابق حضور پرسنل مربوط به این جلسه نیز حذف خواهد شد.`}
        confirmText="بله، حذف جلسه"
        cancelText="انصراف"
        variant="danger"
        onConfirm={handleConfirmDeleteSession}
        onCancel={() => setSessionToDelete(null)}
      />

      {/* Confirmation Modal for Course Deletion */}
      <ConfirmModal
        isOpen={!!courseToDelete}
        title="حذف دوره ضمن خدمت"
        message={`آیا از حذف قطعی دوره «${courseToDelete?.name}» اطمینان دارید؟ تمام جلسات و سوابق حضور این دوره پاکسازی خواهند شد.`}
        confirmText="بله، حذف دوره"
        cancelText="انصراف"
        variant="danger"
        onConfirm={handleConfirmDeleteCourse}
        onCancel={() => setCourseToDelete(null)}
      />
    </div>
  );
};
