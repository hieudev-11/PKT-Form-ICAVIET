const fs = require('fs');
const path = require('path');

const schemaPath = 'C:\\Users\\PC\\Desktop\\phiếu kiểm tra ds-160\\icaviet-forms\\forms\\ds-160\\schema.json';
const htmlPath = 'C:\\Users\\PC\\Desktop\\phiếu kiểm tra ds-160\\icaviet-ds160-pkt\\forms\\ds160.html';

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
let schemaFields = [];
function extractFields(fields) {
  for (let f of fields) {
    if (f.label && f.label.en) {
      schemaFields.push({ id: f.id, en: f.label.en.replace(/\n/g, ' ').trim(), vi: f.label.vi.replace(/\n/g, ' ').trim() });
    }
  }
}
for (let section of schema.sections) {
  if (section.groups) {
    for (let group of section.groups) {
      if (group.fields) extractFields(group.fields);
    }
  }
}

const html = fs.readFileSync(htmlPath, 'utf8');
const regex = /<td colspan="11">([^<]+)<\/td>/g;
let match;
let htmlLabels = [];
while ((match = regex.exec(html)) !== null) {
  let text = match[1].replace(/\n/g, ' ').trim();
  if (text.length > 2) {
    htmlLabels.push(text);
  }
}

let report = '# BẢNG ĐỐI CHIẾU NHANH (MAPPING)\n\n';
report += '| Label trong Phiếu Kiểm Tra (Hạng Mục) | Gợi ý ID từ schema.json (icaviet-forms) |\n';
report += '| :--- | :--- |\n';

for (let h of htmlLabels) {
  let hLower = h.toLowerCase();
  let bestMatch = schemaFields.find(s => {
    let sLower = s.en.toLowerCase();
    return sLower === hLower || sLower.includes(hLower) || hLower.includes(sLower);
  });
  
  if (bestMatch) {
    report += `| **${h}** | \`${bestMatch.id}\` (${bestMatch.en}) |\n`;
  } else {
    report += `| **${h}** | ❌ Không tìm thấy trường tương ứng |\n`;
  }
}

fs.writeFileSync('C:\\Users\\PC\\.gemini\\antigravity\\brain\\894810a0-f1af-4a18-9b3b-916f506b6f18\\mapping_report.md', report);
console.log('Mapping report generated!');
