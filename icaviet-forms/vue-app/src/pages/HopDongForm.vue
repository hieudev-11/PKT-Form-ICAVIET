<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useFormApi } from '@/composables/useFormApi'

const { submitForm } = useFormApi()

// Locale state
const lang = ref<'vi' | 'en'>('vi')

// Splash screen state removed, handled in App.vue

// Form state
const formValues = reactive<any>({
  hoVaTen: '',
  soDienThoai: '',
  giaTriHopDong: 0,
  ngayKy: new Date().toISOString().split('T')[0],
  signaturePng: ''
})

// Validation state
const errors = reactive({
  hoVaTen: false,
  soDienThoai: false,
  giaTriHopDong: false,
  ngayKy: false,
  signature: false,
  general: ''
})

// Submission state
const isSubmitting = ref(false)
const showSuccessModal = ref(false)
const contractRef = ref('')

// Signature canvas refs
const signatureCanvas = ref<HTMLCanvasElement | null>(null)
let signatureCtx: CanvasRenderingContext2D | null = null
const isDrawing = ref(false)
const hasSig = ref(false)

// Handle language change
const setLang = (l: 'vi' | 'en') => {
  lang.value = l
  try {
    localStorage.setItem('hd_lang', l)
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Initialize on mount
onMounted(() => {
  // Load saved language
  try {
    const sl = localStorage.getItem('hd_lang')
    if (sl === 'vi' || sl === 'en') {
      lang.value = sl
    }
  } catch (e) {
    // Ignore localStorage errors
  }
})

// Initialize signature canvas
const initSignatureCanvas = () => {
  if (signatureCanvas.value) {
    signatureCtx = signatureCanvas.value.getContext('2d') as CanvasRenderingContext2D;
    if(signatureCtx) {
      signatureCtx.strokeStyle = '#0f172a'
      signatureCtx.lineWidth = 2.5
      signatureCtx.lineCap = 'round'
      signatureCtx.lineJoin = 'round'
    }
  }
}

// Call initSignatureCanvas safely with slight delay to ensure render
setTimeout(() => {
  initSignatureCanvas()
}, 100)

// Signature event handlers
const getCanvasPos = (e: MouseEvent | TouchEvent) => {
  if (!signatureCanvas.value) return { x: 0, y: 0 }
  
  const rect = signatureCanvas.value.getBoundingClientRect()
  
  let clientX, clientY
  if (window.TouchEvent && e instanceof TouchEvent) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = (e as MouseEvent).clientX
    clientY = (e as MouseEvent).clientY
  }
  
  return {
    x: (clientX - rect.left) * signatureCanvas.value.width / rect.width,
    y: (clientY - rect.top) * signatureCanvas.value.height / rect.height
  }
}

const startDraw = (e: MouseEvent | TouchEvent) => {
  if (!signatureCtx) return
  if (window.TouchEvent && e instanceof TouchEvent) {
    e.preventDefault()
  }
  
  isDrawing.value = true
  signatureCtx.beginPath()
  const pos = getCanvasPos(e)
  signatureCtx.moveTo(pos.x, pos.y)
}

const moveDraw = (e: MouseEvent | TouchEvent) => {
  if (!isDrawing.value || !signatureCtx) return
  if (window.TouchEvent && e instanceof TouchEvent) {
    e.preventDefault()
  }
  
  const pos = getCanvasPos(e)
  signatureCtx.lineTo(pos.x, pos.y)
  signatureCtx.stroke()
  hasSig.value = true
  errors.signature = false
}

const stopDraw = () => {
  isDrawing.value = false
}

const clearSignature = () => {
  if (signatureCtx && signatureCanvas.value) {
    signatureCtx.clearRect(0, 0, signatureCanvas.value.width, signatureCanvas.value.height)
    hasSig.value = false
    formValues.signaturePng = ''
  }
}

// Validation logic
const validateForm = () => {
  let isValid = true
  errors.general = ''
  
  errors.hoVaTen = false
  errors.soDienThoai = false
  errors.giaTriHopDong = false
  errors.ngayKy = false
  errors.signature = false

  if (!formValues.hoVaTen.trim()) {
    errors.hoVaTen = true
    isValid = false
  }

  if (!formValues.soDienThoai.trim()) {
    errors.soDienThoai = true
    isValid = false
  }

  if (formValues.giaTriHopDong === null || formValues.giaTriHopDong === undefined || formValues.giaTriHopDong < 0) {
    errors.giaTriHopDong = true
    isValid = false
  }

  if (!formValues.ngayKy) {
    errors.ngayKy = true
    isValid = false
  }

  if (!hasSig.value) {
    errors.signature = true
    isValid = false
  }

  if (!isValid) {
    if (!hasSig.value) {
      errors.general = lang.value === 'vi' ? 'Vui lòng ký tên vào ô chữ ký.' : 'Please sign in the signature field.'
    } else {
      errors.general = lang.value === 'vi' ? 'Vui lòng điền đầy đủ tất cả thông tin bắt buộc.' : 'Please complete all required fields.'
    }
    
    const errEl = document.getElementById('hd-err')
    if (errEl) {
      errEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return isValid
}

const getSigDataURL = () => {
  if (!hasSig.value || !signatureCanvas.value) return ''
  try {
    return signatureCanvas.value.toDataURL('image/png')
  } catch (e) {
    return ''
  }
}

// Submit logic
const submit = async () => {
  if (!validateForm()) return

  isSubmitting.value = true
  errors.general = ''

  formValues.signaturePng = getSigDataURL()
  const randomRef = 'HD-' + Math.random().toString(36).substr(2, 8).toUpperCase()
  
  const payload = {
    lang: lang.value,
    hoVaTen: formValues.hoVaTen,
    soDienThoai: formValues.soDienThoai,
    giaTriHopDong: formValues.giaTriHopDong,
    ngayKy: formValues.ngayKy,
    signaturePng: formValues.signaturePng,
    contractRef: randomRef
  }

  try {
    const result = await submitForm('hop-dong', payload)
    if (result && result.success) {
      contractRef.value = randomRef
      showSuccessModal.value = true
      if (lang.value === 'en') setLang('en')
    } else {
      errors.general = (result && result.message) || (lang.value === 'vi' ? 'Có lỗi xảy ra, vui lòng thử lại.' : 'An error occurred, please try again.')
      if (lang.value === 'en') setLang('en')
    }
  } catch (err: any) {
    console.error('Submit error:', err)
    let msg = lang.value === 'vi' ? 'Lỗi kết nối, vui lòng kiểm tra mạng và thử lại.' : 'Connection error. Please check your network and try again.'
    if (err.data && err.data.message) {
      msg = err.data.message
    }
    errors.general = msg
  } finally {
    isSubmitting.value = false
    if (errors.general) {
      const errEl = document.getElementById('hd-err')
      if (errEl) {
        errEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }
}

const closeSuccessModal = () => {
  showSuccessModal.value = false
}
</script>

<template>
  <div class="hd-wrap" id="hd-root">
    
    <!-- ══ NỘI DUNG FORM ══ -->
    <Transition name="fade">
      <div id="hd-main">
        
        <!-- Language toggle -->
        <div class="lang-bar">
          <button class="lang-btn" :class="{ active: lang === 'vi' }" @click="setLang('vi')" type="button">🇻🇳 Tiếng Việt</button>
          <button class="lang-btn" :class="{ active: lang === 'en' }" @click="setLang('en')" type="button">🇺🇸 English</button>
        </div>

        <!-- Form card -->
        <div class="hd-card">
          
          <div class="form-hd">
            <p class="hd-welcome">
              <span v-if="lang === 'vi'">Quý khách Vui lòng dành ít phút đọc các thông tin dưới đây để hiểu rõ cách thức và phạm vi hỗ trợ của ICAVIET:</span>
              <span v-else>Please take a few minutes to read the information below so you can clearly understand ICAVIET’s process and scope of support:</span>
            </p>
          </div>

          <!-- Error banner -->
          <div v-if="errors.general" class="errbanner" id="hd-err" style="display:block;">
            {{ errors.general }}
          </div>

          <form id="hd-form" @submit.prevent="submit" autocomplete="off">
            
            <div class="terms-box">
              <!-- Vietnamese -->
              <div v-if="lang === 'vi'">
                <p><strong>VỀ ICAVIET:</strong></p>
                <p style="margin-top:10px">ICAVIET là công ty tư vấn định cư Mỹ, thuộc ICA Holding Group (thành lập từ 2019). Chúng tôi là quản trị viên của cộng đồng “Luật Di trú & Cuộc sống Mỹ” với hơn 122.000 thành viên.</p>

                <p style="margin-top:16px; font-weight: 700;">ĐIỂM MẠNH CỦA ICAVIET:</p>
                <p style="margin-top:8px">&#9679; Chúng tôi luôn cập nhật những quy định mới nhất của Sở di trú Mỹ, NVC và lãnh sự quán Mỹ.</p>
                <p style="margin-top:6px">&#9679; Đội ngũ chuyên viên tư vấn của ICAVIET có nhiều năm kinh nghiệm, luôn theo sát hồ sơ.</p>
                <p style="margin-top:6px">&#9679; ICAVIET quản lý tiến độ hồ sơ bằng phần mềm chuyên nghiệp, quy trình kiểm soát hồ sơ chặt chẽ qua 2 bước, đảm bảo thông tin hồ sơ bảo lãnh luôn chính xác, đầy đủ.</p>
                <p style="margin-top:6px">&#9679; Có nhân viên đồng hành trực tiếp và hỗ trợ người được bảo lãnh trong quá trình khám sức khỏe và chích ngừa tại Việt Nam</p>
                <p style="margin-top:6px">&#9679; Hỗ trợ luyện phỏng vấn để người được bảo lãnh tự tin tham gia phỏng vấn tại Lãnh sự quán Mỹ.</p>

                <p style="margin-top:16px; font-weight: 700;">LƯU Ý QUAN TRỌNG:</p>
                <p style="margin-top:6px">&#9679; ICAVIET không phải là văn phòng luật sư và không liên kết với bất kì cơ quan nào của chính phủ.</p>
                <p style="margin-top:8px">&#9679; ICAVIET cam kết chuẩn bị hồ sơ chặt chẽ, chuyên nghiệp, giúp tăng tỷ lệ đậu của hồ sơ. Tuy nhiên, <span style="font-weight: 700;">chúng tôi tuyệt đối không nhận các hồ sơ kết hôn chỉ vì mục đích định cư và sẽ ngừng hỗ trợ ngay nếu phát hiện dấu hiệu không trung thực.</span></p>
                <p style="margin-top:6px">&#9679; Trong trường hợp hủy dịch vụ, quy định hoàn phí như sau:</p>
                <p style="margin-top:6px; margin-left: 20px;">&#10148; Tại thời điểm này: hoàn 100% phí hồ sơ (nếu chưa hoàn tất xác nhận)</p>
                <p style="margin-top:6px; margin-left: 20px;">&#10148; Trong 24 giờ kể từ khi gửi xác nhận này: hoàn 70% phí hồ sơ</p>
                <p style="margin-top:6px; margin-left: 20px;">&#10148; Sau thời gian trên, chúng tôi sẽ không hoàn lại phí dịch vụ trong bất kỳ trường hợp nào.</p>
                <p style="margin-top:6px">&#9679; Nếu anh/chị có bất cứ trải nghiệm không hài lòng nào trong quá trình hỗ trợ, vui lòng liên hệ: <a href="mailto:info@icaviet.com" style="color:var(--bl)">info@icaviet.com</a></p>
              </div>

              <!-- English -->
              <div v-else>
                <p><strong>ABOUT ICAVIET:</strong></p>
                <p style="margin-top:10px">ICAVIET is a U.S. immigration case preparation company under ICA Holding Group, established in 2019. We are also the administrators of the “Luật Di trú & Cuộc sống Mỹ” community, which has more than 122,000 members.</p>

                <p style="margin-top:16px; font-weight: 700;">ICAVIET’S STRENGTHS:</p>
                <p style="margin-top:8px">&#9679; We stay up to date with the latest policies from USCIS, the NVC, and U.S. embassies and consulates.</p>
                <p style="margin-top:6px">&#9679; ICAVIET’s consulting team has many years of experience and closely follows each case.</p>
                <p style="margin-top:6px">&#9679; We manage case progress using professional software and a two-step review process to ensure that petition information is always accurate and complete.</p>
                <p style="margin-top:6px">&#9679; Our dedicated staff provide direct support to beneficiaries during the medical exam and vaccination process in Vietnam.</p>
                <p style="margin-top:6px">&#9679; We provide interview preparation support so beneficiaries can attend their interview at the U.S. consulate with confidence.</p>

                <p style="margin-top:16px; font-weight: 700;">IMPORTANT NOTES:</p>
                <p style="margin-top:6px">&#9679; ICAVIET is not a law firm and is not affiliated with any government agency.</p>
                <p style="margin-top:8px">&#9679; ICAVIET is committed to preparing cases carefully and professionally to help improve the chances of approval. However, <span style="font-weight: 700;">we do not accept fraudulent cases or non-genuine marriages for immigration purposes, and we will immediately stop providing support if we find that any information provided is false.</span></p>
                <p style="margin-top:6px">&#9679; In the event of service cancellation, the refund policy is as follows:</p>
                <p style="margin-top:6px; margin-left: 20px;">&#10148; On the date this confirmation is submitted: 100% refund of the case fee (if the confirmation process has not been completed)</p>
                <p style="margin-top:6px; margin-left: 20px;">&#10148; Within 24 hours after this confirmation is submitted: 70% refund of the case fee</p>
                <p style="margin-top:6px; margin-left: 20px;">&#10148; After that period, no service fee will be refunded under any circumstances.</p>
                <p style="margin-top:6px">&#9679; If you experience any dissatisfaction during the support process, please contact: <a href="mailto:info@icaviet.com" style="color:var(--bl)">info@icaviet.com</a></p>
              </div>
            </div>

            <div class="fgrp" :class="{ err: errors.hoVaTen }" style="padding-top: 30px">
              <label>
                <span v-if="lang === 'vi'">Điền họ và tên đầy đủ</span>
                <span v-else>Please Fill in your full name</span>
                <span class="req">*</span>
              </label>
              <input type="text" v-model="formValues.hoVaTen" @input="errors.hoVaTen = false">
              <div v-if="errors.hoVaTen" class="errmsg" style="display:block;">
                <span v-if="lang === 'vi'">Vui lòng nhập họ và tên</span>
                <span v-else>Your full name</span>
              </div>
            </div>

            <div class="fgrp" :class="{ err: errors.soDienThoai }">
              <label>
                <span v-if="lang === 'vi'">Số điện thoại</span>
                <span v-else>Phone number</span>
                <span class="req">*</span>
              </label>
              <input type="tel" v-model="formValues.soDienThoai" @input="errors.soDienThoai = false">
              <div v-if="errors.soDienThoai" class="errmsg" style="display:block;">
                <span v-if="lang === 'vi'">Vui lòng nhập số điện thoại</span>
                <span v-else>Please enter phone number</span>
              </div>
            </div>

            <div class="fgrp" :class="{ err: errors.giaTriHopDong }">
              <label>
                <span v-if="lang === 'vi'">Giá trị hợp đồng</span>
                <span v-else>Contract value</span>
                <span class="req">*</span>
              </label>
              <div class="input-prefix">
                <span>$</span>
                <input type="number" v-model="formValues.giaTriHopDong" min="0" @input="errors.giaTriHopDong = false">
              </div>
            </div>

            <!-- Signature section -->
            <div class="fgrp" style="margin-top:32px">
              <label style="font-size:15px;font-weight:700;color:var(--dk); line-height: 24px;">
                <span v-if="lang === 'vi'">Tôi đã đọc và đồng ý với tất cả những điều trên đây (Ký tên):</span>
                <span v-else>I have read and agreed to all of the above (Sign):</span>
              </label>
              <div class="sig-wrap" :style="errors.signature ? 'border-color: #ef4444' : ''">
                <canvas 
                  ref="signatureCanvas" 
                  width="640" 
                  height="160"
                  @mousedown="startDraw"
                  @mousemove="moveDraw"
                  @mouseup="stopDraw"
                  @mouseleave="stopDraw"
                  @touchstart.prevent="startDraw"
                  @touchmove.prevent="moveDraw"
                  @touchend="stopDraw"
                ></canvas>
                <div class="sig-bar">
                  <span v-if="lang === 'vi'">Chạm để mở khóa / ký tên bằng ngón tay hoặc chuột</span>
                  <span v-else>Tap to unlock / sign with finger or mouse</span>
                  <button type="button" @click="clearSignature">
                    🗑 <span v-if="lang === 'vi'">Xóa</span><span v-else>Clear</span>
                  </button>
                </div>
              </div>
              <div class="hint">
                <span v-if="lang === 'vi'">Chữ ký của bạn sẽ được đưa vào hợp đồng PDF</span>
                <span v-else>Your signature will be included in the PDF contract</span>
              </div>
            </div>

            <div class="fgrp" :class="{ err: errors.ngayKy }">
              <label>
                <span v-if="lang === 'vi'">Ngày Ký</span>
                <span v-else>Date Signed</span>
                <span class="req">*</span>
              </label>
              <input type="date" v-model="formValues.ngayKy" @input="errors.ngayKy = false">
            </div>

            <button type="submit" class="btn-submit" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="spn"></span>
              <span v-else id="btn-text">
                <span v-if="lang === 'vi'">📝 Ký & Gửi xác nhận</span>
                <span v-else>📝 Sign & Submit</span>
              </span>
            </button>

          </form>

        </div><!-- /hd-card -->
      </div><!-- /hd-main -->
    </Transition>

    <!-- ══ SUCCESS MODAL ══ -->
    <Transition name="fade">
      <div v-if="showSuccessModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-icon">🎉</div>
          
          <h2 class="modal-title">
            <span v-if="lang === 'vi'">Gửi thành công!</span>
            <span v-else>Submitted Successfully!</span>
          </h2>
          
          <p class="modal-desc">
            <span v-if="lang === 'vi'">ICAVIET đã nhận được thông tin của bạn. Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.</span>
            <span v-else>ICAVIET has received your information. We will contact you as soon as possible.</span>
          </p>

          <span class="modal-ref">{{ contractRef }}</span>
          <br>
          <button @click="closeSuccessModal" type="button" class="btn-success">
            <span v-if="lang === 'vi'">✓ Đóng</span>
            <span v-else>✓ Close</span>
          </button>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.hd-wrap {
  --bl: #2563eb;
  --bld: #1d4ed8;
  --bll: #eff6ff;
  --dk: #111827;
  --md: #374151;
  --gr: #6b7280;
  --bd: #e5e7eb;
  --lt: #f9fafb;
  --rd: #dc2626;
  --gn: #16a34a;
  --sh: 0 1px 3px rgba(0, 0, 0, .08), 0 8px 32px rgba(0, 0, 0, .06);
  --sh2: 0 4px 24px rgba(37, 99, 235, .18);
  --text: #000;

  font-family: 'Inter', system-ui, sans-serif;
  font-size: 15px;
  color: var(--dk);
  width: 100%;
  max-width: 700px;
  margin: 32px auto;
  line-height: 1.6;
  box-sizing: border-box;
}

.hd-wrap * {
  box-sizing: border-box;
}

/* ── Vue Transitions ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── Vue Transitions ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── Language toggle ── */
.lang-bar {
  display: flex;
  background: #f3f4f6;
  border-radius: 50px;
  padding: 4px;
  width: fit-content;
  margin: 0 auto 28px;
  gap: 2px;
}

.lang-btn {
  padding: 8px 24px;
  border: none;
  background: none;
  border-radius: 50px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  color: var(--gr);
  transition: all .2s;
  font-family: inherit;
}

.lang-btn.active {
  background: #fff;
  color: var(--bl);
  box-shadow: 0 2px 8px rgba(0, 0, 0, .12);
}

/* ── Main card ── */
.hd-card {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, .07);
  border-radius: 20px;
  box-shadow: var(--sh);
  padding: 36px 40px 40px;
}

/* ── Header ── */
.form-hd {
  padding-bottom: 24px;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--bd);
}

.form-hd .hd-welcome {
  font-size: 17px;
  font-weight: 600;
  color: black;
  line-height: 1.6;
  margin: 0;
}

@media(max-width:600px) {
  .hd-card {
    padding: 22px 18px 28px;
  }

  .form-hd {
    padding-bottom: 20px;
    margin-bottom: 20px;
  }

  .form-hd .hd-welcome {
    font-size: 15.5px;
    line-height: 1.5;
  }

  .hd-wrap {
    margin: 16px auto;
  }
}

/* ── Terms box ── */
.terms-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  font-size: 15px;
  color: var(--text);
  line-height: 1.7;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
}

@media(max-width: 480px) {
  .terms-box {
    padding: 14px;
  }
}

/* ── Field groups ── */
.fgrp {
  margin-bottom: 20px;
}

.fgrp > label {
  display: block;
  font-size: 14.5px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 8px;
}

.fgrp label .req {
  color: var(--rd);
  margin-left: 1px;
}

.fgrp input,
.fgrp textarea,
.fgrp select {
  width: 100%;
  padding: 12px 15px;
  border: 1.5px solid var(--bd);
  border-radius: 10px;
  font-size: 14.5px;
  font-family: inherit;
  background: #fff;
  color: var(--dk);
  transition: border-color .15s, box-shadow .15s;
  -webkit-appearance: none;
  appearance: none;
}

.fgrp input::placeholder {
  color: #c4c9d4;
}

.fgrp input:hover,
.fgrp textarea:hover {
  border-color: #d1d5db;
}

.fgrp input:focus,
.fgrp textarea:focus,
.fgrp select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
}

.fgrp.err input,
.fgrp.err textarea {
  border-color: var(--rd);
  box-shadow: 0 0 0 4px rgba(220, 38, 38, .08);
}

.fgrp .errmsg {
  font-size: 12px;
  color: var(--rd);
  margin-top: 5px;
  font-weight: 500;
}

.fgrp .hint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 5px;
  font-style: italic;
}

