import api from './api'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// 解析一条 SSE 的 data 载荷：JSON 字符串时为消息片段，对象时为结构化事件
function parseSseData(data) {
  try {
    return JSON.parse(data)
  } catch (e) {
    return null
  }
}

/**
 * 通用流式请求：fetch + ReadableStream 解析 Server-Sent Events
 * @param {string} url 接口路径
 * @param {object} body 请求体
 * @param {object} handlers 回调：onText(片段)、onEvent(结构化事件)、onError、onDone
 */
async function streamFetch(url, body, handlers) {
  const token = localStorage.getItem('token')
  let res
  try {
    res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    })
  } catch (e) {
    handlers.onError?.(e)
    return
  }
  if (!res.ok) {
    handlers.onError?.(new Error(`HTTP error! status: ${res.status}`))
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const dispatch = (chunk) => {
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      const parsed = parseSseData(payload)
      if (parsed === null) continue
      if (typeof parsed === 'string') {
        handlers.onText?.(parsed)
      } else {
        handlers.onEvent?.(parsed)
      }
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop()
      for (const evt of events) {
        dispatch(evt)
      }
    }
    if (buffer.trim()) dispatch(buffer)
    handlers.onDone?.()
  } catch (e) {
    handlers.onError?.(e)
  }
}

// 组装带用户身份的请求体
function buildBody(messages, conversationId) {
  return {
    messages,
    user_id: localStorage.getItem('user_id'),
    conversation_id: conversationId
  }
}

// 会话相关接口 + 流式聊天/推理/搜索
export const conversationService = {
  // 创建新会话
  async createConversation() {
    const res = await api.post('/api/conversations', {
      user_id: localStorage.getItem('user_id')
    })
    return res.data.conversation_id
  },
  // 获取用户会话列表
  async getUserConversations(userId) {
    const res = await api.get(`/api/conversations/user/${userId}`)
    return res.data
  },
  // 获取会话消息历史
  async getConversationMessages(conversationId) {
    const userId = localStorage.getItem('user_id')
    const res = await api.get(`/api/conversations/${conversationId}/messages?user_id=${userId}`)
    return res.data
  },
  // 流式聊天
  chat(messages, conversationId, handlers) {
    return streamFetch('/api/chat', buildBody(messages, conversationId), handlers)
  },
  // 流式推理（深度思考）
  reason(messages, conversationId, handlers) {
    return streamFetch('/api/reason', buildBody(messages, conversationId), handlers)
  },
  // 流式联网搜索
  search(messages, conversationId, handlers) {
    return streamFetch('/api/search', buildBody(messages, conversationId), handlers)
  }
}
