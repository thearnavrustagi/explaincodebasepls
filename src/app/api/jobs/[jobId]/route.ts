import { NextRequest, NextResponse } from 'next/server'
import { SQLiteJobStore } from '@/adapters/storage/sqlite'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params
  const store = new SQLiteJobStore()
  const result = await store.getJobResult(jobId)

  if (!result) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json(result)
}
