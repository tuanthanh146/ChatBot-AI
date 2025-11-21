'use client'

import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '@/store/chat'
import { Sidebar } from '@/components/chat/Sidebar'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { MessageInput } from '@/components/chat/MessageInput'
import { SystemStatus } from '@/components/chat/SystemStatus'
import { Button } from '@/components/ui/button'
import { Moon, Sun, Menu, X, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function ChatPage() {
  const {
    sessions,
    currentSessionId,
    isLoading,
    createSession,
    addMessage,
    updateMessage,
    updateMessageMetrics,
    setLoading,
  } = useChatStore()

  const [darkMode, setDarkMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentMessageIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    if (sessions.length === 0) {
      createSession()
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sessions.find((s) => s.id === currentSessionId)?.messages])

  const currentSession = sessions.find((s) => s.id === currentSessionId)

  const handleSend = async (content: string) => {
    if (!currentSessionId) return
    if (isLoading) return // Prevent multiple simultaneous requests

    const startTime = Date.now()
    setLoading(true)

    // Add user message
    addMessage(currentSessionId, {
      role: 'user',
      content,
    })

    // Create assistant message placeholder with known ID
    const assistantMessageId = `msg-${Date.now()}-${Math.random()}`
    currentMessageIdRef.current = assistantMessageId
    
    // Add empty assistant message with the ID we created
    const messageIdToUse = addMessage(currentSessionId, {
      role: 'assistant',
      content: '',
    }, assistantMessageId)
    
    console.log('Assistant message ID:', messageIdToUse)

    try {
      // Build messages array - exclude empty assistant messages and the one we just added
      const messages = currentSession!.messages
        .filter((m) => m.content.trim() !== '' && m.id !== messageIdToUse)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }))
      
      // Add the new user message
      messages.push({ role: 'user' as const, content })

      // Luôn gọi API route trên Vercel, API route sẽ gọi đến Ollama qua Cloudflare tunnel
      // (Cấu hình OLLAMA_BASE_URL trên Vercel để trỏ đến Cloudflare tunnel URL)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: 'gpt-oss:120b-cloud',
        }),
      })

      if (!response.ok) {
        // Đọc error message từ response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // Nếu không parse được JSON, đọc text
          try {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          } catch (e2) {
            // Giữ nguyên errorMessage mặc định
          }
        }
        throw new Error(errorMessage)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      const decoder = new TextDecoder()
      let fullResponse = ''
      let chunkCount = 0
      let buffer = ''
      let hasReceivedChunk = false
      let timeoutId: NodeJS.Timeout | null = null

      // Set a timeout to detect if stream is stuck
      const timeout = setTimeout(() => {
        if (!hasReceivedChunk && fullResponse === '') {
          console.error('Stream timeout: No data received after 30 seconds')
          updateMessage(
            currentSessionId,
            messageIdToUse,
            'Error: Request timeout. The model may be taking too long to respond or there is a connection issue.'
          )
        }
      }, 30000)

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log('Stream ended. Total chunks:', chunkCount, 'Response length:', fullResponse.length)
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue
            
            // SSE format: "data: {...}\n\n"
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim()
                if (!jsonStr) continue
                
                const data = JSON.parse(jsonStr)
                
                if (data.type === 'chunk' && data.content) {
                  hasReceivedChunk = true
                  fullResponse += data.content
                  chunkCount++
                  
                  // Update message with current full response
                  updateMessage(currentSessionId, messageIdToUse, fullResponse)
                  
                  // Force a re-render by logging (debug)
                  if (chunkCount % 100 === 0) {
                    console.log('Received chunk:', chunkCount, 'Total length:', fullResponse.length)
                  }
                } else if (data.type === 'done') {
                  const responseTime = Date.now() - startTime
                  const tokensPerSecond = fullResponse.length > 0 
                    ? (fullResponse.length / 4) / (responseTime / 1000)
                    : 0

                  // Update message with performance metrics
                  updateMessageMetrics(currentSessionId, messageIdToUse, {
                    responseTime,
                    tokensPerSecond,
                  })
                  console.log('Stream done. Final response length:', fullResponse.length)
                  break
                } else if (data.type === 'error') {
                  throw new Error(data.error || 'Unknown error from server')
                } else if (data.type === 'start') {
                  // Just acknowledge start
                  console.log('Stream started:', data.requestId)
                }
              } catch (e: any) {
                // Log parsing errors for debugging
                console.error('Failed to parse SSE data:', e, 'Line:', line.substring(0, 100))
                // If it's a JSON parse error, continue - might be partial data
                if (!e.message || !e.message.includes('JSON')) {
                  throw e
                }
              }
            } else if (line.trim()) {
              // Log non-SSE lines for debugging
              console.warn('Non-SSE line received:', line.substring(0, 100))
            }
          }
        }
        
        // Process any remaining buffer
        if (buffer.trim() && buffer.startsWith('data: ')) {
          try {
            const jsonStr = buffer.slice(6).trim()
            if (jsonStr) {
              const data = JSON.parse(jsonStr)
              if (data.type === 'chunk' && data.content) {
                fullResponse += data.content
                updateMessage(currentSessionId, messageIdToUse, fullResponse)
              }
            }
          } catch (e) {
            // Ignore parsing errors for remaining buffer
          }
        }
        
        // Clear timeout if we got here
        if (timeoutId) clearTimeout(timeoutId)
        
        // If we got no response at all, show an error
        if (fullResponse === '' && chunkCount === 0) {
          console.error('No response received from stream')
          throw new Error('No response received from server. Please check if Ollama is running and the model exists.')
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
      }
    } catch (error: any) {
      console.error('Chat error:', error)
      const errorMessage = error.message || error.error?.message || 'Failed to get response'
      // Use messageIdToUse if available (it's in the outer scope), otherwise use ref
      const errorMessageId = messageIdToUse || currentMessageIdRef.current || assistantMessageId
      updateMessage(
        currentSessionId,
        errorMessageId,
        `Error: ${errorMessage}`
      )
    } finally {
      setLoading(false)
      currentMessageIdRef.current = null
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          exit={{ x: -300 }}
          className="hidden md:block"
        >
          <Sidebar />
        </motion.div>
      )}

      <div className="flex-1 flex flex-col">
        <header className="border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-xl font-semibold">AI Chatbot</h1>
          </div>
          <div className="flex items-center gap-2">
            <SystemStatus />
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" title="Dashboard">
                <BarChart3 className="h-5 w-5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle theme"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {currentSession?.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">Start a conversation</h2>
                <p>Ask me anything!</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {currentSession?.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <MessageInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  )
}

