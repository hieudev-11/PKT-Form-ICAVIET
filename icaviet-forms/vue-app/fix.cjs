const fs = require('fs');
const path = require('path');
const dir = 'src/pages';
const files = fs.readdirSync(dir).filter(f => (f.startsWith('BaoLanh') || f.startsWith('NDBL')) && f.endsWith('Form.vue'));

files.forEach(f => {
  let c = fs.readFileSync(path.join(dir, f), 'utf8');
  c = c.replace(/GỬI HỒ SƠ/g, `{{ t('GỬI HỒ SƠ', 'SUBMIT APPLICATION') }}`);
  c = c.replace(/>\s*Xóa\s*</g, `>{{ t('Xóa', 'Clear') }}<`);
  c = c.replace(/TÌNH TRẠNG CƯ TRÚ HIỆN TẠI Ở MỸ/g, `{{ t('TÌNH TRẠNG CƯ TRÚ HIỆN TẠI Ở MỸ', 'CURRENT US RESIDENCY STATUS') }}`);
  c = c.replace(/LỊCH SỬ USCIS & PHÁP LÝ/g, `{{ t('LỊCH SỬ USCIS & PHÁP LÝ', 'USCIS & LEGAL HISTORY') }}`);
  c = c.replace(/THÔNG TIN CON CÁI & QUAN HỆ/g, `{{ t('THÔNG TIN CON CÁI & QUAN HỆ', 'CHILDREN & RELATIONSHIP INFORMATION') }}`);
  c = c.replace(/THÔNG TIN CHA VÀ MẸ/g, `{{ t('THÔNG TIN CHA VÀ MẸ', 'PARENTS\\' INFORMATION') }}`);
  c = c.replace(/LỊCH SỬ 5 NĂM QUA/g, `{{ t('LỊCH SỬ 5 NĂM QUA', '5-YEAR HISTORY') }}`);
  c = c.replace(/THÔNG TIN BỔ SUNG & XÁC NHẬN/g, `{{ t('THÔNG TIN BỔ SUNG & XÁC NHẬN', 'ADDITIONAL INFORMATION & CONFIRMATION') }}`);
  c = c.replace(/Thông tin hôn phối hiện tại</g, `{{ t('Thông tin hôn phối hiện tại', 'Current spouse information') }}<`);
  
  fs.writeFileSync(path.join(dir, f), c);
});
console.log('Fixed headers.');
