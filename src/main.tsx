import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installPersianInputGuard } from './utils/persianText';

installPersianInputGuard();

// ارتفاع قابل‌مشاهده‌ی صفحه (با باز شدن کیبورد گوشی کم می‌شود) برای مودال‌ها
function syncViewport() {
  const vv = window.visualViewport;
  const h = vv ? vv.height : window.innerHeight;
  const top = vv ? vv.offsetTop : 0;
  const root = document.documentElement.style;
  root.setProperty('--app-vh', `${h}px`);
  root.setProperty('--app-vt', `${top}px`);
}
syncViewport();
window.addEventListener('resize', syncViewport);
window.visualViewport?.addEventListener('resize', syncViewport);
window.visualViewport?.addEventListener('scroll', syncViewport);

// هنگام ورود به فیلد داخل مودال، فیلد به محدوده‌ی دید آورده می‌شود
document.addEventListener('focusin', (e) => {
  const el = e.target as HTMLElement | null;
  if (!el || !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
  if (!el.closest('.app-modal-panel')) return;
  setTimeout(() => {
    try {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch { /* ignore */ }
  }, 350);
});

createRoot(document.getElementById('root')!).render(<App />);
