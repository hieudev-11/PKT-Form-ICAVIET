const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\PC\\Desktop\\test2\\icaviet-forms\\vue-app\\src\\pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('Form.vue'));

for (const file of files) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');

    // Add import statement if not already there
    if (!content.includes('import GlobalAddressSelect')) {
        content = content.replace(
            /import AddressSelect from '@\/components\/AddressSelect\.vue'/,
            "import AddressSelect from '@/components/AddressSelect.vue'\nimport GlobalAddressSelect from '@/components/GlobalAddressSelect.vue'"
        );
    }

    fs.writeFileSync(p, content);
}
console.log('Added GlobalAddressSelect import');
