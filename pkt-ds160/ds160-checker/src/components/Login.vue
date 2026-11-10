<template>
  <div class="login-container">
    <div class="login-box">
      <h2>ICAVIET Login</h2>
      <p class="subtitle">Đăng nhập hệ thống Phiếu Kiểm Tra</p>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Tài khoản</label>
          <input type="text" v-model="username" required placeholder="Nhập tài khoản" />
        </div>
        
        <div class="form-group">
          <label>Mật khẩu</label>
          <input type="password" v-model="password" required placeholder="Nhập mật khẩu" />
        </div>

        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? 'Đang đăng nhập...' : 'Đăng Nhập' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import * as api from '../api/index.js'

const emit = defineEmits(['login-success'])

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  loading.value = true
  errorMsg.value = ''
  
  try {
    const res = await api.login(username.value, password.value)
    if (res.success) {
      emit('login-success', res.user)
    } else {
      errorMsg.value = res.message || 'Đăng nhập thất bại'
    }
  } catch (err) {
    errorMsg.value = err.message || 'Lỗi kết nối máy chủ'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--sidebar-bg);
  color: var(--sidebar-text);
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.login-box {
  background: rgba(255,255,255,0.05);
  padding: 40px;
  border-radius: 8px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
}

h2 {
  margin: 0 0 5px 0;
  text-align: center;
  font-size: 24px;
}

.subtitle {
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 8px;
  font-weight: 600;
}

input {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 4px;
  background: rgba(0,0,0,0.2);
  color: #fff;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

input:focus {
  border-color: var(--accent);
}

.login-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  transition: background 0.2s;
}

.login-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-msg {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  padding: 10px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 15px;
  text-align: center;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
</style>
