import type { ChatMessage } from './metrics'
import * as process from 'node:process'
import * as os from 'node:os'

// OLLAMA_BASE_URL: URL của Ollama server
// Khi deploy lên Vercel và dùng Cloudflare tunnel, set biến này trên Vercel
// Ví dụ: OLLAMA_BASE_URL=https://xxx.trycloudflare.com (không có /api/chat ở cuối)
// Cloudflare tunnel sẽ expose localhost:11434, nên URL sẽ là: https://xxx.trycloudflare.com
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const DEFAULT_MODEL = 'gpt-oss:120b-cloud'

export interface OllamaChatRequest {
  model: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
  stream?: boolean
}

export interface OllamaChatResponse {
  model: string
  created_at: string
  message: {
    role: string
    content: string
  }
  done: boolean
}

export async function checkOllamaConnection(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout cho Cloudflare tunnel
    
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    })
    
    clearTimeout(timeoutId)
    return response.ok
  } catch (error: any) {
    console.error('Ollama connection check failed:', error.message)
    return false
  }
}

export async function streamChat(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  onChunk?: (chunk: string) => void
): Promise<{ fullResponse: string; duration: number }> {
  const startTime = Date.now()
  let fullResponse = ''

  try {
    // Tăng timeout cho Cloudflare tunnel (có thể chậm hơn localhost)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 phút timeout
    
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      }),
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Ollama API error:', response.status, response.statusText, errorText)
      
      // Thông báo lỗi rõ ràng hơn cho Cloudflare tunnel
      if (response.status === 404 || response.status === 502 || response.status === 503) {
        throw new Error(`Không thể kết nối đến Ollama server. Kiểm tra Cloudflare tunnel và đảm bảo Ollama đang chạy. (${response.status}: ${response.statusText})`)
      }
      
      throw new Error(`Ollama API error: ${response.statusText} - ${errorText}`)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let hasReceivedData = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        // Process remaining buffer before breaking
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer.trim()) as OllamaChatResponse
            if ((data as any).error) {
              throw new Error((data as any).error)
            }
            if (data.message?.content) {
              fullResponse += data.message.content
              onChunk?.(data.message.content)
              hasReceivedData = true
            }
          } catch (e) {
            // Ignore parsing errors for remaining buffer if we already got data
            if (!hasReceivedData) {
              console.warn('Failed to parse final buffer:', buffer.substring(0, 100))
            }
          }
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue
        
        try {
          const data = JSON.parse(trimmedLine) as OllamaChatResponse
          
          // Handle error response from Ollama
          if ((data as any).error) {
            console.error('Ollama error:', (data as any).error)
            throw new Error((data as any).error)
          }
          
          // Ollama sends content in message.content field
          if (data.message?.content) {
            fullResponse += data.message.content
            onChunk?.(data.message.content)
            hasReceivedData = true
          }
          
          // Check if done - but continue processing in case there are more chunks
          if (data.done) {
            // Don't break here, continue to process any remaining data
          }
        } catch (e: any) {
          // If it's an error message, throw it
          if (e.message && (e.message.includes('error') || e.message.includes('Error'))) {
            throw e
          }
          // Otherwise, skip invalid JSON lines (might be partial data)
          // Only warn if we haven't received any data yet
          if (!hasReceivedData && trimmedLine.length > 0 && !trimmedLine.startsWith('{')) {
            console.warn('Skipping non-JSON line:', trimmedLine.substring(0, 50))
          }
        }
      }
    }
    
    // If we got no data at all, that's an error
    if (!hasReceivedData && !fullResponse) {
      throw new Error('No response content received from Ollama. The model may not be responding.')
    }

    const duration = Date.now() - startTime
    return { fullResponse, duration }
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    // Xử lý lỗi timeout hoặc network
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      throw new Error(`Kết nối timeout. Kiểm tra Cloudflare tunnel và đảm bảo Ollama server đang chạy. (${error.message || 'Request timeout'})`)
    }
    
    // Xử lý lỗi network
    if (error.message?.includes('fetch') || error.message?.includes('network') || error.code === 'ECONNREFUSED') {
      throw new Error(`Không thể kết nối đến Ollama server qua Cloudflare tunnel. Kiểm tra URL: ${OLLAMA_BASE_URL}`)
    }
    
    // Nếu đã có error message, throw nó
    if (error.message) {
      throw error
    }
    
    throw { error, duration, fullResponse }
  }
}

export async function getSystemInfo() {
  try {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    const systemLoad = os.loadavg()

    return {
      ollama_connected: await checkOllamaConnection(),
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      system: {
        load_avg: systemLoad,
        uptime: os.uptime(),
        platform: os.platform(),
        arch: os.arch(),
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Failed to get system info:', error)
    return {
      ollama_connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

