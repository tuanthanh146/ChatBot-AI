import { NextRequest } from 'next/server'
import { streamChat } from '@/lib/ollama'
import { metricsCollector } from '@/lib/metrics'
import type { ChatMessage } from '@/lib/metrics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { messages, model = 'gpt-oss:120b-cloud' } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Start metrics collection
    const requestId = metricsCollector.startRequest(messages, model)
    const streamStartTime = Date.now()

    // Create a readable stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = ''
          let firstChunk = true
          let chunkCount = 0

          console.log(`[Chat API] Starting stream for model: ${model}, messages: ${messages.length}`)
          
          // Send start event immediately
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', requestId })}\n\n`))
          
          await streamChat(
            messages as ChatMessage[],
            model,
            (chunk) => {
              if (chunk) {
                chunkCount++
                fullResponse += chunk
                console.log(`[Chat API] Chunk ${chunkCount} received, length: ${chunk.length}, total: ${fullResponse.length}`)
                
                // Send chunk to client
                try {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`))
                } catch (e) {
                  console.error('[Chat API] Failed to enqueue chunk:', e)
                }
              }
            }
          )
          
          console.log(`[Chat API] Stream completed. Chunks: ${chunkCount}, Response length: ${fullResponse.length}`)
          
          // If no response was received, send an error
          if (!fullResponse) {
            console.error('[Chat API] No response received from Ollama')
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'error', error: 'No response received from Ollama. Please check if the model exists and Ollama is running.' })}\n\n`
              )
            )
            controller.close()
            return
          }

          const streamingDuration = Date.now() - streamStartTime

          // End metrics collection
          await metricsCollector.endRequest(
            requestId,
            fullResponse,
            streamingDuration,
            'success'
          )

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', requestId })}\n\n`))
          controller.close()
        } catch (error: any) {
          console.error('[Chat API] Stream error:', error)
          const streamingDuration = Date.now() - streamStartTime
          const errorMessage = error.error?.message || error.message || 'Unknown error'
          
          await metricsCollector.endRequest(
            requestId,
            error.fullResponse || '',
            streamingDuration,
            'error',
            errorMessage
          )

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

