import fs from 'fs'; 
let txt = fs.readFileSync('public/forms/ds160.html', 'utf8'); 
txt = txt.replace(/(<td[^>]*>Driver's License Number<\/td>\s*<td[^>]*colspan=")\d+("[^>]*>)/, '$1 20 $2'); 
txt = txt.replace(/(<td[^>]*>State of Driver's License<\/td>\s*<td[^>]*colspan=")\d+("[^>]*>)/, '$1 20 $2'); 
fs.writeFileSync('public/forms/ds160.html', txt); 
console.log('Fixed');
