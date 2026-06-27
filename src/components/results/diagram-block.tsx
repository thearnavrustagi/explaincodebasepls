'use client'
import { Fragment, useState } from 'react'
import { MermaidDiagram } from './mermaid-diagram'

interface GlossaryEntry {
  term:        string
  description: string
}

interface ParsedBlock {
  mermaidDef:      string   // bare diagram syntax (no fences)
  glossaryEntries: GlossaryEntry[]
}

/**
 * Parse a diagram block that may contain:
 *   1. A ```mermaid ... ``` fenced block
 *   2. A ### Glossary section with - **Term**: description bullets
 *
 * Falls back gracefully: if no fence is found, the entire content is
 * treated as raw Mermaid syntax (backwards-compat for in-flight results).
 */
function parseDiagramBlock(content: string): ParsedBlock {
  // Extract the first mermaid fence
  const fenceMatch = content.match(/```mermaid\n([\s\S]*?)```/)
  const mermaidDef = fenceMatch ? fenceMatch[1].trim() : content.trim()

  // Extract ### Glossary section (everything after the heading until end or next ##)
  const glossaryMatch = content.match(/^###\s+Glossary\s*\n([\s\S]*?)(?=\n##|\s*$)/m)
  const glossaryEntries: GlossaryEntry[] = []

  if (glossaryMatch) {
    const bulletPattern = /^[-*]\s+\*\*(.+?)\*\*:\s*(.+)$/gm
    let m: RegExpExecArray | null
    while ((m = bulletPattern.exec(glossaryMatch[1])) !== null) {
      glossaryEntries.push({ term: m[1].trim(), description: m[2].trim() })
    }
  }

  return { mermaidDef, glossaryEntries }
}

function GlossarySection({ entries }: { entries: GlossaryEntry[] }) {
  const [open, setOpen] = useState(false)

  if (entries.length === 0) return null

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Separator + toggle */}
      <div style={{ height: '1px', background: 'oklch(17% 0.005 55)', marginBottom: '14px' }} />
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           '8px',
          background:    'transparent',
          border:        'none',
          padding:       0,
          cursor:        'pointer',
          fontFamily:    'var(--font-mono)',
          fontSize:      '0.62rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color:         'oklch(72% 0.22 55)',
          opacity:       0.8,
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
      >
        <span
          style={{
            display:        'inline-block',
            transition:     'transform 0.15s',
            transform:      open ? 'rotate(90deg)' : 'rotate(0deg)',
            fontSize:       '0.7rem',
          }}
        >
          ▶
        </span>
        Glossary
        <span style={{ color: 'oklch(38% 0.004 55)', fontWeight: 400 }}>
          ({entries.length} terms)
        </span>
      </button>

      {open && (
        <dl
          style={{
            marginTop:  '14px',
            display:    'grid',
            gridTemplateColumns: 'max-content 1fr',
            columnGap:  '24px',
            rowGap:     '10px',
            fontFamily: 'var(--font-mono)',
            fontSize:   '0.75rem',
            lineHeight: 1.55,
          }}
        >
          {entries.map(({ term, description }) => (
            <Fragment key={term}>
              <dt
                style={{
                  color:         'oklch(72% 0.22 55)',
                  whiteSpace:    'nowrap',
                  alignSelf:     'baseline',
                  paddingTop:    '1px',
                }}
              >
                {term}
              </dt>
              <dd
                style={{
                  margin: 0,
                  color:  'oklch(55% 0.004 55)',
                }}
              >
                {description}
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
    </div>
  )
}

interface Props {
  /** Raw agent output: either a fenced mermaid block (+ optional glossary) or bare mermaid syntax */
  content: string
  id:      string
}

/**
 * Renders one diagram + its collapsible glossary.
 * The MermaidDiagram's "copy mermaid" button copies only the bare diagram
 * definition — the glossary is stripped automatically since we pass `mermaidDef`.
 */
export function DiagramBlock({ content, id }: Props) {
  const { mermaidDef, glossaryEntries } = parseDiagramBlock(content)

  return (
    <div>
      <MermaidDiagram definition={mermaidDef} id={id} />
      <GlossarySection entries={glossaryEntries} />
    </div>
  )
}
