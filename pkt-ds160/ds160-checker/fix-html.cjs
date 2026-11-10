const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'forms', 'ds160.html');
let content = fs.readFileSync(filePath, 'utf8');

// Remove the static add button row from HTML
// This row is: <!-- Nút thêm công việc trước đây --> followed by <tr class="even prev-employment-add-row">...</tr>
const commentPattern = '<!-- N\u00FAt th\u00EAm c\u00F4ng vi\u1EC7c tr\u01B0\u1EDBc \u0111\u00E2y -->';
const commentIdx = content.indexOf(commentPattern);

if (commentIdx === -1) {
  console.log('Static button comment not found - may already be removed');
  process.exit(0);
}

// Find the end of the </tr> after the button row
const afterComment = content.substring(commentIdx);
const trEndIdx = afterComment.indexOf('</tr>');
if (trEndIdx === -1) {
  console.log('Could not find closing </tr>');
  process.exit(1);
}

const toRemove = afterComment.substring(0, trEndIdx + '</tr>'.length);
content = content.replace(toRemove, '');

// Also update rowspan from 16 back to 15 (1 header + 14 detail rows)
content = content.replace('rowspan="16"><strong>33</strong>', 'rowspan="15"><strong>33</strong>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Static button row removed from ds160.html');
console.log('Rowspan updated to 15');
