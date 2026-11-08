# سامانه حضور و غیاب ضمن خدمت – نسخه نصبی اندروید

همان برنامه‌ی وب شما (React) که با Capacitor داخل یک اپ اندروید بسته‌بندی شده است.
همه‌ی امکانات قبلی (اکسل، تقویم شمسی، پشتیبان‌گیری، تم، …) بدون تغییر کار می‌کنند.
تنها تغییر: خروجی اکسل و فایل پشتیبان در اندروید با پنجره‌ی «اشتراک‌گذاری/ذخیره» اندروید ذخیره می‌شود
(چون WebView دانلود مستقیم فایل را پشتیبانی نمی‌کند).

## پیش‌نیاز
Node.js 20 یا بالاتر، Android Studio، و اینترنت برای نصب پکیج‌ها.

## ساخت APK (یک‌بار)
```bash
npm install
npx cap add android        # پوشه android ساخته می‌شود (فقط یک بار)
npm run android:sync       # بیلد وب + کپی داخل پروژه اندروید
npm run android:open       # باز شدن در Android Studio
```
در Android Studio: منوی **Build ▸ Build Bundle(s) / APK(s) ▸ Build APK(s)**.
فایل خروجی: `android/app/build/outputs/apk/debug/app-debug.apk` را روی گوشی نصب کنید.

برای نسخه‌ی نهایی امضاشده: **Build ▸ Generate Signed Bundle / APK**.

## بدون Android Studio
این پروژه فایل `.github/workflows/build-apk.yml` دارد؛ آن را در GitHub بارگذاری کنید و از تب Actions
گزینه‌ی Build Android APK را اجرا کنید، APK به‌صورت Artifact دانلود می‌شود.

## بعد از هر تغییر در کد
`npm run android:sync` و دوباره Build.

## نکات
- داده‌ها داخل حافظه‌ی خود اپ ذخیره می‌شوند. قبل از حذف یا به‌روزرسانی اپ، از بخش تنظیمات «پشتیبان‌گیری» بگیرید.
- فونت وزیر داخل پروژه (`public/fonts`) قرار دارد و برنامه کاملاً آفلاین کار می‌کند.
- آیکون اندروید پیش‌فرض Capacitor است؛ برای آیکون سفارشی از `@capacitor/assets` استفاده کنید.

## نسخه وب برای تست
- محلی: `npm install` و سپس `npm run dev` و باز کردن `http://localhost:3000`.
- آنلاین: در GitHub بخش Settings ▸ Pages گزینه Source را روی **GitHub Actions** بگذارید؛
  workflow با نام Deploy Web Test Version آدرس سایت را می‌دهد.

## چاپ پرونده آموزشی در اندروید
دکمه چاپ از سرویس چاپ خود اندروید استفاده می‌کند (برای ذخیره PDF گزینه Save as PDF را انتخاب کنید).
افزونه‌ی آن در پوشه `native-android` است و اسکریپت `android:sync` آن را خودکار داخل پروژه اندروید کپی می‌کند.
