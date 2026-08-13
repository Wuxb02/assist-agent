<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import { useUserStore } from '../stores/user'
import { useConversationStore } from '../stores/conversation'
import { authService } from '../services/auth'
import { conversationService } from '../services/conversation'

const router = useRouter()
const userStore = useUserStore()
const convStore = useConversationStore()

// markdown-it 渲染（breaks/linkify/typographer 与原版一致）
const md = new MarkdownIt({ breaks: true, linkify: true, typographer: true })

// 输入与模式状态
const input = ref('')
const messages = ref([])
const reasonMode = ref(false) // 深度思考
const searchMode = ref(false) // 联网搜索
const knowledgeMode = ref(false) // 知识库问答
const sidebarCollapsed = ref(false)
const searchResults = ref([])
const showSearchPanel = ref(false)
const selectedResult = ref(null)
const userMenuOpen = ref(false)
const uploadedFile = ref(null)
const fileInput = ref(null)

// ---- 工具函数 ----

function scrollToBottom() {
  nextTick(() => {
    const el = document.querySelector('.chat-container')
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  })
}

// 渲染消息内容：处理搜索 loading、思考过程与 markdown
function renderContent(msg) {
  const clean = (text) => text.replace(/\\n/g, '\n').replace(/^"|"$/g, '')
  const sanitize = (html) =>
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '')

  // 搜索中的消息直接渲染其内部 HTML
  if (msg.isSearching) return msg.content

  if (msg.content.includes('💭 **思考过程：**')) {
    const parts = msg.content.split('\n\n')
    const thinkIdx = parts.findIndex((p) => p.includes('💭 **思考过程：**'))
    if (thinkIdx !== -1) {
      const think = parts[thinkIdx]
      const answer = parts[parts.length - 1]
      const thinkHtml = md.render(clean(think)).replace(/<blockquote>/g, '').replace(/<\/blockquote>/g, '')
      const answerHtml = md.render(clean(answer))
      return sanitize(
        `<div class="message-wrapper">` +
          `<div class="thinking-process"><div class="thinking-content"><blockquote>${thinkHtml}</blockquote></div></div>` +
          `<div class="message-text">${answerHtml}</div>` +
          `</div>`
      )
    }
  }

  if (msg.content.includes('search-loading-container')) {
    const idx = msg.content.indexOf('<div class="model-response">')
    if (idx !== -1) {
      const head = msg.content.slice(0, idx)
      const rest = msg.content.slice(idx)
      return sanitize(head + md.render(clean(rest)))
    }
  }

  return sanitize(md.render(clean(msg.content)))
}

// 会话时间格式化
function formatTime(dateStr) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(new Date(dateStr))
}

