const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\PC\\Desktop\\test2\\icaviet-forms\\vue-app\\src\\pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('Form.vue'));

for (const file of files) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');

    content = content.replace(
        /<button type="button" @click="addRow\(formValues\.honPhoiHienTai,/g,
        '<button v-if="formValues.tinhTrangHonNhan !== \'Kết hôn\'" type="button" @click="addRow(formValues.honPhoiHienTai,'
    );

    fs.writeFileSync(p, content);
}
console.log('Done!');
