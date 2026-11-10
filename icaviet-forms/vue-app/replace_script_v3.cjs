const fs = require('fs');
const path = require('path');
const dict = require('./translations.json');

const dir = 'src/pages';
const files = fs.readdirSync(dir).filter(f => (f.startsWith('BaoLanh') || f.startsWith('NDBL')) && f.endsWith('Form.vue'));

const escapeRegex = (s) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

// Prepare an array of { vi, en } to replace.
let toReplace = [];

Object.keys(dict).forEach(vi => {
  let en = dict[vi];

  // 1. If it ends with " *", strip it and queue it.
  if (vi.endsWith(' *')) {
    let viCore = vi.replace(/ \*$/, '');
    let enCore = en.replace(/ \*$/, '');
    toReplace.push({ vi: viCore, en: enCore });
  }
  
  // 2. Also add the full string itself just in case.
  toReplace.push({ vi, en });
});

// Sort by length descending so longer strings get replaced first
toReplace.sort((a, b) => b.vi.length - a.vi.length);

files.forEach(file => {
  const filepath = path.join(dir, file);
  let content = fs.readFileSync(filepath, 'utf8');

  toReplace.forEach(({ vi, en }) => {
    // We only want to replace `vi` if it is outside of {{ t(...) }}.
    // A robust way in Vue templates is to use negative lookbehind for `t('` or `t("` or `t(`
    // Also, don't replace if it's already inside {{ ... }}
    // But negative lookbehind might be slow or tricky with varying spaces.
    // simpler: `> vi <` or `> vi <span` or `>vi<`
    // Since we just want to wrap text nodes, we can match:
    // `>(\s*)${vi}(\s*)(<|$)` -> `>$1{{ t('${vi}', '${en}') }}$2$3`
    // Wait, what if it's followed by `<span class="text-red-500">*</span>`?
    // Then it's matched by `>(\s*)${vi}(\s*)<`.
    // Let's use this regex:
    const regexText = new RegExp(`>(\\s*)${escapeRegex(vi)}(\\s*)<`, 'g');
    content = content.replace(regexText, `>$1{{ t('${vi.replace(/'/g, "\\'")}', '${en.replace(/'/g, "\\'")}') }}$2<`);
  });

  fs.writeFileSync(filepath, content, 'utf8');
});

console.log('Done replacing missed texts.');
