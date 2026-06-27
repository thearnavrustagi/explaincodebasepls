/**
 * Text post-processor — applied to all LLM output before storage and delivery.
 *
 * Add transformations here to fix systematic issues in model output.
 * Each transform is a pure string → string function; they run in order.
 */

type Transform = (text: string) => string

/** Replace " —" (space + em dash U+2014) and " --" with a comma. */
const noEmDash: Transform = (text) =>
  text
    .replace(/ —/g, ',')   // space + em dash  →  comma
    .replace(/ --(?!>)/g, ',')  // space + -- (but not --> arrows)  →  comma

/** Collapse multiple consecutive blank lines to at most two. */
const normalizeBlankLines: Transform = (text) =>
  text.replace(/\n{3,}/g, '\n\n')

const TRANSFORMS: Transform[] = [
  noEmDash,
  normalizeBlankLines,
]

/**
 * Run all post-processing transforms on a piece of LLM output.
 * Safe to call on Mermaid syntax, markdown, plain text, or ASCII diagrams.
 */
export function postprocess(text: string): string {
  return TRANSFORMS.reduce((t, fn) => fn(t), text)
}
