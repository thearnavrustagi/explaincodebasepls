# explaincodebasepls

Turn any GitHub repository into navigable technical documentation in minutes.

**Architecture diagrams · HLD · LLD · API flows · Glossary**

https://github.com/thearnavrustagi/explaincodebasepls

---

## What it does

Paste a GitHub repo URL. The app clones the repo, runs it through a two-pass LLM pipeline, and produces:

| Output | Description |
|---|---|
| Architecture diagram | Interactive Mermaid system topology |
| Subsystem diagrams | Two deeper Mermaid diagrams (frontend/backend or data-flow/dependency) |
| HLD | High-Level Design: components, data flow, integrations, design decisions |
| LLD | Low-Level Design: typed schemas, service interfaces, DB models, error handling |
| API Flows | Mermaid sequence diagrams for 3–6 major user journeys |
| Glossary | Domain terms, acronyms, and patterns in context |

Results stream progressively to the browser as each agent completes.

---

## Pipeline

```
GitHub URL
  → git clone --depth 1
  → File tree walk + README read
  → Pass 1: Enriched explanation (claude-opus-4-8, streaming)
  → Pass 2: 6 parallel agents (claude-sonnet-4-6)
      diagram-arch · diagram-sub · hld · lld · api-flows · glossary
  → Results stream via SSE → persist to SQLite
```

The explanation pass is intentionally richer than the original GitDiagram pipeline — it asks the model to identify subsystem ownership, sync/async data flows, the full API surface with request/response shapes, data model relationships, frontend/backend boundary, auth model, external dependencies, and architectural patterns.

All 6 agents run in parallel via `Promise.allSettled` — a single agent failure skips that section without failing the job.

---

## Tech stack

- **Next.js 15** App Router, TypeScript
- **Portkey** — LLM gateway with per-agent metadata slugs
- **Drizzle ORM + better-sqlite3** — job and section persistence
- **simple-git** — shallow clone with local PAT for private repos
- **Mermaid.js** (CDN) — architecture + sequence diagram rendering
- **Shiki** — syntax highlighting for LLD code blocks
- **react-markdown + remark-gfm** — HLD and glossary rendering
- **SSE** — live streaming progress from pipeline to browser

Architecture: Ports & Adapters (Hexagonal). Core pipeline has zero framework dependencies.

---

## Setup

```bash
git clone https://github.com/thearnavrustagi/explaincodebasepls
cd explaincodebasepls
npm install

# Copy env template and fill in your keys
cp .env.local.example .env.local

# Generate and run DB migration
npm run db:generate
npm run db:migrate

# Start dev server
npm run dev
```

### Environment variables

```bash
PORTKEY_API_KEY=        # Your Portkey API key
PORTKEY_VIRTUAL_KEY=    # Portkey virtual key pointing to Anthropic
DATABASE_URL=./data/jobs.db
CLONE_DIR=/tmp/ecb-jobs
```

For private repos: ensure your system git has credentials configured (macOS Keychain, `gh auth setup-git`, or a `.netrc` entry).

### Portkey configuration

The app routes all LLM calls through Portkey using your `PORTKEY_VIRTUAL_KEY`. Each agent sends an `x-portkey-metadata` header with `{ "agent": "ecb-<name>" }` for per-agent observability in the Portkey dashboard.

No saved configs needed — just the virtual key pointing to your Anthropic API key.

---

## URL formats supported

```
owner/repo
github.com/owner/repo
https://github.com/owner/repo
https://github.com/owner/repo.git
git@github.com:owner/repo.git
```

---

## Design

Design system: **The Dark Cartographer** — pitch black (`oklch 3.5%`) + amber-orange accent (`oklch 72% 0.22 55`). Space Grotesk for display, Geist Mono for everything else. One accent signal, used sparingly.

See `DESIGN.md` and `PRODUCT.md` for full design context.
