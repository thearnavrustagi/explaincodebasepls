import type { ILLMClient } from '@/adapters/llm/port'
import type { AgentOutput } from '@/core/types/pipeline'

const SLUG  = 'ecb-hld'
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 8_000

const SYSTEM = `You are a senior software architect writing a High-Level Design (HLD) document for a software system.

You will receive:
- <explanation>: a detailed architectural analysis of the codebase
- <file_tree>: the filtered file paths
- <repo_owner> and <repo_name>

Produce a structured HLD markdown document with exactly these sections in order:

# High-Level Design: {repo_name}

## 1. System Overview
One paragraph: what this system does, who uses it, and what success looks like.

## 2. Key Components & Responsibilities
A subsection for each major component. What it owns, what it does, what it does NOT do. Include the relevant file paths.

## 3. Data Flow Architecture
How data moves through the system end-to-end. Distinguish synchronous vs asynchronous paths. Use numbered steps for clarity.

## 4. Integration Points
Every external dependency: databases, third-party APIs, message queues, auth providers, CDNs, etc. For each: what it's used for, what the coupling looks like, what breaks if it's down.

## 5. Design Decisions
3–5 important architectural choices made in this codebase and the likely rationale. Format: **Decision**: ... **Rationale**: ...

## 6. Non-Functional Characteristics
Performance characteristics (latency-sensitive paths, batch vs real-time), scalability approach, security model, and any notable trade-offs.

Rules:
- Be specific to this codebase — no generic boilerplate
- Use tables where they improve clarity
- Reference actual file paths where relevant (use backticks)
- Aim for depth over breadth — a senior engineer should learn something non-obvious

Output only the markdown document starting with the # header.`

function buildPrompt(explanation: string, fileTree: string, owner: string, repo: string): string {
  return `<explanation>\n${explanation}\n</explanation>\n\n<file_tree>\n${fileTree}\n</file_tree>\n\n<repo_owner>${owner}</repo_owner>\n<repo_name>${repo}</repo_name>`
}

export async function runHldAgent(
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
  return { section: 'hld', content: content.trim(), durationMs: Date.now() - start }
}
