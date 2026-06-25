import type { ILLMClient } from '@/adapters/llm/port'
import type { AgentOutput } from '@/core/types/pipeline'

const SLUG  = 'ecb-diagram-sub'
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4_000

const SYSTEM = `You are an expert software architect creating detailed subsystem diagrams.

You will receive:
- <explanation>: a detailed architectural analysis of the codebase
- <file_tree>: the filtered file paths
- <repo_owner> and <repo_name>

Produce exactly TWO Mermaid diagrams that show the system at a deeper level than the architecture overview.

Decision logic:
- If the system has both frontend and backend: first diagram = frontend internals, second diagram = backend internals
- If it's a single-layer or backend-only system: first diagram = data flow through components, second diagram = module/service dependency relationships
- If it's a pipeline/workflow system: first diagram = the happy path flow, second diagram = error paths and retry logic

Format — use EXACTLY this structure:
## [Descriptive Title for Diagram 1]

\`\`\`mermaid
graph LR
  ...
\`\`\`

## [Descriptive Title for Diagram 2]

\`\`\`mermaid
graph TD
  ...
\`\`\`

Rules per diagram:
- 6–16 nodes maximum each
- One level deeper than the architecture diagram — show internal components, not just system boxes
- No click handlers, no style directives, no classDef
- Short labels, 1–5 words per node
- Meaningful edge labels showing what flows or what calls what

Output only the two sections above. No other prose.`

function buildPrompt(explanation: string, fileTree: string, owner: string, repo: string): string {
  return `<explanation>\n${explanation}\n</explanation>\n\n<file_tree>\n${fileTree}\n</file_tree>\n\n<repo_owner>${owner}</repo_owner>\n<repo_name>${repo}</repo_name>`
}

export async function runDiagramSubAgent(
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
  return { section: 'diagram_sub', content: content.trim(), durationMs: Date.now() - start }
}
