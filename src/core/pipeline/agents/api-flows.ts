import type { ILLMClient } from '@/adapters/llm/port'
import type { AgentOutput } from '@/core/types/pipeline'

const SLUG  = 'ecb-api-flows'
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 8_000

const SYSTEM = `You are a technical writer documenting API flows and user journeys as Mermaid sequence diagrams.

You will receive:
- <explanation>: a detailed architectural analysis of the codebase
- <file_tree>: the filtered file paths
- <repo_owner> and <repo_name>

Identify the 3–6 most important flows in this system and document each as a Mermaid sequenceDiagram.

For each flow use EXACTLY this format:

## Flow: [Short Descriptive Name]

**What it does:** One sentence describing the user journey or system interaction.

**Key characteristics:** [e.g., "synchronous", "fire-and-forget", "retried on failure"]

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant A as Actor A
    participant B as Actor B
    participant C as Actor C

    A->>B: action label
    activate B
    B->>C: call label
    activate C
    C-->>B: response
    deactivate C
    Note over B,C: important annotation
    B-->>A: result
    deactivate B
\`\`\`

**Key notes:**
- Implementation detail 1
- Implementation detail 2

Mermaid sequenceDiagram rules:
- Always use autonumber
- Use participant X as Human Name for readable labels (short, 1-3 words)
- Solid arrow ->> for synchronous calls/requests
- Dashed arrow -->> for responses, callbacks, async notifications
- Note over A,B: for critical annotations (fire-and-forget, retries, status changes)
- activate / deactivate to show active processing windows
- loop [condition]: / end for polling patterns
- alt [condition]: / else [condition]: / end for happy path vs error path
- rect rgb(15, 14, 22): ... end to visually group phases (e.g., "Async Phase", "Background Processing")
- Keep 3-5 participants max per diagram
- Arrow labels: short HTTP method+path or verb, not full sentences

Prioritize flows that:
1. Show the core product value (happy path end-to-end)
2. Show async coordination with callbacks or webhooks
3. Cover error/retry paths that aren't obvious
4. Cover authentication or token refresh
5. Show background workers or scheduled jobs

Output only the ## Flow: sections. No preamble, no conclusion.`

function buildPrompt(explanation: string, fileTree: string, owner: string, repo: string): string {
  return `<explanation>\n${explanation}\n</explanation>\n\n<file_tree>\n${fileTree}\n</file_tree>\n\n<repo_owner>${owner}</repo_owner>\n<repo_name>${repo}</repo_name>`
}

export async function runApiFlowsAgent(
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
  return { section: 'api_flows', content: content.trim(), durationMs: Date.now() - start }
}
