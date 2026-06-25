'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

/* Palette — amber-warm black. Never violet-tinted. */
const V = {
  bg:      'oklch(4.5% 0.010 55)',   /* void: true black, amber-kissed        */
  bgUp:    'oklch(10%  0.008 55)',   /* elevated surface                       */
  bgMid:   'oklch(16%  0.006 55)',   /* borders, structural dividers           */
  acc:     'oklch(72%  0.22  55)',   /* amber-orange — the one signal          */
  accLo:   'oklch(52%  0.14  55)',   /* dimmed accent for loading states       */
  t0:      'oklch(92%  0.007 55)',   /* primary text                           */
  t1:      'oklch(70%  0.006 55)',   /* secondary text (readable)              */
  t2:      'oklch(48%  0.005 55)',   /* muted text                             */
  t3:      'oklch(28%  0.004 55)',   /* dead / decorative text                 */
}

const OUTPUTS = [
  { num: '01', label: 'Architecture Diagrams', sub: 'System topology · interactive Mermaid' },
  { num: '02', label: 'HLD + LLD',             sub: 'High + low-level design documents'     },
  { num: '03', label: 'API Flows',              sub: 'Sequence diagrams for every major flow'},
  { num: '04', label: 'Glossary',               sub: 'Domain terms and acronyms in context'  },
]

