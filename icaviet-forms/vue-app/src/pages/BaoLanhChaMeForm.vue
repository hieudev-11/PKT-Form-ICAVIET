<script setup lang="ts">
import { useFormI18n } from '@/composables/useFormI18n'
import DateSelect from '@/components/DateSelect.vue'
import PlaceBirthSelect from '@/components/PlaceBirthSelect.vue'
import AddressSelect from '@/components/AddressSelect.vue'

const { t, td } = useFormI18n()
import { reactive, ref, watch } from 'vue'

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
  chieuCao: '',
  canNang: '',
  danTocMyLatinh: '',
  mauMat: '',
  mauMatKhac: '',
  mauToc: '',
  mauTocKhac: '',
  chungToc: '',
  diaChiNhanThuMy: '',
  tinhTrangCuTruMy: '',
  soDienThoai: '',
  email: '',
  soSsn: '',

  // THƯỜNG TRÚ NHÂN / CÔNG DÂN
  soTheXanh: '',
  noiCapTheXanh: '',
  ngayCapTheXanh: '',
  theXanhDienConNuoi: '',
  theXanhDienKetHon: '',
  dienQuocTich: '',
  soChungNhanQuocTich: '',
  noiCapQuocTich: '',
  ngayCapQuocTich: '',
  quocTichDienConNuoi: '',

  // TÀI KHOẢN USCIS VÀ BẢO LÃNH
  tungMoTaiKhoanUscis: '',
  soTaiKhoanUscis: '',
  tungBaoLanh: '',
  tongSoHoSoBaoLanh: '',
  dangBaoLanhAiKhac: '',
  tongSoHoSoDangBaoLanh: '',

  // PHÁP LÝ
  tungBiCachLy: '',
  tungBiBat: '',

  // CON CÁI & QUAN HỆ

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
  
  // THÔNG TIN NGƯỜI ĐƯỢC BẢO LÃNH DỰ KIẾN
  beneficiaryExpectedName_ho: '',
  beneficiaryExpectedName_tenLot: '',
  beneficiaryExpectedName_ten: '',
  beneficiaryExpectedName: '',
  beneficiaryExpectedDob: '',
  beneficiaryExpectedPhone: '',
  nguoiDuocBaoLanhDuKien: {
    hoTen: '',
    ngaySinh: '',
    soDienThoai: ''
  },

  // THÔNG TIN BỔ SUNG
  ghiChu: '',
  tenNguoiDienDon_ho: '',
  tenNguoiDienDon_tenLot: '',
  tenNguoiDienDon_ten: '',
  tenNguoiDienDon: '',

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
  if (!formValues.tenTrenGiayTo || !formValues.tenNguoiDienDon || !formValues.beneficiaryExpectedName || !formValues.beneficiaryExpectedDob || !formValues.beneficiaryExpectedPhone) {
    alert(t('Vui lòng điền đầy đủ các trường bắt buộc (*)', 'Please fill in all required fields (*)'))
    return
  }

  emit('submit', JSON.parse(JSON.stringify(formValues)))
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

// --- Auto-sort congViec5Nam theo thời gian giảm dần ---
const parseDateToTimestamp = (dateStr: string): number => {
  if (!dateStr) return 0
  let match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1])).getTime()
  }
  match = dateStr.match(/^(\d{1,2})\/(\d{4})$/)
  if (match) {
    return new Date(parseInt(match[2]), parseInt(match[1]) - 1, 1).getTime()
  }
  match = dateStr.match(/^(\d{4})$/)
  if (match) {
    return new Date(parseInt(match[1]), 0, 1).getTime()
  }
  return 0
}

