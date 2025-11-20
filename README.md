# AI Chatbot - ChatGPT Clone

A complete AI Chatbot web application similar to ChatGPT, built with Next.js 14, featuring a beautiful UI, streaming responses, code highlighting, and a comprehensive performance monitoring dashboard.

## Features

### Core Chat Features
- **ChatGPT-like UI**: Sidebar with chat history, message bubbles, streaming responses
- **Code Highlighting**: Syntax highlighting for code blocks using Shiki
- **Dark/Light Mode**: Toggle between themes
- **Auto-scroll**: Automatically scrolls to latest messages
- **Smooth Animations**: Powered by Framer Motion

### Performance Monitoring
- **Request Metrics**: Track every chat request with detailed metrics
  - Request ID, model name, token counts (input/output)
  - Response time, streaming duration
  - Timestamp and status
- **System Metrics**: Real-time system monitoring
  - Ollama server connection status
  - CPU/Memory usage
  - Active request queue
- **Analytics Dashboard**: Full admin dashboard with
  - KPI cards (avg response time, total requests, throughput, error rate)
  - Interactive charts (line charts, bar charts, pie charts)
  - Request history table
  - Filtering by date range, model, and status

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS, shadcn/ui, Framer Motion
- **Backend**: Next.js API Routes with streaming
- **AI Engine**: Ollama local server
- **Database**: SQLite (better-sqlite3)
- **Charts**: Recharts
- **State Management**: Zustand
- **Code Highlighting**: Shiki

## Prerequisites

1. **Node.js** 18+ installed
2. **Ollama** installed and running
   - Download from: https://ollama.ai
   - Make sure Ollama is running on `http://localhost:11434`

## Installation

### 1. Install Ollama

Download and install Ollama from [https://ollama.ai](https://ollama.ai)

### 2. Pull the Model

```bash
ollama pull gpt-oss:120b-cloud
```

**Note**: If `gpt-oss:120b-cloud` is not available, you can use any available model. Update the default model in:
- `lib/ollama.ts` (DEFAULT_MODEL constant)
- `app/api/chat/route.ts` (default model parameter)

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat/          # Chat API endpoint with streaming
│   │   ├── system/        # System metrics endpoint
│   │   └── metrics/       # Metrics data endpoint
│   ├── chat/              # Chat page
│   ├── dashboard/         # Performance dashboard
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── chat/              # Chat UI components
│   ├── dashboard/         # Dashboard components
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── db.ts              # SQLite database operations
│   ├── metrics.ts         # Metrics collection
│   ├── ollama.ts          # Ollama API integration
│   └── utils.ts           # Utility functions
├── store/
│   └── chat.ts            # Zustand store for chat state
└── data/                   # SQLite database (auto-created)
```

## Usage

### Chat Interface

1. Navigate to `/chat` (default page)
2. Start a new conversation or select an existing one from the sidebar
3. Type your message and press Enter (Shift+Enter for new line)
4. Watch the AI response stream in real-time
5. View response time and tokens/second for each message

### Performance Dashboard

1. Navigate to `/dashboard`
2. View KPI cards with key metrics
3. Explore charts showing:
   - Response time trends over time
   - Token usage (input/output)
   - Model usage distribution
4. Filter data by:
   - Date range
   - Model name
   - Request status
5. View detailed request history in the Requests tab

## API Endpoints

### POST `/api/chat`
Stream chat responses from Ollama.

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "model": "gpt-oss:120b-cloud"
}
```

**Response:** Server-Sent Events (SSE) stream

### GET `/api/system`
Get system metrics and status.

**Response:**
```json
{
  "ollama_connected": true,
  "memory": { ... },
  "cpu": { ... },
  "queue": {
    "active_requests": 0
  },
  "metrics": { ... }
}
```

### GET `/api/metrics`
Get performance metrics with optional filters.

**Query Parameters:**
- `startDate`: ISO date string
- `endDate`: ISO date string
- `model`: Model name
- `status`: Request status (success/error)
- `limit`: Number of requests to return

## Configuration

### Change Ollama URL

Edit `lib/ollama.ts`:
```typescript
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
```

Or set environment variable:
```bash
OLLAMA_BASE_URL=http://your-ollama-server:11434
```

### Change Default Model

Edit `lib/ollama.ts`:
```typescript
const DEFAULT_MODEL = 'your-model-name'
```

## Database

The application uses SQLite to store metrics. The database file is automatically created at `data/metrics.db` on first run.

### Database Schema

```sql
CREATE TABLE requests (
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
```

## Troubleshooting

### Ollama Connection Issues

1. Ensure Ollama is running: `ollama list`
2. Check if the model is available: `ollama list`
3. Verify Ollama is accessible at `http://localhost:11434`

### Model Not Found

If `gpt-oss:120b-cloud` is not available:
1. List available models: `ollama list`
2. Use an available model or pull a different one
3. Update the default model in the code

### Database Errors

If you encounter database errors:
1. Delete the `data/` directory
2. Restart the application (database will be recreated)

## Development

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

