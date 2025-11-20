import type { ChatMessage } from './metrics'
import * as process from 'node:process'
import * as os from 'node:os'

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
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch (error) {
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
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Ollama API error:', response.status, response.statusText, errorText)
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
  } catch (error) {
    const duration = Date.now() - startTime
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

