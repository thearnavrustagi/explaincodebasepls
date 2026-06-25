import type { SectionKey } from './job'

export interface AgentOutput {
  section: SectionKey
  content: string
  durationMs: number
}

export interface PipelineInput {
  jobId: string
  owner: string
  repo: string
  repoPath: string
  fileTree: string
  readme: string
  tokenCount: number
}

export interface PipelineResult {
  explanation: string
  agents: AgentOutput[]
  totalDurationMs: number
}

export type ProgressEvent =
  | { type: 'phase';   phase: string }
  | { type: 'section'; section: SectionKey; content: string }
  | { type: 'complete' }
  | { type: 'error';   message: string }
