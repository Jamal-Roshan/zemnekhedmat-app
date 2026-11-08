/**
 * یکسان‌سازی حروف عربی به فارسی (ي→ی ، ك→ک و ...)
 */
const MAP: Record<string, string> = {
  'ي': 'ی', // ي → ی
  'ى': 'ی', // ى → ی
  'ك': 'ک', // ك → ک
  'ۀ': 'ۀ',
  'ـ': '',       // کشیده (ـ)
};
const RE = /[يىكـ]/g;

export function hasArabicChars(s: string): boolean {
  return /[يىك]/.test(s);
}

export function normalizePersian(s: string): string {
  if (!s) return s;
  return s.replace(RE, (c) => MAP[c] ?? c);
}

/** تبدیل بازگشتی همه‌ی رشته‌های یک ساختار داده (آرایه/آبجکت) */
export function deepNormalize<T>(value: T): T {
  if (typeof value === 'string') return normalizePersian(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deepNormalize(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[normalizePersian(k)] = deepNormalize(v);
    }
    return out as T;
  }
  return value;
}

/**
 * هر متنی که کاربر تایپ یا paste کند (در همه‌ی فیلدها) همان لحظه به فارسی تبدیل می‌شود.
 */
export function installPersianInputGuard(): void {
  const handler = (e: Event) => {
    const el = e.target as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el || !('value' in el)) return;
    if ((e as InputEvent).isComposing) return;
    const tag = el.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') return;
    const type = (el as HTMLInputElement).type;
    if (tag === 'INPUT' && !['text', 'search', 'tel', 'email', 'url', ''].includes(type)) return;
    const v = el.value;
    if (!hasArabicChars(v) && !v.includes('ـ')) return;
    const fixed = normalizePersian(v);
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const proto = tag === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (!setter) return;
    setter.call(el, fixed);
    try {
      if (start !== null && end !== null) {
        const delta = v.length - fixed.length;
        el.setSelectionRange(Math.max(0, start - delta), Math.max(0, end - delta));
      }
    } catch { /* برخی انواع input انتخاب متن را پشتیبانی نمی‌کنند */ }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  document.addEventListener('input', handler, true);
}
