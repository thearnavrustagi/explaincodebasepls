/**
 * Convert a Markdown string to LaTeX.
 *
 * Handles the subset we actually emit:
 *   headings h1-h4, bold, italic, inline code, fenced code blocks,
 *   bullet lists, ordered lists, blockquotes, tables, horizontal rules,
 *   and bare text paragraphs.
 *
 * All text outside code spans/blocks is run through escLaTeX.
 * This is intentionally a lightweight handwritten converter — we don't
 * need a full CommonMark spec; just whatever our LLM agents produce.
 */
import { escLaTeX } from './escape'

// Level offset: Markdown h1 → LaTeX \section, h2 → \subsection, etc.
const HEADING_CMDS = ['section', 'subsection', 'subsubsection', 'paragraph']

function headingCmd(level: number): string {
  return HEADING_CMDS[Math.min(level - 1, HEADING_CMDS.length - 1)] ?? 'paragraph'
}

/** Convert an inline Markdown span (no block structure) to LaTeX. */
function inlineToLatex(text: string): string {
  // Process inline code first (don't escape inside it)
  const parts: string[] = []
  const CODE_RE = /`([^`]+)`/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = CODE_RE.exec(text)) !== null) {
    if ((m.index ?? 0) > last) {
      parts.push(inlineMarkup(text.slice(last, m.index)))
    }
    parts.push(`\\texttt{${escLaTeX(m[1])}}`)
    last = (m.index ?? 0) + m[0].length
  }
  if (last < text.length) parts.push(inlineMarkup(text.slice(last)))
  return parts.join('')
}

function inlineMarkup(text: string): string {
  return (
    escLaTeX(text)
      // Bold **…** or __…__
      .replace(/\*\*(.+?)\*\*/g, (_, t) => `\\textbf{${t}}`)
      .replace(/__(.+?)__/g,     (_, t) => `\\textbf{${t}}`)
      // Italic *…* or _…_
      .replace(/\*(.+?)\*/g, (_, t) => `\\textit{${t}}`)
      .replace(/_(.+?)_/g,   (_, t) => `\\textit{${t}}`)
  )
}

/** Convert a table row (pipe-delimited) to LaTeX tabular cells. */
function tableRowToLatex(row: string, bold = false): string {
  const cells = row
    .split('|')
    .filter((_, i, arr) => i > 0 && i < arr.length - 1) // strip leading/trailing empty
    .map(c => {
      const t = inlineToLatex(c.trim())
      return bold ? `\\textbf{${t}}` : t
    })
  return cells.join(' & ') + ' \\\\'
}

/** Turn a Markdown table block into a LaTeX longtable. */
function tableToLatex(lines: string[]): string {
  if (lines.length < 2) return ''
  const header = lines[0]
  // lines[1] is the separator (---)
  const body = lines.slice(2)

  const colCount = (header.match(/\|/g) ?? []).length - 1
  const colSpec  = Array.from({ length: colCount }, () => 'l').join(' | ')

  const rows = [
    tableRowToLatex(header, true) + ' \\hline',
    ...body.map(r => tableRowToLatex(r)),
  ].join('\n    ')

  return [
    `\\begin{longtable}{| ${colSpec} |}`,
    '  \\hline',
    `    ${rows}`,
    '  \\hline',
    '\\end{longtable}',
  ].join('\n')
}

export function markdownToLatex(md: string): string {
  const lines   = md.split('\n')
  const output: string[] = []
  let   i = 0

  while (i < lines.length) {
    const line = lines[i]

    // ── Fenced code block ────────────────────────────────────────────────────
    const fenceMatch = line.match(/^```(\w*)/)
    if (fenceMatch) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // consume closing ```
      output.push(`\\begin{lstlisting}\n${codeLines.join('\n')}\n\\end{lstlisting}`)
      continue
    }

    // ── Heading ──────────────────────────────────────────────────────────────
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text  = inlineToLatex(headingMatch[2].trim())
      output.push(`\\${headingCmd(level)}{${text}}`)
      i++
      continue
    }

    // ── Horizontal rule ──────────────────────────────────────────────────────
    if (line.match(/^[-*_]{3,}\s*$/)) {
      output.push('\\hrulefill')
      i++
      continue
    }

    // ── Blockquote ───────────────────────────────────────────────────────────
    if (line.startsWith('> ')) {
      const blockLines: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        blockLines.push(lines[i].slice(2))
        i++
      }
      output.push(
        `\\begin{quote}\n${blockLines.map(l => inlineToLatex(l)).join('\n\n')}\n\\end{quote}`,
      )
      continue
    }

    // ── Table ────────────────────────────────────────────────────────────────
    if (line.startsWith('|') && i + 1 < lines.length && lines[i + 1].match(/^\|[\s|:-]+\|/)) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      output.push(tableToLatex(tableLines))
      continue
    }

    // ── Bullet list ──────────────────────────────────────────────────────────
    if (line.match(/^[-*+]\s+/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*+]\s+/)) {
        items.push(`  \\item ${inlineToLatex(lines[i].replace(/^[-*+]\s+/, ''))}`)
        i++
      }
      output.push(`\\begin{itemize}\n${items.join('\n')}\n\\end{itemize}`)
      continue
    }

    // ── Ordered list ─────────────────────────────────────────────────────────
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(`  \\item ${inlineToLatex(lines[i].replace(/^\d+\.\s+/, ''))}`)
        i++
      }
      output.push(`\\begin{enumerate}\n${items.join('\n')}\n\\end{enumerate}`)
      continue
    }

    // ── Blank line → paragraph break ─────────────────────────────────────────
    if (line.trim() === '') {
      output.push('')
      i++
      continue
    }

    // ── Regular paragraph text ───────────────────────────────────────────────
    const paraLines: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^[#>\-*+`|]/) && !lines[i].match(/^\d+\./)) {
      paraLines.push(inlineToLatex(lines[i]))
      i++
    }
    if (paraLines.length) {
      output.push(paraLines.join('\n'))
    }
  }

  return output.join('\n\n')
}
