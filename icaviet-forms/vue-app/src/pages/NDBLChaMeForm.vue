<script setup lang="ts">
import { useFormI18n } from '@/composables/useFormI18n'
import DateSelect from '@/components/DateSelect.vue'
import PlaceBirthSelect from '@/components/PlaceBirthSelect.vue'
import AddressSelect from '@/components/AddressSelect.vue'
const { t, td } = useFormI18n()
import { reactive, ref, watch } from 'vue'

// State lưu trữ dữ liệu form
const formValues = reactive<any>({
  // THÔNG TIN CÁ NHÂN CỦA ĐƯƠNG ĐƠN
  tenTrenGiayTo_ho: '',
  tenTrenGiayTo_tenLot: '',
  tenTrenGiayTo_ten: '',
  tenTrenGiayTo: '',
  tenGoiKhac_ho: '',
  tenGoiKhac_tenLot: '',
  tenGoiKhac_ten: '',
  tenGoiKhac: '',
  ngaySinh: '',
  gioiTinh: '',
  noiSinh: '',
  soDienThoai: '',
  email: '',
  diaChiNhanThuVN: '',
  diaChiDuDinhSongMy: '',
  passport: '',
  noiCapPassport: '',
  ngayHetHanPassport: '',
  
  tungNhapCanhMy: '',
  lanNhapCanhMy: [{ ngayNhapCanh: '', dien: '', soVisa: '' }],
  
  tungDuocBaoLanh: '',
  lanDuocBaoLanh: [{ ngayUuTien: '', trungTamUscis: '', ketQua: '' }],
  
  tungOQuaHan: '',
  lanOQuaHan: [{ thoiGianOQuaHan: '', dienNhapCanh: '', lyDo: '' }],

  // Thông tin hôn nhân
  tinhTrangHonNhan: '',
  honPhoiHienTai: [{ ten: '', ten_ho: '', ten_tenLot: '', ten_ten: '', ngaySinh: '', noiSinh: '', ngayKetHon: '', noiKetHon: '', diaChiSongChung: '', ngayBatDauSongChung: '', ngayKetThucSongChung: '' }],
  honNhanCu: [{ ten: '', ten_ho: '', ten_tenLot: '', ten_ten: '', ngayLyHon: '' }],
  honPhoiDaMat: [{ ten: '', ten_ho: '', ten_tenLot: '', ten_ten: '', ngayMat: '' }],

  // ĐỊA CHỈ Ở TRONG 5 NĂM QUA
  diaChi5Nam: [{ diaChi: '', ngayBatDau: '', ngayChuyenDi: '' }],
  
  // CÔNG VIỆC TRONG 5 NĂM QUA
  congViec5Nam: [{ ngheNghiep: '', tenCongTy: '', diaChi: '', ngayNhanViec: '', ngayNghiViec: '' }],
  
  // THÔNG TIN NGƯỜI THÂN CỦA NGƯỜI ĐƯỢC BẢO LÃNH
  thongTinCha: [{ ten: '', ten_ho: '', ten_tenLot: '', ten_ten: '', ngaySinh: '', noiSinh: '', conSong: '', diaChi: '', namMat: '' }],
  thongTinMe: [{ ten: '', ten_ho: '', ten_tenLot: '', ten_ten: '', ngaySinh: '', noiSinh: '', conSong: '', diaChi: '', namMat: '' }],

  // THÔNG TIN CON CÁI CỦA ĐƯƠNG ĐƠN
  daCoCon: '',
  thongTinCon: [{ ten: '', ten_ho: '', ten_tenLot: '', ten_ten: '', ngaySinh: '', noiSinh: '' }],
  
  // THÔNG TIN BỔ SUNG
  ghiChu: '',
  tenNguoiDienDon_ho: '',
  tenNguoiDienDon_tenLot: '',
  tenNguoiDienDon_ten: '',
  tenNguoiDienDon: ''
})

const emit = defineEmits<{
  (e: 'submit', data: Record<string, any>): void
}>()

const isSubmitting = ref(false)

const joinNameParts = (ho?: string, tenLot?: string, ten?: string) => {
  return [ho, tenLot, ten].map(s => String(s || '').trim()).filter(Boolean).join(' ')
}

const syncPersonName = (target: any, field = 'ten') => {
  if (!target) return
  target[field] = joinNameParts(
    target[`${field}_ho`],
    target[`${field}_tenLot`],
    target[`${field}_ten`]
  )
}


const setAddressParts = (target: any, field: string, parts: any) => {
  if (!target || !field || !parts) return
  const normalized = {
    street: String(parts.street || '').trim(),
    city: String(parts.city || '').trim(),
    province: String(parts.province || '').trim(),
    zip: String(parts.zip || '').trim(),
    country: String(parts.country || '').trim(),
  }

  // Address fields are stored exactly as the user typed in each input.
  // Do not split, guess, or generate extra *Parts fields from a full address string.
  target[field] = ''
  target[`${field}Street`] = normalized.street
  target[`${field}City`] = normalized.city
  target[`${field}Province`] = normalized.province
  target[`${field}Zip`] = normalized.zip
  target[`${field}Country`] = normalized.country

  delete target[`${field}Line1`]
  delete target[`${field}State`]
  delete target[`${field}ZipCode`]
  delete target[`${field}Parts`]

  ;['Street', 'Line1', 'City', 'Province', 'State', 'Zip', 'ZipCode', 'Country'].forEach(suffix => {
    delete target[`${field}${suffix}Parts`]
    delete target[`${field}${suffix}Street`]
    delete target[`${field}${suffix}City`]
    delete target[`${field}${suffix}Province`]
    delete target[`${field}${suffix}State`]
    delete target[`${field}${suffix}Zip`]
    delete target[`${field}${suffix}ZipCode`]
    delete target[`${field}${suffix}Country`]
  })
}

