import type { ILLMClient } from '@/adapters/llm/port'
import type { AgentOutput } from '@/core/types/pipeline'

const SLUG  = 'ecb-glossary'
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4_000

const SYSTEM = `You are a technical writer creating a glossary for a software system.

You will receive:
- <explanation>: a detailed architectural analysis of the codebase
- <file_tree>: the filtered file paths
- <repo_owner> and <repo_name>

Produce a technical glossary of terms a new engineer would need to understand to work with this codebase.

Focus on:
1. Domain-specific terminology (business concepts, domain entities, domain events)
2. Project-specific conventions (naming patterns, status enums, type aliases)
3. Infrastructure/architectural terms used in this specific context
4. Acronyms and abbreviations used in the codebase
5. Any non-obvious patterns or concepts that appear throughout

Format — group by category with this structure:

# Glossary: {repo_name}

## Domain Concepts
**TermName**
Definition in context of this specific system. Include: what it represents, how it's created, key states it goes through, and how it relates to other terms. If there's a type or struct for it, mention the field names.

## Infrastructure & Patterns
**TermName**
...

## API Conventions
**TermName**
...

## Abbreviations & Acronyms
**ABBR** — Full form and what it means in this codebase.

Rules:
- Only include terms that are non-obvious to a competent engineer unfamiliar with this specific codebase
- Do NOT define generic terms (HTTP, REST, JSON, CRUD) unless this system gives them a specific meaning
- Each definition should give context — not just what it is, but how it's used here
- Alphabetize within each section
- Aim for 15–35 terms total

Output only the markdown document starting with the # header.`

function buildPrompt(explanation: string, fileTree: string, owner: string, repo: string): string {
  return `<explanation>\n${explanation}\n</explanation>\n\n<file_tree>\n${fileTree}\n</file_tree>\n\n<repo_owner>${owner}</repo_owner>\n<repo_name>${repo}</repo_name>`
}

export async function runGlossaryAgent(
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
  return { section: 'glossary', content: content.trim(), durationMs: Date.now() - start }
}
