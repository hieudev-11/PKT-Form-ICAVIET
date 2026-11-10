const fs = require('fs');
const path = require('path');
const dir = 'src/pages';
const files = fs.readdirSync(dir).filter(f => (f.startsWith('BaoLanh') || f.startsWith('NDBL')) && f.endsWith('Form.vue') && f !== 'BaoLanhForm.vue' && f !== 'NDBLForm.vue');

const viPattern = /[\u00C0-\u024F\u1E00-\u1EFF]/;

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const lines = content.split('\n');
  let missed = [];
  lines.forEach((line, i) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) return;
    // Remove already-translated parts
    let stripped = line
      .replace(/\{\{\s*t\([^)]+\)\s*\}\}/g, '')
      .replace(/\{\{\s*td\([^)]+\)\s*\}\}/g, '')
      .replace(/t\('[^']+',\s*'[^']+'\)/g, '')
      .replace(/td\('[^']+'\)/g, '')
      .replace(/value="[^"]*"/g, '')
      .replace(/v-model="[^"]*"/g, '')
      .replace(/class="[^"]*"/g, '');

    if (viPattern.test(stripped)) {
      missed.push({ line: i+1, text: line.trim().substring(0, 120) });
    }
  });
  if (missed.length > 0) {
    console.log('\n=== ' + f + ' (' + missed.length + ' lines) ===');
    missed.forEach(m => console.log('  L' + m.line + ': ' + m.text));
    // console.log('  ...and ' + (missed.length - 15) + ' more');
  }
});
