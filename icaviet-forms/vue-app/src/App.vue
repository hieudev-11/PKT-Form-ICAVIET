<script setup lang="ts">
import { computed, defineAsyncComponent, ref, onMounted } from 'vue'

// Đọc slug từ WordPress div attribute hoặc config
const config = window.icavietFormsConfig || {
  apiUrl: '/wp-json/ICAVIET/v1',
  nonce: '',
  assetsUrl: '',
  slug: 'n-400'
}

const slug = computed(() => {
  // Ưu tiên đọc từ data attribute trên mount div
  const el = document.getElementById('icaviet-form-app')
  return el?.getAttribute('data-form-slug') || config.slug || 'n-400'
})

// Import form components trực tiếp (vì đã bundle thành 1 file js duy nhất, không cần lazy load nữa)
import N400Form from './pages/N400Form.vue'
import I90Form from './pages/I90Form.vue'
import N600Form from './pages/N600Form.vue'
import HopDongForm from './pages/HopDongForm.vue'
import I751Form from './pages/I751Form.vue'
import DS160Form from './pages/DS160Form.vue'
import DS260Form from './pages/DS260Form.vue'
import BaoLanhForm from './pages/BaoLanhForm.vue'
import NDBLForm from './pages/NDBLForm.vue'

// Splash screen state
const showSplash = ref(true)
const splashLang = ref<'vi' | 'en'>('vi')

onMounted(() => {
  try {
    const sl = localStorage.getItem('hd_lang')
    if (sl === 'vi' || sl === 'en') {
      splashLang.value = sl
    }
  } catch (e) {
    // Ignore
  }
})

const setSplashLang = (l: 'vi' | 'en') => {
  splashLang.value = l
  try {
    localStorage.setItem('hd_lang', l)
  } catch (e) {
    // Ignore
  }
}
</script>

<template>
  <div class="icaviet-forms-root">
    
    <!-- ══ SPLASH SCREEN ══ -->
    <Transition name="fade">
      <div v-if="showSplash" id="hd-splash" class="splash-overlay">
        <div class="splash-box">
          <img src="https://icaviet.com/wp-content/uploads/2025/09/icaviet-png.webp" alt="ICAVIET" class="splash-logo">

          <!-- Language toggle in Splash -->
          <div class="lang-bar" style="margin: 0 auto 24px;">
            <button class="lang-btn" :class="{ active: splashLang === 'vi' }" @click="setSplashLang('vi')" type="button">🇻🇳 Tiếng Việt</button>
            <button class="lang-btn" :class="{ active: splashLang === 'en' }" @click="setSplashLang('en')" type="button">🇺🇸 English</button>
          </div>

          <p class="splash-title">
            <span v-if="splashLang === 'vi'">XÁC NHẬN DỊCH VỤ<br> TƯ VẤN ĐỊNH CƯ</span>
            <span v-else>CONFIRM IMMIGRATION CONSULTING SERVICE</span>
          </p>

          <p class="splash-desc">
            <span v-if="splashLang === 'vi'">ICAVIET xin cảm ơn Quý khách đã tin tưởng lựa chọn dịch vụ của chúng tôi. Trước khi bắt đầu hồ sơ, Quý khách vui lòng dành ít phút để điền thông tin và xác nhận anh/chị đã hiểu về phạm vi dịch vụ của chúng tôi.</span>
            <span v-else>Thank you for choosing ICAVIET. Before starting your petition, please take a moment to provide your information and confirm your understanding of our service scope.</span>
          </p>

          <button class="btn-primary" @click="showSplash = false" type="button">
            <span v-if="splashLang === 'vi'">Bắt đầu xác nhận</span>
            <span v-else>Start Confirmation</span>
          </button>
        </div>
      </div>
    </Transition>

    <div v-show="!showSplash">
      <N400Form v-if="slug === 'n-400'" />
      <I90Form v-else-if="slug === 'i-90'" />
      <N600Form v-else-if="slug === 'n-600'" />
      <HopDongForm v-else-if="slug === 'hop-dong' || slug === 'hop dong'" />
      <I751Form v-else-if="slug === 'i-751'" />
      <DS160Form v-else-if="slug === 'ds-160'" />
      <DS260Form v-else-if="slug === 'ds-260'" />
      <BaoLanhForm v-else-if="slug === 'bao-lanh'" />
      <NDBLForm v-else-if="slug === 'ndbl'" />
      <div v-else class="p-8 text-center text-red-500">
        <p>Form không tồn tại: {{ slug }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Vue Transitions ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── Splash Overlay ── */
.splash-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(17, 24, 39, 0.6);
  backdrop-filter: blur(5px);
  padding: 16px;
  font-family: 'Inter', system-ui, sans-serif;
}

.splash-box {
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3);
  padding: 48px 32px;
  text-align: center;
  width: 100%;
  max-width: 440px;
}

.splash-logo {
  display: block;
  max-width: 190px;
  height: auto;
  margin: 0 auto 20px;
}

.splash-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 12px;
}

.splash-desc {
  font-size: 16px;
  font-weight: 400;
  color: #4b5563;
  margin: 0 0 28px;
  line-height: 1.6;
}

.btn-primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  width: 100%;
  padding: 14px 36px;
  font-size: 15.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all .2s;
  box-shadow: 0 4px 14px rgba(37,99,235,0.35);
}

.btn-primary:hover {
  background: #1d4ed8;
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
  color: #6b7280;
  transition: all .2s;
  font-family: inherit;
}

.lang-btn.active {
  background: #fff;
  color: #2563eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .12);
}

@media (max-width: 440px) {
  .splash-box {
    padding: 32px 20px !important;
  }
  .splash-title {
    font-size: 18px !important;
  }
  .splash-desc {
    font-size: 14px !important;
    margin-bottom: 20px !important;
  }
}
</style>
