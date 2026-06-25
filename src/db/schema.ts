import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core'

export const jobs = sqliteTable('jobs', {
  id:           text('id').primaryKey(),
  repoUrl:      text('repo_url').notNull(),
  owner:        text('owner').notNull(),
  repo:         text('repo').notNull(),
  status:       text('status').notNull().default('pending'),
  errorMessage: text('error_message'),
  createdAt:    integer('created_at').notNull(),
  completedAt:  integer('completed_at'),
})

export const jobSections = sqliteTable('job_sections', {
  id:        text('id').primaryKey(),
  jobId:     text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  section:   text('section').notNull(),
  content:   text('content').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  jobSectionUniq: unique('job_sections_job_section_uq').on(table.jobId, table.section),
}))
