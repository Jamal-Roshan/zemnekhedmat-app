import * as XLSX from 'xlsx';
import { AttendanceRecord, Course, CourseSession, Gender, Personnel } from '../types';
import { getTodayJalali, toEnglishDigits, toPersianDigits } from './jalali';
import { saveWorkbook } from './nativeFile';
import { isValidIranianNationalId, normalizeNationalId, formatNationalIdForExport, getNationalIdConfig } from './nationalId';
import { normalizePersian } from './persianText';

export interface ImportPersonnelResult {
  added: number;
  updated: number;
  total: number;
  errors: string[];
  errorRows: ImportErrorRow[];
  records: Personnel[];
}

export interface ImportErrorRow {
  row: number;            // شماره ردیف در فایل اکسل
  personnelCode: string;
  nationalId: string;
  fullName: string;
  problem: string;
  inserted: boolean;      // آیا با وجود خطا ثبت شد؟
}

/**
 * Configure workbook and all worksheets for Persian Right-to-Left (RTL) display in Excel
 */
export function applyRTLToWorkbook(workbook: XLSX.WorkBook, sheetNames?: string[]) {
  const names = sheetNames || workbook.SheetNames;
  (workbook as unknown as { Workbook?: { Views?: { RTL?: boolean }[] } }).Workbook = {
    Views: [{ RTL: true }],
  };

  names.forEach(name => {
    const sheet = workbook.Sheets[name];
    if (sheet) {
      sheet['!views'] = [{ RTL: true }];
      const sheetAny = sheet as unknown as { '!sheetPr'?: { rightToLeft?: number | boolean } };
      sheetAny['!sheetPr'] = { rightToLeft: 1 };
    }
  });
}

/**
 * Clean and normalize cell text, stripping BOM and invisible RTL/LTR markers
 */
/** یکسان‌سازی سرستون‌ها: ي/ك عربی، نیم‌فاصله، فاصله‌های اضافه و حروف بزرگ/کوچک */
function normHeader(s: string): string {
  return normalizePersian(String(s))
    .replace(/[\u200B-\u200F\uFEFF]/g, ' ')
    .replace(/[_\s]+/g, ' ')
    .trim()
    .toLowerCase();
}

