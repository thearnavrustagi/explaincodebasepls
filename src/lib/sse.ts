/** Encode a single SSE message */
export function sseMessage(event: string, data: unknown): string {
  const payload = JSON.stringify(data)
  return `event: ${event}\ndata: ${payload}\n\n`
}

export interface SSEStream {
  stream: ReadableStream<Uint8Array>
  write:  (event: string, data: unknown) => void
  close:  () => void
}

/** Create a ReadableStream that stays open and can be written to */
export function createSSEStream(): SSEStream {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) { controller = ctrl },
    cancel()    { controller = null },
  })

  return {
    stream,
    write(event, data) {
      try {
        controller?.enqueue(encoder.encode(sseMessage(event, data)))
      } catch {
        // controller already closed
      }
    },
    close() {
      try { controller?.close() } catch { /* already closed */ }
    },
  }
}
