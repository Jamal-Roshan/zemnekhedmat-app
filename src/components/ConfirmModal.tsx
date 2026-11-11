import React from 'react';
import { AlertTriangle, AlertCircle, Info, Trash2, X, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<Props> = ({
  isOpen,
  title,
  message,
  confirmText = 'تایید',
  cancelText = 'انصراف',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <div className="app-modal-overlay bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="app-modal-panel w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-right animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3.5 mb-4">
          <div className={`p-3 rounded-2xl shrink-0 ${
            isDanger 
              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400' 
              : isWarning
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400'
              : 'bg-teal-100 text-teal-600 dark:bg-teal-950/80 dark:text-teal-400'
          }`}>
            {isDanger ? <Trash2 className="w-6 h-6" /> : isWarning ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {message}
            </p>
          </div>

          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/25'
            }`}
          >
            <Check className="w-4 h-4" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
