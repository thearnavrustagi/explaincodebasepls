/**
 * Escape LaTeX special characters in plain text (not inside code/verbatim blocks).
 * Handles the 10 LaTeX specials + a few common Unicode codepoints that
 * pdflatex with T1+utf8 encoding would otherwise choke on.
 */
export function escLaTeX(text: string): string {
  return (
    text
      // Order matters: backslash first so later replacements don't double-escape
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/&/g,  '\\&')
      .replace(/%/g,  '\\%')
      .replace(/\$/g, '\\$')
      .replace(/#/g,  '\\#')
      .replace(/_/g,  '\\_')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/~/g,  '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/</g,  '\\textless{}')
      .replace(/>/g,  '\\textgreater{}')
      // Common Unicode — normalize before pdflatex sees them
      .replace(/—/g, '---')
      .replace(/–/g, '--')
      .replace(/…/g, '\\ldots{}')
      .replace(/“/g, '``')
      .replace(/”/g, "''")
      .replace(/‘/g, '`')
      .replace(/’/g, "'")
      .replace(/ /g, '~')
      .replace(/•/g, '\\textbullet{}')
      .replace(/→/g, '\\(\\rightarrow\\)')
      .replace(/←/g, '\\(\\leftarrow\\)')
      .replace(/↑/g, '\\(\\uparrow\\)')
      .replace(/↓/g, '\\(\\downarrow\\)')
  )
}
