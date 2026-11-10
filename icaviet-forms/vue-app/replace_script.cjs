const fs = require('fs');
const path = require('path');
const dict = require('./translations.json');

const dir = 'src/pages';
const files = fs.readdirSync(dir).filter(f => (f.startsWith('BaoLanh') || f.startsWith('NDBL')) && f.endsWith('Form.vue') && !f.includes('BaoLanhForm.vue') && !f.includes('NDBLForm.vue'));

const keys = Object.keys(dict).sort((a, b) => b.length - a.length);

files.forEach(file => {
  const filepath = path.join(dir, file);
  let content = fs.readFileSync(filepath, 'utf8');

  // Add import and init t()
  if (!content.includes('useFormI18n')) {
    content = content.replace(/<script setup lang="ts">\n/, `<script setup lang="ts">\nimport { useFormI18n } from '@/composables/useFormI18n'\nconst { t } = useFormI18n()\n\n`);
  }

  keys.forEach(vi => {
    const en = dict[vi];
    // 1. Replace placeholder="vi" => :placeholder="t('vi', 'en')"
    // Use split/join to replace all occurrences precisely
    content = content.split(`placeholder="${vi}"`).join(`:placeholder="t('${vi}', '${en.replace(/'/g, "\\'")}')"`);
    
    // 2. Replace alert('vi') => alert(t('vi', 'en'))
    content = content.split(`alert('${vi}')`).join(`alert(t('${vi}', '${en.replace(/'/g, "\\'")}'))`);
    content = content.split(`alert('${vi}' + `).join(`alert(t('${vi}', '${en.replace(/'/g, "\\'")}') + `);
    
    // 3. Replace > vi < to >{{ t('vi', 'en') }}<
    // We can't just use split('> vi <') because there might be spaces.
    // Use regex to match >\s*vi\s*<
    const escapeRegex = (s) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regexText = new RegExp(`>(\\s*)${escapeRegex(vi)}(\\s*)<`, 'g');
    content = content.replace(regexText, `>$1{{ t('${vi}', '${en.replace(/'/g, "\\'")}') }}$2<`);

    // 4. Replace <option value="X">X</option>
    // Sometimes 'X' is already replaced above, but let's check
    // Wait, the regex in #3 will catch "> X <", which is good.

    // 5. Replace {{ c === 'other' ? 'Khác' : c }}
    // Handled manually or below
  });

  // some manual fixes
  content = content.split(`{{ c === 'other' ? 'Khác' : c }}`).join(`{{ c === 'other' ? t('Khác', 'Other') : c }}`);
  content = content.split(`t('Khác:', 'Other:')`).join(`t('Khác', 'Other') + ':'`); // fix if it missed the colon

  fs.writeFileSync(filepath, content, 'utf8');
  console.log('Processed', file);
});
