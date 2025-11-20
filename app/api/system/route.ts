import { NextResponse } from 'next/server'
import { getSystemInfo } from '@/lib/ollama'
import { metricsCollector } from '@/lib/metrics'
import { dbOperations } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const systemInfo = await getSystemInfo()
    const activeRequests = metricsCollector.getActiveRequestCount()

    // Get recent stats (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const recentStats = dbOperations.getStats({
      startDate: oneHourAgo,
    })

    return NextResponse.json({
      ...systemInfo,
      queue: {
        active_requests: activeRequests,
        pending: 0, // Could be enhanced with actual queue tracking
      },
      metrics: {
        recent_requests: recentStats.total_requests || 0,
        avg_response_time: recentStats.avg_response_time || 0,
        avg_throughput: recentStats.avg_throughput || 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get system info' },
      { status: 500 }
    )
  }
}

