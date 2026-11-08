import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  UserCheck, 
  UserPlus, 
  Search, 
  Trash2, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  Sparkles,
  Users,
  Building,
  RotateCcw,
  PlusCircle,
  HelpCircle,
  Check,
  ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttendanceRecord, AttendanceStatus, Course, CourseSession, Gender, Personnel, ThemeName } from '../types';
import { getCurrentTime, getTodayJalali, toEnglishDigits, toPersianDigits } from '../utils/jalali';
import { isValidIranianNationalId, normalizeNationalId } from '../utils/nationalId';
import { sounds, triggerHaptic } from '../utils/feedback';
import { THEMES, getThemeConfig } from '../utils/theme';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from './Toast';

interface Props {
  courses: Course[];
  personnel: Personnel[];
  attendance: AttendanceRecord[];
  activeCourseId: string;
  activeSessionId: string;
  onSelectCourse: (courseId: string) => void;
  onSelectSession: (sessionId: string) => void;
  onAddAttendance: (record: AttendanceRecord) => void;
  onRemoveAttendance: (recordId: string) => void;
  onAddPersonnel: (person: Personnel) => void;
  onAddSession: (courseId: string, session: CourseSession) => void;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  currentTheme: ThemeName;
}

export const FastAttendanceScanner: React.FC<Props> = ({
  courses,
  personnel,
  attendance,
  activeCourseId,
  activeSessionId,
  onSelectCourse,
  onSelectSession,
  onAddAttendance,
  onRemoveAttendance,
  onAddPersonnel,
  onAddSession,
  soundEnabled,
  vibrationEnabled,
  currentTheme,
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('present');
  const [note, setNote] = useState('');
  const [successToast, setSuccessToast] = useState<{ name: string; time: string; status: AttendanceStatus; isGuest?: boolean } | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [attendanceToDelete, setAttendanceToDelete] = useState<AttendanceRecord | null>(null);
  const [guestForm, setGuestForm] = useState<{
    personnelCode: string;
    nationalId: string;
    firstName: string;
    lastName: string;
    gender: Gender;
    workLocation: string;
    note: string;
  }>({
    personnelCode: '',
    nationalId: '',
    firstName: '',
    lastName: '',
    gender: 'male',
    workLocation: '',
    note: '',
  });

  const [newSessionForm, setNewSessionForm] = useState<{
    sessionName: string;
    startTime: string;
    endTime: string;
  }>({
    sessionName: 'جلسه بعدازظهر',
    startTime: '13:30',
    endTime: '16:00',
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Active course and session
  const activeCourse = useMemo(() => {
    return courses.find(c => c.id === activeCourseId) || courses[0];
  }, [courses, activeCourseId]);

  const activeSession = useMemo(() => {
    if (!activeCourse) return null;
    return activeCourse.sessions.find(s => s.id === activeSessionId) || activeCourse.sessions[0] || null;
  }, [activeCourse, activeSessionId]);

  // Normalized search query
  const cleanQuery = useMemo(() => toEnglishDigits(searchQuery).toLowerCase().trim(), [searchQuery]);

  // Live matching personnel
  const matchedPersonnel = useMemo(() => {
    if (!cleanQuery) return [];
    return personnel.filter(p => {
      const pCode = toEnglishDigits(p.personnelCode).toLowerCase();
      const nId = toEnglishDigits(p.nationalId).toLowerCase();
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      return pCode.includes(cleanQuery) || nId.includes(cleanQuery) || fullName.includes(cleanQuery);
    }).slice(0, 5);
  }, [cleanQuery, personnel]);

  // Attendees for the current session
  const currentSessionAttendees = useMemo(() => {
    if (!activeCourse || !activeSession) return [];
    return attendance
      .filter(a => a.courseId === activeCourse.id && a.sessionId === activeSession.id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [attendance, activeCourse, activeSession]);

  const attendeeIdsSet = useMemo(() => {
    return new Set(currentSessionAttendees.map(a => a.personnelId));
  }, [currentSessionAttendees]);

  // Theme primary classes
  const themeObj = getThemeConfig(currentTheme);

  // Auto focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeCourseId, activeSessionId]);

  // Fire check-in for a given person
  const executeCheckIn = (person: Personnel) => {
    if (!activeCourse || !activeSession) {
      showToast('لطفاً ابتدا دوره و جلسه فعال را انتخاب فرمایید.', 'warning');
      return;
    }

    // Check if already registered in this session
    if (attendeeIdsSet.has(person.id)) {
      sounds.playWarning(soundEnabled);
      triggerHaptic([100, 50, 100], vibrationEnabled);
      showToast(`پرسنل «${person.firstName} ${person.lastName}» قبلاً در این جلسه ثبت حضور شده است!`, 'warning');
      return;
    }

    const nowJalali = getTodayJalali();
    const nowTime = getCurrentTime();

    const record: AttendanceRecord = {
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      courseId: activeCourse.id,
      sessionId: activeSession.id,
      personnelId: person.id,
      personnelCode: person.personnelCode,
      nationalId: person.nationalId,
      fullName: `${person.firstName} ${person.lastName}`.trim(),
      gender: person.gender,
      workLocation: person.workLocation,
      isGuest: !!person.isGuest,
      date: nowJalali,
      time: nowTime,
      status: selectedStatus,
      note: note.trim() || (person.isGuest ? 'پرسنل مهمان' : undefined),
      timestamp: Date.now(),
    };

    onAddAttendance(record);
    sounds.playSuccess(soundEnabled);
    triggerHaptic(40, vibrationEnabled);

    // Minor celebratory confetti for 10th, 25th, 50th check-ins
    const nextCount = currentSessionAttendees.length + 1;
    if (nextCount === 10 || nextCount === 25 || nextCount === 50) {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    }

    setSuccessToast({
      name: record.fullName,
      time: nowTime,
      status: selectedStatus,
      isGuest: person.isGuest,
    });
    setTimeout(() => setSuccessToast(null), 3500);

    setSearchQuery('');
    setNote('');
    inputRef.current?.focus();
  };

  // Direct submit from input (Enter key or button)
  const handleSubmitInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cleanQuery) return;

    if (matchedPersonnel.length === 1) {
      executeCheckIn(matchedPersonnel[0]);
    } else if (matchedPersonnel.length > 1) {
      // Exact match check
      const exactMatch = matchedPersonnel.find(
        p => toEnglishDigits(p.personnelCode) === cleanQuery || toEnglishDigits(p.nationalId) === cleanQuery
      );
      if (exactMatch) {
        executeCheckIn(exactMatch);
      } else {
        // multiple matches, wait for user selection
      }
    } else {
      // Not found! Offer Guest registration
      sounds.playGuestNotice(soundEnabled);
      triggerHaptic(80, vibrationEnabled);
      // Pre-fill guest form
      const isNum = /^\d+$/.test(cleanQuery);
      setGuestForm({
        personnelCode: isNum && cleanQuery.length <= 6 ? cleanQuery : `G-${Math.floor(1000 + Math.random() * 9000)}`,
        nationalId: isNum && cleanQuery.length === 10 ? cleanQuery : '',
        firstName: !isNum ? searchQuery.split(' ')[0] || '' : '',
        lastName: !isNum ? searchQuery.split(' ').slice(1).join(' ') || '' : '',
        gender: 'male',
        workLocation: 'واحد مهمان / سایر ادارات',
        note: 'ثبت سریع مهمان',
      });
      setShowGuestModal(true);
    }
  };

  // Save guest and immediately check in
  const handleSaveGuestAndCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestForm.firstName || !guestForm.lastName) {
      showToast('لطفاً نام و نام خانوادگی را وارد فرمایید.', 'error');
      return;
    }

    const cleanNId = normalizeNationalId(guestForm.nationalId);
    if (guestForm.nationalId.trim()) {
      if (!isValidIranianNationalId(cleanNId)) {
        showToast('کد ملی وارد شده برای پرسنل مهمان نامعتبر است! الگوی ده رقمی و رقم کنترلی ثبت احوال مطابقت ندارد.', 'error');
        return;
      }
    }

    const todayJalali = getTodayJalali();
    const guestPerson: Personnel = {
      id: 'p_guest_' + Date.now(),
      personnelCode: toEnglishDigits(guestForm.personnelCode) || `G-${Date.now().toString().slice(-4)}`,
      nationalId: cleanNId,
      firstName: guestForm.firstName.trim(),
      lastName: guestForm.lastName.trim(),
      gender: guestForm.gender,
      workLocation: guestForm.workLocation.trim() || 'پرسنل مهمان',
      isGuest: true,
      createdAt: todayJalali,
      updatedAt: todayJalali,
    };

    onAddPersonnel(guestPerson);
    setShowGuestModal(false);

    // Check in right away
    executeCheckIn(guestPerson);
  };

  // Add new session handler
  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse) return;

    const newSession: CourseSession = {
      id: 's_' + Date.now(),
      courseId: activeCourse.id,
      date: getTodayJalali(),
      sessionNumber: activeCourse.sessions.length + 1,
      sessionName: newSessionForm.sessionName.trim() || `جلسه شماره ${activeCourse.sessions.length + 1}`,
      startTime: newSessionForm.startTime,
      endTime: newSessionForm.endTime,
    };

    onAddSession(activeCourse.id, newSession);
    onSelectSession(newSession.id);
    setShowAddSessionModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Active Course & Session Selector Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 transition">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Course select */}
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              دوره آموزشی فعال:
            </label>
            <div className="relative">
              <select
                value={activeCourse?.id || ''}
                onChange={(e) => {
                  onSelectCourse(e.target.value);
                  const found = courses.find(c => c.id === e.target.value);
                  if (found && found.sessions.length > 0) {
                    onSelectSession(found.sessions[0].id);
                  }
                }}
                className="w-full appearance-none bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition"
              >
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.code}) - {course.instructor}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Session select & quick add */}
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                جلسه / زمان حضور:
              </label>
              <button
                type="button"
                onClick={() => setShowAddSessionModal(true)}
                className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                افزودن جلسه جدید
              </button>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={activeSession?.id || ''}
                  onChange={(e) => onSelectSession(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition"
                >
                  {activeCourse?.sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.sessionName} | تاریخ: {s.date} (ساعت {s.startTime})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Session quick stats badge */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div className="text-center px-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">ثبت شده این جلسه</span>
              <span className="text-lg font-black text-teal-600 dark:text-teal-400">
                {toPersianDigits(currentSessionAttendees.length)} <span className="text-xs font-normal">نفر</span>
              </span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-center px-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">مهمان‌ها</span>
              <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                {toPersianDigits(currentSessionAttendees.filter(a => a.isGuest).length)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Quick Check-In Station */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
              <span className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
                <UserCheck className="w-6 h-6" />
              </span>
              ثبت سریع حضور و غیاب
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              کد پرسنلی، کد ملی یا نام فرد را وارد کرده و Enter را بزنید.
            </p>
          </div>

          {/* Guest personnel quick action button */}
          <button
            type="button"
            onClick={() => {
              setGuestForm({
                personnelCode: `G-${Math.floor(1000 + Math.random() * 9000)}`,
                nationalId: '',
                firstName: '',
                lastName: '',
                gender: 'male',
                workLocation: '',
                note: 'پرسنل مهمان',
              });
              setShowGuestModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-semibold transition cursor-pointer self-start md:self-auto"
          >
            <UserPlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ثبت پرسنل مهمان (جدید)
          </button>
        </div>

        {/* Input & Action Form */}
        <form onSubmit={handleSubmitInput} className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی کد پرسنلی، کد ملی یا نام پرسنل..."
                className="w-full pl-10 pr-12 py-3.5 text-base sm:text-lg bg-slate-50 dark:bg-slate-800/90 border-2 border-slate-300 dark:border-slate-700 focus:border-teal-500 dark:focus:border-teal-400 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden transition shadow-inner font-medium"
              />
              <Search className="w-5 h-5 text-slate-400 absolute right-4 top-4 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    inputRef.current?.focus();
                  }}
                  className="absolute left-3 top-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Check-in Button */}
            <button
              type="submit"
              className={`px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 active:scale-95 transition cursor-pointer ${themeObj.primaryClass}`}
            >
              <CheckCircle className="w-5 h-5" />
              ثبت حضور
            </button>
          </div>

          {/* Status selector & optional note */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setSelectedStatus('present')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedStatus === 'present'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                حاضر (عادی)
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('late')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedStatus === 'late'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                با تأخیر
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('excused')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedStatus === 'excused'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                مرخصی / موجه
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('absent')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedStatus === 'absent'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                غایب
              </button>
            </div>

            <div className="flex-1 max-w-xs">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="یادداشت یا علت تأخیر (اختیاری)..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>
        </form>

        {/* Live Search Results Dropdown/Cards */}
        {cleanQuery && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                نتایج جستجو برای «{searchQuery}»:
              </span>
              <span className="text-xs text-slate-400">
                {toPersianDigits(matchedPersonnel.length)} مورد پیدا شد
              </span>
            </div>

            {matchedPersonnel.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {matchedPersonnel.map(person => {
                  const alreadyCheckedIn = attendeeIdsSet.has(person.id);
                  return (
                    <div
                      key={person.id}
                      onClick={() => !alreadyCheckedIn && executeCheckIn(person)}
                      className={`p-3.5 rounded-2xl border transition text-right relative ${
                        alreadyCheckedIn
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 opacity-80 cursor-default'
                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:shadow-md cursor-pointer active:scale-98'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            {person.firstName} {person.lastName}
                            {person.isGuest && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                مهمان
                              </span>
                            )}
                          </h4>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
                            <p>کد پرسنلی: <span className="font-mono text-slate-700 dark:text-slate-300">{person.personnelCode}</span></p>
                            <p>کد ملی: <span className="font-mono text-slate-700 dark:text-slate-300">{person.nationalId || '-'}</span></p>
                            <p className="truncate max-w-[180px]">واحد: {person.workLocation}</p>
                          </div>
                        </div>

                        {alreadyCheckedIn ? (
                          <span className="p-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 rounded-xl" title="قبلاً ثبت شده">
                            <Check className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="p-1.5 bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300 rounded-xl">
                            <PlusCircle className="w-4 h-4" />
                          </span>
                        )}
                      </div>

                      {alreadyCheckedIn && (
                        <div className="mt-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/50 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                          ✓ حضور در این جلسه ثبت شده است
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                  <div>
                    <h5 className="font-bold text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
                      شخصی با این مشخصات در دیتابیس پرسنل یافت نشد!
                    </h5>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      آیا این شخص پرسنل مهمان است؟ می‌توانید مشخصات وی را ثبت کرده و بلافاصله حضورش را ثبت کنید.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const isNum = /^\d+$/.test(cleanQuery);
                    setGuestForm({
                      personnelCode: isNum && cleanQuery.length <= 6 ? cleanQuery : `G-${Math.floor(1000 + Math.random() * 9000)}`,
                      nationalId: isNum && cleanQuery.length === 10 ? cleanQuery : '',
                      firstName: !isNum ? searchQuery.split(' ')[0] || '' : '',
                      lastName: !isNum ? searchQuery.split(' ').slice(1).join(' ') || '' : '',
                      gender: 'male',
                      workLocation: 'واحد مهمان / سایر ادارات',
                      note: 'ثبت سریع مهمان',
                    });
                    setShowGuestModal(true);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
                >
                  ثبت مشخصات و حضور پرسنل مهمان
                </button>
              </div>
            )}
          </div>
        )}

        {/* Success Toast */}
        {successToast && (
          <div className="mt-4 p-3.5 bg-emerald-500 text-white rounded-2xl shadow-lg flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-emerald-200 animate-spin" />
              <div>
                <p className="font-bold text-sm">
                  حضور «{successToast.name}» با موفقیت در سیستم ثبت شد!
                  {successToast.isGuest && ' (پرسنل مهمان)'}
                </p>
                <p className="text-xs text-emerald-100">
                  ساعت ثبت: {toPersianDigits(successToast.time)} | وضعیت:{' '}
                  {successToast.status === 'present'
                    ? 'حاضر'
                    : successToast.status === 'late'
                    ? 'با تأخیر'
                    : successToast.status === 'excused'
                    ? 'موجه'
                    : 'غایب'}
                </p>
              </div>
            </div>
            <span className="text-xs bg-emerald-600/60 px-2 py-1 rounded-lg">ذخیره شد</span>
          </div>
        )}
      </div>

      {/* Attendees Table / Live Feed for Current Session */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              لیست حاضرین در جلسه جاری
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                {toPersianDigits(currentSessionAttendees.length)} نفر
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              دوره: {activeCourse?.name} | جلسه: {activeSession?.sessionName}
            </p>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            تاریخ امروز: <strong className="text-slate-700 dark:text-slate-200">{toPersianDigits(getTodayJalali())}</strong>
          </div>
        </div>

        {currentSessionAttendees.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40">
                  <th className="py-2.5 px-3 rounded-r-xl">ردیف</th>
                  <th className="py-2.5 px-3">نام و نام خانوادگی</th>
                  <th className="py-2.5 px-3">کد پرسنلی</th>
                  <th className="py-2.5 px-3">کد ملی</th>
                  <th className="py-2.5 px-3">محل خدمت</th>
                  <th className="py-2.5 px-3">ساعت ثبت</th>
                  <th className="py-2.5 px-3">وضعیت</th>
                  <th className="py-2.5 px-3">نوع</th>
                  <th className="py-2.5 px-3 rounded-l-xl text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {currentSessionAttendees.map((att, idx) => (
                  <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-3 text-slate-400 font-mono">{toPersianDigits(idx + 1)}</td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                      {att.fullName}
                      {att.note && (
                        <span className="block text-[11px] font-normal text-slate-400 mt-0.5">
                          یادداشت: {att.note}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">{toPersianDigits(att.personnelCode)}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">{toPersianDigits(att.nationalId) || '-'}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{att.workLocation}</td>
                    <td className="py-3 px-3 font-mono text-teal-600 dark:text-teal-400 font-semibold">{toPersianDigits(att.time)}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        att.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : att.status === 'late'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : att.status === 'excused'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {att.status === 'present' ? 'حاضر' : att.status === 'late' ? 'با تأخیر' : att.status === 'excused' ? 'موجه' : 'غایب'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {att.isGuest ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          مهمان
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">پرسنل رسمی</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setAttendanceToDelete(att)}
                        title="حذف از این جلسه"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              هنوز حضوری برای این جلسه ثبت نشده است.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              با استفاده از کادر جستجوی بالا، کد پرسنلی یا کد ملی شرکت‌کنندگان را ثبت فرمایید.
            </p>
          </div>
        )}
      </div>

      {/* Guest Personnel Quick Registration Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-xl">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">ثبت فوری پرسنل مهمان</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    مشخصات ذخیره شده و حضور فرد در دوره «{activeCourse?.name}» بلافاصله ثبت خواهد شد.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuestModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGuestAndCheckIn} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    نام: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={guestForm.firstName}
                    onChange={(e) => setGuestForm({ ...guestForm, firstName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-hidden"
                    placeholder="مثلاً: علی"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    نام خانوادگی: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={guestForm.lastName}
                    onChange={(e) => setGuestForm({ ...guestForm, lastName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-hidden"
                    placeholder="مثلاً: احمدی"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    کد پرسنلی / شناسه مهمان:
                  </label>
                  <input
                    type="text"
                    value={guestForm.personnelCode}
                    onChange={(e) => setGuestForm({ ...guestForm, personnelCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-hidden font-mono"
                    placeholder="G-1025"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    کد ملی (۱۰ رقم):
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={guestForm.nationalId}
                    onChange={(e) => setGuestForm({ ...guestForm, nationalId: e.target.value })}
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono focus:outline-hidden ${
                      guestForm.nationalId.trim().length >= 8
                        ? isValidIranianNationalId(normalizeNationalId(guestForm.nationalId))
                          ? 'border-emerald-500 focus:border-emerald-600 text-emerald-700 dark:text-emerald-300'
                          : 'border-rose-400 focus:border-rose-500 text-rose-600'
                        : 'border-slate-300 dark:border-slate-700 focus:border-amber-500'
                    }`}
                    placeholder="مثلاً: 0010000003"
                  />
                  {guestForm.nationalId.trim() && (
                    <div className="mt-1 text-[11px] font-semibold">
                      {isValidIranianNationalId(normalizeNationalId(guestForm.nationalId)) ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          کد ملی معتبر است
                        </span>
                      ) : (
                        <span className="text-rose-500 flex items-center gap-1">
                          ✕ الگوی کد ملی نامعتبر است (رقم کنترلی ناصحیح)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    جنسیت:
                  </label>
                  <select
                    value={guestForm.gender}
                    onChange={(e) => setGuestForm({ ...guestForm, gender: e.target.value as Gender })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="male">مرد</option>
                    <option value="female">زن</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    محل خدمت / اداره مبدأ:
                  </label>
                  <input
                    type="text"
                    value={guestForm.workLocation}
                    onChange={(e) => setGuestForm({ ...guestForm, workLocation: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-hidden"
                    placeholder="مثلاً اداره کل راه و شهرسازی"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  توضیحات یا یادداشت مهمان:
                </label>
                <input
                  type="text"
                  value={guestForm.note}
                  onChange={(e) => setGuestForm({ ...guestForm, note: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-amber-500 focus:outline-hidden"
                  placeholder="مثلاً: مأمور به خدمت / شرکت‌کننده آزاد"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGuestModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-md shadow-amber-600/25 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  ذخیره و ثبت فوری حضور در دوره
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Session Modal */}
      {showAddSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-100 dark:bg-teal-950 text-teal-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">افزودن جلسه جدید به دوره</h3>
              </div>
              <button
                onClick={() => setShowAddSessionModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  عنوان جلسه:
                </label>
                <input
                  type="text"
                  required
                  value={newSessionForm.sessionName}
                  onChange={(e) => setNewSessionForm({ ...newSessionForm, sessionName: e.target.value })}
                  placeholder="مثلاً: جلسه دوم (بعدازظهر) یا کارگاه عملی"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    ساعت شروع:
                  </label>
                  <input
                    type="time"
                    required
                    value={newSessionForm.startTime}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, startTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-teal-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    ساعت پایان:
                  </label>
                  <input
                    type="time"
                    required
                    value={newSessionForm.endTime}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, endTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-teal-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-400">
                تاریخ جلسه بر اساس تاریخ جاری ({toPersianDigits(getTodayJalali())}) تنظیم می‌شود.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSessionModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  افزودن و انتخاب جلسه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Removing Attendance */}
      <ConfirmModal
        isOpen={!!attendanceToDelete}
        title="لغو ثبت حضور پرسنل در جلسه"
        message={`آیا از لغو ثبت حضور «${attendanceToDelete?.fullName}» در این جلسه اطمینان دارید؟`}
        confirmText="بله، لغو حضور"
        cancelText="انصراف"
        variant="danger"
        onConfirm={() => {
          if (attendanceToDelete) {
            onRemoveAttendance(attendanceToDelete.id);
            showToast(`ثبت حضور «${attendanceToDelete.fullName}» لغو شد.`, 'info');
            setAttendanceToDelete(null);
          }
        }}
        onCancel={() => setAttendanceToDelete(null)}
      />
    </div>
  );
};
