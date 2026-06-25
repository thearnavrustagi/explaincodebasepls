import type { Job, JobResult, JobStatus, SectionKey } from '@/core/types/job'

export interface IJobStore {
  createJob(params: {
    id: string
    repoUrl: string
    owner: string
    repo: string
  }): Promise<void>

  updateJobStatus(id: string, status: JobStatus, errorMessage?: string): Promise<void>

  completeJob(id: string): Promise<void>

  getJob(id: string): Promise<Job | null>

  getJobResult(id: string): Promise<JobResult | null>

  upsertSection(params: {
    jobId: string
    section: SectionKey
    content: string
  }): Promise<void>
}
