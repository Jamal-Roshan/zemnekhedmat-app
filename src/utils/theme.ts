import { ThemeName, FontSize } from '../types';

export interface ThemeConfig {
  id: ThemeName;
  name: string;
  hex: string;
  btnPrimary: string;
  primaryClass: string;
  btnLight: string;
  textPrimary: string;
  bgLight: string;
  borderLight: string;
  badge: string;
  gradient: string;
  ring: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'emerald',
    name: 'زمردی و فیروزه‌ای',
    hex: '#0d9488',
    btnPrimary: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20',
    primaryClass: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20',
    btnLight: 'bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950/70 dark:text-teal-300',
    textPrimary: 'text-teal-600 dark:text-teal-400',
    bgLight: 'bg-teal-50/70 dark:bg-teal-950/30',
    borderLight: 'border-teal-200 dark:border-teal-800',
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    gradient: 'from-teal-600 to-emerald-700',
    ring: 'focus:border-teal-500 focus:ring-teal-500',
  },
  {
    id: 'blue',
    name: 'آبی لاجوردی اداری',
    hex: '#2563eb',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20',
    primaryClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20',
    btnLight: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/70 dark:text-blue-300',
    textPrimary: 'text-blue-600 dark:text-blue-400',
    bgLight: 'bg-blue-50/70 dark:bg-blue-950/30',
    borderLight: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    gradient: 'from-blue-600 to-cyan-700',
    ring: 'focus:border-blue-500 focus:ring-blue-500',
  },
  {
    id: 'indigo',
    name: 'نیلی و بنفش مدرن',
    hex: '#4f46e5',
    btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20',
    primaryClass: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20',
    btnLight: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:text-indigo-300',
    textPrimary: 'text-indigo-600 dark:text-indigo-400',
    bgLight: 'bg-indigo-50/70 dark:bg-indigo-950/30',
    borderLight: 'border-indigo-200 dark:border-indigo-800',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    gradient: 'from-indigo-600 to-purple-700',
    ring: 'focus:border-indigo-500 focus:ring-indigo-500',
  },
  {
    id: 'amber',
    name: 'کهربایی و طلایی',
    hex: '#d97706',
    btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
    primaryClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
    btnLight: 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/70 dark:text-amber-300',
    textPrimary: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50/70 dark:bg-amber-950/30',
    borderLight: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    gradient: 'from-amber-600 to-orange-700',
    ring: 'focus:border-amber-500 focus:ring-amber-500',
  },
  {
    id: 'rose',
    name: 'یاقوتی و زرشکی',
    hex: '#e11d48',
    btnPrimary: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
    primaryClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
    btnLight: 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/70 dark:text-rose-300',
    textPrimary: 'text-rose-600 dark:text-rose-400',
    bgLight: 'bg-rose-50/70 dark:bg-rose-950/30',
    borderLight: 'border-rose-200 dark:border-rose-800',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    gradient: 'from-rose-600 to-pink-700',
    ring: 'focus:border-rose-500 focus:ring-rose-500',
  },
  {
    id: 'slate',
    name: 'طوسی تیره صنعتی',
    hex: '#334155',
    btnPrimary: 'bg-slate-700 hover:bg-slate-800 text-white shadow-slate-700/20',
    primaryClass: 'bg-slate-700 hover:bg-slate-800 text-white shadow-slate-700/20',
    btnLight: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200',
    textPrimary: 'text-slate-700 dark:text-slate-300',
    bgLight: 'bg-slate-100/70 dark:bg-slate-800/30',
    borderLight: 'border-slate-300 dark:border-slate-700',
    badge: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    gradient: 'from-slate-700 to-zinc-800',
    ring: 'focus:border-slate-500 focus:ring-slate-500',
  },
];

export function getThemeConfig(themeName: ThemeName): ThemeConfig {
  return THEMES.find((t) => t.id === themeName) || THEMES[0];
}

export function applyTheme(themeName: ThemeName, darkMode: boolean, fontSize: FontSize = 'normal', fontSizePx?: number) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const config = getThemeConfig(themeName);

  // Set theme attributes and CSS variables
  root.setAttribute('data-theme', themeName);
  root.setAttribute('data-font-size', fontSize);
  root.style.setProperty('--theme-color', config.hex);

  const fontSizes: Record<FontSize, string> = {
    small: '14px',
    normal: '16px',
    large: '18px',
    xlarge: '20px',
  };
  root.style.fontSize = fontSizePx ? `${Math.min(26, Math.max(12, fontSizePx))}px` : fontSizes[fontSize] || '16px';

  // Toggle Dark Mode
  if (darkMode) {
    root.classList.add('dark');
    document.body?.classList.add('dark');
    root.setAttribute('data-mode', 'dark');
  } else {
    root.classList.remove('dark');
    document.body?.classList.remove('dark');
    root.setAttribute('data-mode', 'light');
  }
}
