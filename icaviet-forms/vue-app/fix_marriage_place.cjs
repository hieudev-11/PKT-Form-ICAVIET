const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('Form.vue'));

// Old block: Ngay ket hon + Noi ket hon side by side (2 cols)
const oldBlock = `              <div>
                <label class="block text-sm text-gray-600 mb-1">{{ t('Ngày kết hôn hiện tại:', 'Date of current marriage:') }}</label>
                <DateSelect v-model="item.ngayKetHon" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">{{ t('Nơi kết hôn:', 'Place of marriage:') }}</label>
                <PlaceBirthSelect v-model="item.noiKetHon" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none" />
              </div>`;

// New block: Ngay ket hon full row, Noi ket hon below as full row
const newBlock = `              <div>
                <label class="block text-sm text-gray-600 mb-1">{{ t('Ngày kết hôn hiện tại:', 'Date of current marriage:') }}</label>
                <DateSelect v-model="item.ngayKetHon" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div></div>
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">{{ t('Nơi kết hôn:', 'Place of marriage:') }}</label>
                <PlaceBirthSelect v-model="item.noiKetHon" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>`;

let totalUpdated = 0;
for (const file of files) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    if (content.includes(oldBlock)) {
        content = content.replace(oldBlock, newBlock);
        fs.writeFileSync(p, content);
        console.log(`Updated: ${file}`);
        totalUpdated++;
    } else {
        console.log(`Skipped: ${file}`);
    }
}
console.log(`Done! Updated ${totalUpdated} files.`);