export function Hero() {
  const [url,     setUrl]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/jobs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ repoUrl: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to start job')
      router.push(`/learn/${data.jobId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const canSubmit    = !!url.trim() && !loading
  const borderColor  = focused ? V.acc : V.bgMid

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: V.bg, color: V.t0 }}>

      {/* Accent top stripe — the one place it belongs: top edge of page, not inside a component */}
      <div style={{ height: '2px', background: V.acc, flexShrink: 0 }} />

      {/* Top bar */}
      <header style={{
        display:       'flex',
        alignItems:    'center',
        justifyContent: 'space-between',
        padding:       '11px 32px',
        borderBottom:  `1px solid ${V.bgMid}`,
        flexShrink:    0,
      }}>
        <span style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      '0.7rem',
          color:         V.acc,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>
          explaincodebasepls
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: V.t3 }}>
          v1.0
        </span>
      </header>

      {/* Content well */}
      <div style={{
        flex:           1,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '64px 24px 80px',
      }}>

        {/* Overline */}
        <div style={{
          marginBottom:  '36px',
          display:       'flex',
          alignItems:    'center',
          gap:           '14px',
          fontFamily:    'var(--font-mono)',
          fontSize:      '0.67rem',
          color:         V.t3,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}>
          <span style={{ display: 'inline-block', width: '36px', height: '1px', background: V.bgMid }} />
          Codebase Intelligence
          <span style={{ display: 'inline-block', width: '36px', height: '1px', background: V.bgMid }} />
        </div>

        {/* Headline */}
        <div style={{ textAlign: 'center', maxWidth: '820px' }}>
          <h1 style={{
            fontFamily:    'var(--font-display)',
            fontSize:      'clamp(3.8rem, 9.5vw, 7.2rem)',
            fontWeight:    800,
            lineHeight:    0.87,
            letterSpacing: '-0.03em',
            textTransform: 'uppercase',
            color:         V.t0,
            margin:        0,
          }}>
            UNDERSTAND
            <br />
            <span style={{ color: V.acc }}>ANY REPO</span>
          </h1>

          <p style={{
            marginTop:     '22px',
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.82rem',
            color:         V.t1,
            letterSpacing: '0.03em',
            lineHeight:    1.5,
          }}>
            Architecture · HLD · LLD · API flows · Glossary
          </p>
        </div>

        {/* Structural rule */}
        <div style={{
          margin:     '44px 0',
          width:      '100%',
          maxWidth:   '600px',
          height:     '1px',
          background: V.bgMid,
        }} />

        {/* Input — full-border, no side stripe */}
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '600px' }}>

          <div style={{
            display:    'flex',
            alignItems: 'stretch',
            border:     `1px solid ${borderColor}`,
            background: V.bgUp,
            transition: 'border-color 0.12s ease',
          }}>
            {/* Prompt glyph — meaningful affordance, not decoration */}
            <span style={{
              fontFamily:  'var(--font-mono)',
              color:       V.acc,
              fontSize:    '0.85rem',
              padding:     '14px 10px 14px 16px',
              userSelect:  'none',
              flexShrink:  0,
              alignSelf:   'center',
            }}>
              $
            </span>

            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="github.com/owner/repo"
              disabled={loading}
              autoFocus
              style={{
                flex:        1,
                background:  'transparent',
                border:      'none',
                outline:     'none',
                fontFamily:  'var(--font-mono)',
                fontSize:    '0.875rem',
                color:       V.t0,
                padding:     '14px 8px',
                caretColor:  V.acc,
                minWidth:    0,
              }}
            />

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                background:    canSubmit ? V.acc : 'transparent',
                color:         canSubmit ? V.bg : V.t3,
                border:        'none',
                borderLeft:    `1px solid ${borderColor}`,
                padding:       '0 28px',
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.72rem',
                fontWeight:    700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                cursor:        canSubmit ? 'pointer' : 'not-allowed',
                flexShrink:    0,
                minWidth:      '96px',
                transition:    'background 0.12s, color 0.12s, border-color 0.12s',
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px', justifyContent: 'center' }}>
                  <span style={{
                    display:        'inline-block',
                    width:          '9px',
                    height:         '9px',
                    border:         '1.5px solid currentColor',
                    borderTopColor: 'transparent',
                    borderRadius:   '50%',
                    animation:      'spin 0.7s linear infinite',
                  }} />
                  Wait
                </span>
              ) : 'RUN →'}
            </button>
          </div>

          {error && (
            <p style={{
              marginTop:   '8px',
              fontFamily:  'var(--font-mono)',
              fontSize:    '0.72rem',
              color:       'oklch(62% 0.20 25)',
            }}>
              ✗ {error}
            </p>
          )}

          {/* Format hints */}
          <div style={{
            marginTop:  '10px',
            display:    'flex',
            flexWrap:   'wrap',
            gap:        '2px 18px',
            fontFamily: 'var(--font-mono)',
            fontSize:   '0.64rem',
            color:      V.t3,
          }}>
            {['owner/repo', 'github.com/owner/repo', 'https://…/repo.git', 'git@github.com:owner/repo.git'].map(fmt => (
              <span key={fmt}>{fmt}</span>
            ))}
          </div>
        </form>

        {/* Output manifest */}
        <div style={{ marginTop: '52px', width: '100%', maxWidth: '600px' }}>

          <div style={{
            marginBottom:  '10px',
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.64rem',
            color:         V.t2,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            Output
          </div>

          <div style={{ border: `1px solid ${V.bgMid}` }}>
            {OUTPUTS.map((item, i) => (
              <div
                key={item.num}
                style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:           '18px',
                  padding:       '12px 16px',
                  borderBottom:  i < OUTPUTS.length - 1 ? `1px solid ${V.bgMid}` : 'none',
                  background:    'transparent',
                }}
              >
                <span style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      '0.62rem',
                  color:         V.acc,
                  opacity:       0.5,
                  letterSpacing: '0.05em',
                  minWidth:      '22px',
                  flexShrink:    0,
                }}>
                  {item.num}
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize:   '0.82rem',
                  color:      V.t0,
                  minWidth:   '170px',
                  flexShrink: 0,
                }}>
                  {item.label}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize:   '0.68rem',
                  color:      V.t2,
                }}>
                  {item.sub}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer style={{
        padding:       '13px 32px',
        borderTop:     `1px solid ${V.bgMid}`,
        display:       'flex',
        alignItems:    'center',
        justifyContent: 'space-between',
        flexShrink:    0,
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.63rem', color: V.t3 }}>
          clone · ingest · explain · generate
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.63rem', color: V.t3 }}>
          claude-opus-4-8 · claude-sonnet-4-6
        </span>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: ${V.t3}; }
      `}</style>
    </main>
  )
}
