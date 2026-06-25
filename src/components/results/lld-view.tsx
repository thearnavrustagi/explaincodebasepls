'use client'
import { useEffect, useState } from 'react'
import { MarkdownView } from './markdown-view'

interface Props { content: string }

/**
 * LLD view: renders markdown with syntax-highlighted code blocks via Shiki.
 * Falls back to MarkdownView (which handles plain code fences) if Shiki isn't available.
 */
export function LldView({ content }: Props) {
  const [highlighted, setHighlighted] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    async function highlightAll() {
      try {
        const { codeToHtml } = await import('shiki')
        const blocks = [...content.matchAll(/```(\w*)\n([\s\S]*?)```/g)]
        const map = new Map<string, string>()

        for (const block of blocks) {
          const lang = block[1] || 'text'
          const code = block[2]
          const key  = `${lang}:${code.slice(0, 40)}`
          if (map.has(key)) continue

          try {
            const html = await codeToHtml(code, { lang: lang as any, theme: 'github-dark-dimmed' })
            // Override shiki background to match our surface token
            const patched = html.replace(
              /background-color:[^;"]*/g,
              'background-color:oklch(9% 0.007 55)'
            )
            map.set(key, patched)
          } catch {
            const html = await codeToHtml(code, { lang: 'text', theme: 'github-dark-dimmed' })
            map.set(key, html.replace(/background-color:[^;"]*/g, 'background-color:oklch(9% 0.007 55)'))
          }
        }
        setHighlighted(map)
      } catch {
        // Shiki unavailable — MarkdownView handles plain fences
      }
    }
    highlightAll()
  }, [content])

  if (highlighted.size === 0) {
    // Shiki hasn't loaded yet or failed — render with plain MarkdownView
    return <MarkdownView content={content} />
  }

  // Inject highlighted blocks by replacing plain fences in the rendered output.
  // Strategy: split content on fenced blocks, render prose through MarkdownView,
  // inject pre-highlighted HTML for code.
  const FENCE_RE = /```(\w*)\n([\s\S]*?)```/g
  const parts: Array<{ type: 'prose' | 'code'; value: string; lang?: string; code?: string }> = []
  let last = 0

  for (const match of content.matchAll(FENCE_RE)) {
    if ((match.index ?? 0) > last) {
      parts.push({ type: 'prose', value: content.slice(last, match.index) })
    }
    parts.push({ type: 'code', value: match[0], lang: match[1], code: match[2] })
    last = (match.index ?? 0) + match[0].length
  }
  if (last < content.length) {
    parts.push({ type: 'prose', value: content.slice(last) })
  }

  return (
    <div style={{ maxWidth: '72ch' }}>
      {parts.map((part, i) => {
        if (part.type === 'prose') {
          return part.value.trim() ? <MarkdownView key={i} content={part.value} /> : null
        }
        const key = `${part.lang}:${(part.code ?? '').slice(0, 40)}`
        const html = highlighted.get(key)
        if (html) {
          return (
            <div
              key={i}
              style={{
                margin:   '16px 0',
                border:   '1px solid oklch(17% 0.005 55)',
                fontSize: '0.78rem',
                overflow: 'auto',
              }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        }
        // Fallback plain block
        return (
          <pre
            key={i}
            style={{
              margin:     '16px 0',
              padding:    '16px 20px',
              background: 'oklch(9% 0.007 55)',
              border:     '1px solid oklch(17% 0.005 55)',
              fontFamily: 'var(--font-mono)',
              fontSize:   '0.78rem',
              color:      'oklch(82% 0.008 55)',
              lineHeight: 1.7,
              overflowX:  'auto',
            }}
          >
            <code>{part.code}</code>
          </pre>
        )
      })}
    </div>
  )
}