/* ── $ prefix ── */
.input-prefix {
  position: relative;
}

.input-prefix > span {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
  font-weight: 700;
  color: #9ca3af;
  pointer-events: none;
}

.input-prefix input {
  padding-left: 28px;
}

/* ── Signature ── */
.sig-wrap {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  overflow: hidden;
  margin-top: 6px;
  background: #f8fafc;
  transition: all .2s;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.01);
}

.sig-wrap:hover {
  border-color: #60a5fa;
  background: #fff;
}

.sig-wrap canvas {
  display: block;
  width: 100%;
  max-width: 100%;
  height: 160px;
  cursor: crosshair;
  touch-action: none;
  background: #fff;
}

.sig-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 16px;
  background: #f9fafb;
  border-top: 1px solid var(--bd);
}

.sig-bar span {
  font-size: 12px;
  color: var(--gr);
}

.sig-bar button {
  font-size: 12px;
  padding: 5px 14px;
  border-radius: 7px;
  border: 1.5px solid var(--bd);
  background: #fff;
  cursor: pointer;
  color: var(--md);
  transition: all .15s;
  font-weight: 500;
}

.sig-bar button:hover {
  background: #fef2f2;
  border-color: #fca5a5;
  color: var(--rd);
}

/* ── Submit ── */
.btn-submit {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  font-size: 15.5px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  transition: all .2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: .02em;
  box-shadow: 0 4px 16px rgba(37, 99, 235, .35);
  margin-top: 10px;
  font-family: inherit;
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(37, 99, 235, .45);
}

