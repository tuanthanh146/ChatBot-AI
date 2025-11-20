'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface Request {
  id: number
  request_id: string
  model: string
  input_tokens: number
  output_tokens: number
  response_time_ms: number
  timestamp: string
  status: string
}

interface RequestsTableProps {
  requests: Request[]
}

export function RequestsTable({ requests }: RequestsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Time</th>
                <th className="text-left p-2">Model</th>
                <th className="text-right p-2">Input Tokens</th>
                <th className="text-right p-2">Output Tokens</th>
                <th className="text-right p-2">Response Time</th>
                <th className="text-center p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-muted/50">
                  <td className="p-2">{formatDate(req.timestamp)}</td>
                  <td className="p-2 font-mono text-xs">{req.model}</td>
                  <td className="p-2 text-right">{req.input_tokens.toLocaleString()}</td>
                  <td className="p-2 text-right">{req.output_tokens.toLocaleString()}</td>
                  <td className="p-2 text-right">{formatTime(req.response_time_ms)}</td>
                  <td className="p-2 text-center">
                    <Badge
                      variant={req.status === 'success' ? 'default' : 'destructive'}
                    >
                      {req.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

