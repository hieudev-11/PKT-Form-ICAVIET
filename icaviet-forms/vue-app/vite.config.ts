import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  // Base path - dung ./ de co relative paths trong CSS/JS
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL('../assets/vue-dist', import.meta.url)),
    emptyOutDir: true,
    // Khong tach chunks - gom het vao 1 file JS
    rollupOptions: {
      input: fileURLToPath(new URL('./index.html', import.meta.url)),
      output: {
        // Inline all dynamic imports - khong tach chunk
        inlineDynamicImports: true,
        entryFileNames: 'icaviet-forms.js',
        assetFileNames: (assetInfo) => {
          // Rollup 4 uses 'names' array instead of 'name'
          if (assetInfo.names && assetInfo.names.some(n => n.endsWith('.css'))) {
            return 'icaviet-forms.css'
          }
          return 'assets/[name][extname]'
        },
      },
    },
  },
})
