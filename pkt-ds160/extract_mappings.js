const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('c:/Users/PC/Desktop/phiếu kiểm tra ds-160/icaviet-forms/forms/ds-160/schema.json','utf8'));
let mappings = [];
schema.sections.forEach(s => {
    s.groups && s.groups.forEach(g => {
        g.fields && g.fields.forEach(f => {
            if(f.label && f.label.en) {
                mappings.push(`    { label: ${JSON.stringify(f.label.en.replace(/\n/g, ' ').trim())}, val: data.${f.id} }`);
            }
        });
    });
});
fs.writeFileSync('mappings_generated.txt', mappings.join(',\n'));
console.log('Done');
