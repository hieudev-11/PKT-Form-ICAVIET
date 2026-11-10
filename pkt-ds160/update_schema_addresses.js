const fs = require('fs');

const schemaPath = 'd:/form+pkt/icaviet-forms/forms/ds-160/schema.json';
const schemaData = fs.readFileSync(schemaPath, 'utf8');
const schema = JSON.parse(schemaData);

const targetFields = {
  addressInUS: 'US',
  usContactAddress: 'US',
  companyAddress01: 'VN',
  companyAddress02: 'VN',
  companyAddress03: 'VN',
  exSpouseCurrentAddress: 'VN',
  spouseCurrentAddress: 'VN',
  fatherCurrentAddress: 'VN',
  motherCurrentAddress: 'VN',
  mailingAddressVN: 'VN'
};

let modified = false;

schema.sections.forEach(section => {
  section.groups.forEach(group => {
    let groupModified = false;
    const newFields = [];
    
    group.fields.forEach(field => {
      if (targetFields[field.name]) {
        groupModified = true;
        modified = true;
        const type = targetFields[field.name];
        
        // Base label
        const baseVi = field.label?.vi || field.columnKey || '';
        const baseEn = field.label?.en || '';

        if (type === 'US') {
          newFields.push({
            id: field.name + 'Street',
            name: field.name + 'Street',
            columnKey: baseVi,
            col_span: 1,
            type: 'text',
            label: { en: 'Street Address', vi: baseVi + ' (Số nhà/đường)' },
            required: field.required || false,
            show_if: field.show_if,
            hide_if: field.hide_if
          });
          newFields.push({
            id: field.name + 'City',
            name: field.name + 'City',
            columnKey: 'Thành phố:',
            col_span: 1,
            type: 'text',
            label: { en: 'City', vi: 'Thành phố:' },
            required: field.required || false,
            show_if: field.show_if,
            hide_if: field.hide_if
          });
          newFields.push({
            id: field.name + 'State',
            name: field.name + 'State',
            columnKey: 'Bang (State):',
            col_span: 1,
            type: 'text',
            label: { en: 'State', vi: 'Bang (State):' },
            required: field.required || false,
            show_if: field.show_if,
            hide_if: field.hide_if
          });
          newFields.push({
            id: field.name + 'ZipCode',
            name: field.name + 'ZipCode',
            columnKey: 'Mã bưu chính (ZIP Code):',
            col_span: 1,
            type: 'text',
            label: { en: 'ZIP Code', vi: 'Mã bưu chính (ZIP Code):' },
            required: field.required || false,
            show_if: field.show_if,
            hide_if: field.hide_if
          });
        } else {
          newFields.push({
            id: field.name + 'Street',
            name: field.name + 'Street',
            columnKey: baseVi,
            col_span: 1,
            type: 'text',
            label: { en: 'Street Address', vi: baseVi + ' (Số nhà + quận/đường/xã)' },
            required: field.required || false,
            show_if: field.show_if,
            hide_if: field.hide_if
          });
          newFields.push({
            id: field.name + 'City',
            name: field.name + 'City',
            columnKey: 'Thành phố/huyện:',
            col_span: 1,
            type: 'text',
            label: { en: 'City', vi: 'Thành phố/huyện:' },
            required: field.required || false,
            show_if: field.show_if,
            hide_if: field.hide_if
          });
          newFields.push({
            id: field.name + 'Province',
            name: field.name + 'Province',
            columnKey: 'Tỉnh thành:',
            col_span: 1,
            type: 'text',
            label: { en: 'State/Province', vi: 'Tỉnh thành:' },
            required: field.required || false,
            show_if: field.show_if,
            hide_if: field.hide_if
          });
          newFields.push({
            id: field.name + 'Country',
            name: field.name + 'Country',
            columnKey: 'Quốc gia:',
            col_span: 1,
            type: 'text',
            label: { en: 'Country', vi: 'Quốc gia:' },
            required: field.required || false,
            show_if: field.show_if,
            hide_if: field.hide_if
          });
        }
      } else {
        newFields.push(field);
      }
    });

    if (groupModified) {
      group.grid_cols = 2;
      group.fields = newFields.map(f => {
        if (!f.col_span && !targetFields[f.name] && !f.name.endsWith('Street') && !f.name.endsWith('City') && !f.name.endsWith('Province') && !f.name.endsWith('Country') && !f.name.endsWith('State') && !f.name.endsWith('ZipCode')) {
          f.col_span = 2;
        }
        return f;
      });
    }
  });
});

if (modified) {
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 4));
  console.log('Schema updated successfully.');
} else {
  console.log('No fields were modified.');
}
