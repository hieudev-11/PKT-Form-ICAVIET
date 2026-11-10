const fs = require('fs');
const path = require('path');
const dir = 'src/pages';
const files = fs.readdirSync(dir).filter(f => (f.startsWith('BaoLanh') || f.startsWith('NDBL')) && f.endsWith('Form.vue') && !f.includes('BaoLanhForm.vue') && !f.includes('NDBLForm.vue'));
let texts = new Set();

files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  // Extract text from <label> tags (accounting for <span>*</span>)
  const labelMatches = content.match(/<label[^>]*>(.*?)<\/label>/g);
  if (labelMatches) {
    labelMatches.forEach(m => {
      let text = m.replace(/<[^>]+>/g, '').trim();
      if (text && !text.match(/^[A-Za-z0-9_\-\s\{\}\(\)\[\]\*]+$/)) { // Only if contains Vietnamese or special chars
        texts.add(text);
      }
    });
  }

  // Extract placeholders
  const placeholderMatches = content.match(/placeholder="([^"]+)"/g);
  if (placeholderMatches) {
    placeholderMatches.forEach(m => {
      let text = m.match(/placeholder="([^"]+)"/)[1];
      if (text && !text.match(/^[A-Za-z0-9_\-\s\{\}\(\)\[\]\*]+$/)) texts.add(text);
    });
  }

  // Extract from text content outside tags, e.g. <h3>, <h2>, <p>, <span>, <option>, <button>
  const tags = ['h2', 'h3', 'p', 'span', 'option', 'button'];
  tags.forEach(tag => {
    const regex = new RegExp('<' + tag + '[^>]*>(.*?)</' + tag + '>', 'g');
    const matches = content.match(regex);
    if (matches) {
      matches.forEach(m => {
        let text = m.replace(/<[^>]+>/g, '').trim();
        text = text.replace(/&times;/g, '').trim(); // Remove &times;
        if (text && !text.match(/^[A-Za-z0-9_\-\s\{\}\(\)\[\]\*\+]+$/)) {
          texts.add(text);
        }
      });
    }
  });
  
  // Extract from alerts
  const alertMatches = content.match(/alert\('([^']+)'\)/g);
  if (alertMatches) {
    alertMatches.forEach(m => {
      texts.add(m.match(/alert\('([^']+)'\)/)[1]);
    });
  }
});

fs.writeFileSync('extracted_texts.json', JSON.stringify([...texts], null, 2));
console.log('Extracted ' + texts.size + ' texts.');
