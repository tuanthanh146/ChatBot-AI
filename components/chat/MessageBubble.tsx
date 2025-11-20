'use client'

import { Message } from '@/store/chat'
import { CodeBlock } from './CodeBlock'
import { formatTime } from '@/lib/utils'
import { motion } from 'framer-motion'
import { User, Bot } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 p-4 ${
        isUser ? 'bg-background' : 'bg-muted/30'
      }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        {message.content ? (
          <>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <CodeBlock content={message.content} />
            </div>
            {!isUser && (message.responseTime || message.tokensPerSecond) && (
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                {message.responseTime && (
                  <span>Response: {formatTime(message.responseTime)}</span>
                )}
                {message.tokensPerSecond && (
                  <span>Speed: {message.tokensPerSecond.toFixed(1)} tokens/s</span>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-muted-foreground italic">Đang suy nghĩ...</div>
        )}
      </div>
    </motion.div>
  )
}

