import { NextRequest, NextResponse } from 'next/server'
import { dbOperations } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const model = searchParams.get('model') || undefined
    const status = searchParams.get('status') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const filters = {
      startDate,
      endDate,
      model,
      status,
      limit,
    }

    const requests = dbOperations.getRequests(filters)
    const stats = dbOperations.getStats(filters)
    const timeSeries = dbOperations.getTimeSeries({
      startDate,
      endDate,
      model,
      interval: 'hour',
    })
    const modelDistribution = dbOperations.getModelDistribution({
      startDate,
      endDate,
    })

    return NextResponse.json({
      requests,
      stats,
      timeSeries,
      modelDistribution,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get metrics' },
      { status: 500 }
    )
  }
}

