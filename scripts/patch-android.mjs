// کپی افزونه‌های اندروید داخل پروژه‌ی تولیدشده توسط `cap add android` و تنظیم کیبورد
import fs from 'node:fs';
import path from 'node:path';

const dest = path.join('android', 'app', 'src', 'main', 'java', 'ir', 'attendance', 'inservice');
if (!fs.existsSync('android')) {
  console.error('پوشه android وجود ندارد. ابتدا: npx cap add android');
  process.exit(1);
}
fs.mkdirSync(dest, { recursive: true });
for (const f of fs.readdirSync('native-android').filter((n) => n.endsWith('.java'))) {
  fs.copyFileSync(path.join('native-android', f), path.join(dest, f));
  console.log('copied', f);
}

// با باز شدن کیبورد، اندازه‌ی صفحه تغییر کند (فرم‌ها زیر کیبورد نروند)
const manifestPath = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');
if (!manifest.includes('android:windowSoftInputMode')) {
  manifest = manifest.replace('<activity', '<activity\n            android:windowSoftInputMode="adjustResize"');
  fs.writeFileSync(manifestPath, manifest);
  console.log('manifest: windowSoftInputMode=adjustResize');
}
