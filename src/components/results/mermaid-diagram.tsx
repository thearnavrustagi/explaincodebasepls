'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  definition: string
  id: string
}

// Load mermaid from CDN via a script tag — avoids Turbopack/webpack
// bundling issues with mermaid's ESM internals (import.meta usage).
function loadMermaidCDN(): Promise<any> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if ((window as any).mermaid) {
      resolve((window as any).mermaid)
      return
    }
    const existing = document.getElementById('mermaid-cdn')
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).mermaid))
      existing.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.id = 'mermaid-cdn'
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js'
    script.onload = () => resolve((window as any).mermaid)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

/**
 * Sanitize a Mermaid definition before rendering.
 * Fixes common LLM-generated issues that cause parse failures.
 */
function sanitizeMermaid(def: string): string {
  const lines = def.split('\n')
  const out: string[] = []

  for (const line of lines) {
    const trimmed = line.trimEnd()

    // Convert self-loop arrows (Actor->>Actor: label) to Note annotations
    // These cause parse errors inside rect blocks in some Mermaid versions
    const selfLoop = trimmed.match(/^(\s*)([\w]+)(->>|-->>|->|-->)([\w]+):\s*(.*)$/)
    if (selfLoop) {
      const [, indent, from, , to, label] = selfLoop
      if (from === to) {
        out.push(`${indent}Note over ${from}: ${label}`)
        continue
      }
    }

    // Remove bare `---` horizontal rules that aren't Mermaid syntax
    if (trimmed.trim() === '---') continue

    out.push(trimmed)
  }

  return out.join('\n')
}

export function MermaidDiagram({ definition, id }: Props) {
  const cleanDefinition = sanitizeMermaid(definition)
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError]   = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const mermaid = await loadMermaidCDN()
        // Amber-warm palette — all surfaces map to the same axis as the app UI.
        // BG  = #090806  (oklch 3.5% 0.005 55 → hex approx)
        // SFC = #141109  (oklch 9% 0.007 55)
        // BDR = #2b2218  (oklch 17% 0.005 55)
        // ACC = #c96326  (oklch 72% 0.22 55)
        // T0  = #f2ece4  (oklch 95% 0.008 55)
        // T1  = #d4c9bc  (oklch 84% 0.007 55)
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            background:          '#090806',   // page bg
            primaryColor:        '#141109',   // node fill
            primaryTextColor:    '#d4c9bc',   // node text
            primaryBorderColor:  '#2b2218',   // node border
            lineColor:           '#c96326',   // arrows — accent
            edgeLabelBackground: '#090806',   // edge label bg
            secondaryColor:      '#0f0d07',   // secondary node fill
            tertiaryColor:       '#0c0a06',   // tertiary node fill
            clusterBkg:          '#0f0d07',   // subgraph fill
            clusterBorder:       '#2b2218',   // subgraph border
            titleColor:          '#f2ece4',   // diagram title
            nodeTextColor:       '#d4c9bc',   // node label fallback
            labelTextColor:      '#d4c9bc',   // edge labels
            fontFamily:          'Geist Mono, ui-monospace, monospace',
            fontSize:            '12px',
          },
        })

        const { svg } = await mermaid.render(`mermaid-${id}`, cleanDefinition)

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
          const svgEl = containerRef.current.querySelector('svg')
          if (svgEl) {
            svgEl.style.maxWidth = '100%'
            svgEl.style.height   = 'auto'
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Render failed')
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [cleanDefinition, id])

  async function copyDef() {
    await navigator.clipboard.writeText(definition)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (error) {
    return (
      <div>
        <div
          className="text-xs mb-2 px-3 py-1.5 rounded-sm flex items-center justify-between"
          style={{ background: 'oklch(14% 0.06 25)', color: 'oklch(65% 0.18 25)', fontFamily: 'var(--font-mono)', border: '1px solid oklch(22% 0.08 25)' }}
        >
          <span>Mermaid parse error — raw syntax below</span>
          <button
            onClick={copyDef}
            className="text-xs opacity-70 hover:opacity-100"
            style={{ color: 'inherit' }}
          >
            copy
          </button>
        </div>
        <pre
          className="text-xs p-4 overflow-auto rounded-sm"
          style={{
            color:       'oklch(60% 0.007 275)',
            fontFamily:  'var(--font-mono)',
            background:  'oklch(10% 0.007 275)',
            border:      '1px solid oklch(18% 0.006 275)',
            lineHeight:  1.65,
          }}
        >
          {cleanDefinition}
        </pre>
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          onClick={copyDef}
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.68rem',
            letterSpacing: '0.06em',
            color:         'oklch(38% 0.004 55)',
            background:    'transparent',
            border:        '1px solid oklch(17% 0.005 55)',
            padding:       '4px 12px',
            cursor:        'pointer',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'oklch(62% 0.006 55)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'oklch(38% 0.004 55)'}
        >
          {copied ? '✓ copied' : 'copy mermaid'}
        </button>
      </div>

      <div
        ref={containerRef}
        className="mermaid-container w-full overflow-auto"
        style={{
          background: '#090806',
          border:     '1px solid oklch(17% 0.005 55)',
          padding:    '24px',
          minHeight:  '200px',
        }}
      />
    </div>
  )
}
