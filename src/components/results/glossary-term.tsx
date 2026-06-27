'use client'
import React, { useState, useRef, useMemo } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlossaryEntry {
  term:       string
  definition: string
}

// ── Parser ────────────────────────────────────────────────────────────────────
// Converts glossary markdown into a flat list of {term, definition} pairs.
// Handles both formats produced by the LLM agent:
//   1. **Term**\nDefinition paragraph        (Domain Concepts / Infra sections)
//   2. **ABBR** — Full form and meaning       (Abbreviations section)

export function parseGlossaryTerms(content: string): GlossaryEntry[] {
  const entries: GlossaryEntry[] = []
  const lines = content.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    if (!line || line.startsWith('#')) { i++; continue }

    // Format 2: **ABBR** — inline definition
    const inlineMatch = line.match(/^\*\*([^*]+)\*\*\s*[—–-]\s*(.+)$/)
    if (inlineMatch) {
      entries.push({ term: inlineMatch[1].trim(), definition: inlineMatch[2].trim() })
      i++; continue
    }

    // Format 1: **Term** on its own line, definition follows
    const termMatch = line.match(/^\*\*([^*]+)\*\*$/)
    if (termMatch) {
      const term = termMatch[1].trim()
      i++

      // Skip blank lines between header and definition body
      while (i < lines.length && !lines[i].trim()) i++

      // Collect definition lines until blank line, next term, or heading
      const defLines: string[] = []
      while (i < lines.length) {
        const l = lines[i].trim()
        if (!l || l.startsWith('#') || /^\*\*[^*]+\*\*/.test(l)) break
        defLines.push(l)
        i++
      }

      const definition = defLines.join(' ').trim()
      if (definition) entries.push({ term, definition })
      continue
    }

    i++
  }

  return entries
}

// ── Design tokens (mirrors markdown-view.tsx T object) ───────────────────────

const C = {
  accent:      'oklch(72% 0.22 55)',
  accentDim:   'oklch(72% 0.22 55 / 0.55)',
  accentLight: 'oklch(80% 0.18 55)',
  cardBg:      'oklch(12% 0.008 55)',
  border:      'oklch(20% 0.006 55)',
  borderSub:   'oklch(17% 0.005 55)',
  t1:          'oklch(84% 0.007 55)',
}

// ── GlossaryTermTooltip ───────────────────────────────────────────────────────

interface TooltipProps {
  term:            string
  definition:      string
  onGlossaryClick: () => void
}

