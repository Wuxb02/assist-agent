<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useConversationStore } from '../stores/conversation'
import { authService } from '../services/auth'

const router = useRouter()
const userStore = useUserStore()
const convStore = useConversationStore()

const form = ref({ username: '', email: '', password: '', confirmPassword: '' })
const agreed = ref(false)
const error = ref('')
const loading = ref(false)

const USERNAME_RE = /^[A-Za-z0-9_]{4,16}$/
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

async function handleRegister() {
  error.value = ''
  if (!form.value.username) {
    error.value = '请输入用户名'
    return
  }
  if (!USERNAME_RE.test(form.value.username)) {
    error.value = '用户名必须是4-16位字母、数字或下划线'
    return
  }
  if (!form.value.email) {
    error.value = '请输入邮箱'
    return
  }
  if (!/^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(form.value.email)) {
    error.value = '请输入有效的邮箱地址'
    return
  }
  if (!form.value.password) {
    error.value = '请输入密码'
    return
  }
  if (!PASSWORD_RE.test(form.value.password)) {
    error.value = '密码必须包含大小写字母和数字，至少8位'
    return
  }
  if (form.value.password !== form.value.confirmPassword) {
    error.value = '请确认密码'
    return
  }
  if (!agreed.value) {
    error.value = '请先同意用户协议和隐私政策'
    return
  }

  loading.value = true
  try {
    await authService.register({ username: form.value.username, email: form.value.email, password: form.value.password })
    // 注册成功后自动登录并进入主页
    const data = await authService.login({ email: form.value.email, password: form.value.password })
    localStorage.setItem('token', data.access_token)

    const info = await authService.getUserInfo()
    userStore.setUserInfo(info)
    localStorage.setItem('user_id', info.id.toString())

    await convStore.createNewConversation()
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.detail || '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <div class="logo-wrapper">
        <span class="logo">A</span>
        <span class="logo-text">AssistGen<span class="logo-highlight">!</span></span>
      </div>
      <h2 class="login-title">注册账号</h2>
      <p class="disclaimer-text">创建你的 AssistGen 账号</p>

      <form class="form-container" @submit.prevent="handleRegister">
        <div class="input-group">
          <label>用户名</label>
          <input v-model="form.username" type="text" placeholder="请输入用户名（4-16位）" autocomplete="username" />
        </div>
        <div class="input-group">
          <label>邮箱</label>
          <input v-model="form.email" type="email" placeholder="请输入邮箱" autocomplete="email" />
        </div>
        <div class="input-group">
          <label>密码</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="请输入密码（含大小写字母和数字）"
            autocomplete="new-password"
          />
        </div>
        <div class="input-group">
          <label>确认密码</label>
          <input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            autocomplete="new-password"
          />
        </div>
        <label class="agreement">
          <input v-model="agreed" type="checkbox" />
          <span>我已同意 <a href="javascript:void(0)">用户协议</a> 和 <a href="javascript:void(0)">隐私政策</a></span>
        </label>
        <p v-if="error" class="error-message">{{ error }}</p>
        <button class="submit-btn" type="submit" :disabled="loading">
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>

      <p class="register-link">已有账号？<router-link to="/login">返回登录</router-link></p>
    </div>
  </div>
</template>
