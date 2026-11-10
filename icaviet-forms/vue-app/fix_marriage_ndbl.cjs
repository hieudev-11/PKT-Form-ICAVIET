const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('Form.vue'));

let totalUpdated = 0;
for (const file of files) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');

    // Replace Ngay ket hon + Noi ket hon side-by-side with Noi ket hon below (full width)
    // Use a flexible regex to handle both \r\n and \n
    const regex = /(<div>\s*<label class="block text-sm text-gray-600 mb-1">\{\{ t\('Ngày kết hôn hiện tại:', 'Date of current marriage:'\) \}\}<\/label>\s*<DateSelect v-model="item\.ngayKetHon"[^/]*\/>\s*<\/div>)\s*(<div>\s*<label class="block text-sm text-gray-600 mb-1">\{\{ t\('Nơi kết hôn:', 'Place of marriage:'\) \}\}<\/label>\s*<PlaceBirthSelect v-model="item\.noiKetHon"[^/]*\/>\s*<\/div>)/s;

    if (regex.test(content)) {
        content = content.replace(regex, (_, ngayBlock, noiBlock) => {
            // Get indentation from the ngay block
            const indent = '              ';
            const noiContent = noiBlock
                .replace(/^\s*<div>/, `<div></div>\n${indent}<div class="md:col-span-2">`)
                .replace(/<PlaceBirthSelect v-model="item\.noiKetHon" baseClass="[^"]*" \/>/, 
                         `<PlaceBirthSelect v-model="item.noiKetHon" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />`);
            return ngayBlock + '\n' + indent + noiContent;
        });
        fs.writeFileSync(p, content);
        console.log(`Updated: ${file}`);
        totalUpdated++;
    } else {
        console.log(`Skipped: ${file}`);
    }
}
console.log(`Done! Updated ${totalUpdated} files.`);
