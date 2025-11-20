'use client'

import { useEffect, useState } from 'react'
import { KPICard } from '@/components/dashboard/KPICard'
import { RequestsTable } from '@/components/dashboard/RequestsTable'
import { MetricsCharts } from '@/components/dashboard/MetricsCharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatTime } from '@/lib/utils'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface DashboardData {
  requests: any[]
  stats: {
    total_requests: number
    avg_response_time: number
    total_input_tokens: number
    total_output_tokens: number
    avg_throughput: number
    error_count: number
  }
  timeSeries: any[]
  modelDistribution: any[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    model: '',
    status: '',
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.model) params.append('model', filters.model)
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(`/api/metrics?${params.toString()}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [filters])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const stats = data?.stats || {
    total_requests: 0,
    avg_response_time: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    avg_throughput: 0,
    error_count: 0,
  }

  const errorRate = stats.total_requests > 0
    ? ((stats.error_count / stats.total_requests) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/chat">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          </div>
          <Button onClick={fetchData} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Input
            type="date"
            placeholder="Start Date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <Input
            type="date"
            placeholder="End Date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
          <Select
            value={filters.model}
            onValueChange={(value) => setFilters({ ...filters, model: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Models</SelectItem>
              <SelectItem value="gpt-oss:120b-cloud">gpt-oss:120b-cloud</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Average Response Time"
            value={formatTime(Math.round(stats.avg_response_time || 0))}
            subtitle="Mean response time"
          />
          <KPICard
            title="Total Requests"
            value={stats.total_requests.toLocaleString()}
            subtitle="All time requests"
          />
          <KPICard
            title="Average Throughput"
            value={`${stats.avg_throughput.toFixed(1)} tokens/s`}
            subtitle="Tokens per second"
          />
          <KPICard
            title="Error Rate"
            value={`${errorRate}%`}
            subtitle={`${stats.error_count} errors`}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <KPICard
                  title="Total Input Tokens"
                  value={stats.total_input_tokens.toLocaleString()}
                />
                <KPICard
                  title="Total Output Tokens"
                  value={stats.total_output_tokens.toLocaleString()}
                />
              </div>
              {data?.modelDistribution && data.modelDistribution.length > 0 && (
                <MetricsCharts
                  timeSeries={data.timeSeries || []}
                  modelDistribution={data.modelDistribution}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <RequestsTable requests={data?.requests.slice(0, 50) || []} />
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            {data && (
              <MetricsCharts
                timeSeries={data.timeSeries || []}
                modelDistribution={data.modelDistribution || []}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

