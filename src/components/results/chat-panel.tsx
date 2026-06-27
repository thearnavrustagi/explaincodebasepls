'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg:      '#080806',
  surface: '#0f0d08',
  border:  'oklch(17% 0.005 55)',
  accent:  'oklch(72% 0.22 55)',
  t0:      'oklch(95% 0.008 55)',
  t1:      'oklch(84% 0.007 55)',
  t2:      'oklch(62% 0.006 55)',
  t3:      'oklch(38% 0.004 55)',
  t4:      'oklch(22% 0.003 55)',
}

const MODELS = [
  // Frontier — GPT-5.x family
  { id: 'gpt-5.5-pro',  label: 'GPT-5.5 Pro ✦' },  // best for deep technical docs
  { id: 'gpt-5.5',      label: 'GPT-5.5'        },
  { id: 'gpt-5.4-pro',  label: 'GPT-5.4 Pro'    },
  { id: 'gpt-5.4',      label: 'GPT-5.4'        },
  { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini'   },
  { id: 'gpt-5.4-nano', label: 'GPT-5.4 nano'   },
  // Legacy
  { id: 'gpt-4o',       label: 'GPT-4o'         },
  { id: 'gpt-4o-mini',  label: 'GPT-4o mini'    },
  { id: 'o3-mini',      label: 'o3 mini'         },
]

interface Message {
  role:    'user' | 'assistant'
  content: string
}

interface Props {
  jobId:         string
  pinnedContext: string | null
  onClearPin:   () => void
}

export function ChatPanel({ jobId, pinnedContext, onClearPin }: Props) {
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [model,      setModel]      = useState('gpt-5.5-pro')
  const [streaming,  setStreaming]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [open,       setOpen]       = useState(true)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)
  const abortRef    = useRef<AbortController | null>(null)

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // When pinned context changes, suggest a question
  useEffect(() => {
    if (pinnedContext && !streaming) {
      inputRef.current?.focus()
    }
  }, [pinnedContext, streaming])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)
    setError(null)

    // Placeholder assistant message that we'll stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  abort.signal,
        body:    JSON.stringify({
          jobId,
          model,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          pinnedContext: pinnedContext ?? undefined,
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') continue
          try {
            const { delta, error: streamErr } = JSON.parse(payload)
            if (streamErr) throw new Error(streamErr)
            if (delta) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + delta }
                }
                return updated
              })
            }
          } catch { /* ignore malformed chunks */ }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message ?? 'Something went wrong')
      // Remove the empty assistant placeholder on error
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && !last.content) return prev.slice(0, -1)
        return prev
      })
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, streaming, messages, jobId, model, pinnedContext])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function stopStream() {
    abortRef.current?.abort()
    setStreaming(false)
  }

  function clearChat() {
    setMessages([])
    setError(null)
    onClearPin()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position:    'fixed',
          bottom:      '24px',
          right:       '24px',
          width:       '44px',
          height:      '44px',
          background:  C.accent,
          color:       C.bg,
          border:      'none',
          cursor:      'pointer',
          fontFamily:  'var(--font-mono)',
          fontSize:    '1.2rem',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'center',
          zIndex:      50,
        }}
        title="Open chat"
      >
        ✦
      </button>
    )
  }

  return (
    <div
      style={{
        width:         '360px',
        minWidth:      '360px',
        height:        '100vh',
        display:       'flex',
        flexDirection: 'column',
        background:    C.bg,
        borderLeft:    `1px solid ${C.border}`,
        flexShrink:    0,
      }}
    >
      {/* Top stripe */}
      <div style={{ height: '2px', background: C.accent, flexShrink: 0 }} />

      {/* Header */}
      <div
        style={{
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
          padding:       '12px 16px',
          borderBottom:  `1px solid ${C.border}`,
          flexShrink:    0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: C.accent, fontSize: '0.9rem' }}>✦</span>
          <span
            style={{
              fontFamily:    'var(--font-display)',
              fontWeight:    700,
              fontSize:      '0.8rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color:         C.t0,
            }}
          >
            Ask
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Model selector */}
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            style={{
              fontFamily:  'var(--font-mono)',
              fontSize:    '0.65rem',
              color:       C.t2,
              background:  C.surface,
              border:      `1px solid ${C.border}`,
              padding:     '3px 6px',
              cursor:      'pointer',
              outline:     'none',
            }}
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id} style={{ background: '#0f0d08' }}>
                {m.label}
              </option>
            ))}
          </select>

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              title="Clear chat"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   '0.65rem',
                color:      C.t3,
                background: 'transparent',
                border:     'none',
                cursor:     'pointer',
                padding:    '3px 6px',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.t2}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.t3}
            >
              clear
            </button>
          )}

          <button
            onClick={() => setOpen(false)}
            title="Collapse"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   '0.8rem',
              color:      C.t3,
              background: 'transparent',
              border:     'none',
              cursor:     'pointer',
              padding:    '2px 4px',
              lineHeight: 1,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.t1}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.t3}
          >
            ×
          </button>
        </div>
      </div>

      {/* Pinned context banner */}
      {pinnedContext && (
        <div
          style={{
            padding:     '8px 14px',
            background:  'oklch(72% 0.22 55 / 0.08)',
            borderBottom:`1px solid oklch(72% 0.22 55 / 0.2)`,
            flexShrink:  0,
          }}
        >
          <div
            style={{
              display:        'flex',
              alignItems:     'flex-start',
              justifyContent: 'space-between',
              gap:            '8px',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      '0.6rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color:         C.accent,
                  marginBottom:  '4px',
                }}
              >
                Pinned context
              </div>
              <div
                style={{
                  fontFamily:  'var(--font-mono)',
                  fontSize:    '0.72rem',
                  color:       C.t2,
                  lineHeight:  1.5,
                  display:     '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow:    'hidden',
                }}
              >
                {pinnedContext.slice(0, 120)}{pinnedContext.length > 120 ? '…' : ''}
              </div>
            </div>
            <button
              onClick={onClearPin}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   '0.7rem',
                color:      C.t3,
                background: 'transparent',
                border:     'none',
                cursor:     'pointer',
                flexShrink: 0,
                paddingTop: '2px',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.t1}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.t3}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex:       1,
          overflowY:  'auto',
          padding:    '16px',
          display:    'flex',
          flexDirection: 'column',
          gap:        '16px',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              flex:           1,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '12px',
              paddingTop:     '40px',
            }}
          >
            <span style={{ fontSize: '1.6rem', color: C.accent, opacity: 0.4 }}>✦</span>
            <p
              style={{
                fontFamily:  'var(--font-mono)',
                fontSize:    '0.75rem',
                color:       C.t3,
                textAlign:   'center',
                lineHeight:  1.6,
                maxWidth:    '240px',
              }}
            >
              Ask anything about this codebase. Select text in the docs and click ✦ to pin it as context.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {error && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   '0.72rem',
              color:      'oklch(58% 0.18 25)',
              padding:    '8px 12px',
              background: 'oklch(10% 0.06 25)',
              border:     '1px solid oklch(22% 0.10 25)',
            }}
          >
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop:  `1px solid ${C.border}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display:    'flex',
            alignItems: 'flex-end',
            gap:        0,
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pinnedContext ? 'Ask about the pinned context…' : 'Ask about this codebase…'}
            rows={3}
            disabled={streaming}
            style={{
              flex:       1,
              background: 'transparent',
              border:     'none',
              outline:    'none',
              resize:     'none',
              fontFamily: 'var(--font-mono)',
              fontSize:   '0.8rem',
              color:      C.t1,
              padding:    '12px 14px',
              caretColor: C.accent,
              lineHeight: 1.6,
            }}
          />
          <button
            onClick={streaming ? stopStream : sendMessage}
            disabled={!streaming && !input.trim()}
            style={{
              alignSelf:     'flex-end',
              background:    streaming ? 'transparent' : (input.trim() ? C.accent : 'transparent'),
              color:         streaming ? 'oklch(58% 0.18 25)' : (input.trim() ? C.bg : C.t4),
              border:        'none',
              padding:       '12px 16px',
              fontFamily:    'var(--font-mono)',
              fontSize:      '0.7rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor:        (!streaming && !input.trim()) ? 'not-allowed' : 'pointer',
              transition:    'background 0.1s, color 0.1s',
              fontWeight:    600,
            }}
          >
            {streaming ? '■ stop' : 'send'}
          </button>
        </div>
        <div
          style={{
            padding:       '4px 14px 8px',
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.58rem',
            color:         C.t4,
            letterSpacing: '0.04em',
          }}
        >
          ↵ send · shift+↵ newline
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            maxWidth:   '85%',
            padding:    '8px 12px',
            background: 'oklch(72% 0.22 55 / 0.12)',
            border:     '1px solid oklch(72% 0.22 55 / 0.2)',
            fontFamily: 'var(--font-mono)',
            fontSize:   '0.8rem',
            color:      'oklch(90% 0.008 55)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '100%' }}>
      <div
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           '6px',
          marginBottom:  '6px',
        }}
      >
        <span style={{ color: 'oklch(72% 0.22 55)', fontSize: '0.7rem' }}>✦</span>
        <span
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.6rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         'oklch(38% 0.004 55)',
          }}
        >
          Assistant
        </span>
      </div>

      {message.content ? (
        <div className="chat-response" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: 1.7, color: 'oklch(84% 0.007 55)' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <p style={{ marginBottom: '10px', lineHeight: 1.7, color: 'oklch(84% 0.007 55)' }}>{children}</p>
              ),
              code({ className, children }) {
                const isBlock = className?.includes('language-')
                const code = String(children).replace(/\n$/, '')
                if (isBlock || code.includes('\n')) {
                  return (
                    <pre style={{ background: '#0f0d08', border: '1px solid oklch(17% 0.005 55)', padding: '10px 14px', overflowX: 'auto', fontSize: '0.72rem', lineHeight: 1.65, margin: '10px 0', color: 'oklch(80% 0.008 55)' }}>
                      <code>{code}</code>
                    </pre>
                  )
                }
                return (
                  <code style={{ background: '#0f0d08', border: '1px solid oklch(17% 0.005 55)', padding: '1px 5px', fontSize: '0.75rem', color: 'oklch(80% 0.012 55)' }}>
                    {children}
                  </code>
                )
              },
              ul: ({ children }) => <ul style={{ paddingLeft: '16px', marginBottom: '10px' }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ paddingLeft: '16px', marginBottom: '10px' }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: '4px', color: 'oklch(80% 0.007 55)' }}>{children}</li>,
              strong: ({ children }) => <strong style={{ color: 'oklch(95% 0.008 55)', fontWeight: 600 }}>{children}</strong>,
              h3: ({ children }) => <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', color: 'oklch(95% 0.008 55)', marginTop: '14px', marginBottom: '6px' }}>{children}</h3>,
              blockquote: ({ children }) => <blockquote style={{ borderLeft: '2px solid oklch(72% 0.22 55 / 0.4)', paddingLeft: '12px', color: 'oklch(62% 0.006 55)', margin: '8px 0' }}>{children}</blockquote>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                width:           '4px',
                height:          '4px',
                borderRadius:    '50%',
                background:      'oklch(72% 0.22 55)',
                display:         'inline-block',
                animation:       `chatdot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
          <style>{`
            @keyframes chatdot {
              0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
              40% { opacity: 1; transform: scale(1.2); }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}
