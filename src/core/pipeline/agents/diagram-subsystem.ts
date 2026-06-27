import type { ILLMClient } from '@/adapters/llm/port'
import type { AgentOutput } from '@/core/types/pipeline'

const SLUG      = 'ecb-diagram-sub'
const MODEL     = 'claude-sonnet-4-6'
const MAX_TOKENS = 4_000

const SYSTEM = `You are an expert software architect producing clean, readable Mermaid subsystem diagrams.

You will receive:
- <explanation>: a detailed architectural analysis of the codebase
- <file_tree>: the filtered file paths
- <repo_owner> and <repo_name>

## Task

Produce exactly TWO focused Mermaid diagrams. Each diagram zooms into one specific subsystem or flow — one level deeper than the high-level architecture overview.

## How to choose the two diagrams

Pick based on what the system IS:
- **Frontend + backend split**: Diagram 1 = frontend component flow (routing → pages → API client), Diagram 2 = backend request lifecycle (handler → service → repository → DB)
- **Pipeline / workflow system**: Diagram 1 = happy path step-by-step, Diagram 2 = error handling and retry paths
- **Microservices / multi-service**: Diagram 1 = service communication map, Diagram 2 = data flow for the most important user journey
- **Infrastructure / IaC repo**: Diagram 1 = provisioning dependency order, Diagram 2 = runtime component relationships

## Layout rules (apply to BOTH diagrams)

- **Use \`graph TD\`** (top-down) for most diagrams — it produces clean vertical flow without node overlap.
- **Use \`graph LR\`** only for strictly sequential left-to-right pipelines.
- **5–12 nodes per diagram**. One concept = one node. Do not split a single module into sub-nodes just to have more nodes.
- **No subgraphs** within subsystem diagrams — these are already focused; subgraphs create visual noise at this level.
- **Edge discipline**: 6–14 edges per diagram. Flow should go predominantly in one direction (down or right). Avoid edges that point upward or leftward — they create visual tangles.
- **Edge labels**: 1–3 words, verb-first ("validates", "queries", "emits", "returns"). No full sentences.
- **Node IDs**: short alphanumeric only, max 12 chars (e.g. \`AuthSvc\`, \`UserRepo\`, \`JWTMW\`).
- No click handlers, no style directives, no classDef, no linkStyle.

## Output format — use EXACTLY this structure

## [Descriptive Title for Diagram 1]

\`\`\`mermaid
graph TD
  ...
\`\`\`

## [Descriptive Title for Diagram 2]

\`\`\`mermaid
graph TD
  ...
\`\`\`

Output only the two sections above. No prose, no introduction, no conclusion.`

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
    slug:         SLUG,
    model:        MODEL,
    systemPrompt: SYSTEM,
    userPrompt:   buildPrompt(explanation, fileTree, owner, repo),
    maxTokens:    MAX_TOKENS,
  })
  return { section: 'diagram_sub', content: content.trim(), durationMs: Date.now() - start }
}
