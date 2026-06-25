import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import path from 'path'
import fs from 'fs'
import { jobs, jobSections } from '@/db/schema'
import type { IJobStore } from './port'
import type { Job, JobResult, JobStatus, SectionKey } from '@/core/types/job'
import * as schema from '@/db/schema'

// Use global to survive Next.js hot-reload in development
declare global {
  // eslint-disable-next-line no-var
  var __ecbDb: ReturnType<typeof drizzle<typeof schema>> | undefined
}

function getDb() {
  if (!global.__ecbDb) {
    const dbUrl = process.env.DATABASE_URL ?? './data/jobs.db'
    const dir = path.dirname(path.resolve(dbUrl))
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const sqlite = new Database(dbUrl)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')

    const db = drizzle(sqlite, { schema })
    migrate(db, { migrationsFolder: './drizzle' })
    global.__ecbDb = db
  }
  return global.__ecbDb!
}

export class SQLiteJobStore implements IJobStore {
  private get db() { return getDb() }

  async createJob(params: { id: string; repoUrl: string; owner: string; repo: string }) {
    this.db.insert(jobs).values({
      id:        params.id,
      repoUrl:   params.repoUrl,
      owner:     params.owner,
      repo:      params.repo,
      status:    'pending',
      createdAt: Date.now(),
    }).run()
  }

  async updateJobStatus(id: string, status: JobStatus, errorMessage?: string) {
    this.db.update(jobs)
      .set({ status, ...(errorMessage ? { errorMessage } : {}) })
      .where(eq(jobs.id, id))
      .run()
  }

  async completeJob(id: string) {
    this.db.update(jobs)
      .set({ status: 'complete', completedAt: Date.now() })
      .where(eq(jobs.id, id))
      .run()
  }

  async getJob(id: string): Promise<Job | null> {
    const rows = this.db.select().from(jobs).where(eq(jobs.id, id)).limit(1).all()
    const row = rows[0]
    if (!row) return null
    return {
      id:           row.id,
      repoUrl:      row.repoUrl,
      owner:        row.owner,
      repo:         row.repo,
      status:       row.status as JobStatus,
      errorMessage: row.errorMessage ?? null,
      createdAt:    row.createdAt,
      completedAt:  row.completedAt ?? null,
    }
  }

  async getJobResult(id: string): Promise<JobResult | null> {
    const job = await this.getJob(id)
    if (!job) return null

    const sections = this.db
      .select()
      .from(jobSections)
      .where(eq(jobSections.jobId, id))
      .all()

    return {
      ...job,
      sections: sections.map(s => ({
        id:        s.id,
        jobId:     s.jobId,
        section:   s.section as SectionKey,
        content:   s.content,
        createdAt: s.createdAt,
      })),
    }
  }

  async upsertSection(params: { jobId: string; section: SectionKey; content: string }) {
    this.db.insert(jobSections)
      .values({
        id:        nanoid(),
        jobId:     params.jobId,
        section:   params.section,
        content:   params.content,
        createdAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: [jobSections.jobId, jobSections.section],
        set:    { content: params.content, createdAt: Date.now() },
      })
      .run()
  }
}
