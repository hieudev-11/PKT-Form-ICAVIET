const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\PC\\Desktop\\test2\\icaviet-forms\\vue-app\\src\\pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('Form.vue'));

for (const file of files) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');

    const diaChiRegex = /(v-for="\(item, index\) in formValues\.diaChi5Nam"[^>]*>[\s\S]*?)<AddressSelect v-model="item\.diaChi"/g;
    content = content.replace(diaChiRegex, '$1<AddressSelect isUs v-model="item.diaChi"');

    const congViecRegex = /(v-for="\(item, index\) in formValues\.congViec5Nam"[^>]*>[\s\S]*?)<AddressSelect v-model="item\.diaChi"/g;
    content = content.replace(congViecRegex, '$1<AddressSelect isUs v-model="item.diaChi"');

    fs.writeFileSync(p, content);
}
console.log('Done!');
