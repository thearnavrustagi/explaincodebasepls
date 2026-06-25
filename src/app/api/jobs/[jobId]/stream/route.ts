import { NextRequest } from 'next/server'
import { getProgressEmitter } from '@/core/pipeline/runner'
import { SQLiteJobStore } from '@/adapters/storage/sqlite'
import { createSSEStream } from '@/lib/sse'
import type { ProgressEvent } from '@/core/types/pipeline'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params
  const store = new SQLiteJobStore()

  const job = await store.getJob(jobId)
  if (!job) {
    return new Response('Job not found', { status: 404 })
  }

  const { stream, write, close } = createSSEStream()

  if (job.status === 'complete' || job.status === 'error') {
    // Job already done — drain from DB and close
    const result = await store.getJobResult(jobId)
    if (result) {
      for (const section of result.sections) {
        write('section', { section: section.section, content: section.content })
      }
    }
    if (job.status === 'complete') {
      write('complete', {})
    } else {
      write('error', { message: job.errorMessage ?? 'Pipeline failed' })
    }
    close()
  } else {
    // Live job — subscribe to EventEmitter
    const emitter = getProgressEmitter(jobId)

    function onProgress(event: ProgressEvent) {
      if (event.type === 'section') {
        write('section', { section: event.section, content: event.content })
      } else if (event.type === 'phase') {
        write('progress', { phase: event.phase })
      } else if (event.type === 'complete') {
        write('complete', {})
        cleanup()
      } else if (event.type === 'error') {
        write('error', { message: event.message })
        cleanup()
      }
    }

    function cleanup() {
      emitter.off('progress', onProgress)
      close()
    }

    emitter.on('progress', onProgress)

    // Send initial heartbeat so the client knows we're connected
    write('ping', { jobId, status: job.status })

    // Clean up when client disconnects
    req.signal.addEventListener('abort', cleanup)
  }

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
