import type { ILLMClient } from '@/adapters/llm/port'
import type { AgentOutput } from '@/core/types/pipeline'

const SLUG      = 'ecb-diagram-arch'
const MODEL     = 'claude-sonnet-4-6'
const MAX_TOKENS = 4_500

const SYSTEM = `You are an expert software architect producing a clean, readable Mermaid architecture diagram with a glossary.

You will receive:
- <explanation>: a detailed architectural analysis of the codebase
- <file_tree>: the filtered file paths
- <repo_owner> and <repo_name>

## Diagram requirements

Produce a SINGLE Mermaid diagram. The goal is a crisp, high-signal overview a human can read in 30 seconds.

### Layout strategy (choose one, commit to it)
- Use \`graph TD\` (top-down) for systems with clear layers: user-facing → application → data. This is the DEFAULT.
- Use \`graph LR\` ONLY for pure pipeline/workflow systems where left-to-right data flow is the dominant story.
- Never mix subgraph orientations. Pick one and use it consistently.

### Structure rules
- **6–14 nodes maximum**. Fewer is better. Collapse implementation details into single representative nodes.
- **Subgraphs**: Use 2–4 subgraphs for major boundaries (e.g. "Client", "Backend", "Infrastructure", "External"). Every node must belong to a subgraph.
- **Layer discipline**: In a TD diagram, all nodes in a subgraph should be at roughly the same depth. Do NOT put a bottom-layer node (DB) inside a top-layer subgraph (Frontend).
- **Edge direction**: Edges should generally flow downward (TD) or rightward (LR). Avoid backwards edges — they cause Mermaid to produce crossing, overlapping layouts.
- **Max edges**: 8–16 edges. Only show the architecturally significant flows. Omit obvious/trivial connections.
- **Edge labels**: 1–4 words. Verb-first ("calls", "stores", "reads", "triggers"). No sentences.

### Node rules
- Node labels: 1–4 words, human-readable, no file paths
- Use rectangle nodes \`NodeID[Label]\` by default
- Use \`NodeID[(Label)]\` for databases/stores only
- Use \`NodeID([Label])\` for external services/cloud only

### Hard bans
- No click handlers, no style directives, no classDef, no linkStyle
- No node IDs longer than 15 characters (causes layout issues)

## Output format — use EXACTLY this structure

\`\`\`mermaid
graph TD
  ...
\`\`\`

### Glossary

- **[Node Label]**: [1–2 sentence plain-English description of what this component does in this specific codebase]
- **[Node Label]**: ...

Rules for the glossary:
- List EVERY node label that appears in the diagram (include subgraph boundary nodes too)
- Use the exact same label text as in the diagram
- Keep each description to 1–2 sentences, specific to this codebase — not a generic definition
- Order entries top-to-bottom / left-to-right as they appear in the diagram

Output only the fenced diagram block and the glossary section above. No other prose.`

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
    slug:         SLUG,
    model:        MODEL,
    systemPrompt: SYSTEM,
    userPrompt:   buildPrompt(explanation, fileTree, owner, repo),
    maxTokens:    MAX_TOKENS,
  })
  return { section: 'diagram_arch', content: content.trim(), durationMs: Date.now() - start }
}
