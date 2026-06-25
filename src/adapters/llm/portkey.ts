import Portkey from 'portkey-ai'
import type { ILLMClient, LLMParams, LLMStreamChunk } from './port'

// Single shared client — route via virtualKey + per-request metadata slug for observability
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

export class PortkeyLLMClient implements ILLMClient {
  async *stream(params: LLMParams): AsyncIterable<LLMStreamChunk> {
    const client = getClient()
    const streamResponse = await client.chat.completions.create({
      model:      params.model,
      max_tokens: params.maxTokens,
      stream:     true,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user',   content: params.userPrompt },
      ],
    } as any, {
      headers: { 'x-portkey-metadata': JSON.stringify({ agent: params.slug }) },
    })

    for await (const chunk of streamResponse) {
      const delta = (chunk as any).choices?.[0]?.delta?.content
      if (delta) yield { content: delta }
    }
  }

  async complete(params: LLMParams): Promise<string> {
    const client = getClient()
    const response = await client.chat.completions.create({
      model:      params.model,
      max_tokens: params.maxTokens,
      stream:     false,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user',   content: params.userPrompt },
      ],
    } as any, {
      headers: { 'x-portkey-metadata': JSON.stringify({ agent: params.slug }) },
    })
    return (response as any).choices?.[0]?.message?.content ?? ''
  }
}
