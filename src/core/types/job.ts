export type JobStatus =
  | 'pending'
  | 'cloning'
  | 'analyzing'
  | 'generating'
  | 'complete'
  | 'error'

export type SectionKey =
  | 'explanation'
  | 'diagram_arch'
  | 'diagram_sub'
  | 'hld'
  | 'lld'
  | 'api_flows'
  | 'glossary'

export interface Job {
  id: string
  repoUrl: string
  owner: string
  repo: string
  status: JobStatus
  errorMessage: string | null
  createdAt: number
  completedAt: number | null
}

export interface JobSection {
  id: string
  jobId: string
  section: SectionKey
  content: string
  createdAt: number
}

export interface JobResult extends Job {
  sections: JobSection[]
}
