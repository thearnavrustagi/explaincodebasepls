import { EventEmitter } from 'events'
import path from 'path'
import type { ILLMClient } from '@/adapters/llm/port'
import type { IJobStore } from '@/adapters/storage/port'
import type { IRepoFetcher } from '@/adapters/git/port'
import { ingestRepo } from './ingest'
import { runExplainPass } from './explain'
import { postprocess } from './postprocess'
import { runDiagramArchAgent }  from './agents/diagram-architecture'
import { runDiagramSubAgent }   from './agents/diagram-subsystem'
import { runHldAgent }          from './agents/hld'
import { runLldAgent }          from './agents/lld'
import { runApiFlowsAgent }     from './agents/api-flows'
import { runGlossaryAgent }     from './agents/glossary'
import type { ProgressEvent } from '@/core/types/pipeline'

export const CLONE_BASE = process.env.CLONE_DIR ?? '/tmp/ecb-jobs'

/** In-memory EventEmitter bus — jobId -> emitter */
const progressBus = new Map<string, EventEmitter>()

export function getProgressEmitter(jobId: string): EventEmitter {
  if (!progressBus.has(jobId)) {
    const emitter = new EventEmitter()
    emitter.setMaxListeners(20)
    progressBus.set(jobId, emitter)
  }
  return progressBus.get(jobId)!
}

export function destroyProgressEmitter(jobId: string) {
  progressBus.get(jobId)?.removeAllListeners()
  progressBus.delete(jobId)
}

function emit(jobId: string, event: ProgressEvent) {
  progressBus.get(jobId)?.emit('progress', event)
}

export async function runPipeline(
  jobId: string,
  owner: string,
  repo: string,
  cloneUrl: string,
  llm: ILLMClient,
  store: IJobStore,
  fetcher: IRepoFetcher,
): Promise<void> {
  const repoPath = path.join(CLONE_BASE, jobId)

  try {
    // Phase 1: Clone
    await store.updateJobStatus(jobId, 'cloning')
    emit(jobId, { type: 'phase', phase: 'cloning' })
    console.log(`[${jobId}] Cloning ${cloneUrl}...`)
    await fetcher.clone(cloneUrl, repoPath)

    // Phase 2: Ingest
    await store.updateJobStatus(jobId, 'analyzing')
    emit(jobId, { type: 'phase', phase: 'analyzing' })
    console.log(`[${jobId}] Ingesting file tree...`)
    const { fileTree, readme, tokenCount, warning } = ingestRepo(repoPath)
    if (warning) console.warn(`[${jobId}] ${warning}`)
    console.log(`[${jobId}] ~${tokenCount.toLocaleString()} tokens, ${fileTree.split('\n').length} files`)

    // Phase 3: Explanation pass
    emit(jobId, { type: 'phase', phase: 'explaining' })
    console.log(`[${jobId}] Running explanation pass...`)
    const rawExplanation = await runExplainPass(llm, fileTree, readme)
    const explanation = postprocess(rawExplanation)
    await store.upsertSection({ jobId, section: 'explanation', content: explanation })
    emit(jobId, { type: 'section', section: 'explanation', content: explanation })
    console.log(`[${jobId}] Explanation complete (${explanation.length} chars)`)

    // Phase 4: Parallel agent fan-out
    await store.updateJobStatus(jobId, 'generating')
    emit(jobId, { type: 'phase', phase: 'generating' })
    console.log(`[${jobId}] Launching 6 parallel agents...`)

    const agentArgs = [explanation, fileTree, owner, repo] as const
    const start = Date.now()

    const results = await Promise.allSettled([
      runDiagramArchAgent(llm, ...agentArgs),
      runDiagramSubAgent(llm,  ...agentArgs),
      runHldAgent(llm,         ...agentArgs),
      runLldAgent(llm,         ...agentArgs),
      runApiFlowsAgent(llm,    ...agentArgs),
      runGlossaryAgent(llm,    ...agentArgs),
    ])

    console.log(`[${jobId}] All agents resolved in ${Date.now() - start}ms`)

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { section, durationMs } = result.value
        const content = postprocess(result.value.content)
        console.log(`[${jobId}] Agent ${section} done in ${durationMs}ms`)
        await store.upsertSection({ jobId, section, content })
        emit(jobId, { type: 'section', section, content })
      } else {
        console.error(`[${jobId}] Agent failed:`, result.reason)
        // Best-effort: skip the section, don't fail the whole job
      }
    }

    // Phase 5: Complete
    await store.completeJob(jobId)
    emit(jobId, { type: 'complete' })
    console.log(`[${jobId}] Pipeline complete`)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[${jobId}] Pipeline error:`, msg)
    await store.updateJobStatus(jobId, 'error', msg)
    emit(jobId, { type: 'error', message: msg })
  } finally {
    // Always clean up the clone
    await fetcher.cleanup(repoPath)
    // Schedule emitter cleanup after a brief delay (let any pending SSE clients drain)
    setTimeout(() => destroyProgressEmitter(jobId), 30_000)
  }
}
