import type { ILLMClient } from '@/adapters/llm/port'

export const EXPLANATION_SLUG  = 'ecb-explanation'
export const EXPLANATION_MODEL = 'claude-opus-4-8'
export const MAX_EXPLANATION_TOKENS = 16_000

const EXPLANATION_SYSTEM = `You are a principal software engineer conducting a deep technical analysis of a software repository.

You will receive:
- <file_tree>...</file_tree> — filtered list of repository-relative file paths
- <readme>...</readme> — the repository README

Your task is to produce a comprehensive architectural explanation that will be used to generate detailed technical documentation including architecture diagrams, HLD, LLD, API flow diagrams, and a glossary.

Required coverage — address each of these explicitly:
1. **Subsystem ownership boundaries** — identify the major subsystems and what each owns/is responsible for
2. **Data flow direction** — how data moves between components; which flows are synchronous vs asynchronous; protocols used (HTTP, gRPC, WebSocket, message queue, etc.)
3. **Technology stack with rationale** — why each major technology choice was made (where inferable)
4. **API surface** — all major endpoints, their request/response shapes, and caller/callee relationships
5. **Data models and relationships** — key entities, their fields, and how they relate to each other
6. **Architectural patterns** — identify patterns in use (event-driven, CQRS, hexagonal/ports-adapters, layered, microservices, etc.)
7. **Frontend/backend boundary** — where the split is, what protocol they use to communicate
8. **External service dependencies** — third-party APIs, databases, queues, CDNs, auth providers
9. **Authentication and authorization model** — how the system handles identity and permissions
10. **Natural sub-project decomposition** — for monorepos or complex systems, identify the natural boundaries that would make sense as separate diagram subjects

Rules:
- Be concrete and repo-specific. Never speculate beyond what is visible in the file tree and README.
- If you cannot determine something, say so — don't invent.
- Use 12–20 well-structured sections or paragraphs.
- Do NOT use Mermaid syntax, JSON, or pseudo-code.
- Do not assume this is a web app — it could be any type of project.

Return only:
<explanation>
...your analysis here...
</explanation>`

function buildUserPrompt(fileTree: string, readme: string): string {
  return `<file_tree>\n${fileTree}\n</file_tree>\n\n<readme>\n${readme}\n</readme>`
}

export function extractExplanation(raw: string): string {
  const match = raw.match(/<explanation>([\s\S]*?)<\/explanation>/)
  const text = match?.[1]?.trim() ?? ''
  if (!text) {
    throw new Error('Explanation pass returned no usable output (missing <explanation> tags).')
  }
  return text
}

export async function runExplainPass(
  llm: ILLMClient,
  fileTree: string,
  readme: string,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  let fullText = ''
  for await (const chunk of llm.stream({
    slug:        EXPLANATION_SLUG,
    model:       EXPLANATION_MODEL,
    systemPrompt: EXPLANATION_SYSTEM,
    userPrompt:  buildUserPrompt(fileTree, readme),
    maxTokens:   MAX_EXPLANATION_TOKENS,
  })) {
    fullText += chunk.content
    onChunk?.(chunk.content)
  }
  return extractExplanation(fullText)
}
