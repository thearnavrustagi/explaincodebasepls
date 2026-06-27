import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { SQLiteJobStore } from '@/adapters/storage/sqlite'

const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'o1',
  'o1-mini',
  'o3-mini',
] as const

const bodySchema = z.object({
  jobId:       z.string().min(1),
  model:       z.string().default('gpt-4o'),
  messages:    z.array(z.object({
    role:    z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
  pinnedContext: z.string().optional(), // user-pinned paragraph
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
      explanation:  'Architecture Explanation',
      hld:          'High-Level Design (HLD)',
      lld:          'Low-Level Design (LLD)',
      api_flows:    'API Flows',
      glossary:     'Glossary',
    }

    for (const [key, label] of Object.entries(sectionLabels)) {
      const section = result.sections.find(s => s.section === key)
      if (section?.content) {
        parts.push(`### ${label}`)
        parts.push(section.content.slice(0, 6000)) // cap per section to stay within context
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

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
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

  const client = new OpenAI({ apiKey })

  const stream = await client.chat.completions.create({
    model,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    max_tokens: 2048,
  })

  // Stream the response as SSE
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content
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
