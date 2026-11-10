import fs from 'fs';
const file = 'c:/Users/PC/Desktop/test-PKT-V3/pkt-ds160/ds160-checker/public/forms/i130a.html';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
console.log(lines.slice(265, 305).join('\n'));
