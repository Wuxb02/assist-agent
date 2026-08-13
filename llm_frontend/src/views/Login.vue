<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useConversationStore } from '../stores/conversation'
import { authService } from '../services/auth'

const router = useRouter()
const userStore = useUserStore()
const convStore = useConversationStore()

const form = ref({ email: '', password: '' })
const agreed = ref(false)
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
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
  if (!agreed.value) {
    error.value = '请先同意用户协议和隐私政策'
    return
  }

  loading.value = true
  try {
    const data = await authService.login({ email: form.value.email, password: form.value.password })
    localStorage.setItem('token', data.access_token)

    const info = await authService.getUserInfo()
    userStore.setUserInfo(info)
    localStorage.setItem('user_id', info.id.toString())

    await convStore.createNewConversation()
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.detail === 'Incorrect email or password'
      ? '邮箱或密码错误'
      : (e.response?.data?.detail || '发生错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 微信登录为占位功能（后端未提供对应接口）
function wechatLogin() {
  error.value = '微信登录暂未开放，请使用账号登录'
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <div class="logo-wrapper">
        <span class="logo">A</span>
        <span class="logo-text">AssistGen<span class="logo-highlight">!</span></span>
      </div>
      <h2 class="login-title">账号登录</h2>
      <p class="disclaimer-text">请使用注册的账号登录</p>

      <form class="form-container" @submit.prevent="handleLogin">
        <div class="input-group">
          <label>邮箱</label>
          <input v-model="form.email" type="email" placeholder="请输入邮箱" autocomplete="email" />
        </div>
        <div class="input-group">
          <label>密码</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
        </div>
        <label class="agreement">
          <input v-model="agreed" type="checkbox" />
          <span>我已同意 <a href="javascript:void(0)">用户协议</a> 和 <a href="javascript:void(0)">隐私政策</a></span>
        </label>
        <p v-if="error" class="error-message">{{ error }}</p>
        <button class="submit-btn" type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <div class="divider"><span>其他登录方式</span></div>
      <button class="wechat-btn" type="button" @click="wechatLogin">
        使用微信自动登录
      </button>

      <p class="register-link">还没有账号？<router-link to="/register">立即注册</router-link></p>
    </div>
  </div>
</template>
