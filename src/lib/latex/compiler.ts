/**
 * Compile a LaTeX source string to PDF via pdflatex.
 *
 * Uses a temp directory so the working process is isolated and cleaned up.
 * pdflatex is run twice to resolve cross-references and the table of contents.
 *
 * Returns the raw PDF Buffer on success.
 * Throws with pdflatex stdout/stderr captured in the error message on failure.
 */
import { exec }    from 'child_process'
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join }   from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function compileLatexToPdf(source: string): Promise<Buffer> {
  const dir      = await mkdtemp(join(tmpdir(), 'ecbpls-latex-'))
  const texFile  = join(dir, 'document.tex')
  const pdfFile  = join(dir, 'document.pdf')

  try {
    await writeFile(texFile, source, 'utf8')

    // pdflatex needs to run twice to build ToC / cross-references correctly.
    // -interaction=nonstopmode prevents it hanging on errors.
    const cmd = `pdflatex -interaction=nonstopmode -output-directory="${dir}" "${texFile}"`

    for (let pass = 0; pass < 2; pass++) {
      try {
        await execAsync(cmd, { timeout: 60_000 })
      } catch (err: unknown) {
        // pdflatex exits non-zero even on warnings sometimes; if the PDF was
        // produced anyway we can still return it. Only rethrow if no PDF.
        const fsErr = err as NodeJS.ErrnoException
        if (fsErr && typeof fsErr === 'object' && 'code' in fsErr) {
          // Will be caught below when we try to readFile
        }
      }
    }

    const pdf = await readFile(pdfFile)
    return pdf
  } catch (err: unknown) {
    // Attach the .log file contents to the error for debuggability
    let log = ''
    try {
      log = await readFile(join(dir, 'document.log'), 'utf8')
    } catch {
      // log file may not exist if pdflatex wasn't found at all
    }
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`pdflatex failed: ${msg}\n\n${log.slice(-4000)}`)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/** Check that pdflatex is on PATH. Throws if not found. */
export async function assertPdflatexAvailable(): Promise<void> {
  try {
    await execAsync('pdflatex --version', { timeout: 5000 })
  } catch {
    throw new Error(
      'pdflatex is not installed or not on PATH. ' +
      'Install TeX Live (e.g. `brew install --cask mactex` on macOS) to enable PDF export.',
    )
  }
}
