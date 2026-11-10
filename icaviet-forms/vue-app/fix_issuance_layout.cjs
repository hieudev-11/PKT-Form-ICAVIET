const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('Form.vue'));

// Pattern for noiCapTheXanh block (Noi cap + Ngay cap side by side)
// Change both to md:col-span-2
const replacements = [
  // Green card (noiCapTheXanh + ngayCapTheXanh)
  {
    old: `            <div class="form-group">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Nơi cấp:', 'Place of issuance:') }}</label>
              <PlaceBirthSelect noCountry v-model="formValues.noiCapTheXanh" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>
            <div class="form-group">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Ngày cấp:', 'Date of issuance:') }}</label>
              <DateSelect v-model="formValues.ngayCapTheXanh" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>`,
    new: `            <div class="form-group md:col-span-2">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Nơi cấp:', 'Place of issuance:') }}</label>
              <PlaceBirthSelect noCountry v-model="formValues.noiCapTheXanh" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>
            <div class="form-group md:col-span-2">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Ngày cấp:', 'Date of issuance:') }}</label>
              <DateSelect v-model="formValues.ngayCapTheXanh" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>`
  },
  // Citizenship (noiCapQuocTich + ngayCapQuocTich)
  {
    old: `            <div class="form-group">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Nơi cấp:', 'Place of issuance:') }} <span class="text-red-500">*</span></label>
              <PlaceBirthSelect noCountry v-model="formValues.noiCapQuocTich" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>
            <div class="form-group">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Ngày cấp:', 'Date of issuance:') }} <span class="text-red-500">*</span></label>
              <DateSelect v-model="formValues.ngayCapQuocTich" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>`,
    new: `            <div class="form-group md:col-span-2">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Nơi cấp:', 'Place of issuance:') }} <span class="text-red-500">*</span></label>
              <PlaceBirthSelect noCountry v-model="formValues.noiCapQuocTich" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>
            <div class="form-group md:col-span-2">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Ngày cấp:', 'Date of issuance:') }} <span class="text-red-500">*</span></label>
              <DateSelect v-model="formValues.ngayCapQuocTich" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>`
  }
];

let total = 0;
for (const file of files) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;
  for (const { old, new: newText } of replacements) {
    if (content.includes(old)) {
      content = content.replace(old, newText);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(p, content);
    console.log(`Updated: ${file}`);
    total++;
  }
}
console.log(`Done! Updated ${total} files.`);
