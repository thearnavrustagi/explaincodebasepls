import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { parseGitHubUrl } from '@/core/url-parser'
import { SQLiteJobStore } from '@/adapters/storage/sqlite'
import { PortkeyLLMClient } from '@/adapters/llm/portkey'
import { GitCloneFetcher } from '@/adapters/git/git-clone'
import { runPipeline } from '@/core/pipeline/runner'

const bodySchema = z.object({
  repoUrl: z.string().min(1, 'repoUrl is required'),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  let repoRef: ReturnType<typeof parseGitHubUrl>
  try {
    repoRef = parseGitHubUrl(parsed.data.repoUrl)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid URL format'
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  const jobId  = nanoid()
  const store   = new SQLiteJobStore()
  const llm     = new PortkeyLLMClient()
  const fetcher = new GitCloneFetcher()

  await store.createJob({
    id:      jobId,
    repoUrl: parsed.data.repoUrl,
    owner:   repoRef.owner,
    repo:    repoRef.repo,
  })

  // Fire-and-forget — do NOT await
  runPipeline(jobId, repoRef.owner, repoRef.repo, repoRef.cloneUrl, llm, store, fetcher)
    .catch(err => console.error('[jobs] Unhandled pipeline error:', err))

  return NextResponse.json({ jobId }, { status: 202 })
}
