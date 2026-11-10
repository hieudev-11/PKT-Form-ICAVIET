const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('Form.vue'));

let total = 0;
for (const file of files) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  const original = content;

  // Replace hardcoded <span class="ml-2">Có</span> with translated version
  content = content.replace(/<span class="ml-2">Có<\/span>/g, '<span class="ml-2">{{ td(\'Có\') }}</span>');
  // Replace hardcoded <span class="ml-2">Không</span>
  content = content.replace(/<span class="ml-2">Không<\/span>/g, '<span class="ml-2">{{ td(\'Không\') }}</span>');

  if (content !== original) {
    fs.writeFileSync(p, content);
    const count = (original.match(/<span class="ml-2">(Có|Không)<\/span>/g) || []).length;
    console.log(`Updated: ${file} (${count} replacements)`);
    total++;
  }
}
console.log(`\nDone! Updated ${total} files.`);