function cleanText(val: unknown): string {
  if (val === undefined || val === null) return '';
  return normalizePersian(String(val))
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize gender string
 */
function normalizeGender(val: unknown): Gender {
  const text = cleanText(val).toLowerCase();
  if (text.includes('زن') || text.includes('خانم') || text.includes('female') || text.includes('f')) {
    return 'female';
  }
  return 'male';
}

/**
 * Parse an uploaded Excel or CSV file containing personnel
 */
export async function parsePersonnelExcel(
  file: File,
  existingPersonnel: Personnel[]
): Promise<ImportPersonnelResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  
  if (workbook.SheetNames.length === 0) {
    throw new Error('فایل اکسل خالی است یا شیت معتبری ندارد.');
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('هیچ داده‌ای در شیت اول اکسل پیدا نشد.');
  }

  const errors: string[] = [];
  const errorRows: ImportErrorRow[] = [];
  const personnelMapByCode = new Map<string, Personnel>();
  const personnelMapByNationalId = new Map<string, Personnel>();

  // Index existing records
  existingPersonnel.forEach(p => {
    if (p.personnelCode) personnelMapByCode.set(toEnglishDigits(p.personnelCode), p);
    if (p.nationalId) personnelMapByNationalId.set(toEnglishDigits(p.nationalId), p);
  });

  const updatedPersonnelList: Personnel[] = [...existingPersonnel];
  let addedCount = 0;
  let updatedCount = 0;

  const nowJalali = getTodayJalali();

  rawRows.forEach((row, index) => {
    const rowNum = index + 2;
    try { // considering header is row 1
    
    // Find keys with case-insensitive / Persian tolerant matching
    const keys = Object.keys(row);
    const findVal = (...patterns: string[]) => {
      for (const pattern of patterns) {
        const foundKey = keys.find(k => normHeader(k).includes(normHeader(pattern)));
        if (foundKey && row[foundKey] !== undefined) {
          return cleanText(row[foundKey]);
        }
      }
      return '';
    };

    const personnelCodeRaw = findVal('کد پرسنلی', 'پرسنلی', 'شماره پرسنلی', 'personnel', 'personnelcode', 'code');
    const nationalIdRaw = findVal('کد ملی', 'کدملی', 'شماره ملی', 'national', 'nationalid', 'melli');
    const fullNameRaw = findVal('نام و نام خانوادگی', 'نام کامل', 'نام_کامل', 'fullname', 'full_name');
    let firstName = findVal('نام کوچک', 'نام', 'اسم', 'firstname', 'first_name');
    let lastName = findVal('نام خانوادگی', 'فامیلی', 'نام_خانوادگی', 'شهرت', 'lastname', 'last_name', 'family');
    const genderRaw = findVal('جنسیت', 'جنس', 'gender', 'sex');
    const workLocation = findVal('محل خدمت', 'محل کار', 'واحد سازمانی', 'واحد', 'اداره', 'بخش', 'سازمان', 'worklocation', 'department', 'location');

    // Handle combined full name if separate columns are not provided
    if (fullNameRaw && (!firstName || !lastName)) {
      const parts = fullNameRaw.trim().split(/\s+/);
      if (parts.length > 1) {
        if (!firstName) firstName = parts[0];
        if (!lastName) lastName = parts.slice(1).join(' ');
      } else {
        if (!firstName) firstName = parts[0] || '';
      }
    } else if (firstName && !lastName && firstName.trim().includes(' ')) {
      const parts = firstName.trim().split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }

    let personnelCode = toEnglishDigits(personnelCodeRaw).replace(/\s+/g, '');
    let nationalId = normalizeNationalId(nationalIdRaw);
    const pushErr = (problem: string, inserted: boolean) => {
      errors.push(`ردیف ${rowNum}: ${problem}`);
      errorRows.push({
        row: rowNum,
        personnelCode: personnelCodeRaw,
        nationalId: nationalIdRaw,
        fullName: `${firstName} ${lastName}`.trim(),
        problem,
        inserted,
      });
    };
    {
      const rawDigits = toEnglishDigits(nationalIdRaw).replace(/\D/g, '');
      if (getNationalIdConfig().nidImportMode === 'with' && rawDigits && rawDigits.length < 10 && isValidIranianNationalId(nationalId)) {
        pushErr(`طبق تنظیمات، فایل باید کد ملی را با صفر اول (ده رقمی) داشته باشد؛ «${nationalIdRaw}» کوتاه‌تر است و به‌صورت خودکار با صفر تکمیل شد.`, true);
      }
    }

    // Validate National ID pattern and checksum if provided
    if (nationalId && !isValidIranianNationalId(nationalId)) {
      pushErr(`کد ملی «${nationalIdRaw}» نامعتبر است (عدم تطابق با الگوی ده رقمی ثبت احوال) و ردیف ثبت نشد.`, false);
      return;
    }

    if (!personnelCode && !nationalId) {
      pushErr('کد پرسنلی و کد ملی هر دو خالی هستند و ردیف ثبت نشد.', false);
      return;
    }

    if (!firstName && !lastName) {
      pushErr('نام و نام خانوادگی خالی است و ردیف ثبت نشد.', false);
      return;
    }

    const gender = normalizeGender(genderRaw);

    // Check if record exists
    let existing: Personnel | undefined;
    if (personnelCode && personnelMapByCode.has(personnelCode)) {
      existing = personnelMapByCode.get(personnelCode);
    } else if (nationalId && personnelMapByNationalId.has(nationalId)) {
      existing = personnelMapByNationalId.get(nationalId);
    }

    if (existing) {
      // Update existing record
      const indexInList = updatedPersonnelList.findIndex(p => p.id === existing!.id);
      if (indexInList !== -1) {
        const updatedRecord: Personnel = {
          ...existing,
          personnelCode: personnelCode || existing.personnelCode,
          nationalId: nationalId || existing.nationalId,
          firstName: firstName || existing.firstName,
          lastName: lastName || existing.lastName,
          gender: genderRaw ? gender : existing.gender,
          workLocation: workLocation || existing.workLocation,
          updatedAt: nowJalali,
        };
        updatedPersonnelList[indexInList] = updatedRecord;
        if (personnelCode) personnelMapByCode.set(personnelCode, updatedRecord);
        if (nationalId) personnelMapByNationalId.set(nationalId, updatedRecord);
        updatedCount++;
      }
    } else {
      // Insert new record
      const newRecord: Personnel = {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        personnelCode: personnelCode || `P-${Math.floor(10000 + Math.random() * 90000)}`,
        nationalId: nationalId || '',
        firstName: firstName || 'نامشخص',
        lastName: lastName || '',
        gender,
        workLocation: workLocation || 'نامشخص',
        isGuest: false,
        createdAt: nowJalali,
        updatedAt: nowJalali,
      };
      updatedPersonnelList.push(newRecord);
      if (newRecord.personnelCode) personnelMapByCode.set(newRecord.personnelCode, newRecord);
      if (newRecord.nationalId) personnelMapByNationalId.set(newRecord.nationalId, newRecord);
      addedCount++;
    }
    } catch (err) {
      // خطای غیرمنتظره در یک ردیف نباید ورود بقیه ردیف‌ها را متوقف کند
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`ردیف ${rowNum}: خطای غیرمنتظره (${msg}) و ردیف ثبت نشد.`);
      errorRows.push({ row: rowNum, personnelCode: '', nationalId: '', fullName: '', problem: `خطای غیرمنتظره: ${msg}`, inserted: false });
    }
  });

  return {
    added: addedCount,
    updated: updatedCount,
    total: rawRows.length,
    errors,
    errorRows,
    records: updatedPersonnelList,
  };
}

