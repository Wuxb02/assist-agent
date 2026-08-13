import api from './api'

// 密码 SHA-256 哈希（hex 小写），与后端 bcrypt + SHA256 验证链路匹配
export async function sha256(text) {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// 认证相关接口
export const authService = {
  // 注册账号（密码先做 SHA-256）
  async register({ username, email, password }) {
    const hashed = await sha256(password)
    const res = await api.post('/api/register', { username, email, password: hashed })
    return res.data
  },
  // 登录（密码先做 SHA-256），返回 { access_token, token_type }
  async login({ email, password }) {
    const hashed = await sha256(password)
    const res = await api.post('/api/token', { email, password: hashed })
    return res.data
  },
  // 退出登录
  logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user_id')
    window.location.href = '/login'
  },
  // 校验 token 是否有效
  async validateToken() {
    try {
      await api.get('/api/validate-token')
      return true
    } catch (e) {
      return false
    }
  },
  // 获取当前用户信息
  async getUserInfo() {
    const res = await api.get('/api/users/me')
    return res.data
  }
}
