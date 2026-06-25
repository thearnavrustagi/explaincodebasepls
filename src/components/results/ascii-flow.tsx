'use client'
import { MermaidDiagram } from './mermaid-diagram'
import { MarkdownView } from './markdown-view'

interface Props {
  content: string
}

interface ParsedFlow {
  title: string
  what: string
  characteristics: string
  mermaidDef: string | null
  rawBlock: string | null
  notes: string
  index: number
}

function parseFlows(content: string): ParsedFlow[] {
  // Split on ## Flow: headings
  const chunks = content.split(/(?=^## Flow:)/m).filter(s => s.trim())

  if (chunks.length === 0) {
    return []
  }

  return chunks.map((chunk, index) => {
    const lines  = chunk.split('\n')
    const title  = (lines[0] ?? '').replace(/^## Flow:\s*/, '').trim()

    // Extract **What it does:**
    const whatMatch = chunk.match(/\*\*What it does:\*\*\s*(.+?)(?:\n|$)/)
    const what = whatMatch?.[1]?.trim() ?? ''

    // Extract **Key characteristics:**
    const charMatch = chunk.match(/\*\*Key characteristics?:\*\*\s*(.+?)(?:\n|$)/)
    const characteristics = charMatch?.[1]?.trim() ?? ''

    // Extract mermaid block
    const mermaidMatch = chunk.match(/```mermaid\n([\s\S]*?)```/)
    const mermaidDef = mermaidMatch ? mermaidMatch[1].trim() : null

    // Extract plain ``` block (fallback for old ASCII content)
    const rawMatch = !mermaidDef ? chunk.match(/```\n?([\s\S]*?)```/) : null
    const rawBlock = rawMatch ? rawMatch[1].trim() : null

    // Extract notes section (everything after the last ```)
    const afterBlock = chunk.split(/```[\s\S]*?```/).pop() ?? ''
    const notes = afterBlock
      .replace(/\*\*What it does:\*\*.*$/m, '')
      .replace(/\*\*Key characteristics?:\*\*.*$/m, '')
      .trim()

    return { title, what, characteristics, mermaidDef, rawBlock, notes, index }
  })
}

export function AsciiFlow({ content }: Props) {
  const flows = parseFlows(content)

  // Fallback: no parseable flows — render as markdown
  if (flows.length === 0) {
    return <MarkdownView content={content} />
  }

  return (
    <div className="space-y-12">
      {flows.map((flow) => (
        <div key={flow.index}>
          {/* Flow header */}
          <div className="flex items-start gap-3 mb-4">
            <span
              className="mt-0.5 text-xs px-2 py-0.5 rounded-sm flex-shrink-0"
              style={{
                fontFamily:  'var(--font-mono)',
                background:  'oklch(72% 0.22 55 / 0.1)',
                color:       'oklch(72% 0.22 55)',
                border:      '1px solid oklch(72% 0.22 55 / 0.25)',
              }}
            >
              {String(flow.index + 1).padStart(2, '0')}
            </span>
            <div>
              <h3
                className="text-sm font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'oklch(90% 0.008 275)' }}
              >
                {flow.title}
              </h3>
              {flow.what && (
                <p
                  className="text-xs mt-1"
                  style={{ fontFamily: 'var(--font-mono)', color: 'oklch(55% 0.006 275)' }}
                >
                  {flow.what}
                </p>
              )}
            </div>
          </div>

          {/* Characteristics badge */}
          {flow.characteristics && (
            <div className="mb-4 flex flex-wrap gap-2">
              {flow.characteristics.split(/,\s*|;\s*/).map((c, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-sm"
                  style={{
                    fontFamily:  'var(--font-mono)',
                    color:       'oklch(65% 0.006 275)',
                    background:  'oklch(16% 0.006 275)',
                    border:      '1px solid oklch(22% 0.006 275)',
                  }}
                >
                  {c.replace(/["""]/g, '').trim()}
                </span>
              ))}
            </div>
          )}

          {/* Mermaid sequence diagram */}
          {flow.mermaidDef && (
            <MermaidDiagram
              definition={flow.mermaidDef}
              id={`flow-${flow.index}`}
            />
          )}

          {/* Fallback: raw ASCII block */}
          {!flow.mermaidDef && flow.rawBlock && (
            <pre
              className="overflow-auto p-5 text-xs leading-loose rounded-sm"
              style={{
                background:  'oklch(9% 0.008 275)',
                border:      '1px solid oklch(20% 0.006 275)',
                fontFamily:  'var(--font-mono)',
                color:       'oklch(82% 0.007 275)',
              }}
            >
              {flow.rawBlock}
            </pre>
          )}

          {/* Notes */}
          {flow.notes && flow.notes.length > 10 && (
            <div className="mt-4 space-y-1.5">
              {flow.notes
                .split('\n')
                .filter(l => l.trim() && !l.trim().match(/^\*\*Key notes?:\*\*$/i))
                .map((line, i) => {
                  // Strip leading - bullet and **bold:** label prefix
                  const clean = line
                    .trim()
                    .replace(/^[-*]\s*/, '')
                    .replace(/\*\*([^*]+)\*\*/g, '$1')
                  if (!clean) return null
                  return (
                    <div
                      key={i}
                      className="flex gap-2 text-xs"
                      style={{ fontFamily: 'var(--font-mono)', color: 'oklch(48% 0.005 275)' }}
                    >
                      <span style={{ color: 'oklch(35% 0.005 275)', flexShrink: 0 }}>—</span>
                      <span>{clean}</span>
                    </div>
                  )
                })}
            </div>
          )}

          {/* Divider between flows */}
          {flow.index < flows.length - 1 && (
            <div
              className="mt-10"
              style={{ height: '1px', background: 'oklch(16% 0.006 275)' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
