import React, { useState, useEffect, useRef } from 'react';
import { 
  UserCheck, 
  BookOpen, 
  Users, 
  BarChart3, 
  Settings, 
  Moon, 
  Sun, 
  Palette,
  ShieldCheck,
  Check
} from 'lucide-react';
import { AppSettings, ThemeName } from '../types';
import { getCurrentTime, getHumanJalaliDate, getTodayJalali, toPersianDigits } from '../utils/jalali';
import { PWAInstallButton } from './PWAInstallButton';
import { THEMES, getThemeConfig } from '../utils/theme';
import { useToast } from './Toast';

interface Props {
  currentTab: 'attendance' | 'courses' | 'personnel' | 'reports' | 'settings';
  onChangeTab: (tab: 'attendance' | 'courses' | 'personnel' | 'reports' | 'settings') => void;
  settings: AppSettings;
  onToggleDarkMode: () => void;
  onSelectTheme: (theme: ThemeName) => void;
  currentTheme: ThemeName;
}

export const Navbar: React.FC<Props> = ({
  currentTab,
  onChangeTab,
  settings,
  onToggleDarkMode,
  onSelectTheme,
  currentTheme,
}) => {
  const { showToast } = useToast();
  const [liveTime, setLiveTime] = useState(getCurrentTime());
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const todayJalali = getTodayJalali();
  const humanDate = getHumanJalaliDate(todayJalali);
  const themeObj = getThemeConfig(currentTheme);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(getCurrentTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close theme menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'attendance', label: 'حضور و غیاب سریع', icon: UserCheck },
    { id: 'courses', label: 'دوره‌های ضمن خدمت', icon: BookOpen },
    { id: 'personnel', label: 'بانک پرسنل', icon: Users },
    { id: 'reports', label: 'گزارش‌ها و اکسل', icon: BarChart3 },
    { id: 'settings', label: 'تنظیمات و پشتیبان', icon: Settings },
  ] as const;

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr ${themeObj.gradient} flex items-center justify-center text-white shadow-md shadow-black/10 shrink-0 transition-all duration-300`}>
              <UserCheck className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  سامانه حضور و غیاب ضمن خدمت
                </h1>
                <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  اندروید و وب
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                ورود با اکسل • تقویم شمسی • ثبت مهمان • پشتیبان‌گیری خودکار
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onChangeTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? `bg-white dark:bg-slate-900 ${themeObj.textPrimary} shadow-xs`
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? themeObj.textPrimary : ''}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & Live Clock */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Live Shamsi Clock & Calendar Widget */}
            <div className="hidden xl:flex flex-col text-left font-mono border-l border-slate-200 dark:border-slate-800 pl-3">
              <span className={`text-xs font-bold ${themeObj.textPrimary} flex items-center justify-end gap-1`}>
                {toPersianDigits(liveTime)}
              </span>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {humanDate}
              </span>
            </div>

            {/* PWA Install Button */}
            <PWAInstallButton variant="navbar" />

            {/* Theme Palette Switcher Dropdown */}
            <div className="relative" ref={themeMenuRef}>
              <button
                type="button"
                onClick={() => setShowThemeMenu(prev => !prev)}
                title="تغییر رنگ تم برنامه"
                className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5"
              >
                <Palette className="w-4 h-4" />
                <span 
                  className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10" 
                  style={{ backgroundColor: themeObj.hex }} 
                />
              </button>

              {showThemeMenu && (
                <div className="absolute left-0 mt-2 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-right">
                  <div className="text-[11px] font-bold text-slate-400 px-2 py-1 mb-1 border-b border-slate-100 dark:border-slate-800">
                    انتخاب رنگ تم:
                  </div>
                  <div className="space-y-1">
                    {THEMES.map(theme => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          onSelectTheme(theme.id);
                          setShowThemeMenu(false);
                          showToast(`تم رنگی «${theme.name}» اعمال شد.`, 'info');
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          currentTheme === theme.id
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full shadow-xs"
                            style={{ backgroundColor: theme.hex }}
                          />
                          <span>{theme.name}</span>
                        </div>
                        {currentTheme === theme.id && (
                          <Check className="w-3.5 h-3.5 text-teal-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => {
                const nextDark = !settings.darkMode;
                onToggleDarkMode();
                showToast(nextDark ? 'حالت شب فعال گردید.' : 'حالت روز فعال گردید.', 'info');
              }}
              title={settings.darkMode ? 'تغییر به حالت روز (روشن)' : 'تغییر به حالت شب (تاریک)'}
              aria-label={settings.darkMode ? 'حالت روز' : 'حالت شب'}
              className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {settings.darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
