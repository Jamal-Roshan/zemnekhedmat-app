// کپی افزونه‌ی چاپ اندروید داخل پروژه‌ی تولیدشده توسط `cap add android`
import fs from 'node:fs';
import path from 'node:path';

const dest = path.join('android', 'app', 'src', 'main', 'java', 'ir', 'attendance', 'inservice');
if (!fs.existsSync('android')) {
  console.error('پوشه android وجود ندارد. ابتدا: npx cap add android');
  process.exit(1);
}
fs.mkdirSync(dest, { recursive: true });
for (const f of ['NativePrintPlugin.java', 'MainActivity.java']) {
  fs.copyFileSync(path.join('native-android', f), path.join(dest, f));
  console.log('copied', f);
}
