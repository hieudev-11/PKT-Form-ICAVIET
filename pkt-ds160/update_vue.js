const fs = require('fs');

const vuePath = 'd:/form+pkt/pkt-ds160/ds160-checker/src/components/WordPaper.vue';
let vueData = fs.readFileSync(vuePath, 'utf8');

// 1. Update splitAddr definition
const oldSplitAddr = `  const splitAddr = (addr) => {
    if (!addr) return { street: '', city: '', province: '', country: '' }
    const parts = addr.split(',').map(p => p.trim())
    if (parts.length >= 4) {
      const country = parts.pop()
      const province = parts.pop()
      const city = parts.pop()
      return { street: parts.join(', '), city, province, country }
    }
    if (parts.length === 3) {
      return { street: parts[0], city: parts[1], province: parts[1], country: parts[2] }
    }
    return { street: addr, city: '', province: '', country: '' }
  }`;

const newSplitAddr = `  const splitAddr = (addr, dataObj = null, prefix = '', isUS = false) => {
    if (dataObj && prefix) {
      const street = dataObj[\`\${prefix}Street\`];
      const city = dataObj[\`\${prefix}City\`];
      const province = dataObj[isUS ? \`\${prefix}State\` : \`\${prefix}Province\`];
      const country = dataObj[isUS ? \`\${prefix}ZipCode\` : \`\${prefix}Country\`];
      
      if (street || city || province || country) {
        return {
          street: street || '',
          city: city || '',
          province: province || '',
          country: country || (isUS ? '' : 'VIETNAM')
        };
      }
    }

    if (!addr) return { street: '', city: '', province: '', country: '' }
    const parts = addr.split(',').map(p => p.trim())
    if (parts.length >= 4) {
      const country = parts.pop()
      const province = parts.pop()
      const city = parts.pop()
      return { street: parts.join(', '), city, province, country }
    }
    if (parts.length === 3) {
      return { street: parts[0], city: parts[1], province: parts[1], country: parts[2] }
    }
    return { street: addr, city: '', province: '', country: '' }
  }`;

vueData = vueData.replace(oldSplitAddr, newSplitAddr);

// 2. Update father and mother addresses
vueData = vueData.replace(
  `const cleanFatherAddr = splitAddr(data.fatherCurrentAddress)`,
  `const cleanFatherAddr = splitAddr(data.fatherCurrentAddress, data, 'fatherCurrentAddress')`
);
vueData = vueData.replace(
  `const cleanMotherAddr = splitAddr(data.motherCurrentAddress)`,
  `const cleanMotherAddr = splitAddr(data.motherCurrentAddress, data, 'motherCurrentAddress')`
);

// 3. Update mailingAddress
vueData = vueData.replace(
  `const mail = splitAddr(data.mailingAddressVN)`,
  `const mail = splitAddr(data.mailingAddressVN, data, 'mailingAddressVN')`
);

// 4. Update US Contact Address
// Find: const usAddrFull = data.usContactAddress || ''
// Find: const usAddrObj = splitAddr(usAddrFull)
vueData = vueData.replace(
  /const usAddrObj = splitAddr\(usAddrFull\)/g,
  `const usAddrObj = splitAddr(usAddrFull, data, 'usContactAddress', true)`
);

// 5. Update Company Address mapping inside Jobs loop
const oldCompanyAddress = `address: data['companyAddress' + sfx],`;
const newCompanyAddress = `address: (() => {
          if (data['companyAddress' + sfx + 'Street'] || data['companyAddress' + sfx + 'City']) {
            return [
              data['companyAddress' + sfx + 'Street'],
              data['companyAddress' + sfx + 'City'],
              data['companyAddress' + sfx + 'Province'],
              data['companyAddress' + sfx + 'Country']
            ].filter(Boolean).join(', ');
          }
          return data['companyAddress' + sfx];
        })(),`;
vueData = vueData.replace(oldCompanyAddress, newCompanyAddress);

// 6. Update spouseCurrentAddress if mapped directly
// Find: { label: "Spouse/Fiancé/ Fiancée's's Address", val: data.spouseCurrentAddress },
vueData = vueData.replace(
  /\{\s*label:\s*"Spouse\/Fianc(é|e)\/\s*Fianc(é|e)e's's Address",\s*val:\s*data.spouseCurrentAddress\s*\}/g,
  `{ label: "Spouse/Fiancé/ Fiancée's's Address", val: (() => {
      const s = data.spouseCurrentAddressStreet;
      const c = data.spouseCurrentAddressCity;
      if (s || c) return [s, c, data.spouseCurrentAddressProvince, data.spouseCurrentAddressCountry].filter(Boolean).join(', ');
      return data.spouseCurrentAddress;
    })() }`
);

// 7. Update exSpouseCurrentAddress if mapped directly
// It might be inside a loop or mapped directly.
// Let's just check if it's there.
vueData = vueData.replace(
  /address:\s*data\['exSpouseCurrentAddress'\s*\+\s*sfx\],/g,
  `address: (() => {
          if (data['exSpouseCurrentAddress' + sfx + 'Street'] || data['exSpouseCurrentAddress' + sfx + 'City']) {
            return [
              data['exSpouseCurrentAddress' + sfx + 'Street'],
              data['exSpouseCurrentAddress' + sfx + 'City'],
              data['exSpouseCurrentAddress' + sfx + 'Province'],
              data['exSpouseCurrentAddress' + sfx + 'Country']
            ].filter(Boolean).join(', ');
          }
          return data['exSpouseCurrentAddress' + sfx];
        })(),`
);

// 8. Update addressInUS if mapped directly
// Wait, is addressInUS used in WordPaper?
vueData = vueData.replace(
  /\{\s*label:\s*'U.S. Street Address(?: \(Line 1\))?',\s*val:\s*data.addressInUS\s*(?:,[^}]*)?\}/g,
  `...(() => {
      const usAddr = splitAddr(data.addressInUS, data, 'addressInUS', true);
      return [
        { label: 'U.S. Street Address (Line 1)', val: usAddr.street },
        { label: 'City', val: usAddr.city },
        { label: 'State', val: usAddr.province },
        { label: 'ZIP Code', val: usAddr.country },
      ]
    })()`
);


fs.writeFileSync(vuePath, vueData);
console.log('WordPaper.vue updated successfully.');
