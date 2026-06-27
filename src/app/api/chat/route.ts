import { NextRequest, NextResponse } from 'next/server'
import Portkey from 'portkey-ai'
import { z } from 'zod'
import { SQLiteJobStore } from '@/adapters/storage/sqlite'

// Portkey slug for the chat agent
const CHAT_SLUG = 'ecb-chat'

const bodySchema = z.object({
  jobId:        z.string().min(1),
  model:        z.string().default('gpt-4o'),
  messages:     z.array(z.object({
    role:    z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
  pinnedContext: z.string().optional(),
})

/** Build the system prompt from the job's documentation sections */
async function buildSystemPrompt(jobId: string, pinnedContext?: string): Promise<string> {
  const store = new SQLiteJobStore()
  const result = await store.getJobResult(jobId)

  const parts: string[] = [
    `You are an expert software engineer and technical writer helping a developer understand the codebase documented below.`,
    ``,
    `You have access to the complete AI-generated documentation for this repository. Answer questions concisely and precisely.`,
    `When referencing code, use backtick formatting. When referencing file paths, use backtick formatting.`,
    `If you are unsure about something, say so — do not hallucinate file paths or APIs that aren't in the docs.`,
    ``,
    `## Repository Documentation`,
    ``,
  ]

  if (result) {
    parts.push(`**Repository:** ${result.owner}/${result.repo}`)
    parts.push(``)

    const sectionLabels: Record<string, string> = {
      explanation: 'Architecture Explanation',
      hld:         'High-Level Design (HLD)',
      lld:         'Low-Level Design (LLD)',
      api_flows:   'API Flows',
      glossary:    'Glossary',
    }

    for (const [key, label] of Object.entries(sectionLabels)) {
      const section = result.sections.find(s => s.section === key)
      if (section?.content) {
        parts.push(`### ${label}`)
        parts.push(section.content.slice(0, 6000))
        parts.push(``)
      }
    }
  }

  if (pinnedContext) {
    parts.push(`---`)
    parts.push(`## Pinned Context (user is asking specifically about this)`)
    parts.push(``)
    parts.push(pinnedContext)
    parts.push(``)
    parts.push(`Focus your answer on this pinned excerpt unless the user asks about something broader.`)
  }

  return parts.join('\n')
}

/** Singleton Portkey client for chat */
let _client: Portkey | null = null
function getClient(): Portkey {
  if (!_client) {
    _client = new Portkey({
      apiKey:     process.env.PORTKEY_API_KEY!,
      virtualKey: process.env.PORTKEY_VIRTUAL_KEY!,
    })
  }
  return _client
}

export async function POST(req: NextRequest) {
  if (!process.env.PORTKEY_API_KEY || !process.env.PORTKEY_VIRTUAL_KEY) {
    return NextResponse.json(
      { error: 'PORTKEY_API_KEY and PORTKEY_VIRTUAL_KEY must be set' },
      { status: 500 }
    )
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { jobId, model, messages, pinnedContext } = parsed.data
  const systemPrompt = await buildSystemPrompt(jobId, pinnedContext)
  const client = getClient()

  let stream: any
  try {
    stream = await client.chat.completions.create(
      {
        model,
        stream:     true,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      } as any,
      {
        headers: {
          'x-portkey-metadata': JSON.stringify({ agent: CHAT_SLUG }),
        },
      }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to connect to LLM'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of (stream as any)) {
          const delta = chunk?.choices?.[0]?.delta?.content
          if (delta) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
