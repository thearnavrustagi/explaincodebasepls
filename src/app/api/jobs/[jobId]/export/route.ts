import { NextRequest, NextResponse } from 'next/server'
import { SQLiteJobStore }            from '@/adapters/storage/sqlite'
import { buildLatexDocument }        from '@/lib/latex/document-builder'
import { compileLatexToPdf, assertPdflatexAvailable } from '@/lib/latex/compiler'
import type { SectionKey }           from '@/core/types/job'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params

  // 1. Verify pdflatex is available before doing any DB work
  try {
    await assertPdflatexAvailable()
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 503 },
    )
  }

  // 2. Fetch the job + sections from DB
  const store  = new SQLiteJobStore()
  const result = await store.getJobResult(jobId)

  if (!result) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (result.status !== 'complete') {
    return NextResponse.json({ error: 'Job not yet complete' }, { status: 409 })
  }

  // 3. Build a section map
  const sections: Partial<Record<SectionKey, string>> = {}
  for (const s of result.sections) {
    sections[s.section] = s.content
  }

  // 4. Build the LaTeX source
  const latex = buildLatexDocument({
    owner:    result.owner,
    repo:     result.repo,
    sections,
  })

  // 5. Compile to PDF
  let pdf: Buffer
  try {
    pdf = await compileLatexToPdf(latex)
  } catch (err) {
    console.error('[export] pdflatex error:', err)
    return NextResponse.json(
      { error: 'PDF compilation failed. Is pdflatex installed?' },
      { status: 500 },
    )
  }

  // 6. Stream the PDF back as a download
  // NextResponse expects BodyInit; convert Node Buffer to Uint8Array
  const filename = `${result.owner}-${result.repo}-docs.pdf`
  return new NextResponse(new Uint8Array(pdf), {
    status:  200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(pdf.length),
    },
  })
}
