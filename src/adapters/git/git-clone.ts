import simpleGit from 'simple-git'
import fs from 'fs/promises'
import type { IRepoFetcher } from './port'

export class GitCloneFetcher implements IRepoFetcher {
  async clone(cloneUrl: string, destPath: string): Promise<void> {
    const git = simpleGit()
    await git.clone(cloneUrl, destPath, ['--depth', '1', '--single-branch'])
  }

  async cleanup(destPath: string): Promise<void> {
    try {
      await fs.rm(destPath, { recursive: true, force: true })
    } catch {
      // best-effort: don't throw if already gone
    }
  }
}
