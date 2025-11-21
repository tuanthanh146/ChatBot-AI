import { NextRequest, NextResponse } from 'next/server'
import { streamChat } from '@/lib/ollama'
import { metricsCollector } from '@/lib/metrics'
import type { ChatMessage } from '@/lib/metrics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ✅ FIX 405: Vercel dùng GET để kiểm tra API route
export function GET() {
  console.log('[GET /api/chat] Health check')
  return NextResponse.json(
    { 
      status: 'ok', 
      message: 'Chat API is running',
      methods: ['GET', 'POST', 'OPTIONS']
    },
    { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    }
  )
}

// ✅ FIX 405: CORS preflight
export function OPTIONS() {
  console.log('[OPTIONS /api/chat] CORS preflight')
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export async function POST(req: NextRequest) {
  // Log để debug trên Vercel
  console.log('[POST /api/chat] Request received')
  console.log('[POST /api/chat] Method:', req.method)
  console.log('[POST /api/chat] URL:', req.url)
  
  try {
    // Parse request body với error handling tốt hơn
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    const { messages, model = 'gpt-oss:120b-cloud' } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages: messages must be an array' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    const requestId = metricsCollector.startRequest(messages, model)
    const streamStartTime = Date.now()

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = ''
          let chunkCount = 0

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'start', requestId })}\n\n`
            )
          )

          await streamChat(messages as ChatMessage[], model, (chunk) => {
            if (chunk) {
              chunkCount++
              fullResponse += chunk

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`
                )
              )
            }
          })

          const streamingDuration = Date.now() - streamStartTime

          await metricsCollector.endRequest(
            requestId,
            fullResponse,
            streamingDuration,
            'success'
          )

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'done', requestId })}\n\n`
            )
          )
          controller.close()
        } catch (error: any) {
          const streamingDuration = Date.now() - streamStartTime

          await metricsCollector.endRequest(
            requestId,
            '',
            streamingDuration,
            'error',
            error.message
          )

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error: any) {
    console.error('[POST /api/chat] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
}