/**
 * Generate and trigger download of Excel sample template
 */
const tplNid = (id: string) =>
  getNationalIdConfig().nidImportMode === 'without' ? id.replace(/^0+/, '') : id;

export function downloadPersonnelTemplateExcel() {
  const sampleData = [
    {
      'کد پرسنلی': '1001',
      'کد ملی': tplNid('0010000003'),
      'نام': 'احمد',
      'نام خانوادگی': 'رضایی',
      'جنسیت': 'مرد',
      'محل خدمت': 'امور مالی و اداری',
    },
    {
      'کد پرسنلی': '1002',
      'کد ملی': tplNid('0079876544'),
      'نام': 'زهرا',
      'نام خانوادگی': 'حسینی',
      'جنسیت': 'زن',
      'محل خدمت': 'فناوری اطلاعات و رایانه',
    },
    {
      'کد پرسنلی': '1003',
      'کد ملی': tplNid('0451234561'),
      'نام': 'محمد',
      'نام خانوادگی': 'صادقی',
      'جنسیت': 'مرد',
      'محل خدمت': 'روابط عمومی و آموزش',
    },
    {
      'کد پرسنلی': '1004',
      'کد ملی': tplNid('1234567891'),
      'نام': 'مریم',
      'نام خانوادگی': 'مرادی',
      'جنسیت': 'زن',
      'محل خدمت': 'حراست و بازرسی',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // کد پرسنلی
    { wch: 15 }, // کد ملی
    { wch: 15 }, // نام
    { wch: 20 }, // نام خانوادگی
    { wch: 10 }, // جنسیت
    { wch: 25 }, // محل خدمت
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'قالب_پرسنل');
  applyRTLToWorkbook(workbook, ['قالب_پرسنل']);
  void saveWorkbook(workbook, 'قالب_ورود_پرسنل.xlsx');
}

/**
 * Export full personnel list to Excel
 */
export function exportPersonnelToExcel(personnelList: Personnel[]) {
  const rows = personnelList.map((p, idx) => ({
    'ردیف': idx + 1,
    'کد پرسنلی': p.personnelCode,
    'کد ملی': formatNationalIdForExport(p.nationalId),
    'نام': p.firstName,
    'نام خانوادگی': p.lastName,
    'جنسیت': p.gender === 'female' ? 'زن' : 'مرد',
    'محل خدمت': p.workLocation,
    'نوع پرسنل': p.isGuest ? 'مهمان' : 'رسمی',
    'تاریخ ثبت': p.createdAt,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 10 },
    { wch: 25 },
    { wch: 12 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'لیست_پرسنل');
  applyRTLToWorkbook(workbook, ['لیست_پرسنل']);
  void saveWorkbook(workbook, `لیست_پرسنل_${getTodayJalali().replace(/\//g, '-')}.xlsx`);
}

/**
 * Export Course Attendance Matrix to comprehensive Excel report
 */
export function exportCourseAttendanceExcel(
  course: Course,
  sessions: CourseSession[],
  attendanceList: AttendanceRecord[],
  personnelList: Personnel[],
  includeAllPersonnel = false
) {
  // Filter attendance for this course
  const courseAttendance = attendanceList.filter(a => a.courseId === course.id);
  
  // Find all unique attendees (from attendance or registered personnel)
  const attendeeMap = new Map<string, {
    personnel: Personnel | {
      id: string;
      personnelCode: string;
      nationalId: string;
      firstName: string;
      lastName: string;
      gender: Gender;
      workLocation: string;
      isGuest: boolean;
    };
    records: Map<string, AttendanceRecord>;
  }>();

  // If includeAllPersonnel is true, add all official personnel first
  if (includeAllPersonnel) {
    personnelList.forEach(p => {
      attendeeMap.set(p.id, {
        personnel: p,
        records: new Map(),
      });
    });
  }

  // Populate attendees from attendance records (including guests)
  courseAttendance.forEach(record => {
    if (!attendeeMap.has(record.personnelId)) {
      const p = personnelList.find(x => x.id === record.personnelId) || {
        id: record.personnelId,
        personnelCode: record.personnelCode,
        nationalId: record.nationalId,
        firstName: record.fullName.split(' ')[0] || '',
        lastName: record.fullName.split(' ').slice(1).join(' ') || '',
        gender: record.gender,
        workLocation: record.workLocation,
        isGuest: record.isGuest,
      };
      attendeeMap.set(record.personnelId, {
        personnel: p,
        records: new Map(),
      });
    }
    attendeeMap.get(record.personnelId)!.records.set(record.sessionId, record);
  });

  const totalSessionsCount = sessions.length || 1;

  // Build matrix rows
  const rows: Record<string, unknown>[] = [];
  let rowIdx = 1;

  // If attendeeMap is empty (no one checked in and includeAll is false), fallback to personnelList
  if (attendeeMap.size === 0) {
    personnelList.forEach(p => {
      attendeeMap.set(p.id, {
        personnel: p,
        records: new Map(),
      });
    });
  }

  attendeeMap.forEach(({ personnel, records }) => {
    let presentCount = 0;
    const rowObj: Record<string, unknown> = {
      'ردیف': rowIdx++,
      'کد پرسنلی': personnel.personnelCode,
      'کد ملی': formatNationalIdForExport(personnel.nationalId) || '-',
      'نام و نام خانوادگی': `${personnel.firstName} ${personnel.lastName}`.trim(),
      'جنسیت': personnel.gender === 'female' ? 'زن' : 'مرد',
      'محل خدمت': personnel.workLocation || '-',
      'نوع پرسنل': personnel.isGuest ? 'مهمان' : 'رسمی',
    };

    sessions.forEach(session => {
      const record = records.get(session.id);
      const colTitle = `${session.sessionName} (${session.date})`;
      if (record) {
        if (record.status === 'present') {
          rowObj[colTitle] = `حاضر (${record.time})`;
          presentCount++;
        } else if (record.status === 'late') {
          rowObj[colTitle] = `با تأخیر (${record.time})`;
          presentCount += 0.8;
        } else if (record.status === 'excused') {
          rowObj[colTitle] = `مرخصی/موجه`;
          presentCount += 0.5;
        } else {
          rowObj[colTitle] = `غایب`;
        }
      } else {
        rowObj[colTitle] = `غایب`;
      }
    });

    const percent = Math.min(100, Math.round((presentCount / totalSessionsCount) * 100));
    rowObj['تعداد جلسات حاضر'] = Math.round(presentCount);
    rowObj['درصد حضور'] = `${percent}%`;
    rowObj['نتیجه نهایی'] = percent >= 75 ? 'قبول' : percent >= 50 ? 'مشروط' : 'مردود';

    rows.push(rowObj);
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set RTL view for Persian Microsoft Excel
  worksheet['!views'] = [{ RTL: true }];

  // Column widths
  const cols = [
    { wch: 8 },  // ردیف
    { wch: 15 }, // کد پرسنلی
    { wch: 15 }, // کد ملی
    { wch: 24 }, // نام و نام خانوادگی
    { wch: 10 }, // جنسیت
    { wch: 24 }, // محل خدمت
    { wch: 12 }, // نوع
  ];
  sessions.forEach(() => {
    cols.push({ wch: 25 });
  });
  cols.push({ wch: 16 }, { wch: 12 }, { wch: 14 });
  worksheet['!cols'] = cols;

  const workbook = XLSX.utils.book_new();
  const safeTitle = course.name.replace(/[/\\?%*:|"<>]/g, '_').substring(0, 28) || 'ماتریس_حضور_غیاب';
  XLSX.utils.book_append_sheet(workbook, worksheet, safeTitle);
  applyRTLToWorkbook(workbook, [safeTitle]);
  void saveWorkbook(workbook, `ماتریس_حضور_غیاب_${course.code || 'دوره'}_${getTodayJalali().replace(/\//g, '-')}.xlsx`);
}

/**
 * Export All Courses summary report to Excel
 */
export function exportCoursesSummaryExcel(
  courses: Course[],
  attendanceList: AttendanceRecord[]
) {
  const rows = courses.map((course, idx) => {
    const courseAttendance = attendanceList.filter(a => a.courseId === course.id);
    const uniqueAttendees = new Set(courseAttendance.map(a => a.personnelId)).size;
    const guestAttendees = new Set(courseAttendance.filter(a => a.isGuest).map(a => a.personnelId)).size;

    return {
      'ردیف': idx + 1,
      'کد دوره': course.code,
      'نام دوره': course.name,
      'مدرس': course.instructor,
      'مدت دوره (ساعت)': course.hours,
      'محل برگزاری': course.location,
      'تعداد جلسات': course.sessions.length,
      'شرکت‌کنندگان کل': uniqueAttendees,
      'تعداد پرسنل مهمان': guestAttendees,
      'وضعیت': course.status === 'active' ? 'در حال برگزاری' : course.status === 'completed' ? 'تکمیل شده' : 'پیش‌رو',
      'تاریخ شروع': course.startDate,
      'تاریخ پایان': course.endDate,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 28 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'گزارش_دوره‌ها');
  applyRTLToWorkbook(workbook, ['گزارش_دوره‌ها']);
  void saveWorkbook(workbook, `گزارش_جامع_دوره‌ها_${getTodayJalali().replace(/\//g, '-')}.xlsx`);
}

/**
 * خروجی اکسل از خطاهای ورود اطلاعات پرسنل
 */
export function exportImportErrorsExcel(errorRows: ImportErrorRow[]) {
  const rows = errorRows.map((e, i) => ({
    'ردیف': i + 1,
    'ردیف در فایل اکسل': e.row,
    'کد پرسنلی': e.personnelCode,
    'کد ملی': e.nationalId,
    'نام و نام خانوادگی': e.fullName,
    'شرح خطا': e.problem,
    'وضعیت': e.inserted ? 'ثبت شد (نیازمند اصلاح)' : 'ثبت نشد',
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 8 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 70 }, { wch: 22 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'خطاهای_ورود');
  applyRTLToWorkbook(workbook, ['خطاهای_ورود']);
  void saveWorkbook(workbook, `خطاهای_ورود_پرسنل_${getTodayJalali().replace(/\//g, '-')}.xlsx`);
}
