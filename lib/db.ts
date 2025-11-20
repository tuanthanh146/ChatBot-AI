import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPath = path.join(process.cwd(), 'data', 'metrics.db')
const dbDir = path.dirname(dbPath)

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const db = new Database(dbPath)

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT UNIQUE NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    streaming_duration_ms INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'success',
    error_message TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_timestamp ON requests(timestamp);
  CREATE INDEX IF NOT EXISTS idx_model ON requests(model);
  CREATE INDEX IF NOT EXISTS idx_request_id ON requests(request_id);
`)

export interface RequestMetric {
  id?: number
  request_id: string
  model: string
  input_tokens: number
  output_tokens: number
  response_time_ms: number
  streaming_duration_ms?: number
  timestamp?: string
  status?: string
  error_message?: string
}

export const dbOperations = {
  insertRequest: (metric: RequestMetric) => {
    const stmt = db.prepare(`
      INSERT INTO requests (
        request_id, model, input_tokens, output_tokens,
        response_time_ms, streaming_duration_ms, status, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(
      metric.request_id,
      metric.model,
      metric.input_tokens,
      metric.output_tokens,
      metric.response_time_ms,
      metric.streaming_duration_ms || null,
      metric.status || 'success',
      metric.error_message || null
    )
  },

  getRequests: (filters?: {
    startDate?: string
    endDate?: string
    model?: string
    status?: string
    limit?: number
  }) => {
    let query = 'SELECT * FROM requests WHERE 1=1'
    const params: any[] = []

    if (filters?.startDate) {
      query += ' AND timestamp >= ?'
      params.push(filters.startDate)
    }
    if (filters?.endDate) {
      query += ' AND timestamp <= ?'
      params.push(filters.endDate)
    }
    if (filters?.model) {
      query += ' AND model = ?'
      params.push(filters.model)
    }
    if (filters?.status) {
      query += ' AND status = ?'
      params.push(filters.status)
    }

    query += ' ORDER BY timestamp DESC'
    
    if (filters?.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
    }

    const stmt = db.prepare(query)
    return stmt.all(...params) as RequestMetric[]
  },

  getStats: (filters?: {
    startDate?: string
    endDate?: string
    model?: string
  }) => {
    let query = `
      SELECT 
        COUNT(*) as total_requests,
        AVG(response_time_ms) as avg_response_time,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(output_tokens) * 1000.0 / SUM(response_time_ms) as avg_throughput,
        COUNT(CASE WHEN status != 'success' THEN 1 END) as error_count
      FROM requests
      WHERE 1=1
    `
    const params: any[] = []

    if (filters?.startDate) {
      query += ' AND timestamp >= ?'
      params.push(filters.startDate)
    }
    if (filters?.endDate) {
      query += ' AND timestamp <= ?'
      params.push(filters.endDate)
    }
    if (filters?.model) {
      query += ' AND model = ?'
      params.push(filters.model)
    }

    const stmt = db.prepare(query)
    return stmt.get(...params) as {
      total_requests: number
      avg_response_time: number
      total_input_tokens: number
      total_output_tokens: number
      avg_throughput: number
      error_count: number
    }
  },

  getTimeSeries: (filters?: {
    startDate?: string
    endDate?: string
    model?: string
    interval?: 'hour' | 'day'
  }) => {
    const interval = filters?.interval || 'hour'
    const dateFormat = interval === 'hour' 
      ? "strftime('%Y-%m-%d %H:00:00', timestamp)" 
      : "date(timestamp)"

    let query = `
      SELECT 
        ${dateFormat} as time_bucket,
        COUNT(*) as request_count,
        AVG(response_time_ms) as avg_response_time,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens
      FROM requests
      WHERE 1=1
    `
    const params: any[] = []

    if (filters?.startDate) {
      query += ' AND timestamp >= ?'
      params.push(filters.startDate)
    }
    if (filters?.endDate) {
      query += ' AND timestamp <= ?'
      params.push(filters.endDate)
    }
    if (filters?.model) {
      query += ' AND model = ?'
      params.push(filters.model)
    }

    query += ` GROUP BY time_bucket ORDER BY time_bucket`

    const stmt = db.prepare(query)
    return stmt.all(...params) as Array<{
      time_bucket: string
      request_count: number
      avg_response_time: number
      input_tokens: number
      output_tokens: number
    }>
  },

  getModelDistribution: (filters?: {
    startDate?: string
    endDate?: string
  }) => {
    let query = `
      SELECT 
        model,
        COUNT(*) as count,
        SUM(input_tokens + output_tokens) as total_tokens
      FROM requests
      WHERE 1=1
    `
    const params: any[] = []

    if (filters?.startDate) {
      query += ' AND timestamp >= ?'
      params.push(filters.startDate)
    }
    if (filters?.endDate) {
      query += ' AND timestamp <= ?'
      params.push(filters.endDate)
    }

    query += ' GROUP BY model ORDER BY count DESC'

    const stmt = db.prepare(query)
    return stmt.all(...params) as Array<{
      model: string
      count: number
      total_tokens: number
    }>
  },
}

export default db

