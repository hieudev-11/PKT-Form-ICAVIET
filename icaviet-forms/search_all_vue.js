const fs = require('fs');
const path = require('path');
const pagesDir = 'c:/Users/PC/Desktop/PKT-model/icaviet-forms/vue-app/src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.vue'));

console.log('=== SEARCHING FOR NAME INPUTS ACROSS ALL VUE PAGES ===');
files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('ten_ten') || content.includes('ten_ho') || content.includes('ten_tenLot')) {
    const hasTenTen = content.includes('ten_ten');
    const hasTenHo = content.includes('ten_ho');
    const hasTenLot = content.includes('ten_tenLot');
    console.log(`${file}: hasTenHo=${hasTenHo}, hasTenLot=${hasTenLot}, hasTenTen=${hasTenTen}`);
  }
});
