# GitDiagram — AI Pipeline Reference

> A portable reference for the two-pass LLM architecture used to convert a repository file tree + README into a validated, structured diagram graph. Everything below is self-contained and can be transplanted to any codebase.

---

## Table of Contents

1. [Pipeline Overview](#1-pipeline-overview)
2. [Input Preparation & Guards](#2-input-preparation--guards)
3. [Pass 1 — Explanation Prompt](#3-pass-1--explanation-prompt)
4. [Pass 2 — Graph Prompt](#4-pass-2--graph-prompt)
5. [Output Schema (DiagramGraph)](#5-output-schema-diagramgraph)
6. [Validation & Retry Loop](#6-validation--retry-loop)
7. [Token & Cost Guards](#7-token--cost-guards)
8. [LLM Call Configuration](#8-llm-call-configuration)
9. [End-to-End Flow Pseudocode](#9-end-to-end-flow-pseudocode)

---

## 1. Pipeline Overview

The pipeline converts raw repository data into a validated structured graph in **two sequential LLM passes**, with a **validation + retry loop** on the second pass.

```
[File Tree] + [README]
        │
        ▼
  ┌─────────────┐
  │  Guard:     │  Token count check (hard limits before any LLM call)
  │  Input Size │
  └──────┬──────┘
         │
         ▼
  ┌─────────────────────┐
  │  Pass 1: Explanation │  System: SYSTEM_FIRST_PROMPT
  │  (streaming)         │  → plain-English architecture summary
  └──────────┬──────────┘
             │  <explanation>...</explanation>
             ▼
  ┌─────────────────────┐
  │  Pass 2: Graph       │  System: SYSTEM_GRAPH_PROMPT
  │  (structured output) │  → DiagramGraph JSON (nodes, edges, groups)
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────────┐
  │  Validate DiagramGraph   │  Schema check + semantic checks (paths, IDs)
  │  → retry with feedback   │  Up to MAX_GRAPH_ATTEMPTS = 3
  └──────────┬──────────────┘
             │  valid graph
             ▼
  ┌─────────────────────┐
  │  Compile to output   │  Graph → Mermaid / your target format
  └─────────────────────┘
```

---

## 2. Input Preparation & Guards

### 2a. File Tree Filtering

Before any LLM call, strip noise from the raw file tree. The following patterns are excluded:

```
node_modules/   vendor/        venv/          __pycache__/
.cache/         .tmp/          .vscode/       .idea/
*.min.*         *.pyc  *.pyo  *.pyd
*.so  *.dll  *.class
*.jpg  *.jpeg  *.png  *.gif  *.ico  *.svg  *.ttf  *.woff  *.webp
yarn.lock  poetry.lock  *.log
```

The filtered tree is a flat newline-delimited list of repo-relative paths:

```
src/app/page.tsx
src/server/generate/prompts.ts
backend/app/main.py
...
```

### 2b. Input Format for LLM Calls

Both passes receive inputs wrapped in XML-style tags. This makes it unambiguous for the model where each piece of data starts and ends:

```
<file_tree>
src/app/page.tsx
src/server/generate/prompts.ts
...
</file_tree>

<readme>
# My Project
...
</readme>
```

For Pass 2, additional context is added:

```
<explanation>
... (output from Pass 1) ...
</explanation>

<file_tree>
...
</file_tree>

<repo_owner>octocat</repo_owner>
<repo_name>my-repo</repo_name>

<!-- Only present on retry attempts: -->
<previous_graph>{ ... }</previous_graph>
<validation_feedback>
nodes.2.path: Path "src/missing.ts" does not exist in the repository file tree.
edges.0.to: Unknown target node id "nonexistent".
</validation_feedback>
```

---

## 3. Pass 1 — Explanation Prompt

**Purpose:** Convert raw file tree + README into a concise, human-readable architecture explanation that Pass 2 can reason from.

**Mode:** Streaming text completion  
**Reasoning effort:** `medium`  
**Max output tokens:** `12,000`

### System Prompt

```
You are a principal software engineer analyzing a repository in order to explain its architecture clearly.

You will receive:
- <file_tree>...</file_tree>
- <readme>...</readme>

Your job is to explain the repository in a way that helps another engineer draw an accurate architecture diagram for any type of project.

Requirements:
- Be concrete and repo-specific.
- Identify the main subsystems, data flows, and important boundaries.
- Mention relevant technologies, runtimes, tooling, infrastructure, or external services only when they materially affect the architecture.
- Keep the explanation concise and high-signal. Prefer 8-16 short sections or paragraphs over a long essay.
- Avoid repeating the same subsystem in multiple ways.
- Avoid Mermaid syntax, JSON, pseudo-code, or implementation instructions.
- Do not assume the project is a web app. It could be any repo type.

Return only:
<explanation>
...
</explanation>
```

### Output Extraction

Parse the tagged section from the raw response:

```ts
function extractTaggedSection(text: string, tag: string): string {
  const match = text.match(new RegExp(`<${tag}>([\s\S]*?)<\/${tag}>`));
  return match?.[1]?.trim() ?? "";
}

const explanation = extractTaggedSection(rawResponse, "explanation");
if (!explanation.trim()) {
  throw new Error("Explanation generation returned no usable output.");
}
```

---

## 4. Pass 2 — Graph Prompt

**Purpose:** Convert the explanation + file tree into a structured JSON graph that maps architecture concepts to real file paths.

**Mode:** Structured output (JSON schema enforcement via tool/response_format)  
**Reasoning effort:** `low`  
**Max output tokens:** `6,000`

### System Prompt

```
You are a repository-to-graph planner.

You will receive:
- <explanation>...</explanation>
- <file_tree>...</file_tree>
- <repo_owner>...</repo_owner>
- <repo_name>...</repo_name>
- Optional <previous_graph>...</previous_graph>
- Optional <validation_feedback>...</validation_feedback>

Your task is to produce a graph representation of the repository architecture.
The goal is not completeness. The goal is a crisp, high-signal overview that a human can understand quickly.

Rules:
- Return a complete overview of the repository, not a patch.
- The graph must work for any repo type. Do not assume web-app conventions.
- Use only the JSON schema requested by the caller.
- Every field defined by the schema must be present in the JSON output. When a field does not apply, set it to null rather than omitting it.
- Do not emit Mermaid syntax.
- Do not emit URLs, click lines, styles, classes, layout directives, or explanations outside the JSON.
- Keep groups single-level only.
- Use repo-relative file paths only when they exactly exist in the provided file tree.
- The "type" field must stay freeform and repo-specific.
- Make the "type" field short but informative, because it may be shown as secondary detail in the rendered node.
- The optional "shape" field is only a rendering hint. Use it sparingly.
- Prefer major subsystems, boundaries, and flows over implementation details.
- Collapse repeated internals into one representative node when possible.
- Do not create nodes for tests, tiny helper modules, config files, or leaf utilities unless they are architecturally central.
- Use short human labels. Prefer 1-4 words per node label.
- Use groups only when they make the diagram easier to scan.
- Include one meaningful layer below the top-level systems by default.
- When a subsystem is central to how the repo works, break it into 2-4 internal nodes instead of one black box.
- Prefer useful decomposition over broad aggregation.
- For multi-runtime, multi-service, or pipeline-heavy repos, show the major internal stages of each runtime or pipeline rather than summarizing each as one node.
- Prefer components that move data, coordinate execution, or define important boundaries.
- Favor 14-24 nodes for most repos. Smaller is better if it still captures the architecture.
- Favor 0-8 groups.
- Favor 10-34 edges.
- The output should feel like an opinionated architecture summary, not an inventory dump.

If validation feedback is provided, fix the graph so that every issue is resolved while preserving the intended architecture.
```

---

## 5. Output Schema (DiagramGraph)

The schema enforced on Pass 2's structured output. Adapt field names/constraints to your use case.

### Limits

```ts
MAX_GRAPH_GROUPS    = 10
MAX_GRAPH_NODES     = 34
MAX_GRAPH_EDGES     = 48
MAX_GRAPH_ATTEMPTS  = 3   // max retry attempts before giving up

MAX_GRAPH_LABEL_LENGTH       = 72   // chars
MAX_GRAPH_TYPE_LENGTH        = 72
MAX_GRAPH_DESCRIPTION_LENGTH = 240
MAX_GRAPH_PATH_LENGTH        = 512
```

### Zod Schema (TypeScript)

```ts
import { z } from "zod";

const nodeShapeSchema = z.enum(["box", "database", "queue", "document", "circle", "hexagon"]);
const edgeStyleSchema = z.enum(["solid", "dashed"]);

const groupSchema = z.object({
  id:          z.string().trim().regex(/^[a-z][a-z0-9_]*$/),
  label:       z.string().trim().min(1).max(72),
  description: z.string().trim().max(240).nullable(),
});

const nodeSchema = z.object({
  id:          z.string().trim().regex(/^[a-z][a-z0-9_]*$/),
  label:       z.string().trim().min(1).max(72),
  type:        z.string().trim().min(1).max(72),   // freeform, repo-specific
  description: z.string().trim().max(240).nullable(),
  groupId:     z.string().trim().regex(/^[a-z][a-z0-9_]*$/).nullable(),
  path:        z.string().trim().min(1).max(512).nullable(), // repo-relative file path
  shape:       nodeShapeSchema.nullable(),
});

const edgeSchema = z.object({
  from:        z.string().trim().regex(/^[a-z][a-z0-9_]*$/),
  to:          z.string().trim().regex(/^[a-z][a-z0-9_]*$/),
  label:       z.string().trim().min(1).max(72).nullable(),
  description: z.string().trim().max(240).nullable(),
  style:       edgeStyleSchema.nullable(),
});

export const diagramGraphSchema = z.object({
  groups: z.array(groupSchema).max(10),
  nodes:  z.array(nodeSchema).min(1).max(34),
  edges:  z.array(edgeSchema).max(48),
});

export type DiagramGraph = z.infer<typeof diagramGraphSchema>;
```

### Example JSON Output

```json
{
  "groups": [
    { "id": "frontend", "label": "Frontend", "description": null },
    { "id": "backend",  "label": "Backend API", "description": null }
  ],
  "nodes": [
    { "id": "ui",        "label": "Web UI",          "type": "Next.js app",    "description": null, "groupId": "frontend", "path": "src/app/page.tsx",            "shape": null },
    { "id": "api",       "label": "Generate API",     "type": "Route handler",  "description": null, "groupId": "backend",  "path": "src/app/api/generate/stream/route.ts", "shape": null },
    { "id": "llm",       "label": "LLM Service",      "type": "OpenAI wrapper", "description": null, "groupId": "backend",  "path": "src/server/generate/openai.ts", "shape": null },
    { "id": "storage",   "label": "Diagram Store",    "type": "Cloudflare R2",  "description": null, "groupId": null,       "path": null,                          "shape": "database" }
  ],
  "edges": [
    { "from": "ui",  "to": "api",     "label": "POST /generate/stream", "description": null, "style": "solid" },
    { "from": "api", "to": "llm",     "label": "explain + graph",       "description": null, "style": "solid" },
    { "from": "api", "to": "storage", "label": "save artifact",         "description": null, "style": "dashed" }
  ]
}
```

---

## 6. Validation & Retry Loop

After Pass 2 returns a graph, run two layers of validation before accepting it.

### Layer 1 — Schema Validation (Zod)

Parse the raw JSON output against the schema. On failure, collect all field-level issues.

```ts
function parseDiagramGraph(rawOutput: string): { graph: DiagramGraph | null; issues: Issue[] } {
  try {
    const parsed = JSON.parse(rawOutput);
    const result = diagramGraphSchema.safeParse(parsed);
    if (!result.success) {
      return {
        graph: null,
        issues: result.error.issues.map(i => ({ path: i.path.join(".") || "graph", message: i.message })),
      };
    }
    return { graph: result.data, issues: [] };
  } catch (err) {
    return {
      graph: null,
      issues: [{ path: "graph", message: err instanceof Error ? err.message : "Not valid JSON." }],
    };
  }
}
```

### Layer 2 — Semantic Validation

Check the graph's internal consistency and that all file paths actually exist in the repository.

```ts
function buildFileTreeLookup(fileTree: string): Set<string> {
  return new Set(fileTree.split("\n").map(s => s.trim()).filter(Boolean));
}

function validateDiagramGraph(graph: DiagramGraph, fileTreeLookup: Set<string>): ValidationResult {
  const issues: Issue[] = [];
  const groupIds = new Set<string>();
  const nodeIds  = new Set<string>();

  // 1. Duplicate group IDs
  for (const [i, group] of graph.groups.entries()) {
    if (groupIds.has(group.id))
      issues.push({ path: `groups.${i}.id`, message: `Duplicate group id "${group.id}".` });
    groupIds.add(group.id);
  }

  // 2. Node checks
  for (const [i, node] of graph.nodes.entries()) {
    // Duplicate node IDs
    if (nodeIds.has(node.id))
      issues.push({ path: `nodes.${i}.id`, message: `Duplicate node id "${node.id}".` });
    nodeIds.add(node.id);

    // groupId references a real group
    if (node.groupId && !groupIds.has(node.groupId))
      issues.push({ path: `nodes.${i}.groupId`, message: `Unknown group id "${node.groupId}" for node "${node.id}".` });

    // path actually exists in the file tree
    if (node.path && !fileTreeLookup.has(node.path))
      issues.push({ path: `nodes.${i}.path`, message: `Path "${node.path}" does not exist in the repository file tree.` });
  }

  // 3. Edge endpoint references
  for (const [i, edge] of graph.edges.entries()) {
    if (!nodeIds.has(edge.from))
      issues.push({ path: `edges.${i}.from`, message: `Unknown source node id "${edge.from}".` });
    if (!nodeIds.has(edge.to))
      issues.push({ path: `edges.${i}.to`,   message: `Unknown target node id "${edge.to}".` });
  }

  return { valid: issues.length === 0, issues };
}
```

### Retry Strategy

Feed validation failures back into Pass 2 as `<validation_feedback>` and `<previous_graph>` so the model knows exactly what to fix. Retry up to `MAX_GRAPH_ATTEMPTS` times.

```ts
const fileTreeLookup = buildFileTreeLookup(fileTree);
let validGraph = null;
let validationFeedback: string | undefined;
let previousGraphRaw: string | undefined;

for (let attempt = 1; attempt <= MAX_GRAPH_ATTEMPTS; attempt++) {
  const { output: graph, rawText } = await generateStructuredOutput({
    systemPrompt: SYSTEM_GRAPH_PROMPT,
    userPrompt: toTaggedMessage({
      explanation,
      file_tree: fileTree,
      repo_owner: username,
      repo_name: repo,
      previous_graph: previousGraphRaw,        // undefined on first attempt
      validation_feedback: validationFeedback, // undefined on first attempt
    }),
    schema: diagramGraphSchema,
  });

  const validation = validateDiagramGraph(graph, fileTreeLookup);

  if (!validation.valid) {
    // Format issues as "path: message" lines and feed back on next attempt
    validationFeedback = validation.issues.map(i => `${i.path}: ${i.message}`).join("\n");
    previousGraphRaw   = rawText;
    continue;
  }

  validGraph = graph;
  break;
}

if (!validGraph) {
  throw new Error(`Graph failed validation after ${MAX_GRAPH_ATTEMPTS} attempts.\n${validationFeedback}`);
}
```

---

## 7. Token & Cost Guards

These guards fire **before** any LLM call to fail fast on inputs that are too large.

```ts
const FREE_INPUT_TOKEN_LIMIT = 100_000;   // soft limit: require user's own API key above this
const HARD_INPUT_TOKEN_LIMIT = 195_000;   // hard limit: reject entirely above this

// Estimated after fetching github data, before any LLM call
const tokenCount = await countTokens(fileTree + readme);

if (tokenCount > HARD_INPUT_TOKEN_LIMIT) {
  throw new Error("Repository is too large (>195k tokens) for analysis.");
}

if (tokenCount > FREE_INPUT_TOKEN_LIMIT && !userHasOwnApiKey) {
  throw new Error(`Input exceeds ${FREE_INPUT_TOKEN_LIMIT.toLocaleString()} tokens. Provide your own API key.`);
}
```

### Max Output Token Budgets

Set conservative caps per pass to bound cost and prevent runaway outputs:

| Pass | Cap |
|---|---|
| Pass 1 (explanation) | 12,000 output tokens |
| Pass 2 (graph) | 6,000 output tokens per attempt |

---

## 8. LLM Call Configuration

### Pass 1 — Streaming Completion

```ts
const stream = await streamCompletion({
  systemPrompt: SYSTEM_FIRST_PROMPT,
  userPrompt:   toTaggedMessage({ file_tree: fileTree, readme }),
  reasoningEffort:  "medium",   // explanation benefits from reasoning
  maxOutputTokens:  12_000,
});

let fullText = "";
for await (const chunk of stream) {
  fullText += chunk;
  // optionally stream chunks to the client
}
```

### Pass 2 — Structured Output

```ts
const { output: graph } = await generateStructuredOutput({
  systemPrompt:     SYSTEM_GRAPH_PROMPT,
  userPrompt:       toTaggedMessage({ ... }),
  schema:           diagramGraphSchema,
  schemaName:       "diagram_graph",
  reasoningEffort:  "low",    // graph planning is more mechanical
  maxOutputTokens:  6_000,
});
// `output` is already a validated DiagramGraph — no JSON.parse needed
```

### Reasoning Effort Rationale

| Pass | Effort | Why |
|---|---|---|
| Explanation | `medium` | Open-ended synthesis, benefits from deeper reasoning |
| Graph | `low` | Constrained structured output following clear rules — cheaper is fine |

---

## 9. End-to-End Flow Pseudocode

```
function generateDiagram(fileTree, readme, username, repo):

  # --- Input guards ---
  filteredTree = filterFileTree(fileTree)         # strip noise
  tokenCount   = countTokens(filteredTree + readme)

  if tokenCount > HARD_INPUT_TOKEN_LIMIT:
    fail("Repository too large")
  if tokenCount > FREE_INPUT_TOKEN_LIMIT and not userHasOwnKey:
    fail("Provide your own API key for large repos")

  # --- Pass 1: Explanation ---
  explanationRaw = streamCompletion(
    system = SYSTEM_FIRST_PROMPT,
    user   = tagged({ file_tree: filteredTree, readme }),
    effort = "medium",
    maxOutputTokens = 12_000,
  )
  explanation = extractTag(explanationRaw, "explanation")
  if not explanation:
    fail("Explanation pass returned empty output")

  # --- Pass 2: Graph (with retry loop) ---
  lookup = buildFileTreeLookup(filteredTree)
  validGraph         = null
  validationFeedback = null
  previousGraphRaw   = null

  for attempt in 1..MAX_GRAPH_ATTEMPTS:
    graph = generateStructuredOutput(
      system = SYSTEM_GRAPH_PROMPT,
      user   = tagged({
        explanation,
        file_tree:          filteredTree,
        repo_owner:         username,
        repo_name:          repo,
        previous_graph:     previousGraphRaw,   # null on attempt 1
        validation_feedback: validationFeedback, # null on attempt 1
      }),
      schema  = diagramGraphSchema,
      effort  = "low",
      maxOutputTokens = 6_000,
    )

    result = validateDiagramGraph(graph, lookup)
    if result.valid:
      validGraph = graph
      break
    else:
      validationFeedback = formatFeedback(result.issues)  # "path: message" lines
      previousGraphRaw   = raw JSON from this attempt

  if not validGraph:
    fail("Graph failed validation after max attempts")

  # --- Compile to output format ---
  output = compileGraph(validGraph, username, repo)
  return output
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Two-pass** instead of one | The explanation pass gives the graph pass a dense, reasoned summary rather than raw file paths — dramatically improves graph quality and makes validation failures easier to fix |
| **Structured output for Pass 2** | Schema enforcement at the API level eliminates JSON parsing failures; the model retries automatically on schema violations |
| **Validate file paths against the tree** | The model frequently hallucinates plausible-looking paths; verifying them against the real tree and feeding failures back as feedback is the primary quality lever |
| **Retry with feedback, not from scratch** | Sending `<previous_graph>` + `<validation_feedback>` gives the model surgical context to fix only what's wrong, not regenerate blindly |
| **XML-tagged inputs** | Makes the boundary between file tree, README, and explanation unambiguous; works across all model families |
| **`reasoning_effort: low` for graph** | The graph task is rule-bound and structured — cheaper reasoning tiers are sufficient and the savings across retry attempts are meaningful |