.btn-submit:active {
  transform: translateY(0);
}

.btn-submit:disabled {
  opacity: .5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.spn {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2.5px solid rgba(255, 255, 255, .3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: sp .7s linear infinite;
}

@keyframes sp {
  to {
    transform: rotate(360deg);
  }
}

/* ── Error banner ── */
.errbanner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 13px 16px;
  color: #b91c1c;
  font-size: 13px;
  margin-bottom: 20px;
  font-weight: 500;
}

/* ── Success Modal ── */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 24, 39, 0.65);
  backdrop-filter: blur(6px);
  padding: 16px;
}

.modal-content {
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3);
  padding: 48px 32px;
  text-align: center;
  width: 100%;
  max-width: 420px;
}

.modal-icon {
  font-size: 64px;
  line-height: 1;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 22px;
  font-weight: 800;
  color: #16a34a;
  margin: 0 0 10px;
}

.modal-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 20px;
  line-height: 1.6;
}

.modal-ref {
  display: inline-block;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 700;
  color: #166534;
  font-family: monospace;
  margin-bottom: 28px;
}

.btn-success {
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 12px 32px;
  font-size: 14.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 4px 14px rgba(22, 163, 74, .35);
  transition: all .2s;
}

.btn-success:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(22, 163, 74, .45);
}
</style>









