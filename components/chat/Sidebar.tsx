'use client'

import { useChatStore } from '@/store/chat'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, MessageSquare } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export function Sidebar() {
  const { sessions, currentSessionId, createSession, deleteSession, setCurrentSession } = useChatStore()

  return (
    <div className="w-64 h-screen bg-muted/30 border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <Button
          onClick={createSession}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence>
          {sessions.map((session) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`mb-2 group relative rounded-lg p-3 cursor-pointer transition-colors ${
                currentSessionId === session.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-accent'
              }`}
              onClick={() => setCurrentSession(session.id)}
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {session.title}
                  </div>
                  <div className={`text-xs mt-1 ${
                    currentSessionId === session.id
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  }`}>
                    {formatDate(session.updatedAt)}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={`absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 ${
                  currentSessionId === session.id
                    ? 'hover:bg-primary-foreground/20'
                    : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  deleteSession(session.id)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

