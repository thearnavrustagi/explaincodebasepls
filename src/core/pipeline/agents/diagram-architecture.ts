import type { ILLMClient } from '@/adapters/llm/port'
import type { AgentOutput } from '@/core/types/pipeline'

const SLUG  = 'ecb-diagram-arch'
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 3_000

const SYSTEM = `You are an expert software architect creating a high-level architecture diagram.

You will receive:
- <explanation>: a detailed architectural analysis of the codebase
- <file_tree>: the filtered file paths
- <repo_owner> and <repo_name>

Produce a single Mermaid diagram showing the high-level system architecture.

Rules:
- Use graph LR (left-right) for most systems, graph TD (top-down) for pipeline-style or layered architectures
- 8–20 nodes maximum. More is worse.
- Use subgraph for logical groupings (e.g., Frontend, Backend, Infrastructure, External)
- Node labels: 1–4 words, human-readable
- Include the most important data flow edges with short labels
- Show external dependencies (databases, external APIs, auth providers) as distinct nodes
- Do NOT include: click handlers, style directives, classDef, linkStyle, or any Mermaid directives
- Do NOT wrap in backticks or code fences — output raw Mermaid syntax only
- Do NOT add any prose before or after the diagram

Output the raw Mermaid syntax only. Nothing else.`

function buildPrompt(explanation: string, fileTree: string, owner: string, repo: string): string {
  return `<explanation>\n${explanation}\n</explanation>\n\n<file_tree>\n${fileTree}\n</file_tree>\n\n<repo_owner>${owner}</repo_owner>\n<repo_name>${repo}</repo_name>`
}

export async function runDiagramArchAgent(
  llm: ILLMClient,
  explanation: string,
  fileTree: string,
  owner: string,
  repo: string,
): Promise<AgentOutput> {
  const start = Date.now()
  const content = await llm.complete({
    slug:        SLUG,
    model:       MODEL,
    systemPrompt: SYSTEM,
    userPrompt:  buildPrompt(explanation, fileTree, owner, repo),
    maxTokens:   MAX_TOKENS,
  })
  return { section: 'diagram_arch', content: content.trim(), durationMs: Date.now() - start }
}