let isSortingCongViec = false
watch(
  () => formValues.congViec5Nam.map(item => item.ngayNhanViec),
  () => {
    if (isSortingCongViec) return
    const hasAnyDate = formValues.congViec5Nam.some(item => parseDateToTimestamp(item.ngayNhanViec) > 0)
    if (formValues.congViec5Nam.length < 2 || !hasAnyDate) return

    const sorted = [...formValues.congViec5Nam].sort((a, b) => {
      const dateA = parseDateToTimestamp(a.ngayNhanViec)
      const dateB = parseDateToTimestamp(b.ngayNhanViec)
      if (dateA === 0 && dateB === 0) return 0
      if (dateA === 0) return 1
      if (dateB === 0) return -1
      return dateB - dateA
    })

    const orderChanged = sorted.some((item, i) => item !== formValues.congViec5Nam[i])
    if (orderChanged) {
      isSortingCongViec = true
      formValues.congViec5Nam.splice(0, formValues.congViec5Nam.length, ...sorted)
      setTimeout(() => { isSortingCongViec = false }, 0)
    }
  },
  { deep: true }
)

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

watch(
  () => [formValues.beneficiaryExpectedName_ho, formValues.beneficiaryExpectedName_tenLot, formValues.beneficiaryExpectedName_ten],
  ([ho, tenLot, ten]) => {
    formValues.beneficiaryExpectedName = joinNameParts(ho, tenLot, ten)
    formValues.nguoiDuocBaoLanhDuKien.hoTen = formValues.beneficiaryExpectedName
  }
)
</script>

