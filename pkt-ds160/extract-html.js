const fs = require('fs');
const path = require('path');

const htmlPath = 'c:\\Users\\PC\\Desktop\\phiếu kiểm tra ds-160\\test-interface.html';
const rawHtml = fs.readFileSync(htmlPath, 'utf-8');

const startIdx = rawHtml.indexOf('<main class="page">');
const endIdx = rawHtml.indexOf('</main>', startIdx) + 7;
const mainContent = rawHtml.substring(startIdx, endIdx);

const formsDir = 'c:\\Users\\PC\\Desktop\\phiếu kiểm tra ds-160\\icaviet-ds160-pkt\\forms';
fs.mkdirSync(formsDir, { recursive: true });
fs.writeFileSync(path.join(formsDir, 'ds160.html'), mainContent, 'utf-8');

console.log('ds160.html extracted successfully.');
