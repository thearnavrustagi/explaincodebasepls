import type { ILLMClient } from '@/adapters/llm/port'
import type { AgentOutput } from '@/core/types/pipeline'

const SLUG  = 'ecb-lld'
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 10_000

const SYSTEM = `You are a senior software engineer writing a Low-Level Design (LLD) document for a software system.

You will receive:
- <explanation>: a detailed architectural analysis of the codebase
- <file_tree>: the filtered file paths
- <repo_owner> and <repo_name>

Your job is to extract and document the concrete implementation details — schemas, types, interfaces, algorithms, and data models — as they actually exist in this codebase.

Produce a structured LLD markdown document with these sections:

# Low-Level Design: {repo_name}

## 1. Data Schemas & Types
For each major data entity, reproduce or reconstruct its type definition in a typed code block with the appropriate language tag (typescript, go, python, rust, etc.). Add a brief explanation of each field's purpose, constraints, and any derived/virtual fields. Format:

### EntityName
\`\`\`typescript
type EntityName = { ... }
\`\`\`
**Fields:**
- \`fieldName\` — what it stores, constraints, notes on nullability

## 2. Service & Interface Contracts
Key interfaces, abstract classes, or service contracts. Show the method signatures with parameter and return types. Explain the contract each method must satisfy.

## 3. Key Algorithms & Business Logic
The 3–5 most important pieces of non-trivial logic in the codebase. Step-by-step description of what each does, what its inputs and outputs are, and any critical edge cases or invariants.

## 4. Database Models & Queries
If the system has a database: the schema, relationships (FK constraints, indexes), and the most important queries. For ORM-based systems, show the model definitions.

## 5. Error Handling & Edge Cases
How the system handles failures: error types, retry logic, fallback behaviors, timeout policies. What a caller gets back when things go wrong.

## 6. Configuration & Environment
Key configuration parameters, their valid ranges, and what breaks if they're misconfigured. Environment variables and their purpose.

Rules:
- Extract real details from the codebase — do not invent types or schemas that aren't there
- If you can't see the exact implementation, clearly mark it as inferred: "// inferred from usage"
- Use the same language as the codebase (Go structs for Go, TypeScript interfaces for TS, etc.)
- Include the file path as a comment above each type definition
- Be precise: field names, types, and constraints matter here

Output only the markdown document starting with the # header.`

function buildPrompt(explanation: string, fileTree: string, owner: string, repo: string): string {
  return `<explanation>\n${explanation}\n</explanation>\n\n<file_tree>\n${fileTree}\n</file_tree>\n\n<repo_owner>${owner}</repo_owner>\n<repo_name>${repo}</repo_name>`
}

export async function runLldAgent(
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
  return { section: 'lld', content: content.trim(), durationMs: Date.now() - start }
}
