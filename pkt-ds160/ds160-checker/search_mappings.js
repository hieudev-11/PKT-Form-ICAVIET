import fs from 'fs';
const file = 'c:/Users/PC/Desktop/test-PKT-V3/pkt-ds160/ds160-checker/src/forms/i130a-mappings.js';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('petition') || line.toLowerCase().includes('alien') || line.toLowerCase().includes('relative')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