const setPlaceBirthParts = (target: any, field: string, parts: any) => {
  if (!target || !field || !parts) return
  const normalized = {
    city: String(parts.city || '').trim(),
    province: String(parts.province || '').trim(),
    country: String(parts.country || '').trim(),
  }

  target[`${field}City`] = normalized.city
  target[`${field}Province`] = normalized.province
  target[`${field}State`] = normalized.province
  target[`${field}Country`] = normalized.country
  target[`${field}Parts`] = normalized
}


const handleSubmit = () => {
  // Validate sơ bộ
  if (!formValues.tenTrenGiayTo || !formValues.tenNguoiDienDon) {
    alert(t('Vui lòng điền đầy đủ các trường bắt buộc (*)', 'Please fill in all required fields (*)'))
    return
  }

  const payload = JSON.parse(JSON.stringify(formValues))

  // Nếu chọn Chưa có con thì không gửi mảng thông tin con cái lên backend.
  if (payload.daCoCon !== 'Có') {
    payload.thongTinCon = []
  }

  emit('submit', payload)
}

// Helpers cho các mảng động
const addRow = (list: any[], template: any) => {
  list.push({ ...template })
}

const removeRow = (list: any[], index: number | string) => {
  if (list.length > 0) {
    list.splice(Number(index), 1)
  }
}

watch(
  () => [formValues.tenTrenGiayTo_ho, formValues.tenTrenGiayTo_tenLot, formValues.tenTrenGiayTo_ten],
  ([ho, tenLot, ten]) => {
    formValues.tenTrenGiayTo = [ho, tenLot, ten].map(s => s?.trim()).filter(Boolean).join(' ')
  }
)
watch(
  () => [formValues.tenGoiKhac_ho, formValues.tenGoiKhac_tenLot, formValues.tenGoiKhac_ten],
  ([ho, tenLot, ten]) => {
    formValues.tenGoiKhac = [ho, tenLot, ten].map(s => s?.trim()).filter(Boolean).join(' ')
  }
)

watch(
  () => [formValues.tenNguoiDienDon_ho, formValues.tenNguoiDienDon_tenLot, formValues.tenNguoiDienDon_ten],
  ([ho, tenLot, ten]) => {
    formValues.tenNguoiDienDon = joinNameParts(ho, tenLot, ten)
  }
)
</script>

