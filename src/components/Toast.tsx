import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // پیام‌های سراسری از بخش‌های غیر React (مثلاً ذخیره فایل)
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ message: string; type?: ToastType }>).detail;
      if (d?.message) showToast(d.message, d.type ?? 'info');
    };
    window.addEventListener('app:toast', handler);
    return () => window.removeEventListener('app:toast', handler);
  }, [showToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container floating in top-left or top-center */}
      <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in slide-in-from-top-3 duration-200 ${
              t.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20'
                : t.type === 'error'
                ? 'bg-rose-600 text-white border-rose-500 shadow-rose-900/20'
                : t.type === 'warning'
                ? 'bg-amber-600 text-white border-amber-500 shadow-amber-900/20'
                : 'bg-slate-800 text-white border-slate-700 shadow-black/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-200" />}
              {t.type === 'warning' && <AlertCircle className="w-4 h-4 shrink-0 text-amber-200" />}
              {t.type === 'info' && <Info className="w-4 h-4 shrink-0 text-blue-200" />}
              <span className="leading-snug">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg hover:bg-white/20 transition shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showToast: (msg: string) => console.log(msg),
    };
  }
  return context;
}