<template>
  <div class="icaviet-form-container max-w-4xl mx-auto bg-white p-6 md:p-10 rounded-xl shadow-sm border border-gray-100">
    <div class="text-center mb-10">
      <h2 class="text-2xl md:text-3xl font-bold text-gray-800 uppercase tracking-wide">{{ t('HỒ SƠ BẢO LÃNH CHA/MẸ', 'PARENT SPONSORSHIP CASE') }}</h2>
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
            <DateSelect isBirthDate v-model="formValues.ngaySinh" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
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
            <PlaceBirthSelect v-model="formValues.noiSinh" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" @parts-change="setPlaceBirthParts(formValues, 'noiSinh', $event)" />
          </div>

          <div class="form-group">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Số điện thoại:', 'Phone number:') }} <span class="text-red-500">*</span></label>
            <input type="tel" v-model="formValues.soDienThoai" placeholder="(000) 000-0000" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
          </div>

          <div class="form-group">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Email', 'Email') }} <span class="text-red-500">*</span></label>
            <input type="email" v-model="formValues.email" :placeholder="t('example@example.com', 'example@example.com')" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
          </div>

          <div class="form-group">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Chiều cao (feet & inches):', 'Height (feet & inches):') }} <span class="text-red-500">*</span></label>
            <input type="text" v-model="formValues.chieuCao" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
          </div>

          <div class="form-group">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Cân nặng (Pounds):', 'Weight (Pounds):') }} <span class="text-red-500">*</span></label>
            <input type="text" v-model="formValues.canNang" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
          </div>

          <div class="form-group md:col-span-2">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Có phải dân tộc Mỹ Latinh không?', 'Are you of Hispanic or Latino origin?') }} <span class="text-red-500">*</span></label>
            <div class="flex gap-6 mt-2">
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.danTocMyLatinh" value="Có" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Có', 'Yes') }}</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.danTocMyLatinh" value="Không" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Không', 'No') }}</span>
              </label>
            </div>
          </div>

          <div class="form-group md:col-span-2">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Màu mắt:', 'Eye color:') }} <span class="text-red-500">*</span></label>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <label v-for="color in ['Đen', 'Nâu', 'Xanh lá', 'Đỏ', 'Xám', 'Hồng', 'Xanh dương', 'Nâu đỏ', 'Khác']" :key="color" class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.mauMat" :value="color" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ td(color) }}</span>
              </label>
            </div>
            <div v-if="formValues.mauMat === 'Khác'" class="mt-3">
              <input type="text" v-model="formValues.mauMatKhac" :placeholder="t('Vui lòng ghi rõ...', 'Please specify...')" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
            </div>
          </div>

          <div class="form-group md:col-span-2">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Màu tóc:', 'Hair color:') }} <span class="text-red-500">*</span></label>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <label v-for="color in ['Đen', 'Trọc', 'Vàng', 'Nâu', 'Đỏ', 'Cát', 'Trắng', 'Xám', 'Khác']" :key="color" class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.mauToc" :value="color" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ td(color) }}</span>
              </label>
            </div>
            <div v-if="formValues.mauToc === 'Khác'" class="mt-3">
              <input type="text" v-model="formValues.mauTocKhac" :placeholder="t('Vui lòng ghi rõ...', 'Please specify...')" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
            </div>
          </div>

          <div class="form-group md:col-span-2 mb-4">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Chủng tộc:', 'Race:') }} <span class="text-red-500">*</span></label>
            <div class="flex flex-col gap-3 mt-2">
              <label v-for="race in ['Da trắng', 'Châu Á', 'Người Mỹ gốc Phi', 'Người Mỹ gốc Ấn hoặc người Alaska bản xứ', 'Người Hawaiian bản xứ hoặc cư dân đảo Thái Bình Dương']" :key="race" class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.chungToc" :value="race" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ td(race) }}</span>
              </label>
            </div>
          </div>

          <div class="form-group md:col-span-2 border-t pt-6">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Địa chỉ nhận thư ở Mỹ:', 'Mailing address in the US:') }} <span class="text-red-500">*</span></label>
            <AddressSelect :street-value="formValues.diaChiNhanThuMyStreet" :city-value="formValues.diaChiNhanThuMyCity" :province-value="formValues.diaChiNhanThuMyProvince" :zip-value="formValues.diaChiNhanThuMyZip" :country-value="formValues.diaChiNhanThuMyCountry" isUs v-model="formValues.diaChiNhanThuMy" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" @parts-change="setAddressParts(formValues, 'diaChiNhanThuMy', $event)" />
          </div>

          <div class="form-group md:col-span-2">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Tình trạng cư trú hiện tại ở Mỹ:', 'Current immigration status in the US:') }} <span class="text-red-500">*</span></label>
            <div class="flex flex-col sm:flex-row gap-6 mt-2">
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tinhTrangCuTruMy" value="Thường trú nhân" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Thường trú nhân', 'Lawful Permanent Resident') }}</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tinhTrangCuTruMy" value="Công dân Mỹ" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Công dân Mỹ', 'US Citizen') }}</span>
              </label>
            </div>
          </div>

          <!-- Thông tin Thẻ xanh -->
          <div v-if="formValues.tinhTrangCuTruMy === 'Thường trú nhân'" class="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group md:col-span-2">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Số thẻ xanh:', 'Green Card Number:') }}</label>
              <input type="text" v-model="formValues.soTheXanh" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
            </div>
            <div class="form-group md:col-span-2">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Nơi cấp:', 'Place of issuance:') }}</label>
              <PlaceBirthSelect noCountry v-model="formValues.noiCapTheXanh" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" @parts-change="setPlaceBirthParts(formValues, 'noiCapTheXanh', $event)" />
            </div>
            <div class="form-group md:col-span-2">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Ngày cấp:', 'Date of issuance:') }}</label>
              <DateSelect v-model="formValues.ngayCapTheXanh" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>
            <div class="form-group">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Có thẻ xanh theo diện con nuôi không?', 'Did you gain permanent resident status through adoption?') }} <span class="text-red-500">*</span></label>
              <div class="flex gap-4">
                <label class="flex items-center cursor-pointer"><input type="radio" v-model="formValues.theXanhDienConNuoi" value="Có" class="w-4 h-4 text-blue-600 focus:ring-blue-500" required><span class="ml-2">{{ td('Có') }}</span></label>
                <label class="flex items-center cursor-pointer"><input type="radio" v-model="formValues.theXanhDienConNuoi" value="Không" class="w-4 h-4 text-blue-600 focus:ring-blue-500" required><span class="ml-2">{{ td('Không') }}</span></label>
              </div>
            </div>
            <div class="form-group">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Có thẻ xanh theo diện kết hôn không?', 'Did you gain permanent resident status through marriage?') }} <span class="text-red-500">*</span></label>
              <div class="flex gap-4">
                <label class="flex items-center cursor-pointer"><input type="radio" v-model="formValues.theXanhDienKetHon" value="Có" class="w-4 h-4 text-blue-600 focus:ring-blue-500" required><span class="ml-2">{{ td('Có') }}</span></label>
                <label class="flex items-center cursor-pointer"><input type="radio" v-model="formValues.theXanhDienKetHon" value="Không" class="w-4 h-4 text-blue-600 focus:ring-blue-500" required><span class="ml-2">{{ td('Không') }}</span></label>
              </div>
            </div>
          </div>

          <!-- Thông đón Quốc tịch -->
          <div v-if="formValues.tinhTrangCuTruMy === 'Công dân Mỹ'" class="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group md:col-span-2">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Có quốc tịch theo diện:', 'Obtained citizenship through:') }} <span class="text-red-500">*</span></label>
              <div class="flex flex-col sm:flex-row gap-4 mt-2">
                <label v-for="type in ['Sinh ở Mỹ', 'Nhập tịch theo cha mẹ', 'Nhập tịch']" :key="type" class="flex items-center cursor-pointer">
                  <input type="radio" v-model="formValues.dienQuocTich" :value="type" class="w-4 h-4 text-blue-600 focus:ring-blue-500" required>
                  <span class="ml-2 text-gray-700">{{ td(type) }}</span>
                </label>
              </div>
            </div>
            <div class="form-group md:col-span-2">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Số chứng nhận trên giấy quốc tịch:', 'Certificate of Citizenship/Naturalization Number:') }} <span class="text-red-500">*</span></label>
              <input type="text" v-model="formValues.soChungNhanQuocTich" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
            </div>
            <div class="form-group md:col-span-2">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Nơi cấp:', 'Place of issuance:') }} <span class="text-red-500">*</span></label>
              <PlaceBirthSelect noCountry v-model="formValues.noiCapQuocTich" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" @parts-change="setPlaceBirthParts(formValues, 'noiCapQuocTich', $event)" />
            </div>
            <div class="form-group md:col-span-2">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Ngày cấp:', 'Date of issuance:') }} <span class="text-red-500">*</span></label>
              <DateSelect v-model="formValues.ngayCapQuocTich" baseClass="w-full flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>
            <div class="form-group md:col-span-2">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Có quốc tịch theo diện con nuôi không?', 'Did you obtain citizenship through adoption?') }} <span class="text-red-500">*</span></label>
              <div class="flex gap-4">
                <label class="flex items-center cursor-pointer"><input type="radio" v-model="formValues.quocTichDienConNuoi" value="Có" class="w-4 h-4 text-blue-600 focus:ring-blue-500" required><span class="ml-2">{{ td('Có') }}</span></label>
                <label class="flex items-center cursor-pointer"><input type="radio" v-model="formValues.quocTichDienConNuoi" value="Không" class="w-4 h-4 text-blue-600 focus:ring-blue-500" required><span class="ml-2">{{ td('Không') }}</span></label>
              </div>
            </div>
          </div>

          <div class="form-group border-t pt-6 mt-4 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="md:col-span-2">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Số SSN:', 'SSN:') }} <span class="text-red-500">*</span></label>
              <input type="text" v-model="formValues.soSsn" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
            </div>
          </div>

        </div>
      </section>

      <!-- ==================== TÀI KHOẢN USCIS & LỊCH SỬ BẢO LÃNH ==================== -->
      <section class="form-section">
        <h3 class="text-xl font-semibold text-blue-700 border-b-2 border-blue-100 pb-2 mb-6 uppercase">{{ t('TÀI KHOẢN USCIS & LỊCH SỬ BẢO LÃNH', 'USCIS ACCOUNT & PETITION HISTORY') }}</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="form-group md:col-span-2">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Đã từng mở tài khoản USCIS online chưa?', 'Have you ever created a USCIS online account?') }} <span class="text-red-500">*</span></label>
            <div class="flex gap-6 mt-2 mb-4">
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tungMoTaiKhoanUscis" value="Có" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Có', 'Yes') }}</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tungMoTaiKhoanUscis" value="Không" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Không', 'No') }}</span>
              </label>
            </div>
            <div v-if="formValues.tungMoTaiKhoanUscis === 'Có'">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Số tài khoản USCIS online:', 'USCIS online account number:') }} <span class="text-red-500">*</span></label>
              <input type="text" v-model="formValues.soTaiKhoanUscis" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
            </div>
          </div>

          <div class="form-group md:col-span-2 border-t pt-4">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Bạn đã từng nộp hồ sơ bảo lãnh nhập cư Mỹ trước đây chưa?', 'Have you ever filed a US immigration petition before?') }} <span class="text-red-500">*</span></label>
            <div class="flex gap-6 mt-2 mb-4">
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tungBaoLanh" value="Có" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Có', 'Yes') }}</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tungBaoLanh" value="Không" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Không', 'No') }}</span>
              </label>
            </div>
            <div v-if="formValues.tungBaoLanh === 'Có'">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Tổng số hồ sơ đã nộp bảo lãnh trước đây:', 'Total number of previously filed petitions:') }} <span class="text-red-500">*</span></label>
              <input type="number" min="0" v-model="formValues.tongSoHoSoBaoLanh" class="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
            </div>
          </div>

          <div class="form-group md:col-span-2 border-t pt-4">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Bạn có đang nộp hồ sơ bảo lãnh nhập cư Mỹ cho ai khác không?', 'Are you currently filing a US immigration petition for anyone else?') }} <span class="text-red-500">*</span></label>
            <div class="flex gap-6 mt-2 mb-4">
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.dangBaoLanhAiKhac" value="Có" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Có', 'Yes') }}</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.dangBaoLanhAiKhac" value="Không" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Không', 'No') }}</span>
              </label>
            </div>
            <div v-if="formValues.dangBaoLanhAiKhac === 'Có'">
              <label class="block text-gray-700 font-medium mb-2">{{ t('Tổng số hồ sơ đang được bảo lãnh:', 'Total number of concurrently filed petitions:') }} <span class="text-red-500">*</span></label>
              <input type="number" min="0" v-model="formValues.tongSoHoSoDangBaoLanh" class="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== LÝ LỊCH TƯ PHÁP ==================== -->
      <section class="form-section">
        <h3 class="text-xl font-semibold text-blue-700 border-b-2 border-blue-100 pb-2 mb-6 uppercase">{{ t('LÝ LỊCH TƯ PHÁP', 'CRIMINAL HISTORY') }}</h3>
        
        <div class="space-y-6">
          <div class="form-group">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Đã từng bị lệnh cách ly tạm thời hoặc vĩnh viễn chưa?', 'Have you ever been subject to a temporary or permanent quarantine/isolation order?') }} <span class="text-red-500">*</span></label>
            <div class="flex gap-6 mt-2">
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tungBiCachLy" value="Có" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Có', 'Yes') }}</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tungBiCachLy" value="Không" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Không', 'No') }}</span>
              </label>
            </div>
          </div>
          <div class="form-group border-t pt-4">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Đã từng bị bắt hoặc nhận án tích trừ tòa án chưa?', 'Have you ever been arrested or convicted by a court?') }} <span class="text-red-500">*</span></label>
            <div class="flex gap-6 mt-2">
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tungBiBat" value="Có" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Có', 'Yes') }}</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="radio" v-model="formValues.tungBiBat" value="Không" class="w-5 h-5 text-blue-600 focus:ring-blue-500" required>
                <span class="ml-2 text-gray-700">{{ t('Không', 'No') }}</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== THÔNG TIN NGƯỜI THÂN ==================== -->
      <section class="form-section">
        <h3 class="text-xl font-semibold text-blue-700 border-b-2 border-blue-100 pb-2 mb-6 uppercase">{{ t('THÔNG TIN NGƯỜI THÂN CỦA NGƯỜI BẢO LÃNH:', 'BENEFICIARY\'S RELATIVES INFORMATION:') }}</h3>
        
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
                  <DateSelect isBirthDate v-model="item.ngaySinh" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Nơi sinh:', 'Place of birth:') }}</label>
                  <PlaceBirthSelect v-model="item.noiSinh" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" @parts-change="setPlaceBirthParts(item, 'noiSinh', $event)" />
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
                  <DateSelect isBirthDate v-model="item.ngaySinh" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm text-gray-600 mb-1">{{ t('Nơi sinh:', 'Place of birth:') }}</label>
                  <PlaceBirthSelect v-model="item.noiSinh" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none" @parts-change="setPlaceBirthParts(item, 'noiSinh', $event)" />
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
                <DateSelect isBirthDate v-model="item.ngaySinh" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">{{ t('Nơi sinh:', 'Place of birth:') }}</label>
                <PlaceBirthSelect v-model="item.noiSinh" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none" @parts-change="setPlaceBirthParts(item, 'noiSinh', $event)" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">{{ t('Ngày kết hôn hiện tại:', 'Date of current marriage:') }}</label>
                <DateSelect v-model="item.ngayKetHon" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div></div>
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">{{ t('Nơi kết hôn:', 'Place of marriage:') }}</label>
                <PlaceBirthSelect v-model="item.noiKetHon" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" @parts-change="setPlaceBirthParts(item, 'noiKetHon', $event)" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600 mb-1">{{ t('Địa chỉ cả hai sống chung gần đây nhất:', 'Last address lived together:') }}</label>
                <AddressSelect :street-value="item.diaChiSongChungStreet" :city-value="item.diaChiSongChungCity" :province-value="item.diaChiSongChungProvince" :zip-value="item.diaChiSongChungZip" :country-value="item.diaChiSongChungCountry" v-model="item.diaChiSongChung" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none" @parts-change="setAddressParts(item, 'diaChiSongChung', $event)" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">{{ t('Ngày bắt đầu sống chung:', 'Date started living together:') }}</label>
                <DateSelect v-model="item.ngayBatDauSongChung" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">{{ t('Ngày kết thúc sống chung:', 'Date stopped living together:') }}</label>
                <DateSelect v-model="item.ngayKetThucSongChung" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
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
              <DateSelect v-model="item.ngayLyHon" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
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
              <DateSelect v-model="item.ngayMat" baseClass="w-full flex-1 px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
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

      <!-- ==================== SECTION BENEFICIARY MATCHING FOR I-130 ==================== -->
      <section class="form-section">
        <h3 class="text-xl font-semibold text-blue-700 border-b-2 border-blue-100 pb-2 mb-6 uppercase">{{ t('THÔNG TIN NGƯỜI ĐƯỢC BẢO LÃNH:', 'BENEFICIARY INFORMATION:') }}</h3>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-5 mb-5">
          <p class="text-sm text-yellow-900 leading-relaxed">
            {{ t('Thông tin này dùng để đối chiếu và tự ghép đúng hồ sơ Người được bảo lãnh trong phiếu kiểm tra I-130. Vui lòng nhập đúng họ tên, ngày sinh và số điện thoại của người bạn đang bảo lãnh.', 'This information is used to match the correct beneficiary record in the I-130 review. Please enter the exact full name, date of birth, and phone number of the person you are petitioning for.') }}
          </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="form-group md:col-span-3">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Bạn bảo lãnh cho ai? Họ và tên:', 'Who are you petitioning for? Full name:') }} <span class="text-red-500">*</span></label>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Họ', 'Family name') }}</label>
                <input type="text" v-model="formValues.beneficiaryExpectedName_ho" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
              </div>
              <div>
                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên lót', 'Middle name') }}</label>
                <input type="text" v-model="formValues.beneficiaryExpectedName_tenLot" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
              </div>
              <div>
                <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">{{ t('Tên', 'Given name') }}</label>
                <input type="text" v-model="formValues.beneficiaryExpectedName_ten" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
              </div>
            </div>
          </div>
          <div class="form-group md:col-span-1">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Ngày tháng năm sinh:', 'Date of birth:') }} <span class="text-red-500">*</span></label>
            <DateSelect v-model="formValues.beneficiaryExpectedDob" @update:modelValue="formValues.nguoiDuocBaoLanhDuKien.ngaySinh = formValues.beneficiaryExpectedDob" baseClass="w-full flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
          </div>
          <div class="form-group md:col-span-1">
            <label class="block text-gray-700 font-medium mb-2">{{ t('Số điện thoại:', 'Phone number:') }} <span class="text-red-500">*</span></label>
            <input type="text" v-model="formValues.beneficiaryExpectedPhone" @input="formValues.nguoiDuocBaoLanhDuKien.soDienThoai = formValues.beneficiaryExpectedPhone" :placeholder="t('Nhập số điện thoại người được bảo lãnh', 'Enter beneficiary phone number')" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" required>
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
