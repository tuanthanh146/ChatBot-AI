import { create } from 'zustand'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  responseTime?: number
  tokensPerSecond?: number
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

interface ChatStore {
  sessions: ChatSession[]
  currentSessionId: string | null
  isLoading: boolean
  systemStatus: 'ok' | 'warning' | 'error'
  createSession: () => string
  deleteSession: (id: string) => void
  setCurrentSession: (id: string) => void
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>, messageId?: string) => string
  updateMessage: (sessionId: string, messageId: string, content: string) => void
  updateMessageMetrics: (sessionId: string, messageId: string, metrics: { responseTime?: number; tokensPerSecond?: number }) => void
  setLoading: (loading: boolean) => void
  setSystemStatus: (status: 'ok' | 'warning' | 'error') => void
  updateSessionTitle: (sessionId: string, title: string) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  isLoading: false,
  systemStatus: 'ok',

  createSession: () => {
    const id = `session-${Date.now()}`
    const newSession: ChatSession = {
      id,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    set((state) => ({
      sessions: [newSession, ...state.sessions],
      currentSessionId: id,
    }))
    return id
  },

  deleteSession: (id) => {
    set((state) => {
      const newSessions = state.sessions.filter((s) => s.id !== id)
      const newCurrentId =
        state.currentSessionId === id
          ? newSessions.length > 0
            ? newSessions[0].id
            : null
          : state.currentSessionId
      return {
        sessions: newSessions,
        currentSessionId: newCurrentId,
      }
    })
  },

  setCurrentSession: (id) => {
    set({ currentSessionId: id })
  },

  addMessage: (sessionId, message, messageId?: string) => {
    const newMessage: Message = {
      ...message,
      id: messageId || `msg-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    }
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages, newMessage],
              updatedAt: new Date(),
            }
          : session
      ),
    }))
    return newMessage.id
  },

  updateMessage: (sessionId, messageId, content) => {
    set((state) => {
      const session = state.sessions.find(s => s.id === sessionId)
      if (!session) {
        console.warn('Session not found:', sessionId)
        return state
      }
      
      const message = session.messages.find(m => m.id === messageId)
      if (!message) {
        console.warn('Message not found:', messageId, 'in session:', sessionId)
        return state
      }
      
      return {
        sessions: state.sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                messages: session.messages.map((msg) =>
                  msg.id === messageId ? { ...msg, content } : msg
                ),
                updatedAt: new Date(),
              }
            : session
        ),
      }
    })
  },

  updateMessageMetrics: (sessionId, messageId, metrics) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: session.messages.map((msg) =>
                msg.id === messageId ? { ...msg, ...metrics } : msg
              ),
              updatedAt: new Date(),
            }
          : session
      ),
    }))
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  setSystemStatus: (status) => {
    set({ systemStatus: status })
  },

  updateSessionTitle: (sessionId, title) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, title, updatedAt: new Date() } : session
      ),
    }))
  },
}))

