import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,        // lang nghe tren moi card mang de may khac trong LAN vao duoc
    port: 5175,
    strictPort: true,  // ket noi cua may khac phai dung dung 5175, khong tu nhay cong
    open: true
  }
})
