const fs = require('fs');
const path = require('path');
const dir = 'src/pages';
const files = fs.readdirSync(dir).filter(f => (f.startsWith('BaoLanh') || f.startsWith('NDBL')) && f.endsWith('Form.vue'));

files.forEach(f => {
  let c = fs.readFileSync(path.join(dir, f), 'utf8');

  // Add td to the import destructuring if not there
  c = c.replace(/const \{ t \} = useFormI18n\(\)/, `const { t, td } = useFormI18n()`);

  // Fix {{ st }}
  c = c.replace(/>\{\{\s*st\s*\}\}</g, `>{{ td(st) }}<`);
  // Fix {{ race }}
  c = c.replace(/>\{\{\s*race\s*\}\}</g, `>{{ td(race) }}<`);
  // Fix {{ c }} 
  // Wait, `c === 'other' ? t('Khác', 'Other') : c`
  c = c.replace(/:\s*c\s*\}\}/g, `: td(c) }}`);
  // Also fix `{{ c }}` if any exist alone
  c = c.replace(/>\{\{\s*c\s*\}\}</g, `>{{ td(c) }}<`);

  fs.writeFileSync(path.join(dir, f), c);
});
console.log('Fixed v-for text.');
