import { dbOperations, type RequestMetric } from './db'
import { estimateTokens } from './utils'
import { randomUUID } from 'crypto'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export class MetricsCollector {
  private static instance: MetricsCollector
  private activeRequests: Map<string, { startTime: number; inputTokens: number }> = new Map()

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector()
    }
    return MetricsCollector.instance
  }

  startRequest(messages: ChatMessage[], model: string = 'gpt-oss:120b-cloud'): string {
    const requestId = randomUUID()
    const inputText = messages.map(m => m.content).join(' ')
    const inputTokens = estimateTokens(inputText)

    this.activeRequests.set(requestId, {
      startTime: Date.now(),
      inputTokens,
    })

    return requestId
  }

  async endRequest(
    requestId: string,
    responseText: string,
    streamingDuration?: number,
    status: 'success' | 'error' = 'success',
    errorMessage?: string
  ): Promise<void> {
    const request = this.activeRequests.get(requestId)
    if (!request) {
      console.warn(`Request ${requestId} not found in active requests`)
      return
    }

    const responseTime = Date.now() - request.startTime
    const outputTokens = estimateTokens(responseText)

    const metric: RequestMetric = {
      request_id: requestId,
      model: 'gpt-oss:120b-cloud', // Default model
      input_tokens: request.inputTokens,
      output_tokens: outputTokens,
      response_time_ms: responseTime,
      streaming_duration_ms: streamingDuration,
      status,
      error_message: errorMessage,
    }

    try {
      dbOperations.insertRequest(metric)
    } catch (error) {
      console.error('Failed to save metric:', error)
    }

    this.activeRequests.delete(requestId)
  }

  getActiveRequestCount(): number {
    return this.activeRequests.size
  }
}

export const metricsCollector = MetricsCollector.getInstance()

