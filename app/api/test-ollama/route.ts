import { NextResponse } from 'next/server'
import { checkOllamaConnection } from '@/lib/ollama'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const isConnected = await checkOllamaConnection()
    
    // Try to get available models
    let models: string[] = []
    try {
      const response = await fetch('http://localhost:11434/api/tags')
      if (response.ok) {
        const data = await response.json()
        models = data.models?.map((m: any) => m.name) || []
      }
    } catch (e) {
      console.error('Failed to fetch models:', e)
    }
    
    return NextResponse.json({
      connected: isConnected,
      models,
      message: isConnected 
        ? `Ollama is connected. Available models: ${models.length > 0 ? models.join(', ') : 'none'}`
        : 'Ollama is not connected. Please make sure Ollama is running on http://localhost:11434',
    })
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      error: error.message,
    }, { status: 500 })
  }
}

