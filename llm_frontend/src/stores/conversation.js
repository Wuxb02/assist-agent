import { defineStore } from 'pinia'
import { conversationService } from '../services/conversation'

export const useConversationStore = defineStore('conversation', {
  state: () => ({
    currentConversationId: null,
    isNewConversation: true,
    conversations: [],
    currentMessages: []
  }),
  actions: {
    // 创建新会话并刷新列表
    async createNewConversation() {
      this.currentConversationId = await conversationService.createConversation()
      this.isNewConversation = false
      await this.loadUserConversations()
      return this.currentConversationId
    },
    // 加载当前用户会话列表
    async loadUserConversations() {
      const userId = localStorage.getItem('user_id')
      if (!userId) throw new Error('No user ID found')
      this.conversations = await conversationService.getUserConversations(userId)
    },
    // 加载指定会话的消息历史
    async loadConversationMessages(id) {
      this.currentConversationId = id
      this.isNewConversation = false
      this.currentMessages = await conversationService.getConversationMessages(id)
    },
    resetConversation() {
      this.currentConversationId = null
      this.isNewConversation = true
      this.currentMessages = []
    }
  }
})