export function GlossaryTermTooltip({ term, definition, onGlossaryClick }: TooltipProps) {
  const [visible,  setVisible]  = useState(false)
  const [flipLeft, setFlipLeft] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const hideRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function show() {
    clearTimeout(hideRef.current)
    setVisible(true)
    // Measure next frame — DOM needs a tick to place the wrapper
    requestAnimationFrame(() => {
      if (!wrapRef.current) return
      const { left } = wrapRef.current.getBoundingClientRect()
      setFlipLeft(left + 308 > window.innerWidth - 16)
    })
  }

  function scheduleHide() {
    hideRef.current = setTimeout(() => setVisible(false), 120)
  }

  return (
    <span
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline' }}
    >
      {/* ── Term — dotted amber underline signals "glossary word" ── */}
      <span
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onClick={(e) => { e.stopPropagation(); onGlossaryClick() }}
        style={{
          textDecoration:      'underline',
          textDecorationStyle: 'dotted',
          textDecorationColor: C.accentDim,
          textUnderlineOffset: '3px',
          cursor:              'pointer',
          color:               'inherit',
        }}
      >
        {term}
      </span>

      {/* ── Floating definition card ── */}
      {visible && (
        <span
          role="tooltip"
          onMouseEnter={() => clearTimeout(hideRef.current)}
          onMouseLeave={scheduleHide}
          style={{
            position:  'absolute',
            display:   'block',
            top:       'calc(100% + 9px)',
            left:      flipLeft ? 'auto' : '0',
            right:     flipLeft ? '0' : 'auto',
            width:     '300px',
            background: C.cardBg,
            border:    `1px solid ${C.border}`,
            // Amber left accent via box-shadow — avoids side-stripe border pattern
            boxShadow: `inset 2px 0 0 ${C.accentDim}, 0 16px 48px oklch(0% 0 0 / 0.7)`,
            zIndex:    9999,
          }}
        >
          {/* Caret — rotated square pointing up to the term */}
          <span
            aria-hidden="true"
            style={{
              position:    'absolute',
              top:         '-5px',
              left:        flipLeft ? 'auto' : '14px',
              right:       flipLeft ? '14px' : 'auto',
              width:       '8px',
              height:      '8px',
              background:  C.cardBg,
              border:      `1px solid ${C.border}`,
              borderRight: 'none',
              borderBottom:'none',
              transform:   'rotate(45deg)',
            }}
          />

          <span style={{ display: 'block', padding: '12px 15px 10px' }}>
            {/* Term name */}
            <span
              style={{
                display:       'block',
                fontFamily:    'var(--font-display)',
                fontWeight:    600,
                fontSize:      '0.78rem',
                letterSpacing: '-0.01em',
                lineHeight:    1.2,
                color:         C.accent,
                marginBottom:  '6px',
              }}
            >
              {term}
            </span>

            {/* Definition — capped at 3 lines */}
            <span
              style={{
                display:         '-webkit-box' as React.CSSProperties['display'],
                fontFamily:      'var(--font-mono)',
                fontSize:        '0.7rem',
                lineHeight:      1.65,
                color:           C.t1,
                overflow:        'hidden',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
              }}
            >
              {definition}
            </span>

            {/* Footer — "→ Glossary" link */}
            <span
              style={{
                display:        'flex',
                justifyContent: 'flex-end',
                marginTop:      '10px',
                paddingTop:     '8px',
                borderTop:      `1px solid ${C.borderSub}`,
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onGlossaryClick() }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.accentLight }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.accent }}
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      '0.62rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color:         C.accent,
                  background:    'none',
                  border:        'none',
                  cursor:        'pointer',
                  padding:       0,
                }}
              >
                → Glossary
              </button>
            </span>
          </span>
        </span>
      )}
    </span>
  )
}

// ── Child injector ────────────────────────────────────────────────────────────
// Recursively walks ReactMarkdown's children tree, splitting text nodes on
// glossary term matches and wrapping each match in GlossaryTermTooltip.
// Skips <code> and <pre> so code identifiers are never highlighted.

export function injectGlossaryIntoChildren(
  node:            React.ReactNode,
  termMap:         Map<string, GlossaryEntry>,
  onGlossaryClick: () => void,
): React.ReactNode {
  if (!termMap.size) return node

  function walk(n: React.ReactNode): React.ReactNode {
    if (typeof n === 'string') return splitText(n)

    if (Array.isArray(n)) {
      return n.map((child, i) => {
        const result = walk(child)
        // Preserve key if it was on the original element
        if (React.isValidElement(result) && !result.key) {
          return React.cloneElement(result as React.ReactElement, { key: i })
        }
        return result
      })
    }

    if (React.isValidElement(n)) {
      const el = n as React.ReactElement<{ children?: React.ReactNode }>
      // Never recurse into code — don't annotate code identifiers
      if (el.type === 'code' || el.type === 'pre') return el
      if (el.props.children == null) return el
      const newChildren = walk(el.props.children)
      // cloneElement(el, props, ...children) — pass new children as 3rd arg
      return React.cloneElement(
        el,
        {} as Partial<typeof el.props>,
        newChildren,
      )
    }

    return n
  }

  function splitText(text: string): React.ReactNode {
    if (!text) return text

    const escaped = [...termMap.keys()].map(t =>
      t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    )
    // Case-insensitive split; the capturing group keeps the matched term in parts
    const re = new RegExp(`(${escaped.join('|')})`, 'gi')
    const parts = text.split(re)
    if (parts.length <= 1) return text

    return parts.map((part, i) => {
      if (!part) return null
      const entry = termMap.get(part.toLowerCase())
      return entry ? (
        <GlossaryTermTooltip
          key={i}
          term={entry.term}
          definition={entry.definition}
          onGlossaryClick={onGlossaryClick}
        />
      ) : part
    })
  }

  return walk(node)
}

// ── Hook — memoised term map from entries array ───────────────────────────────

export function useGlossaryTermMap(terms?: GlossaryEntry[]): Map<string, GlossaryEntry> {
  return useMemo(() => {
    if (!terms?.length) return new Map()
    return new Map(terms.map(e => [e.term.toLowerCase(), e]))
  }, [terms])
}
