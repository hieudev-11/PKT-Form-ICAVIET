const fs = require('fs');
const path = require('path');
const dir = 'src/pages';
const dict = require('./translations.json');
const files = fs.readdirSync(dir).filter(f => (f.startsWith('BaoLanh') || f.startsWith('NDBL')) && f.endsWith('Form.vue') && f !== 'BaoLanhForm.vue' && f !== 'NDBLForm.vue');

const escapeRegex = (s) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

files.forEach(f => {
  let c = fs.readFileSync(path.join(dir, f), 'utf8');

  // Fix {{ stt }} - marital status v-for var in NDBL forms
  c = c.replace(/\{\{\s*stt\s*\}\}/g, `{{ td(stt) }}`);

  // Fix {{ st }} - marital status v-for var in BaoLanh forms
  c = c.replace(/\{\{\s*st\s*\}\}/g, `{{ td(st) }}`);
  
  // Fix {{ race }} - race v-for
  c = c.replace(/\{\{\s*race\s*\}\}/g, `{{ td(race) }}`);
  
  // Fix `: c }}` -> `: td(c) }}` in eye/hair color options
  c = c.replace(/:\s*c\s*\}\}/g, `: td(c) }}`);
  
  // Fix: plain > Vietnamese text < inside labels (not yet wrapped)
  // Use dictionary to do exact matches
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  keys.forEach(vi => {
    const en = dict[vi];
    const viEsc = escapeRegex(vi);
    const enEsc = en.replace(/'/g, "\\'");
    const viEsc2 = vi.replace(/'/g, "\\'");
    
    // Match: >TEXT< where TEXT is the Vietnamese string
    const re = new RegExp(`>(\\s*)${viEsc}(\\s*)<`, 'g');
    c = c.replace(re, `>$1{{ t('${viEsc2}', '${enEsc}') }}$2<`);
  });

  // Also fix double-wrapped: {{ t('{{ t(...) }}', ...) }} which can happen
  c = c.replace(/\{\{\s*t\('(\{\{.*?\}\})',\s*'([^']*)'\)\s*\}\}/g, (m, inner) => inner);

  // Fix "Đang xử lý..." spinner text
  c = c.replace(/>\s*Đang xử lý\.\.\.\s*</g, `>{{ t('Đang xử lý...', 'Processing...') }}<`);
  
  // Fix employment sub-description that is still hardcoded
  c = c.replace(
    /\(Liệt kê từ gần tới xa, bao gồm việc hiện tại đang làm\) theo thứ tự nghề nghiệp - tên công ty - địa chỉ - ngày nhận việc - ngày nghỉ việc\.<br\/>Ví dụ: Chuyên viên tư vấn - icaviet - G27 D3 TTN, Quận 12, TP\. HCM - 21\/09\/2019 - 21\/09\/2024 /g,
    `{{ t('(Liệt kê từ gần tới xa, bao gồm việc hiện tại đang làm) theo thứ tự nghề nghiệp - tên công ty - địa chỉ - ngày nhận việc - ngày nghỉ việc. Ví dụ: Chuyên viên tư vấn - icaviet - G27 D3 TTN, Quận 12, TP. HCM - 21/09/2019 - 21/09/2024', '(From most recent to oldest) in order: Occupation - Company - Address - Start date - End date. Example: Consultant - icaviet - G27 D3 TTN, District 12, HCMC - 21/09/2019 - 21/09/2024') }} `
  );

  fs.writeFileSync(path.join(dir, f), c);
});
console.log('Done fixing all forms.');
