const fs = require('fs');

const file = 'c:/Users/PC/Desktop/PKT-model/icaviet-forms/vue-app/src/pages/BaoLanhVoChongForm.vue';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split('\n');

console.log('=== SEARCHING FOR NAME FIELDS IN VUE ===');
lines.forEach((line, index) => {
  if (line.includes('ten_ten') || line.includes('ten_ho') || line.includes('ten_tenLot')) {
    console.log(`${index + 1}: ${line.trim().substring(0, 140)}`);
  }
});