<template>
  <div class="icaviet-form-container max-w-4xl mx-auto bg-white p-6 md:p-10 rounded-xl shadow-sm border border-gray-100">
    <div class="text-center mb-10">
      <h2 class="text-2xl md:text-3xl font-bold text-gray-800 uppercase tracking-wide">{{ t('NGƯỜI ĐƯỢC BẢO LÃNH: CHA/MẸ', 'BENEFICIARY: PARENT') }}</h2>
      <p class="text-gray-500 mt-2">{{ t('Vui lòng điền đầy đủ thông tin bên dưới bằng tiếng Việt có dấu', 'Please fill out the information below completely in Vietnamese with accents') }}</p>
    </div>
    
    <form @submit.prevent="handleSubmit" class="space-y-12">
      
      <!-- ==================== THÔNG TIN CÁ NHÂN ==================== -->
      <section class="form-section">
        <h3 class="text-xl font-semibold text-blue-700 border-b-2 border-blue-100 pb-2 mb-6 uppercase">{{ t('THÔNG TIN CÁ NHÂN CỦA ĐƯƠNG ĐƠN', 'APPLICANT\'S PERSONAL INFORMATION') }}</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="form-group md:col-span-2">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Tên trên giấy tờ:', 'Legal name on documents:') }} <span class="text-red-500">*</span></label>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs text-gray-500 mb-1">{{ t('Họ', 'Last name') }} <span class="text-red-500">*</span></label>
                <input type="text" v-model="formValues.tenTrenGiayTo_ho" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">{{ t('Tên lót', 'Middle name') }}</label>
                <input type="text" v-model="formValues.tenTrenGiayTo_tenLot" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">{{ t('Tên', 'First name') }} <span class="text-red-500">*</span></label>
                <input type="text" v-model="formValues.tenTrenGiayTo_ten" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
              </div>
            </div>
          </div>
          
          <div class="form-group md:col-span-2">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Tên gọi khác:', 'Other names used:') }}</label>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs text-gray-500 mb-1">{{ t('Họ', 'Last name') }}</label>
                <input type="text" v-model="formValues.tenGoiKhac_ho" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">{{ t('Tên lót', 'Middle name') }}</label>
                <input type="text" v-model="formValues.tenGoiKhac_tenLot" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">{{ t('Tên', 'First name') }}</label>
                <input type="text" v-model="formValues.tenGoiKhac_ten" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Ngày sinh (Ngày tháng năm):', 'Date of birth (dd/mm/yyyy):') }} </label>
            <DateSelect isBirthDate v-model="formValues.ngaySinh" baseClass="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
          </div>

          <div class="form-group">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Giới tính:', 'Gender:') }} <span class="text-red-500">*</span></label>
            <div class="flex gap-6 mt-2">
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.gioiTinh" value="Nam" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Nam', 'Male') }}</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.gioiTinh" value="Nữ" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Nữ', 'Female') }}</span>
              </label>
            </div>
          </div>

          <div class="form-group md:col-span-2">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Nơi sinh (thành phố, tỉnh, quốc gia):', 'Place of birth (City, Province, Country):') }} <span class="text-red-500">*</span></label>
            <PlaceBirthSelect v-model="formValues.noiSinh" baseClass="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" @parts-change="setPlaceBirthParts(formValues, 'noiSinh', $event)" />
          </div>

          <div class="form-group">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Số điện thoại:', 'Phone number:') }} <span class="text-red-500">*</span></label>
            <input type="tel" v-model="formValues.soDienThoai" placeholder="(000) 000-0000" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
          </div>

          <div class="form-group">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Email', 'Email') }} <span class="text-red-500">*</span></label>
            <input type="email" v-model="formValues.email" :placeholder="t('example@example.com', 'example@example.com')" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
          </div>

          <div class="form-group md:col-span-2">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Địa chỉ nhận thư ở Việt Nam', 'Mailing address in Vietnam') }} <span class="text-red-500">*</span></label>
            <AddressSelect :street-value="formValues.diaChiNhanThuVNStreet" :city-value="formValues.diaChiNhanThuVNCity" :province-value="formValues.diaChiNhanThuVNProvince" :zip-value="formValues.diaChiNhanThuVNZip" :country-value="formValues.diaChiNhanThuVNCountry" v-model="formValues.diaChiNhanThuVN" baseClass="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" @parts-change="setAddressParts(formValues, 'diaChiNhanThuVN', $event)" />
          </div>
          
          <div class="form-group md:col-span-2">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Địa chỉ dự định sống ở Mỹ:', 'Intended address in the US:') }} <span class="text-red-500">*</span></label>
            <AddressSelect :street-value="formValues.diaChiDuDinhSongMyStreet" :city-value="formValues.diaChiDuDinhSongMyCity" :province-value="formValues.diaChiDuDinhSongMyProvince" :zip-value="formValues.diaChiDuDinhSongMyZip" :country-value="formValues.diaChiDuDinhSongMyCountry" isUs v-model="formValues.diaChiDuDinhSongMy" baseClass="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" @parts-change="setAddressParts(formValues, 'diaChiDuDinhSongMy', $event)" />
          </div>

          <div class="form-group">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Passport:', 'Passport:') }}</label>
            <input type="text" v-model="formValues.passport" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
          </div>

          <div class="form-group">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Nơi cấp Passport:', 'Place of issuance:') }}</label>
            <PlaceBirthSelect v-model="formValues.noiCapPassport" baseClass="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" @parts-change="setPlaceBirthParts(formValues, 'noiCapPassport', $event)" />
          </div>

          <div class="form-group">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Ngày hết hạn Passport (Ngày tháng năm):', 'Passport expiration date (dd/mm/yyyy):') }}</label>
            <DateSelect allowFutureYears v-model="formValues.ngayHetHanPassport" baseClass="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
          </div>
          
          <!-- Lịch sử Mỹ -->
          <div class="form-group md:col-span-2 border-t pt-6 mt-2">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Bạn đã từng nhập cảnh Mỹ trước đây chưa?', 'Have you ever entered the US before?') }} <span class="text-red-500">*</span></label>
            <div class="flex gap-6 mt-2 mb-4">
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tungNhapCanhMy" value="Có" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Có', 'Yes') }}</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tungNhapCanhMy" value="Không" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Không', 'No') }}</span>
              </label>
            </div>
            
            <div v-if="formValues.tungNhapCanhMy === 'Có'" class="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label class="block text-sm text-gray-700 font-medium mb-2">{{ t('Liệt kê tất cả những lần nhập cảnh Mỹ trước đây, liệt kê từ gần tới xa theo thứ tự: Ngày nhập cảnh - Diện - Số visa', 'List all previous US entries, from most recent to oldest: Date of Entry - Visa Type - Visa Number') }} <span class="text-red-500">*</span></label>
              <div v-for="(item, index) in formValues.lanNhapCanhMy" :key="'nc'+index" class="flex flex-col md:flex-row gap-3 mb-3 relative">
                <div class="flex-1">
                  <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Ngày nhập cảnh', 'Date of entry') }}</label>
                  <DateSelect v-model="item.ngayNhapCanh" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div class="flex-1">
                  <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Diện', 'Visa Type') }}</label>
                  <input type="text" v-model="item.dien" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" required>
                </div>
                <div class="flex-1">
                  <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Số visa', 'Visa Number') }}</label>
                  <input type="text" v-model="item.soVisa" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" required>
                </div>
                <button v-if="formValues.lanNhapCanhMy.length > 1" type="button" @click="removeRow(formValues.lanNhapCanhMy, index)" class="text-red-500 hover:text-red-700 p-2 mt-4 md:mt-0 self-start md:self-center">&times;</button>
              </div>
              <button type="button" @click="addRow(formValues.lanNhapCanhMy, { ngayNhapCanh: '', dien: '', soVisa: '' })" class="text-xs bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1 rounded">Add New</button>
            </div>
          </div>

          <div class="form-group md:col-span-2">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Bạn đã từng được ai bảo lãnh nhập cư Mỹ trước đây chưa?', 'Have you ever been sponsored for US immigration before?') }} <span class="text-red-500">*</span></label>
            <div class="flex gap-6 mt-2 mb-4">
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tungDuocBaoLanh" value="Có" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Có', 'Yes') }}</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tungDuocBaoLanh" value="Không" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Không', 'No') }}</span>
              </label>
            </div>
            
            <div v-if="formValues.tungDuocBaoLanh === 'Có'" class="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label class="block text-sm text-gray-700 font-medium mb-2">{{ t('Liệt kê tất cả những lần được nộp hồ sơ bảo lãnh trước đây, liệt kê từ gần tới xa theo thứ tự: Ngày ưu tiên của hồ sơ - Diện - Trung tâm USCIS duyệt hồ sơ - kết quả', 'List all previous immigrant petitions filed on your behalf, from most recent to oldest: Priority Date - Category - USCIS Center - Result') }} <span class="text-red-500">*</span></label>
              <div v-for="(item, index) in formValues.lanDuocBaoLanh" :key="'bl'+index" class="flex flex-col md:flex-row gap-3 mb-3 relative">
                <div class="flex-1">
                  <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Ngày ưu tiên', 'Priority date') }}</label>
                  <DateSelect v-model="item.ngayUuTien" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div class="flex-1">
                  <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Trung tâm USCIS duyệt hồ sơ', 'USCIS Center') }}</label>
                  <input type="text" v-model="item.trungTamUscis" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" required>
                </div>
                <div class="flex-1">
                  <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Kết quả', 'Result') }}</label>
                  <select v-model="item.ketQua" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm bg-white" required>
                    <option value="" disabled></option>
                    <option value="Chấp nhận">{{ t('Chấp nhận', 'Approved') }}</option>
                    <option value="Từ chối">{{ t('Từ chối', 'Denied') }}</option>
                    <option value="Thu hồi">{{ t('Thu hồi', 'Revoked') }}</option>
                  </select>
                </div>
                <button v-if="formValues.lanDuocBaoLanh.length > 1" type="button" @click="removeRow(formValues.lanDuocBaoLanh, index)" class="text-red-500 hover:text-red-700 p-2 mt-4 md:mt-0 self-start md:self-center">&times;</button>
              </div>
              <button type="button" @click="addRow(formValues.lanDuocBaoLanh, { ngayUuTien: '', trungTamUscis: '', ketQua: '' })" class="text-xs bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1 rounded">{{ t('+ Thêm', '+ Add') }}</button>
            </div>
          </div>

          <div class="form-group md:col-span-2">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Bạn đã từng ở Mỹ quá hạn chưa?', 'Have you ever overstayed in the US?') }} <span class="text-red-500">*</span></label>
            <div class="flex gap-6 mt-2 mb-4">
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tungOQuaHan" value="Có" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Có', 'Yes') }}</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tungOQuaHan" value="Không" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Không', 'No') }}</span>
              </label>
            </div>
            
            <div v-if="formValues.tungOQuaHan === 'Có'" class="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label class="block text-sm text-gray-700 font-medium mb-2">{{ t('Liệt kê tất cả những lần bạn ở quá hạn trước đây theo thứ tự từ gần tới xa bao gồm các thông tin sau: Thời gian ở quá hạn - Diện nhập cảnh - lý do', 'List all instances of overstaying in the US, from most recent to oldest: Time overstayed - Visa Type - Reason') }} <span class="text-red-500">*</span></label>
              <div v-for="(item, index) in formValues.lanOQuaHan" :key="'qh'+index" class="flex flex-col gap-3 mb-4 relative border-b pb-4 last:border-b-0 last:pb-0">
                <div class="flex flex-col md:flex-row gap-3">
                  <div class="flex-1">
                    <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Thời gian ở quá hạn (số ngày)', 'Time overstayed (days)') }}</label>
                    <input type="number" v-model="item.thoiGianOQuaHan" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" required>
                  </div>
                  <div class="flex-1">
                    <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Nhập cảnh theo diện', 'Entered under Visa Type') }}</label>
                    <input type="text" v-model="item.dienNhapCanh" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" required>
                  </div>
                  <button v-if="formValues.lanOQuaHan.length > 1" type="button" @click="removeRow(formValues.lanOQuaHan, index)" class="text-red-500 hover:text-red-700 p-2 mt-4 md:mt-0 self-start md:self-center">&times;</button>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Lý do', 'Reason') }}</label>
                  <textarea v-model="item.lyDo" rows="2" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" required></textarea>
                </div>
              </div>
              <button type="button" @click="addRow(formValues.lanOQuaHan, { thoiGianOQuaHan: '', dienNhapCanh: '', lyDo: '' })" class="text-xs bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1 rounded">{{ t('+ Thêm', '+ Add') }}</button>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== THÔNG TIN HÔN NHÂN ==================== -->
      <section class="form-section">
        <h3 class="text-xl font-semibold text-blue-700 border-b-2 border-blue-100 pb-2 mb-6 uppercase">{{ t('THÔNG TIN HÔN NHÂN:', 'MARITAL INFORMATION:') }}</h3>
        
        <div class="form-group mb-6">
          <label class="block text-gray-700 font-medium mb-3">{{ t('Tình trạng hôn nhân hiện tại:', 'Current marital status:') }} <span class="text-red-500">*</span></label>
          <div class="flex flex-col gap-3">
            <label v-for="stt in ['Độc thân (Chưa bao giờ kết hôn)', 'Kết hôn', 'Tái hôn (Kết hôn trên 1 lần)', 'Ly hôn', 'Góa phụ']" :key="stt" class="flex items-center cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <input type="radio" v-model="formValues.tinhTrangHonNhan" :value="stt" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
              <span class="ml-3 text-gray-700 text-sm">{{ td(stt) }}</span>
            </label>
          </div>
        </div>

        <!-- Hôn phối hiện tại -->
        <div v-if="['Kết hôn', 'Tái hôn (Kết hôn trên 1 lần)'].includes(formValues.tinhTrangHonNhan)" class="mb-6">
          <label class="block text-gray-700 font-bold mb-4">{{ t('Thông tin hôn phối hiện tại:', 'Current spouse information:') }} <span class="text-red-500">*</span></label>
          <div v-for="(item, index) in formValues.honPhoiHienTai" :key="'hp'+index" class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 relative">
            <button v-if="formValues.honPhoiHienTai.length > 1" type="button" @click="removeRow(formValues.honPhoiHienTai, index)" class="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xl font-bold">&times;</button>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">{{ t('Tên người hôn phối:', 'Spouse\'s name:') }}</label>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Họ', 'Family name') }}</label>
                    <input type="text" v-model="item.ten_ho" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" required>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên lót', 'Middle name') }}</label>
                    <input type="text" v-model="item.ten_tenLot" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên', 'Given name') }}</label>
                    <input type="text" v-model="item.ten_ten" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" required>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">{{ t('Ngày sinh:', 'Date of birth:') }}</label>
                <DateSelect isBirthDate v-model="item.ngaySinh" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">{{ t('Nơi sinh:', 'Place of birth:') }}</label>
                <PlaceBirthSelect v-model="item.noiSinh" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" @parts-change="setPlaceBirthParts(item, 'noiSinh', $event)" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">{{ t('Ngày kết hôn hiện tại:', 'Date of current marriage:') }}</label>
                <DateSelect v-model="item.ngayKetHon" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div></div>
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">{{ t('Nơi kết hôn:', 'Place of marriage:') }}</label>
                <PlaceBirthSelect v-model="item.noiKetHon" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" @parts-change="setPlaceBirthParts(item, 'noiKetHon', $event)" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">{{ t('Địa chỉ cả hai sống chung gần đây nhất:', 'Last address lived together:') }}</label>
                <AddressSelect :street-value="item.diaChiSongChungStreet" :city-value="item.diaChiSongChungCity" :province-value="item.diaChiSongChungProvince" :zip-value="item.diaChiSongChungZip" :country-value="item.diaChiSongChungCountry" v-model="item.diaChiSongChung" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" @parts-change="setAddressParts(item, 'diaChiSongChung', $event)" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">{{ t('Ngày bắt đầu sống chung:', 'Date started living together:') }}</label>
                <DateSelect v-model="item.ngayBatDauSongChung" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">{{ t('Ngày kết thúc sống chung:', 'Date stopped living together:') }}</label>
                <DateSelect v-model="item.ngayKetThucSongChung" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
            </div>
          </div>
          <button v-if="formValues.tinhTrangHonNhan !== 'Kết hôn'" type="button" @click="addRow(formValues.honPhoiHienTai, { ten: '', ten_ho: '', ten_tenLot: '', ten_ten: '', ngaySinh: '', noiSinh: '', ngayKetHon: '', noiKetHon: '', diaChiSongChung: '', ngayBatDauSongChung: '', ngayKetThucSongChung: '' })" class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors">{{ t('+ Thêm địa chỉ', '+ Add address') }}</button>
        </div>

        <!-- Hôn nhân cũ -->
        <div v-if="['Tái hôn (Kết hôn trên 1 lần)', 'Ly hôn'].includes(formValues.tinhTrangHonNhan)" class="mb-6">
          <label class="block text-gray-700 font-bold mb-4">{{ t('Thông tin cuộc hôn nhân cũ:', 'Prior marriage information:') }} <span class="text-red-500">*</span></label>
          <div v-for="(item, index) in formValues.honNhanCu" :key="'hc'+index" class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 relative flex flex-col gap-3">
            <button v-if="formValues.honNhanCu.length > 1" type="button" @click="removeRow(formValues.honNhanCu, index)" class="absolute -top-3 -right-3 bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-200 transition-colors z-10">&times;</button>
            <div class="flex-1">
              <label class="block text-sm text-gray-600 mb-1">{{ t('Tên người hôn phối:', 'Spouse\'s name:') }}</label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Họ', 'Family name') }}</label>
                    <input type="text" v-model="item.ten_ho" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên lót', 'Middle name') }}</label>
                    <input type="text" v-model="item.ten_tenLot" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên', 'Given name') }}</label>
                    <input type="text" v-model="item.ten_ten" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                  </div>
                </div>
            </div>
            <div class="flex-1">
              <label class="block text-sm text-gray-600 mb-1">{{ t('Ngày ly hôn:', 'Date of divorce:') }}</label>
              <DateSelect v-model="item.ngayLyHon" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
            </div>
          </div>
          <button type="button" @click="addRow(formValues.honNhanCu, { ten: '', ten_ho: '', ten_tenLot: '', ten_ten: '', ngayLyHon: '' })" class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors">{{ t('+ Thêm', '+ Add') }}</button>
        </div>

        <!-- Hôn phối đã mất -->
        <div v-if="formValues.tinhTrangHonNhan === 'Góa phụ'" class="mb-6">
          <label class="block text-gray-700 font-bold mb-4">{{ t('Thông tin của hôn phối đã mất:', 'Deceased spouse information:') }} <span class="text-red-500">*</span></label>
          <div v-for="(item, index) in formValues.honPhoiDaMat" :key="'hm'+index" class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 relative flex flex-col gap-3">
            <button v-if="formValues.honPhoiDaMat.length > 1" type="button" @click="removeRow(formValues.honPhoiDaMat, index)" class="absolute -top-3 -right-3 bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-200 transition-colors z-10">&times;</button>
            <div class="flex-1">
              <label class="block text-sm text-gray-600 mb-1">{{ t('Tên người hôn phối:', 'Spouse\'s name:') }}</label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Họ', 'Family name') }}</label>
                    <input type="text" v-model="item.ten_ho" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên lót', 'Middle name') }}</label>
                    <input type="text" v-model="item.ten_tenLot" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên', 'Given name') }}</label>
                    <input type="text" v-model="item.ten_ten" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                  </div>
                </div>
            </div>
            <div class="flex-1">
              <label class="block text-sm text-gray-600 mb-1">{{ t('Ngày mất:', 'Date of death:') }}</label>
              <DateSelect v-model="item.ngayMat" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
            </div>
          </div>
          <button type="button" @click="addRow(formValues.honPhoiDaMat, { ten: '', ten_ho: '', ten_tenLot: '', ten_ten: '', ngayMat: '' })" class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors">{{ t('+ Thêm', '+ Add') }}</button>
        </div>

      </section>

      <!-- ==================== LỊCH SỬ CƯ TRÚ ==================== -->
      <section class="form-section">
        <h3 class="text-xl font-semibold text-blue-700 border-b-2 border-blue-100 pb-2 mb-6 uppercase">{{ t('ĐỊA CHỈ Ở TRONG 5 NĂM QUA:', 'ADDRESSES IN THE LAST 5 YEARS:') }}</h3>
        
        <div class="space-y-4">
          <label class="block text-gray-700 font-medium mb-2">{{ t('Liệt kê những địa chỉ đã ở trong 5 năm qua, ở bất kỳ quốc gia nào:', 'List the addresses where you have lived in the past 5 years, in any country:') }} <span class="text-gray-500 font-normal text-sm block mb-4">{{ t('(Liệt kê từ gần tới xa, bao gồm địa chỉ hiện tại đang ở) theo thứ tự: Địa chỉ - Ngày bắt đầu ở - Ngày chuyển đi', '(From most recent to oldest, including current address) in order: Address - Date from - Date to') }} <span class="text-red-500">*</span></span></label>
          <div v-for="(item, index) in formValues.diaChi5Nam" :key="'dc'+index" class="bg-gray-50 p-4 rounded-lg border border-gray-200 relative flex flex-col gap-3">
            <button v-if="formValues.diaChi5Nam.length > 1" type="button" @click="removeRow(formValues.diaChi5Nam, index)" class="absolute -top-3 -right-3 bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-200 transition-colors">&times;</button>
            <div class="w-full">
              <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Địa chỉ', 'Address') }}</label>
              <AddressSelect :street-value="item.diaChiStreet" :city-value="item.diaChiCity" :province-value="item.diaChiProvince" :zip-value="item.diaChiZip" :country-value="item.diaChiCountry" v-model="item.diaChi" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" @parts-change="setAddressParts(item, 'diaChi', $event)" />
            </div>
            <div class="flex flex-col md:flex-row gap-3">
              <div class="flex-1">
                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Ngày bắt đầu ở', 'Date from') }}</label>
                <DateSelect v-model="item.ngayBatDau" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div class="flex-1">
                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Ngày chuyển đi', 'Move out date') }}</label>
                <DateSelect v-model="item.ngayChuyenDi" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                <p class="text-xs text-gray-400 mt-1 italic">{{ t('Để trống nếu đang ở đây', 'Leave blank if currently residing here') }}</p>
              </div>
            </div>
          </div>
          <button type="button" @click="addRow(formValues.diaChi5Nam, { diaChi: '', ngayBatDau: '', ngayChuyenDi: '' })" class="mt-3 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors">{{ t('+ Thêm địa chỉ', '+ Add address') }}</button>
        </div>
      </section>

      <!-- ==================== CÔNG VIỆC TRONG 5 NĂM QUA ==================== -->
      <section class="form-section">
        <h3 class="text-xl font-semibold text-blue-700 border-b-2 border-blue-100 pb-2 mb-6 uppercase">{{ t('CÔNG VIỆC TRONG 5 NĂM QUA:', 'EMPLOYMENT IN THE LAST 5 YEARS:') }}</h3>
        
        <div class="space-y-4">
          <label class="block text-gray-700 font-medium mb-2">{{ t('Liệt kê những việc đã làm trong 5 năm qua:', 'List your employment history for the last 5 years:') }} <span class="text-gray-500 font-normal text-sm block mb-4">{{ t('(Liệt kê từ gần tới xa, bao gồm việc hiện tại đang làm) theo thứ tự nghề nghiệp - tên công ty - địa chỉ - ngày nhận việc - ngày nghỉ việc. Ví dụ: Chuyên viên tư vấn - icaviet - G27 D3 TTN, Quận 12, TP. HCM - 21/09/2019 - 21/09/2024', '(From most recent to oldest) in order: Occupation - Company - Address - Start date - End date. Example: Consultant - icaviet - G27 D3 TTN, District 12, HCMC - 21/09/2019 - 21/09/2024') }} <span class="text-red-500">*</span></span></label>
          <div v-for="(item, index) in formValues.congViec5Nam" :key="'cv'+index" class="bg-gray-50 p-4 rounded-lg border border-gray-200 relative flex flex-col gap-3">
            <button v-if="formValues.congViec5Nam.length > 1" type="button" @click="removeRow(formValues.congViec5Nam, index)" class="absolute -top-3 -right-3 bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-200 transition-colors z-10">&times;</button>
            <div class="flex flex-col md:flex-row gap-3">
              <div class="flex-1">
                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Nghề nghiệp', 'Occupation') }}</label>
                <textarea v-model="item.ngheNghiep" rows="1" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none" required></textarea>
              </div>
              <div class="flex-1">
                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên công ty', 'Company name') }}</label>
                <textarea v-model="item.tenCongTy" rows="1" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none" required></textarea>
              </div>
            </div>
            <div class="w-full">
              <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Địa chỉ', 'Address') }}</label>
              <AddressSelect :street-value="item.diaChiStreet" :city-value="item.diaChiCity" :province-value="item.diaChiProvince" :zip-value="item.diaChiZip" :country-value="item.diaChiCountry" v-model="item.diaChi" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none" @parts-change="setAddressParts(item, 'diaChi', $event)" />
            </div>
            <div class="flex flex-col md:flex-row gap-3">
              <div class="flex-1">
                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Ngày nhận việc', 'Start date') }}</label>
                <DateSelect v-model="item.ngayNhanViec" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div class="flex-1">
                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Ngày nghỉ việc', 'End date') }}</label>
                <DateSelect v-model="item.ngayNghiViec" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                <p class="text-xs text-gray-400 mt-1 italic">{{ t('Để trống nếu đang làm việc', 'Leave blank if currently employed') }}</p>
              </div>
            </div>
          </div>
          <button type="button" @click="addRow(formValues.congViec5Nam, { ngheNghiep: '', tenCongTy: '', diaChi: '', ngayNhanViec: '', ngayNghiViec: '' })" class="mt-3 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors">{{ t('+ Thêm', '+ Add') }}</button>
        </div>
      </section>

      <!-- ==================== THÔNG TIN NGƯỜI THÂN ==================== -->
      <section class="form-section">
        <h3 class="text-xl font-semibold text-blue-700 border-b-2 border-blue-100 pb-2 mb-6 uppercase">{{ t('THÔNG TIN NGƯỜI THÂN CỦA NGƯỜI ĐƯỢC BẢO LÃNH:', 'BENEFICIARY\'S RELATIVES INFORMATION:') }}</h3>
        
        <div class="space-y-8">
          <!-- Cha -->
          <div>
            <label class="block text-gray-700 font-bold mb-4 uppercase">{{ t('Thông tin của Cha', 'Father\'s Information') }}</label>
            <div v-for="(item, index) in formValues.thongTinCha" :key="'cha'+index" class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 relative">
              <button v-if="formValues.thongTinCha.length > 1" type="button" @click="removeRow(formValues.thongTinCha, index)" class="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xl font-bold">&times;</button>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Tên cha:', 'Father\'s name:') }}</label>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Họ', 'Family name') }}</label>
                      <input type="text" v-model="item.ten_ho" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên lót', 'Middle name') }}</label>
                      <input type="text" v-model="item.ten_tenLot" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên', 'Given name') }}</label>
                      <input type="text" v-model="item.ten_ten" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Ngày sinh:', 'Date of birth:') }}</label>
                  <DateSelect isBirthDate v-model="item.ngaySinh" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Nơi sinh:', 'Place of birth:') }}</label>
                  <PlaceBirthSelect v-model="item.noiSinh" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" @parts-change="setPlaceBirthParts(item, 'noiSinh', $event)" />
                </div>

                <div class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Cha còn sống hay đã mất?', 'Is father alive or deceased?') }}</label>
                  <div class="flex gap-6 mt-1">
                    <label class="flex items-center cursor-pointer">
                      <input type="radio" v-model="item.conSong" value="Còn sống" class="w-4 h-4 text-blue-600 focus:ring-blue-500">
                      <span class="ml-2 text-gray-700 text-sm">{{ t('Còn sống', 'Alive') }}</span>
                    </label>
                    <label class="flex items-center cursor-pointer">
                      <input type="radio" v-model="item.conSong" value="Đã mất" class="w-4 h-4 text-blue-600 focus:ring-blue-500">
                      <span class="ml-2 text-gray-700 text-sm">{{ t('Đã mất', 'Deceased') }}</span>
                    </label>
                  </div>
                </div>
                <div v-if="item.conSong === 'Còn sống'" class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Địa chỉ hiện tại:', 'Current address:') }}</label>
                  <AddressSelect :street-value="item.diaChiStreet" :city-value="item.diaChiCity" :province-value="item.diaChiProvince" :zip-value="item.diaChiZip" :country-value="item.diaChiCountry" v-model="item.diaChi" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" @parts-change="setAddressParts(item, 'diaChi', $event)" />
                </div>
                <div v-if="item.conSong === 'Đã mất'" class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Năm mất:', 'Year of death:') }}</label>
                  <input type="number" v-model="item.namMat" min="1915" :max="new Date().getFullYear()" :placeholder="t('Nhập năm mất...', 'Enter year of death...')" class="w-full max-w-xs px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                </div>
              </div>
            </div>
            <button type="button" @click="addRow(formValues.thongTinCha, { ten: '', ten_ho: '', ten_tenLot: '', ten_ten: '', ngaySinh: '', noiSinh: '', diaChi: '' })" class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors">{{ t('+ Thêm địa chỉ', '+ Add address') }}</button>
          </div>

          <!-- Mẹ -->
          <div>
            <label class="block text-gray-700 font-bold mb-4 uppercase">{{ t('Thông tin của Mẹ', 'Mother\'s Information') }}</label>
            <div v-for="(item, index) in formValues.thongTinMe" :key="'me'+index" class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 relative">
              <button v-if="formValues.thongTinMe.length > 1" type="button" @click="removeRow(formValues.thongTinMe, index)" class="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xl font-bold">&times;</button>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Tên mẹ:', 'Mother\'s name:') }}</label>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Họ', 'Family name') }}</label>
                      <input type="text" v-model="item.ten_ho" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên lót', 'Middle name') }}</label>
                      <input type="text" v-model="item.ten_tenLot" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên', 'Given name') }}</label>
                      <input type="text" v-model="item.ten_ten" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Ngày sinh:', 'Date of birth:') }}</label>
                  <DateSelect isBirthDate v-model="item.ngaySinh" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Nơi sinh:', 'Place of birth:') }}</label>
                  <PlaceBirthSelect v-model="item.noiSinh" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" @parts-change="setPlaceBirthParts(item, 'noiSinh', $event)" />
                </div>

                <div class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Mẹ còn sống hay đã mất?', 'Is mother alive or deceased?') }}</label>
                  <div class="flex gap-6 mt-1">
                    <label class="flex items-center cursor-pointer">
                      <input type="radio" v-model="item.conSong" value="Còn sống" class="w-4 h-4 text-blue-600 focus:ring-blue-500">
                      <span class="ml-2 text-gray-700 text-sm">{{ t('Còn sống', 'Alive') }}</span>
                    </label>
                    <label class="flex items-center cursor-pointer">
                      <input type="radio" v-model="item.conSong" value="Đã mất" class="w-4 h-4 text-blue-600 focus:ring-blue-500">
                      <span class="ml-2 text-gray-700 text-sm">{{ t('Đã mất', 'Deceased') }}</span>
                    </label>
                  </div>
                </div>
                <div v-if="item.conSong === 'Còn sống'" class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Địa chỉ hiện tại:', 'Current address:') }}</label>
                  <AddressSelect :street-value="item.diaChiStreet" :city-value="item.diaChiCity" :province-value="item.diaChiProvince" :zip-value="item.diaChiZip" :country-value="item.diaChiCountry" v-model="item.diaChi" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" @parts-change="setAddressParts(item, 'diaChi', $event)" />
                </div>
                <div v-if="item.conSong === 'Đã mất'" class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Năm mất:', 'Year of death:') }}</label>
                  <input type="number" v-model="item.namMat" min="1915" :max="new Date().getFullYear()" :placeholder="t('Nhập năm mất...', 'Enter year of death...')" class="w-full max-w-xs px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                </div>
              </div>
            </div>
            <button type="button" @click="addRow(formValues.thongTinMe, { ten: '', ten_ho: '', ten_tenLot: '', ten_ten: '', ngaySinh: '', noiSinh: '', diaChi: '' })" class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors">{{ t('+ Thêm địa chỉ', '+ Add address') }}</button>
          </div>

          <!-- Con cái của đương đơn -->
          <div>
            <label class="block text-gray-700 font-bold mb-4 uppercase">{{ t('Đương đơn đã có con chưa?', 'Does the applicant have any children?') }}</label>
            <div class="flex gap-6 mt-2 mb-4">
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.daCoCon" value="Có" class="w-5 h-5 text-blue-600 focus:ring-blue-500">
                <span class="ml-2 text-gray-700">{{ t('Có', 'Yes') }}</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.daCoCon" value="Chưa" class="w-5 h-5 text-blue-600 focus:ring-blue-500">
                <span class="ml-2 text-gray-700">{{ t('Chưa', 'No') }}</span>
              </label>
            </div>

            <div v-if="formValues.daCoCon === 'Có'" class="space-y-4">
              <div v-for="(item, index) in formValues.thongTinCon" :key="'con'+index" class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 relative">
                <button v-if="formValues.thongTinCon.length > 1" type="button" @click="removeRow(formValues.thongTinCon, index)" class="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xl font-bold">&times;</button>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="md:col-span-2">
                    <label class="block text-sm text-gray-600 mb-1">{{ t('Tên con:', 'Child name:') }}</label>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Họ', 'Family name') }}</label>
                      <input type="text" v-model="item.ten_ho" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên lót', 'Middle name') }}</label>
                      <input type="text" v-model="item.ten_tenLot" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên', 'Given name') }}</label>
                      <input type="text" v-model="item.ten_ten" @input="syncPersonName(item)" class="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm">
                    </div>
                  </div>
                  </div>
                  <div>
                    <label class="block text-sm text-gray-600 mb-1">{{ t('Ngày sinh:', 'Date of birth:') }}</label>
                    <DateSelect isBirthDate v-model="item.ngaySinh" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm text-gray-600 mb-1">{{ t('Nơi sinh:', 'Place of birth:') }}</label>
                    <PlaceBirthSelect v-model="item.noiSinh" baseClass="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" @parts-change="setPlaceBirthParts(item, 'noiSinh', $event)" />
                  </div>
                </div>
              </div>
              <button type="button" @click="addRow(formValues.thongTinCon, { ten: '', ten_ho: '', ten_tenLot: '', ten_ten: '', ngaySinh: '', noiSinh: '' })" class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors">{{ t('+ Thêm con', '+ Add child') }}</button>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== THÔNG TIN BỔ SUNG ==================== -->
      <section class="form-section">
        <h3 class="text-xl font-semibold text-blue-700 border-b-2 border-blue-100 pb-2 mb-6 uppercase">{{ t('THÔNG TIN BỔ SUNG:', 'ADDITIONAL INFORMATION:') }}</h3>
        
        <div class="space-y-6">
          <div class="form-group">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Lưu ý: Vui lòng ghi rõ câu hỏi và sử dụng tiếng Việt có dấu đầy đủ để tránh nhầm lẫn thông tin:', 'Note: Please specify the question and use Vietnamese with accents to avoid confusion:') }}</label>
            <textarea v-model="formValues.ghiChu" rows="4" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"></textarea>
          </div>

          <div class="form-group bg-blue-50 p-6 rounded-lg border border-blue-100 mt-8">
            <label class="block text-blue-900 font-bold mb-2">{{ t('Tên đầy đủ của người điền đơn:', 'Full name of the person filling out this form:') }} <span class="text-red-500">*</span></label>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs text-blue-800 uppercase font-semibold mb-1">{{ t('Họ', 'Family name') }}</label>
                <input type="text" v-model="formValues.tenNguoiDienDon_ho" class="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition-colors font-semibold" required>
              </div>
              <div>
                <label class="block text-xs text-blue-800 uppercase font-semibold mb-1">{{ t('Tên lót', 'Middle name') }}</label>
                <input type="text" v-model="formValues.tenNguoiDienDon_tenLot" class="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition-colors font-semibold">
              </div>
              <div>
                <label class="block text-xs text-blue-800 uppercase font-semibold mb-1">{{ t('Tên', 'Given name') }}</label>
                <input type="text" v-model="formValues.tenNguoiDienDon_ten" class="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition-colors font-semibold" required>
              </div>
            </div>
            <p class="text-sm text-blue-700 mt-2 italic">{{ t('Thay cho chữ ký nhận dạng xác thực của người điền đơn.', 'Serves as an electronic signature for identity verification.') }}</p>
          </div>
        </div>
      </section>

      <!-- NÚT GỬI -->
      <div class="pt-8 border-t border-gray-200 text-center">
        <button type="submit" :disabled="isSubmitting" class="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-bold rounded-xl shadow-lg transform transition-all hover:-translate-y-1 w-full md:w-auto min-w-[200px] disabled:opacity-70 disabled:cursor-not-allowed">
          <span v-if="isSubmitting" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>{{ t('Đang xử lý...', 'Processing...') }}</span>
          <span v-else>{{ t('Gửi đi', 'Submit') }}</span>
        </button>
      </div>

    </form>
  </div>
</template>

<style scoped>
.form-section {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
