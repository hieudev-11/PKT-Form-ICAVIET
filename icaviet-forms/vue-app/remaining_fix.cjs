const fs = require('fs');
const path = require('path');
const dir = 'src/pages';
const files = fs.readdirSync(dir).filter(f => (f.startsWith('BaoLanh') || f.startsWith('NDBL')) && f.endsWith('Form.vue') && f !== 'BaoLanhForm.vue' && f !== 'NDBLForm.vue');

// These are remaining hardcoded strings NOT caught by the regex (exact text node match)
// We'll do a simple string replace (all occurrences)
const remainingFixes = [
  ["<label class=\"block text-sm text-gray-600 mb-1\">Tên người hôn phối:</label>", "<label class=\"block text-sm text-gray-600 mb-1\">{{ t('Tên người hôn phối:', 'Spouse\\'s name:') }}</label>"],
  // BaoLanhVoChongForm specific: "Có thẻ xanh diện kết hôn không?"
  ["Có thẻ xanh diện kết hôn không? <span class=\"text-red-500\">*</span>", "{{ t('Có thẻ xanh diện kết hôn không?', 'Do you have a marriage-based green card?') }} <span class=\"text-red-500\">*</span>"],
  // Race options in v-for still rendering as {{ race }} - already handled by td(race) above. 
  // Check if still has {{ race }} not {{ td(race) }}
  ["<span class=\"text-sm\">{{ race }}</span>", "<span class=\"text-sm\">{{ td(race) }}</span>"],
  // fix the select eye/hair color that uses c in v-for: `: c }}` already handled
];

files.forEach(f => {
  let c = fs.readFileSync(path.join(dir, f), 'utf8');

  remainingFixes.forEach(([from, to]) => {
    // replace all occurrences
    while (c.includes(from)) {
      c = c.replace(from, to);
    }
  });

  fs.writeFileSync(path.join(dir, f), c);
});
console.log('Done remaining fixes.');
