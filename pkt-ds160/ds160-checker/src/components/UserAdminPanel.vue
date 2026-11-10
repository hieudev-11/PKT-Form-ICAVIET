<template>
  <div class="user-admin-page">
    <div class="user-admin-card">
      <div class="user-admin-header">
        <div>
          <div class="eyebrow">Dành riêng cho tài khoản ittest</div>
          <h1>Tạo tài khoản nhân viên</h1>
          <p>
            Tài khoản tạo ở đây dùng để đăng nhập thẳng vào phiếu kiểm tra, không cần có trên WordPress.
            Nhân viên <b>ICAVIET</b> nhận quyền <b>điền đơn</b>, nhân viên <b>KSCL</b> nhận quyền <b>kiểm tra</b>.
          </p>
        </div>
        <button class="btn-primary" :disabled="listLoading" @click="loadAccounts">
          {{ listLoading ? 'Đang tải...' : 'Tải lại danh sách' }}
        </button>
      </div>

      <form class="create-form" @submit.prevent="submitForm">
        <label>
          Họ tên
          <input v-model.trim="form.name" placeholder="VD: Nguyễn Văn A" :disabled="saving" />
        </label>
        <label>
          Username
          <input v-model.trim="form.username" placeholder="VD: nguyenvana" autocomplete="off" :disabled="saving" />
        </label>
        <label>
          Mật khẩu
          <div class="password-field">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Tối thiểu 6 ký tự"
              autocomplete="new-password"
              :disabled="saving"
            />
            <button type="button" class="toggle-password" @click="showPassword = !showPassword">
              {{ showPassword ? 'Ẩn' : 'Hiện' }}
            </button>
          </div>
        </label>
        <label>
          Phòng ban
          <select v-model="form.phongBan" :disabled="saving" @change="syncRoleWithDepartment">
            <option value="ICAVIET">ICAVIET (điền đơn)</option>
            <option value="KSCL">KSCL (kiểm tra)</option>
          </select>
        </label>
        <label>
          Quyền
          <select v-model="form.role" :disabled="saving">
            <option value="filler">filler — điền đơn</option>
            <option value="reviewer">reviewer — kiểm tra</option>
          </select>
        </label>

        <label class="checkbox-label">
          Quyền comment
          <span class="checkbox-row">
            <input type="checkbox" v-model="form.canComment" :disabled="saving" />
            <span>Được comment trên phiếu đã kiểm tra</span>
          </span>
        </label>

        <div class="form-actions">
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Đang tạo...' : '＋ Tạo tài khoản' }}
          </button>
          <button type="button" class="btn-ghost" :disabled="saving" @click="resetForm">Xóa form</button>
          <span v-if="message" :class="['form-message', messageType]">{{ message }}</span>
        </div>
      </form>

      <div class="list-header">
        <h2>Tài khoản đang có ({{ accounts.length }})</h2>
        <span class="list-hint">
          Tài khoản có id từ {{ PKT_LOCAL_ID_START }} trở lên là tài khoản tạo trong PKT.
          Đang có <b>{{ commentAccountCount }}</b> tài khoản được comment.
        </span>
      </div>

      <p v-if="listError" class="form-message error">{{ listError }}</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Họ tên</th>
              <th>Phòng ban</th>
              <th>Quyền</th>
              <th>Comment</th>
              <th>Nguồn</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!accounts.length && !listLoading">
              <td colspan="7" class="empty">Chưa tải được danh sách tài khoản.</td>
            </tr>
            <tr v-for="account in accounts" :key="account.id" :class="{ 'row-new': account.id === lastCreatedId }">
              <td>{{ account.id }}</td>
              <td><b>{{ account.username }}</b></td>
              <td>{{ account.name }}</td>
              <td>{{ account.phong_ban || '—' }}</td>
              <td>{{ account.role || '—' }}</td>
              <td>
                <label class="switch">
                  <input
                    type="checkbox"
                    :checked="Number(account.can_comment) === 1"
                    :disabled="togglingId === account.id"
                    @change="toggleComment(account, $event.target.checked)"
                  />
                  <span>{{ Number(account.can_comment) === 1 ? 'Được comment' : 'Không' }}</span>
                </label>
              </td>
              <td>
                <span :class="['source-tag', isLocalAccount(account) ? 'local' : 'wp']">
                  {{ isLocalAccount(account) ? 'PKT' : 'WordPress' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import * as api from '../api/index.js'

// Phải khớp PKT_LOCAL_ID_START bên routes/auth.js — chỉ dùng để gắn nhãn nguồn tài khoản.
const PKT_LOCAL_ID_START = 900000

const props = defineProps({
  currentUser: Object
})

const accounts = ref([])
const listLoading = ref(false)
const listError = ref('')
const saving = ref(false)
const showPassword = ref(false)
const message = ref('')
const messageType = ref('success')
const lastCreatedId = ref(null)

const togglingId = ref(null)

const form = reactive({
  name: '',
  username: '',
  password: '',
  phongBan: 'ICAVIET',
  role: 'filler',
  canComment: false
})

const commentAccountCount = computed(
  () => accounts.value.filter(account => Number(account.can_comment) === 1).length
)

function isLocalAccount(account) {
  return Number(account?.id) >= PKT_LOCAL_ID_START
}

// Phòng ban và quyền trong sync_users.js luôn đi theo cặp, nên đổi phòng ban thì
// gợi ý luôn quyền tương ứng. Người dùng vẫn đổi lại quyền bằng tay được.
function syncRoleWithDepartment() {
  form.role = form.phongBan === 'KSCL' ? 'reviewer' : 'filler'
}

function resetForm() {
  form.name = ''
  form.username = ''
  form.password = ''
  form.phongBan = 'ICAVIET'
  form.role = 'filler'
  form.canComment = false
  message.value = ''
}

// Bật/tắt cho tài khoản đã có — kể cả tài khoản đồng bộ từ WordPress.
async function toggleComment(account, nextValue) {
  togglingId.value = account.id
  message.value = ''
  try {
    await api.setUserCanComment(props.currentUser?.id, account.id, nextValue)
    account.can_comment = nextValue ? 1 : 0
    message.value = `${nextValue ? 'Đã bật' : 'Đã tắt'} quyền comment cho "${account.username}"`
    messageType.value = 'success'
  } catch (err) {
    message.value = err.message || 'Đổi quyền comment thất bại'
    messageType.value = 'error'
    await loadAccounts()
  } finally {
    togglingId.value = null
  }
}

async function loadAccounts() {
  listLoading.value = true
  listError.value = ''
  try {
    accounts.value = await api.getUserAccounts(props.currentUser?.id)
  } catch (err) {
    listError.value = err.message || 'Không lấy được danh sách tài khoản'
    accounts.value = []
  } finally {
    listLoading.value = false
  }
}

async function submitForm() {
  if (saving.value) return

  message.value = ''
  saving.value = true
  try {
    const result = await api.createUserAccount({
      requesterId: props.currentUser?.id,
      name: form.name,
      username: form.username,
      password: form.password,
      phongBan: form.phongBan,
      role: form.role,
      canComment: form.canComment
    })

    lastCreatedId.value = result?.data?.id ?? null
    message.value = result?.message || 'Đã tạo tài khoản'
    messageType.value = 'success'
    form.name = ''
    form.username = ''
    form.password = ''
    await loadAccounts()
  } catch (err) {
    message.value = err.message || 'Tạo tài khoản thất bại'
    messageType.value = 'error'
  } finally {
    saving.value = false
  }
}

onMounted(loadAccounts)
</script>

<style scoped>
.user-admin-page {
  padding: 24px;
  background: #f3f6fb;
  min-height: 100vh;
  color: #0f172a;
}
.user-admin-card {
  max-width: 1220px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  padding: 22px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, .08);
}
.user-admin-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 18px;
}
.eyebrow {
  display: inline-flex;
  margin-bottom: 8px;
  padding: 5px 10px;
  border-radius: 999px;
  background: #eef3ff;
  color: #133985;
  font-size: 12px;
  font-weight: 700;
}
h1 {
  margin: 0 0 6px;
  font-size: 26px;
  color: #0f172a;
}
p {
  margin: 0;
  color: #64748b;
  line-height: 1.45;
}
.create-form {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin: 20px 0 8px;
}
.create-form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}
.create-form input,
.create-form select {
  padding: 9px 10px;
  border: 1px solid #cbd5f5;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 400;
  color: #0f172a;
  background: #fff;
}
.create-form input:focus,
.create-form select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, .15);
}
.password-field {
  display: flex;
  gap: 6px;
}
.password-field input {
  flex: 1;
  min-width: 0;
}
.toggle-password {
  padding: 0 10px;
  border: 1px solid #cbd5f5;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.toggle-password:hover {
  background: #eef2ff;
}
.checkbox-label {
  justify-content: flex-end;
}
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 10px;
  border: 1px solid #cbd5f5;
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
  font-weight: 400;
  color: #334155;
}
.checkbox-row input {
  width: 15px;
  height: 15px;
  margin: 0;
  cursor: pointer;
}
.switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
}
.switch input {
  width: 15px;
  height: 15px;
  margin: 0;
  cursor: pointer;
}
.form-actions {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.btn-primary {
  padding: 9px 16px;
  border: none;
  border-radius: 8px;
  background: #4f46e5;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.btn-primary:hover:not(:disabled) {
  background: #4338ca;
}
.btn-primary:disabled {
  opacity: .6;
  cursor: not-allowed;
}
.btn-ghost {
  padding: 9px 14px;
  border: 1px solid #cbd5f5;
  border-radius: 8px;
  background: #fff;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.btn-ghost:hover:not(:disabled) {
  background: #f1f5f9;
}
.form-message {
  font-size: 13px;
  font-weight: 700;
}
.form-message.success {
  color: #15803d;
}
.form-message.error {
  color: #dc2626;
}
.list-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  margin: 26px 0 10px;
  padding-top: 18px;
  border-top: 1px solid #e5e7eb;
}
h2 {
  margin: 0;
  font-size: 17px;
  color: #0f172a;
}
.list-hint {
  font-size: 12px;
  color: #94a3b8;
}
.table-wrap {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th {
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}
td {
  padding: 9px 12px;
  border-bottom: 1px solid #f1f5f9;
  color: #0f172a;
}
tbody tr:last-child td {
  border-bottom: none;
}
tbody tr.row-new {
  background: #ecfdf5;
}
td.empty {
  text-align: center;
  color: #94a3b8;
  padding: 20px;
}
.source-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.source-tag.local {
  background: #ecfdf5;
  color: #15803d;
}
.source-tag.wp {
  background: #eff6ff;
  color: #1d4ed8;
}
@media (max-width: 1100px) {
  .create-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .create-form {
    grid-template-columns: 1fr;
  }
}
</style>
