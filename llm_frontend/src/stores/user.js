import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    username: '',
    email: '',
    // 默认深色主题
    theme: 'dark'
  }),
  actions: {
    setUserInfo(info) {
      this.username = info.username
      this.email = info.email
    },
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', this.theme)
    }
  }
})
