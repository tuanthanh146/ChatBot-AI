'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { useChatStore } from '@/store/chat'
import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react'

export function SystemStatus() {
  const { systemStatus, setSystemStatus } = useChatStore()
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      setIsChecking(true)
      try {
        const response = await fetch('/api/system')
        const data = await response.json()
        
        if (data.ollama_connected && data.queue.active_requests < 10) {
          setSystemStatus('ok')
        } else if (data.queue.active_requests >= 10) {
          setSystemStatus('warning')
        } else {
          setSystemStatus('error')
        }
      } catch (error) {
        setSystemStatus('error')
      } finally {
        setIsChecking(false)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [setSystemStatus])

  const statusConfig = {
    ok: {
      label: 'Online',
      icon: CheckCircle2,
      variant: 'default' as const,
      className: 'bg-green-500 hover:bg-green-600',
    },
    warning: {
      label: 'Busy',
      icon: Activity,
      variant: 'secondary' as const,
      className: 'bg-yellow-500 hover:bg-yellow-600',
    },
    error: {
      label: 'Offline',
      icon: AlertCircle,
      variant: 'destructive' as const,
      className: 'bg-red-500 hover:bg-red-600',
    },
  }

  const config = statusConfig[systemStatus]
  const Icon = config.icon

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} text-white flex items-center gap-1`}
    >
      {isChecking ? (
        <Activity className="h-3 w-3 animate-spin" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {config.label}
    </Badge>
  )
}

