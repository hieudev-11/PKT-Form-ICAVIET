import { createApp } from 'vue'
import App from './App.vue'
import './assets/tailwind.css'

console.log('[ICAVIET Forms] Initializing Vue app...')

// Mount Vue app vào div được WordPress tạo
const mountEl = document.getElementById('icaviet-form-app')
if (mountEl) {
  console.log('[ICAVIET Forms] Found mount element. Mounting app...')
  const app = createApp(App)
  app.mount(mountEl)
} else {
  console.error('[ICAVIET Forms] Error: Could not find element with id "icaviet-form-app".')
}
