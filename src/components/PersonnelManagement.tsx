import React, { useState, useRef } from 'react';
import { 
  Users, 
  Upload, 
  Download, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  FileSpreadsheet, 
  CheckCircle, 
  X,
  FileCheck,
  Check,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  ArrowDownToLine
} from 'lucide-react';
import { Gender, Personnel, ThemeName } from '../types';
import { downloadPersonnelTemplateExcel, exportPersonnelToExcel, parsePersonnelExcel } from '../utils/excel';
import { getTodayJalali, toEnglishDigits, toPersianDigits } from '../utils/jalali';
import { checkManualNationalId, normalizeNationalId } from '../utils/nationalId';
import { getThemeConfig } from '../utils/theme';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from './Toast';

interface Props {
  personnel: Personnel[];
  onSavePersonnel: (person: Personnel) => void;
  onBulkUpdatePersonnel: (list: Personnel[]) => void;
  onDeletePersonnel: (personId: string) => void;
  currentTheme: ThemeName;
}

export const PersonnelManagement: React.FC<Props> = ({
  personnel,
  onSavePersonnel,
  onBulkUpdatePersonnel,
  onDeletePersonnel,
  currentTheme,
}) => {
  const { showToast } = useToast();
  const themeObj = getThemeConfig(currentTheme);

  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | Gender>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'regular' | 'guest'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  const [showPersonModal, setShowPersonModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Personnel | null>(null);

  // Individual Personnel Delete Confirmation
  const [personToDelete, setPersonToDelete] = useState<Personnel | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    added: number;
    updated: number;
    total: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDropActive, setIsDropActive] = useState(false);
  const [isUploadCardExpanded, setIsUploadCardExpanded] = useState(true);
  const inlineFileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [form, setForm] = useState<{
    personnelCode: string;
    nationalId: string;
    firstName: string;
    lastName: string;
    gender: Gender;
    workLocation: string;
    isGuest: boolean;
  }>({
    personnelCode: '',
    nationalId: '',
    firstName: '',
    lastName: '',
    gender: 'male',
    workLocation: '',
    isGuest: false,
  });

  // Distinct work locations for filter
  const uniqueLocations = Array.from(new Set(personnel.map(p => p.workLocation).filter(Boolean)));

  const handleOpenAdd = () => {
    setEditingPerson(null);
    setForm({
      personnelCode: `P-${Math.floor(1000 + Math.random() * 9000)}`,
      nationalId: '',
      firstName: '',
      lastName: '',
      gender: 'male',
      workLocation: 'امور اداری و مالی',
      isGuest: false,
    });
    setShowPersonModal(true);
  };

  const handleOpenEdit = (person: Personnel) => {
    setEditingPerson(person);
    setForm({
      personnelCode: person.personnelCode,
      nationalId: person.nationalId,
      firstName: person.firstName,
      lastName: person.lastName,
      gender: person.gender,
      workLocation: person.workLocation,
      isGuest: !!person.isGuest,
    });
    setShowPersonModal(true);
  };

  const handleSavePerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      showToast('لطفاً نام و نام خانوادگی را وارد فرمایید.', 'error');
      return;
    }

    const todayJalali = getTodayJalali();
    const cleanPCode = toEnglishDigits(form.personnelCode).trim();
    const cleanNId = normalizeNationalId(form.nationalId);

    // Validate National ID pattern and checksum if entered
    if (form.nationalId.trim()) {
      const chk = checkManualNationalId(form.nationalId);
      if (!chk.ok) {
        showToast(chk.error || 'کد ملی نامعتبر است.', 'error');
        return;
      }
    }

    if (editingPerson) {
      const updated: Personnel = {
        ...editingPerson,
        personnelCode: cleanPCode || editingPerson.personnelCode,
        nationalId: cleanNId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender,
        workLocation: form.workLocation.trim() || 'نامشخص',
        isGuest: form.isGuest,
        updatedAt: todayJalali,
      };
      onSavePersonnel(updated);
      showToast(`مشخصات «${updated.firstName} ${updated.lastName}» بروزرسانی شد.`, 'success');
    } else {
      const newPerson: Personnel = {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        personnelCode: cleanPCode || `P-${Date.now().toString().slice(-4)}`,
        nationalId: cleanNId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender,
        workLocation: form.workLocation.trim() || 'نامشخص',
        isGuest: form.isGuest,
        createdAt: todayJalali,
        updatedAt: todayJalali,
      };
      onSavePersonnel(newPerson);
      showToast(`پرسنل جدید «${newPerson.firstName} ${newPerson.lastName}» با موفقیت افزوده شد.`, 'success');
    }

    setShowPersonModal(false);
  };

  // Confirm delete individual person
  const handleConfirmDeletePerson = () => {
    if (!personToDelete) return;
    onDeletePersonnel(personToDelete.id);
    showToast(`پرسنل «${personToDelete.firstName} ${personToDelete.lastName}» با موفقیت حذف گردید.`, 'success');
    setPersonToDelete(null);
  };

  // Unified Excel File Processing (works for file input, modal, and drag-and-drop)
  const processPersonnelExcelFile = async (file: File) => {
    if (!file) return;

    setImportLoading(true);
    try {
      const res = await parsePersonnelExcel(file, personnel);
      onBulkUpdatePersonnel(res.records);
      setImportSummary({
        added: res.added,
        updated: res.updated,
        total: res.total,
        errors: res.errors,
      });
      showToast(`فایل اکسل با موفقیت پردازش شد: ${res.added} پرسنل جدید، ${res.updated} بروزرسانی`, 'success');
    } catch (err: unknown) {
      showToast('خطا در پردازش فایل اکسل: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (inlineFileInputRef.current) inlineFileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processPersonnelExcelFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropActive(true);
  };

  const handleDragLeave = () => {
    setIsDropActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processPersonnelExcelFile(file);
    }
  };

  // Filtered personnel
  const filtered = personnel.filter(p => {
    const q = toEnglishDigits(search).toLowerCase();
    const matchesSearch = 
      toEnglishDigits(p.personnelCode).toLowerCase().includes(q) ||
      toEnglishDigits(p.nationalId).toLowerCase().includes(q) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.workLocation.toLowerCase().includes(q);

    const matchesGender = genderFilter === 'all' || p.gender === genderFilter;
    const matchesType = typeFilter === 'all' || (typeFilter === 'guest' ? p.isGuest : !p.isGuest);
    const matchesLoc = locationFilter === 'all' || p.workLocation === locationFilter;

    return matchesSearch && matchesGender && matchesType && matchesLoc;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Excel Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <span className={`p-2 rounded-xl ${themeObj.bgLight} ${themeObj.textPrimary}`}>
              <Users className="w-6 h-6" />
            </span>
            مدیریت پرسنل و بانک اطلاعاتی شرکت‌کنندگان
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            ورود اطلاعات با فایل اکسل، بروزرسانی هوشمند رکوردهای تکراری، حذف فردی و خروجی اکسل
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Template */}
          <button
            onClick={downloadPersonnelTemplateExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
            title="دانلود قالب اکسل نمونه برای ورود اطلاعات"
          >
            <Download className={`w-4 h-4 ${themeObj.textPrimary}`} />
            دانلود قالب اکسل
          </button>

          {/* Import Excel */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            بارگذاری فایل اکسل پرسنل
          </button>

          {/* Export full list to Excel */}
          <button
            onClick={() => exportPersonnelToExcel(personnel)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold transition cursor-pointer"
            title="خروجی فایل اکسل از کلیه پرسنل"
          >
            <FileSpreadsheet className="w-4 h-4" />
            خروجی اکسل
          </button>

          {/* Add Single Personnel */}
          <button
            onClick={handleOpenAdd}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md active:scale-95 transition cursor-pointer ${themeObj.btnPrimary}`}
          >
            <Plus className="w-4 h-4" />
            پرسنل جدید
          </button>
        </div>
      </div>

      {/* PROMINENT EXCEL UPLOAD SECTION & DROPZONE */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-xs overflow-hidden transition-all duration-200">
        <div 
          onClick={() => setIsUploadCardExpanded(prev => !prev)}
          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition border-b border-emerald-100 dark:border-emerald-950/80 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm shadow-emerald-600/30">
              <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  بخش بارگذاری و ورود اطلاعات با فایل اکسل پرسنل
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  بروزرسانی هوشمند رکوردهای تکراری
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ورود همزمان صدها پرسنل از طریق فایل‌های اکسل (.xlsx, .xls, .csv) به صورت کشیدن و رها کردن یا انتخاب مستقیم
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              {isUploadCardExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isUploadCardExpanded && (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inlineFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
                isDropActive
                  ? 'border-emerald-500 bg-emerald-100/60 dark:bg-emerald-950/60 scale-[1.01]'
                  : 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40'
              }`}
            >
              <input
                ref={inlineFileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shadow-xs">
                <Upload className="w-7 h-7 animate-bounce" />
              </div>
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                فایل اکسل پرسنل را اینجا بکشید و رها کنید یا برای انتخاب کلیک نمایید
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-xl mx-auto">
                ستون‌های فایل اکسل می‌تواند شامل: <strong>کد پرسنلی</strong>، <strong>کد ملی</strong>، <strong>نام</strong>، <strong>نام خانوادگی</strong>، <strong>جنسیت</strong> و <strong>محل خدمت</strong> باشد.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition">
                  <Upload className="w-4 h-4" />
                  انتخاب فایل اکسل از دستگاه
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadPersonnelTemplateExcel();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                  دانلود قالب اکسل استاندارد
                </button>
              </div>
            </div>

            {/* Spinner when loading */}
            {importLoading && (
              <div className="p-4 bg-teal-50 dark:bg-teal-950/50 rounded-2xl text-center text-xs text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center gap-2 border border-teal-200 dark:border-teal-800 animate-pulse">
                <span className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
                در حال پردازش هوشمند فایل اکسل و بروزرسانی بانک پرسنل...
              </div>
            )}

            {/* Import Summary Results */}
            {importSummary && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs sm:text-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    نتیجه آخرین بارگذاری فایل اکسل:
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportSummary(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    بستن گزارش
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-900 shadow-2xs">
                    <span className="text-slate-500 block mb-0.5 text-[11px]">کل ردیف‌های پردازش شده</span>
                    <strong className="text-base text-slate-800 dark:text-white font-mono">
                      {toPersianDigits(importSummary.total)}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-900 shadow-2xs">
                    <span className="text-slate-500 block mb-0.5 text-[11px]">پرسنل جدید اضافه شده</span>
                    <strong className="text-base text-emerald-600 font-mono">
                      {toPersianDigits(importSummary.added)}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-900 shadow-2xs">
                    <span className="text-slate-500 block mb-0.5 text-[11px]">رکوردهای تکراری بروزرسانی شده</span>
                    <strong className="text-base text-blue-600 font-mono">
                      {toPersianDigits(importSummary.updated)}
                    </strong>
                  </div>
                </div>

                {importSummary.errors.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 max-h-28 overflow-y-auto">
                    <p className="font-bold mb-1">خطاهای جزئی ردیف‌های نامعتبر:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {importSummary.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Smart Upsert Info Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 dark:text-slate-200 block mb-0.5">تطبیق و بروزرسانی خودکار (Upsert):</strong>
                  <span>اگر ردیفی از قبل در دیتابیس موجود باشد (تطبیق بر اساس کد پرسنلی یا کد ملی)، مشخصات فرد بدون ایجاد رکورد تکراری بروزرسانی می‌گردد.</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 dark:text-slate-200 block mb-0.5">انعطاف‌پذیری نام ستون‌ها و شیت‌های راست‌چین (RTL):</strong>
                  <span>سامانه فایل‌های اکسل راست‌چین فارسی را پشتیبانی کرده و نام ستون‌ها (کد پرسنلی، کد ملی، نام و نام خانوادگی، محل خدمت) را خودکار تطبیق می‌دهد.</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 flex items-start gap-2.5 md:col-span-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-800 dark:text-emerald-300 block mb-0.5">اعتبارسنجی الگوی کد ملی و خروجی‌های راست‌چین:</strong>
                  <span>تمام فایل‌های اکسل تولیدی سامانه (قالب نمونه، لیست پرسنل، ماتریس حضور و غیاب) با جهت راست‌چین (RTL) دانلود می‌شوند و کد ملی ۱۰ رقمی بر اساس الگوی رسمی ثبت احوال اعتبارسنجی می‌گردد.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی کد پرسنلی، کد ملی، نام، نام خانوادگی یا محل خدمت..."
            className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Gender */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as 'all' | Gender)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300"
          >
            <option value="all">همه جنسیت‌ها</option>
            <option value="male">مرد</option>
            <option value="female">زن</option>
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'regular' | 'guest')}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300"
          >
            <option value="all">همه پرسنل</option>
            <option value="regular">پرسنل رسمی</option>
            <option value="guest">پرسنل مهمان</option>
          </select>

          {/* Location */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 max-w-[150px] truncate"
          >
            <option value="all">همه محل‌های خدمت</option>
            {uniqueLocations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Personnel Count Summary Badge */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          نمایش <strong className="text-slate-700 dark:text-slate-200">{toPersianDigits(filtered.length)}</strong> از مجموع <strong className="text-slate-700 dark:text-slate-200">{toPersianDigits(personnel.length)}</strong> پرسنل
        </span>
        <div className="flex items-center gap-3">
          <span>پرسنل رسمی: <strong>{toPersianDigits(personnel.filter(p => !p.isGuest).length)}</strong></span>
          <span>پرسنل مهمان: <strong>{toPersianDigits(personnel.filter(p => p.isGuest).length)}</strong></span>
        </div>
      </div>

      {/* Personnel Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-4">ردیف</th>
                <th className="py-3 px-4">کد پرسنلی</th>
                <th className="py-3 px-4">کد ملی</th>
                <th className="py-3 px-4">نام و نام خانوادگی</th>
                <th className="py-3 px-4">جنسیت</th>
                <th className="py-3 px-4">محل خدمت / واحد سازمانی</th>
                <th className="py-3 px-4">وضعیت</th>
                <th className="py-3 px-4">تاریخ ثبت</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((person, idx) => (
                <tr key={person.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono text-slate-400">{toPersianDigits(idx + 1)}</td>
                  <td className={`py-3 px-4 font-mono font-bold ${themeObj.textPrimary}`}>
                    {toPersianDigits(person.personnelCode)}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {toPersianDigits(person.nationalId) || '-'}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                    {person.firstName} {person.lastName}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${
                      person.gender === 'female'
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    }`}>
                      {person.gender === 'female' ? 'زن' : 'مرد'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {person.workLocation}
                  </td>
                  <td className="py-3 px-4">
                    {person.isGuest ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        مهمان
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">رسمی</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-400">
                    {toPersianDigits(person.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(person)}
                        title="ویرایش مشخصات"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPersonToDelete(person)}
                        title="حذف پرسنل"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">پرسنلی یافت نشد</p>
            <p className="text-xs text-slate-400 mt-1">با فایل اکسل یا دکمه «پرسنل جدید» اضافه نمایید.</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Individual Person Delete */}
      <ConfirmModal
        isOpen={!!personToDelete}
        title="حذف پرسنل از سیستم"
        message={`آیا از حذف پرسنل «${personToDelete?.firstName} ${personToDelete?.lastName}» (کد پرسنلی: ${personToDelete?.personnelCode}) اطمینان دارید؟ تمامی سوابق حضور این فرد نیز حذف خواهد شد.`}
        confirmText="بله، حذف پرسنل"
        cancelText="انصراف"
        variant="danger"
        onConfirm={handleConfirmDeletePerson}
        onCancel={() => setPersonToDelete(null)}
      />

      {/* Excel Upload Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    ورود اطلاعات پرسنل با فایل اکسل
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    پشتیبانی از فرمت‌های .xlsx, .xls, .csv و بروزرسانی هوشمند رکوردهای تکراری
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportSummary(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Area */}
            {!importSummary ? (
              <div className="mt-5 space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-teal-400/60 dark:border-teal-700 rounded-2xl p-8 text-center bg-teal-50/40 dark:bg-teal-950/20 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition cursor-pointer"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className="w-12 h-12 text-teal-600 mx-auto mb-3 animate-bounce" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    برای انتخاب فایل اکسل اینجا کلیک کنید یا فایل را بکشید و رها کنید
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    شامل ستون‌های: کد پرسنلی، کد ملی، نام، نام خانوادگی، جنسیت، محل خدمت
                  </p>
                </div>

                {importLoading && (
                  <div className="p-4 bg-teal-50 dark:bg-teal-950/50 rounded-xl text-center text-xs text-teal-700 dark:text-teal-300 font-semibold flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
                    در حال پردازش و استخراج داده‌ها از فایل اکسل...
                  </div>
                )}

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-xs space-y-2 text-slate-600 dark:text-slate-300">
                  <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    ویژگی تطبیق و بروزرسانی خودکار (Upsert):
                  </p>
                  <p>
                    • چنانچه کد پرسنلی یا کد ملی ردیفی از قبل در دیتابیس موجود باشد، مشخصات فرد (مانند محل خدمت یا نام) <strong>بروزرسانی</strong> می‌شود.
                  </p>
                  <p>
                    • در صورتی که فرد جدید باشد، به لیست پرسنل <strong>افزوده</strong> خواهد شد.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm mb-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    پردازش فایل اکسل با موفقیت به پایان رسید!
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-900">
                      <span className="text-slate-500 block mb-0.5">کل ردیف‌ها</span>
                      <strong className="text-base text-slate-800 dark:text-white font-mono">
                        {toPersianDigits(importSummary.total)}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-900">
                      <span className="text-slate-500 block mb-0.5">افزوده شده جدید</span>
                      <strong className="text-base text-emerald-600 font-mono">
                        {toPersianDigits(importSummary.added)}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-900">
                      <span className="text-slate-500 block mb-0.5">بروزرسانی تکراری</span>
                      <strong className="text-base text-blue-600 font-mono">
                        {toPersianDigits(importSummary.updated)}
                      </strong>
                    </div>
                  </div>
                </div>

                {importSummary.errors.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 max-h-32 overflow-y-auto">
                    <p className="font-bold mb-1">خطاهای جزئی رد شده:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {importSummary.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportSummary(null);
                  }}
                  className={`w-full py-2.5 text-white rounded-xl text-xs font-bold transition ${themeObj.btnPrimary}`}
                >
                  مشاهده لیست بروزرسانی شده پرسنل
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Personnel Modal */}
      {showPersonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Users className={`w-5 h-5 ${themeObj.textPrimary}`} />
                {editingPerson ? 'ویرایش مشخصات پرسنل' : 'افزودن پرسنل جدید'}
              </h3>
              <button
                onClick={() => setShowPersonModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePerson} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    نام: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    نام خانوادگی: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    کد پرسنلی:
                  </label>
                  <input
                    type="text"
                    value={form.personnelCode}
                    onChange={(e) => setForm({ ...form, personnelCode: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    کد ملی (۱۰ رقم):
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={form.nationalId}
                    onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                    placeholder="مثلاً: 0010000003"
                    className={`w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono focus:outline-hidden ${
                      form.nationalId.trim().length >= 8
                        ? checkManualNationalId(form.nationalId).ok
                          ? 'border-emerald-500 focus:border-emerald-600 text-emerald-700 dark:text-emerald-300'
                          : 'border-rose-400 focus:border-rose-500 text-rose-600'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {form.nationalId.trim() && (
                    <div className="mt-1 text-[11px] font-semibold">
                      {checkManualNationalId(form.nationalId).ok ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          الگوی کد ملی معتبر و صحیح است
                        </span>
                      ) : (
                        <span className="text-rose-500 flex items-center gap-1">
                          <X className="w-3.5 h-3.5" />
                          کد ملی نامعتبر است (رقم کنترلی ناصحیح است)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    جنسیت:
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden"
                  >
                    <option value="male">مرد</option>
                    <option value="female">زن</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    نوع پرسنل:
                  </label>
                  <select
                    value={form.isGuest ? 'guest' : 'regular'}
                    onChange={(e) => setForm({ ...form, isGuest: e.target.value === 'guest' })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden"
                  >
                    <option value="regular">پرسنل رسمی</option>
                    <option value="guest">پرسنل مهمان</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  محل خدمت / واحد سازمانی:
                </label>
                <input
                  type="text"
                  value={form.workLocation}
                  onChange={(e) => setForm({ ...form, workLocation: e.target.value })}
                  placeholder="مثلاً: فناوری اطلاعات، امور مالی، روابط عمومی"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPersonModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer ${themeObj.btnPrimary}`}
                >
                  {editingPerson ? 'ذخیره تغییرات' : 'ثبت پرسنل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
