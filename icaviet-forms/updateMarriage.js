const fs = require('fs');
const path = 'c:/Users/PC/Downloads/plugin-ica/icaviet-forms/forms/ds-160/schema.json';
let c = fs.readFileSync(path, 'utf8');

// Update section-level show_if for part3b (Ly hon -> also Tai hon)
c = c.replace(
  '"id": "part3b_previous_marriage",\n            "title": {\n                "en": "Previous Marriage Information",\n                "vi": "Thông tin hôn nhân trước đây"\n            },\n            "show_if": {\n                "maritalStatus": "Ly hôn"\n            }',
  '"id": "part3b_previous_marriage",\n            "title": {\n                "en": "Previous Marriage Information",\n                "vi": "Thông tin hôn nhân trước đây"\n            },\n            "show_if": {\n                "maritalStatus": ["Ly hôn", "Tái hôn"]\n            }'
);

// Update section-level show_if for part3c (Ket hon lan dau -> also Tai hon)
c = c.replace(
  '"id": "part3c_first_marriage",\n            "title": {\n                "en": "Current Marriage Information",\n                "vi": "Thông tin hôn nhân"\n            },\n            "show_if": {\n                "maritalStatus": "Kết hôn lần đầu"\n            }',
  '"id": "part3c_first_marriage",\n            "title": {\n                "en": "Current Marriage Information",\n                "vi": "Thông tin hôn nhân"\n            },\n            "show_if": {\n                "maritalStatus": ["Kết hôn lần đầu", "Tái hôn"]\n            }'
);

// Update all field-level show_if: "Ly hon" -> array
c = c.replace(/"show_if": \{ "maritalStatus": "Ly hôn" \}/g,
  '"show_if": { "maritalStatus": ["Ly hôn", "Tái hôn"] }');

// Update all field-level show_if: "Ket hon lan dau" -> array
c = c.replace(/"show_if": \{ "maritalStatus": "Kết hôn lần đầu" \}/g,
  '"show_if": { "maritalStatus": ["Kết hôn lần đầu", "Tái hôn"] }');

fs.writeFileSync(path, c, 'utf8');
console.log('Done');
