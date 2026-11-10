// Mock data - Giai đoạn 1
// Sau này anh đổi thành fetch() gọi API thật

export const customers = [
  {
    id: 101,
    fullName: 'Nguyễn Văn An',
    gender: 'MALE',
    birthDate: '01/05/1990',
    placeBirth: 'Hà Nội',
    idNumber: '001090123456',
    contactPrimary: '0901234567',
    email: 'nguyenvanan@gmail.com',
    occupationTitle01: 'Kỹ sư phần mềm',
    companyName01: 'Công ty ABC',
    passportNumberVN: 'C1234567'
  },
  {
    id: 102,
    fullName: 'Trần Thị Bình',
    gender: 'FEMALE',
    birthDate: '15/08/1985',
    placeBirth: 'Hồ Chí Minh',
    idNumber: '079185123456',
    contactPrimary: '0987654321',
    email: 'binhtran@gmail.com',
    occupationTitle01: 'Giáo viên',
    companyName01: 'Trường THPT XYZ',
    passportNumberVN: 'C9876543'
  },
  {
    id: 103,
    fullName: 'Lê Hoàng Dũng',
    gender: 'MALE',
    birthDate: '22/11/1992',
    placeBirth: 'Đà Nẵng',
    idNumber: '048192654321',
    contactPrimary: '0912345678',
    email: 'dunghoang@gmail.com',
    occupationTitle01: 'Doanh nhân',
    companyName01: 'Công ty TNHH DEF',
    passportNumberVN: 'C5554321'
  }
]

// Employees lấy từ backend DB thật (/api/employees)
export const employees = []

export const formTypes = [
  { value: 'ds160', label: 'Phiếu kiểm tra DS-160' },
  { value: 'ds-260', label: 'Phiếu kiểm tra DS-260' },
  { value: 'i-90', label: 'Phiếu kiểm tra I-90' },
  { value: 'n-600', label: 'Phiếu kiểm tra N-600' },
  { value: 'n-400', label: 'Phiếu kiểm tra N-400' },
  { value: 'i130a-nbl', label: 'I-130A — Người Bảo Lãnh' },
  { value: 'i130a-ndbl', label: 'I-130A — Người Được Bảo Lãnh' },
  { value: 'i130a-final', label: 'I-130A — Phiếu Tổng Hợp' },
  { value: 'k1-visa', label: 'Phiếu K1 Visa' },
  { value: 'f4-visa', label: 'Phiếu F4 Visa' },
  { value: 'cr1-visa', label: 'Phiếu CR1 Visa' },
]

// Hàng đợi review — push thêm trong session khi người điền submit phiếu
// (Sau này sẽ lưu vào DB thật)
export const pendingReviews = []
