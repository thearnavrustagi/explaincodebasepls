import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Shared token values — amber-warm black palette
const T = {
  t0:      'oklch(95% 0.008 55)',   // headings
  t1:      'oklch(84% 0.007 55)',   // body
  t2:      'oklch(62% 0.006 55)',   // secondary
  t3:      'oklch(38% 0.004 55)',   // muted
  accent:  'oklch(72% 0.22 55)',    // amber — used sparingly
  surface: 'oklch(9% 0.007 55)',    // code bg
  border:  'oklch(17% 0.005 55)',   // dividers
  codeText:'oklch(80% 0.012 55)',   // inline code text
}

interface Props { content: string }

export function MarkdownView({ content }: Props) {
  return (
    <div style={{ maxWidth: '72ch' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1
              style={{
                fontFamily:    'var(--font-display)',
                fontWeight:    700,
                fontSize:      '1.25rem',
                letterSpacing: '-0.02em',
                color:         T.t0,
                marginTop:     '0',
                marginBottom:  '20px',
                lineHeight:    1.1,
              }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              style={{
                fontFamily:    'var(--font-display)',
                fontWeight:    600,
                fontSize:      '1rem',
                letterSpacing: '-0.01em',
                color:         T.t0,
                marginTop:     '36px',
                marginBottom:  '12px',
                paddingBottom: '10px',
                borderBottom:  `1px solid ${T.border}`,
                lineHeight:    1.2,
              }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              style={{
                fontFamily:  'var(--font-display)',
                fontWeight:  600,
                fontSize:    '0.875rem',
                color:       T.t0,
                marginTop:   '28px',
                marginBottom:'8px',
                lineHeight:  1.3,
              }}
            >
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4
              style={{
                fontFamily:  'var(--font-display)',
                fontWeight:  600,
                fontSize:    '0.8rem',
                color:       T.t2,
                marginTop:   '20px',
                marginBottom:'6px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p
              style={{
                fontFamily:  'var(--font-mono)',
                fontSize:    '0.825rem',
                lineHeight:  1.75,
                color:       T.t1,
                marginBottom:'14px',
              }}
            >
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul style={{ marginBottom: '14px', paddingLeft: 0, listStyle: 'none' }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              style={{
                marginBottom: '14px',
                paddingLeft:  '1.4em',
                color:        T.t1,
                fontFamily:   'var(--font-mono)',
                fontSize:     '0.825rem',
                lineHeight:   1.75,
              }}
            >
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li
              style={{
                fontFamily:  'var(--font-mono)',
                fontSize:    '0.825rem',
                lineHeight:  1.75,
                color:       T.t1,
                display:     'flex',
                gap:         '10px',
                marginBottom:'4px',
              }}
            >
              <span style={{ color: T.accent, flexShrink: 0, marginTop: '2px', fontSize: '0.7rem' }}>▸</span>
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }) => (
            <strong style={{ color: T.t0, fontWeight: 600 }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ color: T.t2, fontStyle: 'italic' }}>{children}</em>
          ),
          code({ className, children }) {
            const isBlock = className?.includes('language-')
            const code    = String(children).replace(/\n$/, '')

            if (isBlock || code.includes('\n')) {
              return (
                <pre
                  style={{
                    background:  T.surface,
                    border:      `1px solid ${T.border}`,
                    padding:     '16px 20px',
                    overflowX:   'auto',
                    fontFamily:  'var(--font-mono)',
                    fontSize:    '0.78rem',
                    color:       'oklch(82% 0.008 55)',
                    lineHeight:  1.7,
                    margin:      '16px 0',
                  }}
                >
                  <code>{code}</code>
                </pre>
              )
            }

            return (
              <code
                style={{
                  fontFamily:  'var(--font-mono)',
                  fontSize:    '0.78rem',
                  color:       T.codeText,
                  background:  T.surface,
                  border:      `1px solid ${T.border}`,
                  padding:     '1px 6px',
                }}
              >
                {children}
              </code>
            )
          },
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '16px 0' }}>
              <table
                style={{
                  width:          '100%',
                  borderCollapse: 'collapse',
                  fontFamily:     'var(--font-mono)',
                  fontSize:       '0.78rem',
                }}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              style={{
                padding:      '8px 14px',
                textAlign:    'left',
                fontWeight:   600,
                color:        T.t2,
                fontSize:     '0.7rem',
                letterSpacing:'0.08em',
                textTransform:'uppercase',
                borderBottom: `1px solid ${T.border}`,
                background:   T.surface,
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                padding:      '8px 14px',
                color:        T.t1,
                borderBottom: `1px solid oklch(12% 0.005 55)`,
              }}
            >
              {children}
            </td>
          ),
          hr: () => (
            <hr style={{ border: 'none', borderTop: `1px solid ${T.border}`, margin: '24px 0' }} />
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                margin:     '16px 0',
                padding:    '12px 16px',
                background: T.surface,
                border:     `1px solid ${T.border}`,
                fontFamily: 'var(--font-mono)',
                fontSize:   '0.8rem',
                color:      T.t2,
              }}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
