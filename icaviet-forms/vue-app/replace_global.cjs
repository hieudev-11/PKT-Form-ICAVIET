const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\PC\\Desktop\\test2\\icaviet-forms\\vue-app\\src\\pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('Form.vue'));

for (const file of files) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');

    // Replace for diaChi5Nam
    const diaChiRegex = /(v-for="\(item, index\) in formValues\.diaChi5Nam"[^>]*>[\s\S]*?)<AddressSelect\s+v-model="item\.diaChi"/g;
    content = content.replace(diaChiRegex, '$1<GlobalAddressSelect v-model="item.diaChi"');

    // Replace for congViec5Nam
    const congViecRegex = /(v-for="\(item, index\) in formValues\.congViec5Nam"[^>]*>[\s\S]*?)<AddressSelect\s+v-model="item\.diaChi"/g;
    content = content.replace(congViecRegex, '$1<GlobalAddressSelect v-model="item.diaChi"');

    fs.writeFileSync(p, content);
}
console.log('Replaced AddressSelect with GlobalAddressSelect');
