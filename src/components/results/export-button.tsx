'use client'
import { useState } from 'react'

const ACCENT = 'oklch(72% 0.22 55)'
const T3     = 'oklch(38% 0.004 55)'
const T2     = 'oklch(62% 0.006 55)'
const BORDER = 'oklch(17% 0.005 55)'

type State = 'idle' | 'loading' | 'error'

interface Props {
  jobId: string
}

export function ExportButton({ jobId }: Props) {
  const [state,   setState]   = useState<State>('idle')
  const [errMsg,  setErrMsg]  = useState<string | null>(null)

  async function handleExport() {
    setState('loading')
    setErrMsg(null)

    try {
      const res = await fetch(`/api/jobs/${jobId}/export`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const filename = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]
                       ?? 'documentation.pdf'

      const a  = document.createElement('a')
      a.href   = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setState('idle')
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err))
      setState('error')
    }
  }

  const isLoading = state === 'loading'

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={isLoading}
        title={state === 'error' ? (errMsg ?? 'Export failed') : 'Export as PDF'}
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           '7px',
          padding:       '6px 14px',
          background:    isLoading ? 'oklch(72% 0.22 55 / 0.08)' : 'transparent',
          border:        `1px solid ${state === 'error' ? 'oklch(45% 0.14 25)' : isLoading ? 'oklch(72% 0.22 55 / 0.3)' : BORDER}`,
          cursor:        isLoading ? 'wait' : 'pointer',
          fontFamily:    'var(--font-mono)',
          fontSize:      '0.7rem',
          letterSpacing: '0.06em',
          color:         state === 'error'
                           ? 'oklch(55% 0.14 25)'
                           : isLoading
                             ? ACCENT
                             : T3,
          transition:    'color 0.12s, border-color 0.12s, background 0.12s',
          opacity:       isLoading ? 0.7 : 1,
          whiteSpace:    'nowrap',
        }}
        onMouseEnter={e => {
          if (!isLoading && state !== 'error') {
            const el = e.currentTarget as HTMLElement
            el.style.color       = T2
            el.style.borderColor = 'oklch(28% 0.004 55)'
          }
        }}
        onMouseLeave={e => {
          if (!isLoading && state !== 'error') {
            const el = e.currentTarget as HTMLElement
            el.style.color       = T3
            el.style.borderColor = BORDER
          }
        }}
      >
        {/* Icon */}
        {isLoading ? (
          <span
            style={{
              width:       '11px',
              height:      '11px',
              border:      `1.5px solid ${ACCENT}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              display:     'inline-block',
              animation:   'spin 0.7s linear infinite',
              flexShrink:  0,
            }}
          />
        ) : state === 'error' ? (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M6 2v4m0 2v1" stroke="oklch(55% 0.14 25)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2 8v2h8V8M6 2v6M4 6l2 2 2-2"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {isLoading ? 'Compiling…' : state === 'error' ? 'Retry export' : 'Export PDF'}
      </button>

      {/* Error tooltip */}
      {state === 'error' && errMsg && (
        <div
          style={{
            marginTop:   '6px',
            padding:     '6px 10px',
            background:  'oklch(8% 0.05 25)',
            border:      '1px solid oklch(22% 0.10 25)',
            fontFamily:  'var(--font-mono)',
            fontSize:    '0.65rem',
            color:       'oklch(55% 0.14 25)',
            maxWidth:    '200px',
            lineHeight:  1.5,
          }}
        >
          {errMsg}
        </div>
      )}

      {/* Keyframe for spinner — injected once via a <style> tag */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