// 搜索结果来源 favicon（接收 hostname）
function getFavicon(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}`
}

// 文件大小格式化
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileType(name) {
  const n = name.toLowerCase()
  if (n.includes('pdf')) return 'pdf'
  if (n.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) return 'doc'
  if (n.includes('excel') || n.includes('spreadsheet') || n.endsWith('.xls') || n.endsWith('.xlsx')) return 'xls'
  if (n.includes('powerpoint') || n.includes('presentation') || n.endsWith('.ppt') || n.endsWith('.pptx')) return 'ppt'
  if (n.includes('text') || n.endsWith('.txt')) return 'txt'
  if (n.includes('image')) return 'image'
  return 'default'
}

// ---- 消息流处理 ----

function lastAssistant() {
  return messages.value[messages.value.length - 1]
}

// 搜索流式处理：search_start / search_results / direct_answer / direct_content / 内容片段
function handleSearchStream(payload) {
  conversationService.search([{ role: 'user', content: payload }], convStore.currentConversationId, {
    onEvent: (evt) => {
      switch (evt.type) {
        case 'search_start':
          messages.value.push({
            role: 'assistant',
            isSearching: true,
            content:
              `<div class="search-loading-container">` +
              `<div class="search-loading-text">🔍 正在联网检索...</div>` +
              `</div>` +
              `<div class="model-response"></div>`
          })
          break
        case 'search_results':
          searchResults.value = evt.results.map((r) => ({
            ...r,
            date: new Date().toLocaleDateString('zh-CN'),
            source: new URL(r.url).hostname,
            isExpanded: false
          }))
          {
            const last = lastAssistant()
            if (last && last.isSearching) {
              const idx = last.content.indexOf('<div class="model-response">')
              if (idx !== -1) {
                last.content =
                  last.content.slice(0, idx).replace('正在联网检索...', '联网检索完成，点击查看结果') +
                  last.content.slice(idx)
              }
            }
          }
          break
        case 'direct_answer':
          messages.value.push({ role: 'assistant', content: '' })
          break
        case 'direct_content': {
          const last = lastAssistant()
          if (last && last.role === 'assistant') last.content += evt.content
          break
        }
      }
      scrollToBottom()
    },
    onText: (text) => {
      const last = lastAssistant()
      if (last && last.isSearching) {
        const idx = last.content.indexOf('<div class="model-response">')
        if (idx !== -1) {
          const head = last.content.slice(0, idx + 28)
          last.content = head + md.render(text) + '</div>'
        }
      }
      scrollToBottom()
    },
    onError: () => {
      const last = lastAssistant()
      if (last) last.content = '抱歉，搜索时发生了错误，请稍后重试。'
    }
  })
}

// 普通聊天/深度思考流式处理：逐帧累积文本
function handleChatStream(payload) {
  let accumulated = ''
  const method = reasonMode.value ? conversationService.reason : conversationService.chat
  method([{ role: 'user', content: payload }], convStore.currentConversationId, {
    onText: (text) => {
      accumulated += text
      const last = lastAssistant()
      if (last && last.role === 'assistant') last.content = accumulated
      scrollToBottom()
    },
    onError: () => {
      const last = lastAssistant()
      if (last) last.content = '抱歉，发生了错误，请稍后重试。'
    },
    onDone: () => {
      convStore.loadUserConversations().catch(() => {})
    }
  })
}

// 发送消息
function sendMessage() {
  const content = input.value.trim()
  if (!content) return

  messages.value.push({ role: 'user', content })
  input.value = ''

  if (searchMode.value) {
    handleSearchStream(content)
  } else {
    handleChatStream(content)
  }
  scrollToBottom()
}

// ---- 模式切换 ----

function toggleReason() {
  reasonMode.value = !reasonMode.value
  if (reasonMode.value) searchMode.value = false
}

function toggleSearch() {
  searchMode.value = !searchMode.value
  if (!searchMode.value) reasonMode.value = false
}

function toggleKnowledge() {
  knowledgeMode.value = !knowledgeMode.value
}

// ---- 侧边栏与会话 ----

function toggleCollapse() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

async function startNewChat() {
  try {
    await convStore.createNewConversation()
    messages.value = []
    scrollToBottom()
  } catch (e) {
    console.error('Failed to start new chat:', e)
  }
}

async function selectConversation(id) {
  try {
    await convStore.loadConversationMessages(id)
    messages.value = convStore.currentMessages.map((m) => ({
      role: m.sender,
      content: m.content
    }))
  } catch (e) {
    console.error('Failed to load conversation:', e)
  }
}

// ---- 用户菜单 ----

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
}

function handleLogout() {
  authService.logout()
}

function handleOutsideClick(e) {
  if (!e.target.closest('.user-menu')) userMenuOpen.value = false
}

// ---- 文件上传 ----

async function handleFileUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  formData.append('user_id', localStorage.getItem('user_id') || '')
  uploadedFile.value = { name: file.name, size: file.size, type: file.type, status: 'uploading' }
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/upload`, {
      method: 'POST',
      body: formData
    })
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json()
    if (data && data.filename) {
      uploadedFile.value = { name: data.filename, size: data.size, type: data.type, status: 'success' }
    }
  } catch (err) {
    console.error('Upload failed:', err)
    if (uploadedFile.value) uploadedFile.value.status = 'error'
  }
  e.target.value = ''
}

// 点击消息内容：命中搜索 loading 容器且已有结果时打开搜索面板
function handleMessageClick(msg, event) {
  if (event.target.closest('.search-loading-container') && searchResults.value.length > 0) {
    showSearchPanel.value = true
  }
}

function removeUploadedFile() {
  uploadedFile.value = null
}

// ---- 生命周期 ----

onMounted(async () => {
  try {
    const info = await authService.getUserInfo()
    userStore.setUserInfo(info)
    localStorage.setItem('user_id', info.id.toString())
    await convStore.loadUserConversations()
    if (convStore.isNewConversation) await convStore.createNewConversation()
  } catch (e) {
    console.error('Failed to fetch user info:', e)
  }
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})

// 消息变化时自动滚动到底部
watch(messages, scrollToBottom, { deep: true })
</script>

