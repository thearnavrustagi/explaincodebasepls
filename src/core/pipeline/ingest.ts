import fs from 'fs'
import path from 'path'

const EXCLUDED_DIRS = new Set([
  'node_modules', 'vendor', 'venv', '.venv', '__pycache__',
  '.cache', '.tmp', '.vscode', '.idea', '.git', 'dist', 'build',
  'coverage', '.nyc_output', 'out', '.next', '.nuxt', '.turbo',
  'target', 'bin', 'obj', '.gradle', '.mvn', 'Pods',
])

const EXCLUDED_EXTENSIONS = new Set([
  '.pyc', '.pyo', '.pyd',
  '.so', '.dll', '.class', '.exe', '.bin', '.o', '.a',
  '.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg',
  '.ttf', '.woff', '.woff2', '.eot', '.webp', '.avif', '.bmp',
  '.mp4', '.mp3', '.wav', '.ogg', '.pdf',
  '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
  '.db', '.sqlite', '.sqlite3',
])

const EXCLUDED_FILES = new Set([
  'yarn.lock', 'package-lock.json', 'pnpm-lock.yaml', 'poetry.lock',
  'Pipfile.lock', 'Cargo.lock', 'composer.lock', 'Gemfile.lock',
  'go.sum', 'mix.lock', 'pubspec.lock',
])

export function walkFileTree(repoPath: string): string[] {
  const results: string[] = []

  function walk(dir: string, relBase: string) {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          walk(path.join(dir, entry.name), relPath)
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (!EXCLUDED_FILES.has(entry.name) && !EXCLUDED_EXTENSIONS.has(ext) && !entry.name.includes('.min.')) {
          results.push(relPath)
        }
      }
    }
  }

  walk(repoPath, '')
  return results
}

export function readReadme(repoPath: string): string {
  const candidates = [
    'README.md', 'readme.md', 'README.rst', 'readme.rst',
    'README.txt', 'README', 'readme.txt', 'Readme.md',
  ]
  for (const candidate of candidates) {
    const filePath = path.join(repoPath, candidate)
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      // Cap at 8k chars to prevent the README alone from blowing the token budget
      return content.slice(0, 8000)
    } catch {
      // continue
    }
  }
  return '(no README found)'
}

/**
 * Rough token estimate — 4 chars per token.
 * Sufficient for the guard; exact counting would require the Claude tokenizer.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

export const HARD_TOKEN_LIMIT = 195_000
export const SOFT_TOKEN_LIMIT = 100_000

export interface IngestResult {
  fileTree: string
  readme: string
  tokenCount: number
  warning?: string
}

export function ingestRepo(repoPath: string): IngestResult {
  const files    = walkFileTree(repoPath)
  const readme   = readReadme(repoPath)
  const fileTree = files.join('\n')
  const tokenCount = estimateTokenCount(fileTree + readme)

  if (tokenCount > HARD_TOKEN_LIMIT) {
    throw new Error(
      `Repository too large (~${tokenCount.toLocaleString()} estimated tokens). ` +
      `Hard limit is ${HARD_TOKEN_LIMIT.toLocaleString()}. Try a smaller repo or a subdirectory.`
    )
  }

  const warning = tokenCount > SOFT_TOKEN_LIMIT
    ? `Large repo (~${tokenCount.toLocaleString()} tokens). Analysis may take longer.`
    : undefined

  return { fileTree, readme, tokenCount, warning }
}
