'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface TimeSeriesData {
  time_bucket: string
  request_count: number
  avg_response_time: number
  input_tokens: number
  output_tokens: number
}

interface ModelDistribution {
  model: string
  count: number
  total_tokens: number
}

interface MetricsChartsProps {
  timeSeries: TimeSeriesData[]
  modelDistribution: ModelDistribution[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export function MetricsCharts({ timeSeries, modelDistribution }: MetricsChartsProps) {
  const chartData = timeSeries.map((item) => ({
    time: new Date(item.time_bucket).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    responseTime: Math.round(item.avg_response_time),
    requests: item.request_count,
  }))

  const tokenData = timeSeries.map((item) => ({
    time: new Date(item.time_bucket).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    input: item.input_tokens,
    output: item.output_tokens,
  }))

  const pieData = modelDistribution.map((item) => ({
    name: item.model,
    value: item.count,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Response Time Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="responseTime"
                stroke="#8884d8"
                name="Response Time (ms)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Token Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tokenData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="input" fill="#0088FE" name="Input Tokens" />
              <Bar dataKey="output" fill="#00C49F" name="Output Tokens" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Model Usage Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

