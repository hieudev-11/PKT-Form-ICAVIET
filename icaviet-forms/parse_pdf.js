const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('DS160 DRAFT - Phong.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('pdf_output_utf8.txt', data.text, 'utf8');
}).catch(function(error){
    console.error(error);
});
