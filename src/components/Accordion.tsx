import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  /** حالت کنترل‌شده (اختیاری) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: 'default' | 'danger';
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

/** محفظه اکاردیونی جمع‌شونده */
export const Accordion: React.FC<AccordionProps> = ({
  title,
  subtitle,
  icon,
  badge,
  defaultOpen = false,
  open,
  onOpenChange,
  variant = 'default',
  className = '',
  bodyClassName = '',
  children,
}) => {
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const isOpen = open ?? innerOpen;
  const toggle = () => {
    const next = !isOpen;
    if (open === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  };

  const card =
    variant === 'danger'
      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800';

  return (
    <div className={`rounded-3xl border shadow-xs overflow-hidden self-start w-full ${card} ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-right cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon}
          <div className="min-w-0">
            <h3
              className={`font-bold text-sm flex items-center gap-2 ${
                variant === 'danger' ? 'text-rose-800 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              <span className="truncate">{title}</span>
              {badge}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className={`px-4 sm:px-6 pb-5 sm:pb-6 pt-1 space-y-5 ${bodyClassName}`}>{children}</div>
      )}
    </div>
  );
};
