import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  variant?: 'navbar' | 'card' | 'badge';
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'navbar' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  if (isInstalled) {
    if (variant === 'badge') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          نسخه اندروید نصب شده
        </span>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstalledNotice(true);
        setTimeout(() => setInstalledNotice(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // General browser guidance
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {variant === 'card' ? (
        <div className="p-4 rounded-2xl bg-gradient-to-l from-teal-500/10 via-emerald-500/10 to-teal-500/5 border border-teal-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-right">
            <div className="p-3 bg-teal-600 text-white rounded-xl shadow-md shadow-teal-600/20">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">نصب نسخه اندروید و PWA</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                نصب مستقیم روی گوشی بدون نیاز به دانلود از بازار، کارکرد روان و آفلاین
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-teal-600/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            نصب روی صفحه اصلی
          </button>
        </div>
      ) : (
        <button
          onClick={handleInstallClick}
          title="نصب اپلیکیشن روی دستگاه یا گوشی"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/60 text-xs font-medium border border-teal-200/60 dark:border-teal-800 transition shadow-xs cursor-pointer"
        >
          <Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span className="hidden sm:inline">نصب روی اندروید</span>
          <span className="sm:hidden">نصب</span>
        </button>
      )}

      {/* Guide Modal for iOS or manual install */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-100 dark:bg-teal-950 text-teal-600 rounded-lg">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">راهنمای نصب اپلیکیشن</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                <p className="font-semibold text-slate-800 dark:text-white">در گوشی‌های اندروید (کروم):</p>
                <p>۱. منوی سه نقطه (⋮) بالای مرورگر را لمس کنید.</p>
                <p>۲. گزینه <strong>«افزودن به صفحه اصلی» (Add to Home screen)</strong> یا <strong>«نصب برنامه» (Install App)</strong> را انتخاب کنید.</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                <p className="font-semibold text-slate-800 dark:text-white">در گوشی‌های آیفون (سافاری):</p>
                <p>۱. دکمه اشتراک‌گذاری <strong>(Share)</strong> را در پایین مرورگر بزنید.</p>
                <p>۲. به پایین اسکرول کرده و <strong>«Add to Home Screen»</strong> را لمس کنید.</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-2 w-full py-2.5 rounded-xl bg-teal-600 text-white font-medium text-xs hover:bg-teal-700 transition"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};
