export interface LLMStreamChunk {
  content: string
}

export interface LLMParams {
  slug: string
  model: string
  systemPrompt: string
  userPrompt: string
  maxTokens: number
}

export interface ILLMClient {
  /** Stream a completion. Yields text chunks. */
  stream(params: LLMParams): AsyncIterable<LLMStreamChunk>

  /** Non-streaming completion. Returns the full text. */
  complete(params: LLMParams): Promise<string>
}
