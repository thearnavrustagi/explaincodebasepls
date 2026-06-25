export interface IRepoFetcher {
  /**
   * Clone the repo to destPath. Resolves when clone is complete.
   * Uses --depth 1 for speed.
   */
  clone(cloneUrl: string, destPath: string): Promise<void>

  /**
   * Remove the cloned directory. Best-effort — does not throw on missing path.
   */
  cleanup(destPath: string): Promise<void>
}