<template>
  <div class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <div class="sidebar-header">
      <div class="logo-wrapper">
        <span class="logo-text"><span class="logo-highlight">AssistGen</span></span>
      </div>
      <button class="collapse-btn" @click="toggleCollapse">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 2L2 8L6 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <div class="chat-history">
      <button class="new-chat-btn" @click="startNewChat">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3.33334V12.6667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          <path d="M12.6667 8L3.33333 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <span> 开启新对话 </span>
      </button>
      <div class="history-list">
        <div
          v-for="conv in convStore.conversations"
          :key="conv.id"
          class="history-item"
          :class="{ active: conv.id === convStore.currentConversationId }"
          @click="selectConversation(conv.id)"
        >
          <div class="history-content">
            <span class="history-title">{{ conv.title }}</span>
            <span class="history-time">{{ formatTime(conv.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="user-section">
      <div class="user-menu" @click.stop="toggleUserMenu">
        <div class="user-avatar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" />
            <circle cx="12" cy="9" r="3" stroke="currentColor" stroke-width="1.5" />
            <path d="M17.9691 20C17.81 17.1085 16.9247 15 12 15C7.07527 15 6.18997 17.1085 6.03087 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>
        <span class="user-text">{{ userStore.username }}</span>
      </div>
      <div v-if="userMenuOpen" class="user-dropdown">
        <div class="menu-item" @click="handleLogout">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path d="M10 11L14 8L10 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path d="M14 8H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <span> 退出登录 </span>
        </div>
      </div>
    </div>
  </div>

  <button v-if="sidebarCollapsed" class="expand-btn" @click="toggleCollapse">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2L14 8L10 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  </button>

  <div class="chat-container">
    <div class="chat-content">
      <!-- 初始欢迎态 -->
      <div v-if="!messages.length && !uploadedFile" class="initial-state">
        <div class="welcome-message">
          <h2>我是 AssistGen, 很高兴见到你!</h2>
          <p>我可以帮你写代码、读文件、写作各种创意内容，请把你的任务交给我吧~</p>
        </div>
        <div class="chat-input">
          <div class="input-wrapper">
            <input v-model="input" type="text" placeholder="给 AssistGen 发送消息" @keyup.enter="sendMessage" />
            <div class="button-group">
              <div class="left-buttons">
                <button class="tool-btn" :class="{ 'tool-btn-active': reasonMode }" @click="toggleReason">
                  <div class="icon">🔄</div><span> 深度思考 </span>
                </button>
                <button class="tool-btn" :class="{ 'tool-btn-active': searchMode }" @click="toggleSearch">
                  <div class="icon">🌐</div><span> {{ searchMode ? '取消搜索' : '联网搜索' }} </span>
                </button>
                <button class="tool-btn" :class="{ 'tool-btn-active': knowledgeMode }" @click="toggleKnowledge">
                  <div class="icon">📚</div><span> 知识库问答 </span>
                </button>
              </div>
              <div class="right-buttons">
                <button class="tool-btn" @click="fileInput?.click()">
                  <div class="icon">📎</div>
                </button>
                <button class="send-btn" :class="{ 'send-btn-active': input.trim() }" :disabled="!input.trim()" @click="sendMessage">
                  <div class="icon">
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M7 16c-.595 0-1.077-.462-1.077-1.032V1.032C5.923.462 6.405 0 7 0s1.077.462 1.077 1.032v13.936C8.077 15.538 7.595 16 7 16z" fill="currentColor" />
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M.315 7.44a1.002 1.002 0 0 1 0-1.46L6.238.302a1.11 1.11 0 0 1 1.523 0c.421.403.421 1.057 0 1.46L1.838 7.44a1.11 1.11 0 0 1-1.523 0z" fill="currentColor" />
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M13.685 7.44a1.11 1.11 0 0 1-1.523 0L6.238 1.762a1.002 1.002 0 0 1 0-1.46 1.11 1.11 0 0 1 1.523 0l5.924 5.678c.42.403.42 1.056 0 1.46z" fill="currentColor" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div class="disclaimer-text">内容由 AI 生成，请仔细甄别</div>
        </div>
      </div>

      <!-- 聊天消息区 -->
      <div v-else class="chat-state">
        <div class="chat-messages">
          <div
            v-for="(msg, index) in messages"
            :key="index"
            class="message"
            :class="msg.role === 'user' ? 'user-message' : 'assistant-message'"
          >
            <div class="message-avatar">
              <svg v-if="msg.role === 'user'" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" />
                <circle cx="12" cy="9" r="3" stroke="currentColor" stroke-width="1.5" />
                <path d="M17.9691 20C17.81 17.1085 16.9247 15 12 15C7.07527 15 6.18997 17.1085 6.03087 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
              <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" fill="#4b4bff" opacity="0.2" />
                <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" stroke="#4b4bff" stroke-width="1.5" />
                <circle cx="12" cy="12" r="3" fill="#4b4bff" opacity="0.2" stroke="#4b4bff" stroke-width="1.5" />
              </svg>
            </div>
            <div class="message-content" @click="handleMessageClick(msg, $event)" v-html="renderContent(msg)"></div>
          </div>
        </div>

        <!-- 输入区：文件卡片 + 输入框 -->
        <div class="chat-input-container">
          <div v-if="uploadedFile" class="file-message" :class="{ error: uploadedFile.status === 'error' }">
            <div class="ds-icon" :data-type="fileType(uploadedFile.name)">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 9C7 6.79086 8.79086 5 11 5L18.6383 5C19.1906 5 19.6383 5.44772 19.6383 6V6.92308C19.6383 9.13222 21.4292 10.9231 23.6383 10.9231H24C24.5523 10.9231 25 11.3708 25 11.9231V23C25 25.2091 23.2091 27 21 27H11C8.79086 27 7 25.2091 7 23V9Z" />
              </svg>
            </div>
            <div class="file-info">
              <div class="file-name">{{ uploadedFile.name }}</div>
              <div class="file-status">
                {{ uploadedFile.status === 'uploading' ? '上传中...' : uploadedFile.status === 'error' ? '上传失败' : formatSize(uploadedFile.size) }}
              </div>
            </div>
            <button class="delete-btn" @click="removeUploadedFile">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path d="M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="chat-input">
            <div class="input-wrapper">
              <input v-model="input" type="text" placeholder="给 AssistGen 发送消息" @keyup.enter="sendMessage" />
              <div class="button-group">
                <div class="left-buttons">
                  <button class="tool-btn" :class="{ 'tool-btn-active': reasonMode }" @click="toggleReason">
                    <div class="icon">🔄</div><span> 深度思考 </span>
                  </button>
                  <button class="tool-btn" :class="{ 'tool-btn-active': searchMode }" @click="toggleSearch">
                    <div class="icon">🌐</div><span> {{ searchMode ? '取消搜索' : '联网搜索' }} </span>
                  </button>
                  <button class="tool-btn" :class="{ 'tool-btn-active': knowledgeMode }" @click="toggleKnowledge">
                    <div class="icon">📚</div><span> 知识库问答 </span>
                  </button>
                </div>
                <div class="right-buttons">
                  <button class="tool-btn" @click="fileInput?.click()">
                    <div class="icon">📎</div>
                  </button>
                  <button class="send-btn" :class="{ 'send-btn-active': input.trim() }" :disabled="!input.trim()" @click="sendMessage">
                    <div class="icon">
                      <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M7 16c-.595 0-1.077-.462-1.077-1.032V1.032C5.923.462 6.405 0 7 0s1.077.462 1.077 1.032v13.936C8.077 15.538 7.595 16 7 16z" fill="currentColor" />
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M.315 7.44a1.002 1.002 0 0 1 0-1.46L6.238.302a1.11 1.11 0 0 1 1.523 0c.421.403.421 1.057 0 1.46L1.838 7.44a1.11 1.11 0 0 1-1.523 0z" fill="currentColor" />
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M13.685 7.44a1.11 1.11 0 0 1-1.523 0L6.238 1.762a1.002 1.002 0 0 1 0-1.46 1.11 1.11 0 0 1 1.523 0l5.924 5.678c.42.403.42 1.056 0 1.46z" fill="currentColor" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>
            <div class="disclaimer-text">内容由 AI 生成，请仔细甄别</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索结果面板 -->
    <div v-if="showSearchPanel" class="search-panel">
      <div class="search-panel-header">
        <h3>搜索结果</h3>
        <button class="close-btn" @click="showSearchPanel = false"><span>×</span></button>
      </div>
      <div class="search-results-list">
        <div v-for="(item, idx) in searchResults" :key="idx" class="search-result-item" :class="{ active: item.isExpanded }">
          <div class="result-header" @click="item.isExpanded = !item.isExpanded">
            <div class="result-source">
              <img :src="getFavicon(item.source)" class="source-icon" />
              <span class="source-name">{{ item.source }}</span>
              <span class="result-date">{{ item.date }}</span>
            </div>
            <div class="result-title">{{ item.title }}</div>
          </div>
          <div v-if="item.isExpanded" class="result-content">
            <div class="result-snippet">{{ item.snippet }}</div>
            <a :href="item.url" target="_blank" class="result-link">查看原文</a>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索结果详情面板 -->
    <div v-if="selectedResult" class="result-detail-panel">
      <div class="detail-header">
        <button class="back-btn" @click="selectedResult = null"><span>←</span></button>
        <h3>{{ selectedResult.title }}</h3>
      </div>
      <div class="detail-content">
        <div class="detail-meta">
          <span class="detail-source">{{ selectedResult.source }}</span>
          <span class="detail-date">{{ selectedResult.date }}</span>
        </div>
        <div class="detail-text">{{ selectedResult.snippet }}</div>
        <a :href="selectedResult.url" target="_blank" class="detail-link">查看原文</a>
      </div>
    </div>
  </div>

  <input ref="fileInput" type="file" style="display: none" @change="handleFileUpload" />
</template>
