const fs = require('fs');
const file = 'c:/Users/PC/Desktop/PKT-model/pkt-ds160/ds160-backend/server.js';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split('\n');

console.log('=== SEARCHING FOR /api/i130a ROUTE IN SERVER.JS ===');
lines.forEach((line, index) => {
  if (line.includes("app.get('/api/i130a'") || line.includes('app.get(\'/api/i130a\'')) {
    for (let i = index; i < index + 40; i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
  }
});
