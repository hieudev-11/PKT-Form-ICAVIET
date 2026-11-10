import fs from 'fs';

const file = 'c:/Users/PC/Desktop/test-PKT-V3/pkt-ds160/ds160-checker/public/forms/i130a.html';
const html = fs.readFileSync(file, 'utf8');

const beneficiaryHeaders = [
  'VỢ CHỒNG',
  'NGƯỜI ĐƯỢC BẢO LÃNH',
  'SĐT + EMAIL NGƯỜI ĐƯỢC BẢO LÃNH',
  'ĐỊA CHỈ ĐANG Ở / ĐỊA CHỈ Ở NGOÀI HOA KỲ',
  'ĐỊA CHỈ DỰ ĐỊNH Ở KHI TỚI HOA KỲ',
  'ĐỊA CHỈ SỐNG Ở NGOÀI HOA KỲ (NẾU KHÁC VỚI ĐỊA CHỈ HIỆN TẠI)',
  'ĐỊA CHỈ SỐNG CHUNG VỚI NGƯỜI HÔN PHỐI GẦN ĐÂY NHẤT',
  'THÔNG TIN THÊM NGƯỜI ĐƯỢC BẢO LÃNH',
  'THÔNG TIN NHẬP CƯ',
  'THÔNG TIN HỘ CHIẾU / GIẤY THÔNG HÀNH',
  'THỦ TỤC DI TRÚ',
  'VIỆC LÀM HIỆN TẠI',
  'THÔNG TIN GIA ĐÌNH NGƯỜI ĐƯỢC BẢO LÃNH',
  'CUỘC HÔN NHÂN HIỆN TẠI CỦA NGƯỜI ĐƯỢC BẢO LÃNH',
  'CUỘC HÔN NHÂN TRƯỚC ĐÂY CỦA NGƯỜI ĐƯỢC BẢO LÃNH',
  'THÔNG TIN CON',
  'ĐỊA ĐIỂM NỘP HỒ SƠ'
];

const petitionerHeaders = [
  'PHẦN THÔNG TIN I-130A',
  'TÊN NGƯỜI BẢO LÃNH',
  'SĐT + EMAIL',
  'ĐỊA CHỈ NHẬN THƯ',
  'ĐỊA CHỈ CŨ TRONG 5 NĂM QUA',
  'MÔ TẢ BẢN THÂN',
  'VIỆC LÀM TRONG 5 NĂM QUA (NẾU THẤT NGHIỆP THÌ CHỈ CẦN GHI UNEMPLOYED Ở Ô NAME OF THE EMPLOYER)',
  'THÔNG TIN CƯ TRÚ',
  'THÔNG TIN CHO CÔNG DÂN MỸ',
  'THÔNG TIN GIA ĐÌNH',
  'CUỘC HÔN NHÂN HIỆN TẠI',
  'CUỘC HÔN NHÂN CŨ',
  'THÔNG TIN CHA',
  'THÔNG TIN MẸ',
  'THÔNG TIN THÊM'
];

// Find all headers in the HTML
const regex = /<td colspan="26"><strong>(.*?)<\/strong><\/td>/g;
let match;
const foundHeaders = [];
while ((match = regex.exec(html)) !== null) {
  foundHeaders.push(match[1].trim());
}

console.log('--- Found Headers in HTML ---');
foundHeaders.forEach((h, i) => console.log(`${i+1}: ${h}`));

console.log('\n--- NBL (Người Bảo Lãnh) View ---');
let currentSectionVisible = true;
foundHeaders.forEach(text => {
  if (beneficiaryHeaders.includes(text)) {
    currentSectionVisible = false;
  } else if (petitionerHeaders.includes(text)) {
    currentSectionVisible = true;
  }
  if (currentSectionVisible) {
    console.log(`[VISIBLE]: ${text}`);
  } else {
    console.log(`[HIDDEN ]: ${text}`);
  }
});

console.log('\n--- NDBL (Người Được Bảo Lãnh) View ---');
currentSectionVisible = true;
foundHeaders.forEach(text => {
  if (petitionerHeaders.includes(text)) {
    currentSectionVisible = false;
  } else if (beneficiaryHeaders.includes(text)) {
    currentSectionVisible = true;
  }
  if (currentSectionVisible) {
    console.log(`[VISIBLE]: ${text}`);
  } else {
    console.log(`[HIDDEN ]: ${text}`);
  }
});
