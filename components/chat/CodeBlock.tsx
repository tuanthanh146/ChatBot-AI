'use client'

import { useEffect, useState } from 'react'
import { codeToHtml } from 'shiki'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CodeBlockProps {
  content: string
}

export function CodeBlock({ content }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [htmlContent, setHtmlContent] = useState<string>('')

  useEffect(() => {
    const highlightCode = async () => {
      // Detect code blocks in markdown format
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
      const parts: Array<{ type: 'text' | 'code'; lang?: string; code?: string }> = []
      let lastIndex = 0
      let match

      while ((match = codeBlockRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', code: content.slice(lastIndex, match.index) })
        }
        parts.push({
          type: 'code',
          lang: match[1] || 'text',
          code: match[2],
        })
        lastIndex = match.index + match[0].length
      }

      if (lastIndex < content.length) {
        parts.push({ type: 'text', code: content.slice(lastIndex) })
      }

      if (parts.length === 0 || parts.every((p) => p.type === 'text')) {
        setHtmlContent('')
        return
      }

      const htmlParts = await Promise.all(
        parts.map(async (part) => {
          if (part.type === 'text') {
            return part.code?.replace(/\n/g, '<br>') || ''
          } else {
            try {
              const html = await codeToHtml(part.code || '', {
                lang: part.lang || 'text',
                theme: 'github-dark',
              })
              return html
            } catch (error) {
              return `<pre><code>${part.code}</code></pre>`
            }
          }
        })
      )

      setHtmlContent(htmlParts.join(''))
    }

    highlightCode()
  }, [content])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!htmlContent) {
    return (
      <div className="whitespace-pre-wrap break-words">
        {content}
      </div>
    )
  }

  return (
    <div className="relative group">
      <div
        className="overflow-x-auto rounded-lg"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

