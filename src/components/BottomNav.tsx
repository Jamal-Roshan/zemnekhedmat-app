import React from 'react';
import { 
  UserCheck, 
  BookOpen, 
  Users, 
  BarChart3, 
  Settings 
} from 'lucide-react';
import { ThemeName } from '../types';
import { triggerHaptic } from '../utils/feedback';

interface Props {
  currentTab: 'attendance' | 'courses' | 'personnel' | 'reports' | 'settings';
  onChangeTab: (tab: 'attendance' | 'courses' | 'personnel' | 'reports' | 'settings') => void;
  vibrationEnabled: boolean;
  currentTheme: ThemeName;
}

export const BottomNav: React.FC<Props> = ({
  currentTab,
  onChangeTab,
  vibrationEnabled,
}) => {
  const navItems = [
    { id: 'attendance', label: 'حضور و غیاب', icon: UserCheck },
    { id: 'courses', label: 'دوره‌ها', icon: BookOpen },
    { id: 'personnel', label: 'پرسنل', icon: Users },
    { id: 'reports', label: 'گزارش‌ها', icon: BarChart3 },
    { id: 'settings', label: 'تنظیمات', icon: Settings },
  ] as const;

  const handleSelect = (id: typeof currentTab) => {
    triggerHaptic(20, vibrationEnabled);
    onChangeTab(id);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe shadow-lg">
      <div className="grid grid-cols-5 h-16">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`flex flex-col items-center justify-center gap-1 transition cursor-pointer select-none ${
                isActive
                  ? 'text-teal-600 dark:text-teal-400 font-black'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-xl transition ${isActive ? 'bg-teal-50 dark:bg-teal-950/80 scale-110' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
