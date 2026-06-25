import { notFound } from 'next/navigation'
import { DocumentationView } from '@/components/results/documentation-view'
import { SQLiteJobStore } from '@/adapters/storage/sqlite'
import type { SectionKey } from '@/core/types/job'

interface Props {
  params: Promise<{ jobId: string }>
}

export default async function LearnPage({ params }: Props) {
  const { jobId } = await params
  const store  = new SQLiteJobStore()
  const result = await store.getJobResult(jobId)

  if (!result) notFound()

  // For complete jobs, pre-populate sections for instant render (no SSE needed)
  let initialSections: Partial<Record<SectionKey, string>> | undefined
  if (result.status === 'complete') {
    initialSections = Object.fromEntries(
      result.sections
        .filter(s => s.section !== 'explanation')
        .map(s => [s.section, s.content])
    ) as Record<SectionKey, string>
  }

  return (
    <DocumentationView
      jobId={jobId}
      owner={result.owner}
      repo={result.repo}
      initialSections={initialSections}
      initialStatus={result.status}
    />
  )
}
