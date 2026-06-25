export interface RepoRef {
  owner: string
  repo: string
  /** Canonical HTTPS clone URL */
  cloneUrl: string
}

export class UrlParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UrlParseError'
  }
}

/**
 * Parse any GitHub repo identifier into { owner, repo, cloneUrl }.
 *
 * Supported formats:
 *   user/repo
 *   github.com/user/repo
 *   https://github.com/user/repo
 *   https://github.com/user/repo.git
 *   http://github.com/user/repo
 *   git@github.com:user/repo.git
 */
export function parseGitHubUrl(input: string): RepoRef {
  const raw = input.trim()
  if (!raw) throw new UrlParseError('Empty input')

  let path: string

  // SSH: git@github.com:user/repo.git
  if (raw.startsWith('git@github.com:')) {
    path = raw.slice('git@github.com:'.length)
  } else if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const url = new URL(raw)
    if (!url.hostname.endsWith('github.com')) {
      throw new UrlParseError(`Not a GitHub URL: ${raw}`)
    }
    path = url.pathname
  } else if (raw.includes('github.com/')) {
    path = raw.slice(raw.indexOf('github.com/') + 'github.com/'.length)
  } else if (raw.includes('/') && !raw.includes(' ')) {
    // Bare user/repo
    path = raw
  } else {
    throw new UrlParseError(`Unrecognised GitHub URL format: ${raw}`)
  }

  // Strip leading slash and trailing .git
  path = path.replace(/^\//, '').replace(/\.git$/, '')

  // Strip anything after the second segment (e.g. /tree/main/...)
  const segments = path.split('/').filter(Boolean)
  if (segments.length < 2) {
    throw new UrlParseError(`Could not extract owner/repo from: ${raw}`)
  }

  const [owner, repo] = segments
  return {
    owner,
    repo,
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
  }
}
